import { ApiClient } from '../clients';
import {
  Account,
  Bridge,
  Connector,
  Contract,
  LoadBalancer,
  LogsResponse,
  Network,
  NetworkStats,
  Node,
  Oracle,
  PaginatedResponse,
  TokenContract,
  Transaction,
  Wallet
} from '@provide/types';

/*
 * NChain microservice; provides access to functionality
 * exposed by the Provide container runtime & blockchain APIs.
 */
export class NChain {

  private static readonly DEFAULT_HOST = 'nchain.provide.services';

  private readonly client: ApiClient;

  constructor(token: string, scheme?: string, host?: string, path?: string) {
    if (!host) {
      host = NChain.DEFAULT_HOST;
    }

    this.client = new ApiClient(token, scheme, host, path);
  }

  public static clientFactory(token: string, scheme?: string, host?: string, path?: string): NChain {
    const _scheme = scheme ? scheme : (process.env['NCHAIN_API_SCHEME'] || 'https');
    const _host = host ? host : (process.env['NCHAIN_API_HOST'] || NChain.DEFAULT_HOST);
    const _path = path ? path : (process.env['NCHAIN_API_PATH'] || ApiClient.DEFAULT_PATH);
    return new NChain(token, _scheme, _host, _path);
  }

  public async fetchAccounts(params?: object): Promise<PaginatedResponse<Account>> {
    return ApiClient.handleResponse(await this.client.get('accounts', (params || {}))) as PaginatedResponse<Account>;
  }

  public async fetchAccountDetails(accountId: string): Promise<Account> {
    return ApiClient.handleResponse(await this.client.get(`accounts/${accountId}`, {})) as Account;
  }

  public async fetchAccountBalance(accountId: string, tokenId: string): Promise<any> {
    return ApiClient.handleResponse(await this.client.get(`accounts/${accountId}/balances/${tokenId}`, {}));
  }

  public async createAccount(params: object): Promise<Account> {
    return ApiClient.handleResponse(await this.client.post('accounts', params)) as Account;
  }

  public async fetchBridges(params?: object): Promise<PaginatedResponse<Bridge>> {
    return ApiClient.handleResponse(await this.client.get('bridges', (params || {}))) as PaginatedResponse<Bridge>;
  }

  public async fetchBridgeDetails(bridgeId: string): Promise<Bridge> {
    return ApiClient.handleResponse(await this.client.get(`bridges/${bridgeId}`, {})) as Bridge;
  }

  public async createBridge(params: object): Promise<Bridge> {
    return ApiClient.handleResponse(await this.client.post('bridges', params)) as Bridge;
  }

  public async fetchConnectors(params?: object): Promise<PaginatedResponse<Connector>> {
    return ApiClient.handleResponse(await this.client.get('connectors', (params || {}))) as PaginatedResponse<Connector>;
  }

  public async fetchConnectorDetails(connectorId: string, params?: object): Promise<Connector> {
    return ApiClient.handleResponse(await this.client.get(`connectors/${connectorId}`, (params || {}))) as Connector;
  }

  public async fetchConnectorLoadBalancers(connectorId: string, params?: object): Promise<PaginatedResponse<LoadBalancer>> {
    return ApiClient.handleResponse(await this.client.get(`connectors/${connectorId}/load_balancers`, (params || {}))) as PaginatedResponse<LoadBalancer>;
  }

  public async fetchConnectorNodes(connectorId: string, params?: object): Promise<PaginatedResponse<Node>> {
    return ApiClient.handleResponse(await this.client.get(`connectors/${connectorId}/nodes`, (params || {}))) as PaginatedResponse<Node>;
  }

  public async createConnector(params: object): Promise<Connector> {
    return ApiClient.handleResponse(await this.client.post('connectors', params)) as Connector;
  }

  public async deleteConnector(connectorId: string): Promise<void> {
    return ApiClient.handleResponse(await this.client.delete(`connectors/${connectorId}`));
  }

  public async authorizeConnectorSubscription(connectorId: string, params: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.post(`connectors/${connectorId}/subscriptions`, params));
  }

  public async authorizeContractSubscription(contractId: string, params: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.post(`contracts/${contractId}/subscriptions`, params));
  }

  public async createConnectedEntity(connectorId: string, params: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.post(`connectors/${connectorId}/entities`, params));
  }

  public async fetchConnectedEntities(connectorId: string, params: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.get(`connectors/${connectorId}/entities`, params));
  }

  public async fetchConnectedEntityDetails(connectorId: string, entityId: string, params?: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.get(`connectors/${connectorId}/entities/${entityId}`, (params || {})));
  }

  public async updateConnectedEntity(connectorId: string, entityId: string, params: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.put(`connectors/${connectorId}/entities/${entityId}`, params));
  }

  public async deleteConnectedEntity(connectorId: string, entityId: string): Promise<void> {
    return ApiClient.handleResponse(await this.client.delete(`connectors/${connectorId}/entities/${entityId}`));
  }

  public async fetchContracts(params?: object): Promise<PaginatedResponse<Contract>> {
    return ApiClient.handleResponse(await this.client.get('contracts', (params || {}))) as PaginatedResponse<Contract>;
  }

  public async fetchContractDetails(contractId: string): Promise<Contract> {
    return ApiClient.handleResponse(await this.client.get(`contracts/${contractId}`, {})) as Contract;
  }

  public async createContract(params: object): Promise<Contract> {
    return ApiClient.handleResponse(await this.client.post('contracts', params)) as Contract;
  }

  public async executeContract(contractId: string, params: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.post(`contracts/${contractId}/execute`, params));
  }

  public async fetchNetworks(params?: object): Promise<Network> {
    return ApiClient.handleResponse(await this.client.get('networks', (params || {}))) as Network;
  }

  public async createNetwork(params: object): Promise<Network> {
    return ApiClient.handleResponse(await this.client.post('networks', params)) as Network;
  }

  public async updateNetwork(networkId: string, params: object): Promise<void> {
    return ApiClient.handleResponse(await this.client.put(`networks/${networkId}`, params));
  }

  public async fetchNetworkDetails(networkId: string): Promise<Network> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}`, {})) as Network;
  }

  public async fetchNetworkAccounts(networkId: string, params: object): Promise<PaginatedResponse<Account>> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/accounts`, params)) as PaginatedResponse<Account>;
  }

  public async fetchNetworkBlocks(networkId: string, params: object): Promise<any> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/blocks`, params));
  }

  public async fetchNetworkBridges(networkId: string, params: object): Promise<PaginatedResponse<Bridge>> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/bridges`, params)) as PaginatedResponse<Bridge>;
  }

  public async fetchNetworkConnectors(networkId: string, params: object): Promise<Connector> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/connectors`, params)) as Connector;
  }

  public async fetchNetworkContracts(networkId: string, params: object): Promise<PaginatedResponse<Contract>> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/contracts`, params)) as PaginatedResponse<Contract>;
  }

  public async fetchNetworkContractDetails(networkId: string, contractId: string): Promise<Contract> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/contracts/${contractId}`, {})) as Contract;
  }

  public async fetchNetworkOracles(networkId: string, params: object): Promise<PaginatedResponse<Oracle>> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/oracles`, params)) as PaginatedResponse<Oracle>;
  }

  public async fetchNetworkTokenContracts(networkId: string, params: object): Promise<PaginatedResponse<TokenContract>> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/tokens`, params)) as PaginatedResponse<TokenContract>;
  }

  public async fetchNetworkTransactions(networkId: string, params: object): Promise<PaginatedResponse<Transaction>> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/transactions`, params)) as PaginatedResponse<Transaction>;
  }

  public async fetchNetworkTransactionDetails(networkId: string, transactionId: string): Promise<Transaction> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/transactions/${transactionId}`, {})) as Transaction;
  }

  public async fetchNetworkStatus(networkId: string): Promise<NetworkStats> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/status`, {})) as NetworkStats;
  }

  public async fetchNetworkNodes(networkId: string, params?: object): Promise<PaginatedResponse<Node>> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/nodes`, (params || {}))) as PaginatedResponse<Node>;
  }

  public async createNetworkNode(networkId: string, params: object): Promise<Node> {
    return ApiClient.handleResponse(await this.client.post(`networks/${networkId}/nodes`, params)) as Node;
  }

  public async fetchNetworkNodeDetails(networkId: string, nodeId: string): Promise<Node> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/nodes/${nodeId}`, {})) as Node;
  }

  public async fetchNetworkNodeLogs(networkId: string, nodeId: string, params?: object): Promise<LogsResponse> {
    return ApiClient.handleResponse(await this.client.get(`networks/${networkId}/nodes/${nodeId}/logs`, (params || {})));
  }

  public async deleteNetworkNode(networkId: string, nodeId: string): Promise<void> {
    return ApiClient.handleResponse(await this.client.delete(`networks/${networkId}/nodes/${nodeId}`));
  }

  public async fetchOracles(params?: object): Promise<PaginatedResponse<Oracle>> {
    return ApiClient.handleResponse(await this.client.get('oracles', (params || {}))) as PaginatedResponse<Oracle>;
  }

  public async fetchOracleDetails(oracleId: string): Promise<Oracle> {
    return ApiClient.handleResponse(await this.client.get(`oracles/${oracleId}`, {})) as Oracle;
  }

  public async createOracle(params: object): Promise<Oracle> {
    return ApiClient.handleResponse(await this.client.post('oracles', params)) as Oracle;
  }

  public async fetchTokenContracts(params?: object): Promise<PaginatedResponse<TokenContract>> {
    return ApiClient.handleResponse(await this.client.get('tokens', (params || {}))) as PaginatedResponse<TokenContract>;
  }

  public async fetchTokenContractDetails(tokenId: string): Promise<TokenContract> {
    return ApiClient.handleResponse(await this.client.get(`tokens/${tokenId}`, {})) as TokenContract;
  }

  public async createTokenContract(params: object): Promise<TokenContract> {
    return ApiClient.handleResponse(await this.client.post('tokens', params)) as TokenContract;
  }

  public async createTransaction(params: object): Promise<Transaction> {
    return ApiClient.handleResponse(await this.client.post('transactions', params)) as Transaction;
  }

  public async fetchTransactions(params?: object): Promise<PaginatedResponse<Transaction>> {
    return ApiClient.handleResponse(await this.client.get('transactions', (params || {}))) as PaginatedResponse<Transaction>;
  }

  public async fetchTransactionDetails(transactionId: string): Promise<Transaction> {
    return ApiClient.handleResponse(await this.client.get(`transactions/${transactionId}`, {})) as Transaction;
  }

  public async fetchWallets(params?: object): Promise<PaginatedResponse<Wallet>> {
    return ApiClient.handleResponse(await this.client.get('wallets', (params || {}))) as PaginatedResponse<Wallet>;
  }

  public async fetchWalletAccounts(walletId: string): Promise<PaginatedResponse<Account>> {
    return ApiClient.handleResponse(await this.client.get(`wallets/${walletId}/accounts`, {})) as PaginatedResponse<Account>;
  }

  public async fetchWalletDetails(walletId: string): Promise<Wallet> {
    return ApiClient.handleResponse(await this.client.get(`wallets/${walletId}`, {})) as Wallet;
  }

  public async createWallet(params: object): Promise<Wallet> {
    return ApiClient.handleResponse(await this.client.post('wallets', params)) as Wallet;
  }
}

export const nchainClientFactory = (token: string, scheme?: string, host?: string, path?: string): NChain => {
  return NChain.clientFactory(token, scheme, host, path);
};
