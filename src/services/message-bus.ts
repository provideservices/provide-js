import * as jwt from 'jsonwebtoken';
import * as url from 'url';

import { ApiClientResponse, IpfsClient } from '../clients';
import { Goldmine, Ident } from '.';

import {
  Account,
  Application,
  Connector,
  ConnectorConfig,
  Contract,
  Message,
  MessageData,
  Organization,
  Token,
  Transaction,
  Wallet,
  unmarshal,
} from '@provide/types';


/*
 * Message bus client.
 */
export class MessageBus {

  public static readonly ADDRESS_ZERO_PATTERNS = ['0x0000000000000000000000000000000000000000'];
  public static readonly APPLICATION_TYPE_MESSAGE_BUS = 'message_bus';
  public static readonly APPLICATION_HD_WALLET_DEFAULT_PURPOSE = 44;
  public static readonly CONNECTOR_TYPE_IPFS = 'ipfs';
  public static readonly CONNECTOR_TYPE_IPFS_DEFAULT_API_PORT = 5001;
  public static readonly CONNECTOR_TYPE_IPFS_DEFAULT_GATEWAY_PORT = 8080;
  public static readonly CONTRACT_TYPE_REGISTRY = 'registry';
  public static readonly CONTRACT_REGISTRY_DEFAULT_LIST_METHOD = 'listMessages';
  public static readonly CONTRACT_REGISTRY_DEFAULT_LIST_RESULTS_PER_PAGE = 10;
  public static readonly CONTRACT_REGISTRY_DEFAULT_PUBLISH_METHOD = 'publish';

  private readonly goldmine: Goldmine;
  private readonly ident: Ident;
  private readonly token?: any;

  private application?: Application;
  private connectors: Connector[] = [];
  private messages: Message[] = [];
  private organizations: Organization[] = [];
  private registryContract?: Contract;
  private signingIdentities?: Account[];
  private signingIdentity?: Account;
  private wallets?: Wallet[];
  private walletAccounts?: Account[];

  private ipfs?: IpfsClient;

  public static create(
      token: string,
      networkId: string,
      name: string,
      connectorConfig: ConnectorConfig,
      registryContract: Contract,
    ): Promise<MessageBus> {
    return new Promise((resolve, reject) => {
      const ident = new Ident(token);

      if (!connectorConfig) {
        reject('invalid registry contract');
        return;
      }

      if (!registryContract || !registryContract.params || !registryContract.params.compiled_artifact) {
        reject('invalid registry contract');
        return;
      }

      ident.createApplication({
        name: name,
        network_id: networkId,
        type: MessageBus.APPLICATION_TYPE_MESSAGE_BUS,
      }).then(
        (response: ApiClientResponse) => {
          const resp = JSON.parse(response.responseBody);
          const application = unmarshal(JSON.stringify(resp.application), Application) as Application;
          const applicationToken = unmarshal(JSON.stringify(resp.token), Token) as Token;
          console.log(`created message bus application: ${application.id}`);

          // tslint:disable-next-line: no-non-null-assertion
          const goldmine = new Goldmine(applicationToken.token!);

          goldmine.createWallet({
            purpose: MessageBus.APPLICATION_HD_WALLET_DEFAULT_PURPOSE,
          }).then(
            (hdWalletResponse: ApiClientResponse) => {
              const applicationHdWallet = unmarshal(hdWalletResponse.responseBody, Wallet) as Wallet;
              // tslint:disable-next-line: no-non-null-assertion
              const hdWalletId = applicationHdWallet.id!;

              // tslint:disable-next-line: no-non-null-assertion
              goldmine.fetchWalletAccounts(hdWalletId).then(
                (accountsResponse: ApiClientResponse) => {
                  const hdWalletAccounts = unmarshal(accountsResponse.responseBody, Account) as Account[];
                  const applicationIdentity = hdWalletAccounts[0];

                  goldmine.createConnector({
                    name: `${name} message bus connector - ${MessageBus.CONNECTOR_TYPE_IPFS} - ${connectorConfig.region}`,
                    application_id: application.id,
                    network_id: networkId,
                    type: MessageBus.CONNECTOR_TYPE_IPFS,
                    config: connectorConfig,
                  }).then(
                    (connectorResponse: ApiClientResponse) => {
                      const connector = unmarshal(connectorResponse.responseBody, Connector) as Connector;
                      console.log(`created connector ${connector.id} for message bus application: ${application.id}`);

                      goldmine.createContract({
                        name: registryContract.name,
                        network_id: networkId,
                        application_id: application.id,
                        type: MessageBus.CONTRACT_TYPE_REGISTRY,
                        address: '0x',
                        params: {
                          // tslint:disable-next-line: no-non-null-assertion
                          compiled_artifact: registryContract.params!.compiled_artifact,
                          wallet_id: hdWalletId,
                          hd_derivation_path: applicationIdentity.hdDerivationPath,
                        },
                      }).then(
                        (contractResponse: ApiClientResponse) => {
                          const contract = unmarshal(contractResponse.responseBody, Contract) as Contract;
                          console.log(`created registry contract ${contract.id} for message bus application: ${application.id}`);

                          // tslint:disable-next-line: no-non-null-assertion
                          const mb = new MessageBus(applicationToken.token!);
                          resolve(mb);
                        }
                      ).catch(
                        (contractResponse: any) => {
                          console.log(`WARNING: failed to create registry contract for message bus application ${application.id}; ${contractResponse}`);
                          reject(contractResponse);
                        }
                      );
                    }
                  ).catch(
                    (connectorResponse: any) => {
                      console.log(`WARNING: failed to create connector for message bus application ${application.id}; ${accountsResponse}`);
                      reject(connectorResponse);
                    }
                  );
                }
              ).catch(
                (accountsResponse: any) => {
                  console.log(`WARNING: failed to fetch HD wallet accounts for message bus application ${application.id}; ${accountsResponse}`);
                  reject(accountsResponse);
                }
              );
            },
          ).catch(
            (hdWalletResponse: any) => {
              console.log(`WARNING: failed to create HD wallet for message bus application ${application.id}; ${hdWalletResponse}`);
              reject(hdWalletResponse);
            }
          );
        }
      ).catch(
        (response: any) => {
          console.log(`WARNING: failed to create message bus application; ${response}`);
          reject(response);
        }
      );
    });
  }

  public static factory(token: string): Promise<MessageBus> {
    return new MessageBus(token).initialize();
  }

  public static unmarshal(token: string, json: string): Promise<MessageBus> {
    const msgbus = JSON.parse(json);
    if (!msgbus) {
      return Promise.reject();
    }

    const bus = new MessageBus(token);
    bus.application = msgbus.application;
    bus.connectors = msgbus.connectors;
    bus.organizations = msgbus.organizations;
    bus.registryContract = msgbus.registryContract;
    bus.signingIdentities = msgbus.signingIdentities;
    bus.signingIdentity = msgbus.signingIdentity;
    bus.wallets = msgbus.wallets;
    bus.walletAccounts = msgbus.walletAccounts;
    bus.configureIpfsClient();

    return Promise.resolve(bus);
  }

  private constructor(token: string) {
    this.goldmine = new Goldmine(token);
    this.ident = new Ident(token);

    const payload = jwt.decode(token);
    if (payload === null) {
      throw new Error(`failed to parse application jwt: ${token}`);
    }

    this.token = payload;
  }

  private initialize(): Promise<MessageBus> {
    return new Promise((resolve, reject) => {
      this.resolveApplication().then(
        (application: Application) => {
          this.application = application;
          console.log(`resolved application: ${this.application.id}`);

          this.resolveOrganizations().then(
            (organizations: Organization[]) => {
              this.organizations = organizations;
            }
          ).catch(
            (err) => {
              console.log(`WARNING: failed to resolve application organizations; ${err}`);
            }
          );

          this.resolveRegistryContract().then(
            (registryContract: Contract) => {
              this.registryContract = registryContract;

              this.resolveWallets().then(
                (wallets: Wallet[]) => {
                  this.wallets = wallets;

                  this.resolveWalletAccounts().then(
                    (accounts: Account[]) => {
                      this.walletAccounts = accounts;
                    }
                  ).catch(
                    (err) => {
                      reject(err);
                    }
                  );
                }
              );

              this.resolveSigningIdentities().then(
                (signingIdentities: Account[]) => {
                  this.signingIdentities = signingIdentities;
                  if (this.signingIdentities.length > 0) {
                    this.signingIdentity = this.signingIdentities[0];
                  }

                  this.resolveConnectors().then(
                    (connectors: Connector[]) => {
                      this.connectors = connectors;
                      this.configureIpfsClient();

                      resolve(this);
                    }
                  ).catch(
                    (err) => {
                      reject(err);
                    }
                  );
                }
              ).catch(
                (err) => {
                  reject(err);
                }
              );
            }
          ).catch(
            (err) => {
              reject(err);
            }
          );
        }
      ).catch(
        (err) => {
          reject(err);
        }
      );
    });
  }

  private configureIpfsClient() { // FIXME-- make this an implementation of a ConnectorProvider interface or similar
    const connector = this.getConnector();
    if (connector === null) {
      return;
    }

    // tslint:disable-next-line: no-non-null-assertion
    const connectorConfig = connector.config!;
    if (!connectorConfig['api_url']) {
      return;
    }

    // tslint:disable-next-line: no-non-null-assertion
    const ipfsUrl: any = url.parse(`${connectorConfig['api_url']}/api/v0/`);

    this.ipfs = new IpfsClient(ipfsUrl.protocol.replace(':', ''),
                               ipfsUrl.host,
                               parseInt(ipfsUrl.port, 10),
                               ipfsUrl.path);
  }

  private getApplicationId(): string {
    const subjectParts = this.token.sub.split(':');
    if (subjectParts.length !== 2) {
      throw new Error(`failed to parse application subject from jwt: ${this.token}`);
    }
    return subjectParts[1];
  }

  private getConnector(): Connector | null {
    if (this.connectors.length > 0) {
      return this.connectors[0];
    }

    return null;
  }

  private resolveApplication(): Promise<Application> {
    return new Promise((resolve, reject) => {
      this.ident.fetchApplicationDetails(this.getApplicationId()).then(
        (response: ApiClientResponse) => {
          const application = unmarshal(response.responseBody, Application) as Application;
          resolve(application);
        }
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        }
      );
    });
  }

  private resolveConnectors(): Promise<Connector[]> {
    return new Promise((resolve, reject) => {
      this.goldmine.fetchConnectors({ type: MessageBus.CONNECTOR_TYPE_IPFS }).then(
        (response: ApiClientResponse) => {
          const connectors = unmarshal(response.responseBody, Connector) as Connector[];
          resolve(connectors);
        }
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        }
      );
    });
  }

  private resolveOrganizations(): Promise<Organization[]> {
    return new Promise((resolve, reject) => {
      this.ident.fetchApplicationOrganizations(this.getApplicationId(), { }).then(
        (response: ApiClientResponse) => {
          const organizations = unmarshal(response.responseBody, Organization) as Organization[];
          resolve(organizations);
        }
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        }
      );
    });
  }

  private resolveRegistryContract(): Promise<Contract> {
    return new Promise((resolve, reject) => {
      this.goldmine.fetchContracts({ type: MessageBus.CONTRACT_TYPE_REGISTRY }).then(
        (response: ApiClientResponse) => {
          const contracts = unmarshal(response.responseBody, Contract) as Contract[];
          contracts.forEach(
            (contract: Contract) => {
              resolve(contract);
              return;
            }
          );
          reject(null);
        },
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        },
      );
    });
  }

  private resolveSigningIdentities(): Promise<Account[]> {
    return new Promise((resolve, reject) => {
      this.goldmine.fetchAccounts().then(
        (response: ApiClientResponse) => {
          const accounts = unmarshal(response.responseBody, Account) as Account[];
          resolve(accounts);
        },
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        },
      );
    });
  }

  private resolveWallets(): Promise<Wallet[]> {
    return new Promise((resolve, reject) => {
      this.goldmine.fetchWallets().then(
        (response: ApiClientResponse) => {
          const wallets = unmarshal(response.responseBody, Wallet) as Wallet[];
          resolve(wallets);
        },
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        },
      );
    });
  }

  private resolveWalletAccounts(): Promise<Account[]> {
    if (!this.wallets || this.wallets.length === 0) {
      return Promise.reject('no HD wallet for which signing accounts can be resolved');
    }

    // tslint:disable-next-line: no-non-null-assertion
    const hdWalletId = this.wallets[0].id!;

    return new Promise((resolve, reject) => {
      this.goldmine.fetchWalletAccounts(hdWalletId).then(
        (response: ApiClientResponse) => {
          const accounts = unmarshal(response.responseBody, Account) as Account[];
          resolve(accounts);
        },
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        },
      );
    });
  }

  public getApplication(): Application | undefined {
    return this.application;
  }

  public getConnectors(): Connector[] {
    return this.connectors;
  }

  public getRegistryContract(): Contract | undefined {
    return this.registryContract;
  }

  public getSigningIdentities(): Account[] | undefined {
    return this.signingIdentities;
  }

  public getWallets(): Wallet[] | undefined {
    return this.wallets;
  }

  public getWalletAccount(i: number): Account | null {
    if (this.walletAccounts && i <= this.walletAccounts.length - 1) {
      return this.walletAccounts[i];
    }

    return null;
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public getOrganizations(): Organization[] {
    return this.organizations;
  }

  public publish(subject: string, msg: Uint8Array): Promise<string> {
    if (this.ipfs === null) {
      return Promise.reject('unable to publish message without configured ipfs');
    }
    if (typeof this.registryContract === 'undefined') {
      return Promise.reject('unable to publish message without configured registry contract');
    }

    let accountAddress, hdWalletId, hdDerivationPath;

    if (this.wallets && this.wallets.length > 0 && this.walletAccounts && this.walletAccounts.length > 0) {
      hdWalletId = this.wallets[0].id;
      hdDerivationPath = this.walletAccounts[0].hdDerivationPath;
    } else if (this.signingIdentity) {
      accountAddress = this.signingIdentity.address;
    } else {
      return Promise.reject('unable to publish message without configured signing identity or HD wallet');
    }

    return new Promise<string>((resolve, reject) => {
      // tslint:disable-next-line: no-non-null-assertion
      this.ipfs!.add('', msg).then(
        (hash: any) => {
          // tslint:disable-next-line: no-non-null-assertion
          this.goldmine.executeContract(this.registryContract!.id!, {
            method: MessageBus.CONTRACT_REGISTRY_DEFAULT_PUBLISH_METHOD,
            params: [subject, hash],
            value: 0,
            // tslint:disable-next-line: no-non-null-assertion
            account_address: accountAddress,
            wallet_id: hdWalletId,
            hd_derivation_path: hdDerivationPath,
          }).then(
            (response: ApiClientResponse) => {
              console.log(`received ${response}`);
              resolve(hash);
            }
          ).catch((err) => {
            reject(`WARNING: failed to publish ${msg.length}-byte message ${hash} to registry; ${err}`);
          });
        }
      ).catch((err) => {
        reject(`WARNING: failed to publish message to IPFS; ${err}`);
      });
    });
  }

  public readRegistryContract(
      page: number = 1,
      rpp: number = MessageBus.CONTRACT_REGISTRY_DEFAULT_LIST_RESULTS_PER_PAGE,
  ): Promise<Message[]> {
    if (typeof this.registryContract === 'undefined') {
      return Promise.reject('unable to read registry without configured registry contract');
    }
    if (typeof this.registryContract === 'undefined') {
      return Promise.reject('unable to read registry contract without configured ipfs');
    }

    if (page === 1) {
      this.messages = [];
    }

    let accountAddress, hdWalletId, hdDerivationPath;

    if (this.signingIdentity) {
      accountAddress = this.signingIdentity.address;
    } else if (this.wallets && this.wallets.length > 0 && this.walletAccounts && this.walletAccounts.length > 0) {
      hdWalletId = this.wallets[0].id;
      hdDerivationPath = this.walletAccounts[0].hdDerivationPath;
    } else {
      return Promise.reject('unable to read registry contract without configured signing identity or HD wallet');
    }

    return new Promise<Message[]>((resolve, reject) => {
      // tslint:disable-next-line: no-non-null-assertion
      this.goldmine.executeContract(this.registryContract!.id!, {
        method: MessageBus.CONTRACT_REGISTRY_DEFAULT_LIST_METHOD,
        params: [page, rpp],
        value: 0,
        // tslint:disable-next-line: no-non-null-assertion
        account_address: accountAddress,
        wallet_id: hdWalletId,
        hd_derivation_path: hdDerivationPath,
      }).then((response: ApiClientResponse) => {
        if (response.xhr.status === 200) {
          const messages: Message[] = [];
          const messagesByHash = {};
          const hashes: any[] = [];
          const hashesModifiedAt: any[] = [];

          const messagesList = JSON.parse(response.responseBody).response as any[];
          for (const msg of messagesList) {
            if (msg.sender && MessageBus.ADDRESS_ZERO_PATTERNS.indexOf(msg.sender) === -1) {
              const message = new Message();
              message.sender = msg.sender;
              message.timestamp = new Date(msg.timestamp * 1000).toUTCString();

              const tx = new Transaction();
              tx.unmarshal(JSON.stringify(msg));
              message.tx = tx;

              const hash = atob(msg.hash);

              messages.push(message);
              messagesByHash[hash] = message;
              hashes.push(hash);
              hashesModifiedAt.push(msg.timestamp);
            }
          }

          // tslint:disable-next-line: no-non-null-assertion
          this.goldmine.fetchConnectorDetails(this.getConnector()!.id!, { objects: hashes.join(',') }).then(
            (connectorResponse: ApiClientResponse) => {
              const connector = unmarshal(connectorResponse.responseBody, Connector) as Connector;
              // tslint:disable-next-line: no-non-null-assertion
              const items = connector!.details!.data;

              for (const item of items) {
                if (!item.modified_at) {
                  item['modified_at'] = hashesModifiedAt[items.indexOf(item)]; // HACK
                }

                const msgData = new MessageData();
                msgData.unmarshal(JSON.stringify(item));
                messagesByHash[item['hash']].data = msgData;
              }

              messages.forEach((msg) => {
                this.messages.push(msg);
              });

              resolve(messages);
            }).catch(
              (connectorResponse) => {
                reject(`failed to retrieve connector details; ${connectorResponse}`);
              }
            );
        } else {
          reject(`WARNING: failed to read registry contract; ${response.responseBody}`);
        }
      }).catch((err) => {
        reject(`WARNING: failed to read registry contract; ${err}`);
      });
    });
  }

  public addOrganization(organizationId: string, permissions?: number): Promise<void> {
    const params = { organization_id: organizationId };
    if (permissions && typeof permissions !== 'undefined') {
      params['permissions'] = permissions;
    }

    return new Promise((resolve, reject) => {
      this.ident.createApplicationOrganization(this.getApplicationId(), params).then(
        (response: ApiClientResponse) => {
          if (response.xhr.status === 204) {
            this.resolveOrganizations();
            resolve();
          }
        },
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        },
      );
    });
  }

  public removeOrganization(organizationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ident.deleteApplicationOrganization(this.getApplicationId(), organizationId).then(
        (response: ApiClientResponse) => {
          if (response.xhr.status === 204) {
            this.resolveOrganizations();
            resolve();
          }
        },
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        },
      );
    });
  }

  public updateOrganization(organizationId: string, params: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ident.updateApplicationOrganization(this.getApplicationId(), organizationId, params).then(
        (response: ApiClientResponse) => {
          if (response.xhr.status === 204) {
            this.resolveOrganizations();
            resolve();
          }
        },
      ).catch(
        (response: ApiClientResponse) => {
          reject(response);
        },
      );
    });
  }
}
