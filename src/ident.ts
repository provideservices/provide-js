import { ApiClient } from './api-client';
import { ApiClientResponse } from './api-client-response';

/*
 * Ident microservice; provides access to functionality
 * exposed by the Provide identity and resource authorization APIs.
 */
export class Ident {

  private static readonly DEFAULT_HOST = 'ident.provide.services';

  private readonly client: ApiClient;

  constructor(token: string, scheme?: string, host?: string, path?: string) {
    if (!host) host = Ident.DEFAULT_HOST;
    this.client = new ApiClient(token, scheme, host, path);
  }

  public createApplication(params: object): Promise<ApiClientResponse> {
    return this.client.post('applications', params);
  }

  public updateApplication(app_id: string, params: object): Promise<ApiClientResponse> {
    return this.client.put(`applications/${app_id}`, params);
  }

  public fetchApplications(params: object): Promise<ApiClientResponse> {
    return this.client.get('applications', params);
  }

  public fetchApplicationDetails(app_id: string): Promise<ApiClientResponse> {
    return this.client.get(`applications/${app_id}`, { });
  }

  public fetchApplicationTokens(app_id: string): Promise<ApiClientResponse> {
    return this.client.get(`applications/${app_id}/tokens`, { });
  }

  public authenticate(params: object): Promise<ApiClientResponse> {
    return this.client.post('authenticate', params);
  }

  public fetchTokens(params: object): Promise<ApiClientResponse> {
    return this.client.get('tokens', params);
  }

  public fetchTokenDetails(token_id: string): Promise<ApiClientResponse> {
    return this.client.get(`tokens/${token_id}`, { });
  }

  public deleteToken(token_id: string): Promise<ApiClientResponse> {
    return this.client.delete(`tokens/${token_id}`);
  }

  public createUser(params: object): Promise<ApiClientResponse> {
    return this.client.post('users', params);
  }

  public fetchUsers(): Promise<ApiClientResponse> {
    return this.client.get('users', { });
  }

  public fetchUserDetails(user_id: string): Promise<ApiClientResponse> {
    return this.client.get(`users/${user_id}`, { });
  }

  public updateUser(user_id: string, params: object): Promise<ApiClientResponse> {
    return this.client.put(`users/${user_id}`, params);
  }
}
