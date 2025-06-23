import { VerificationConfig } from 'src/types/types.js';
import { IConfigStorage } from './interface.js';

export class InMemoryConfigStore implements IConfigStorage {
  private configs: Map<string, VerificationConfig> = new Map();
  private getActionIdFunc: IConfigStorage['getActionId'];

  constructor(getActionIdFunc: IConfigStorage['getActionId']) {
    this.getActionIdFunc = getActionIdFunc;
  }

  async getActionId(userIdentifier: string, userDefinedData: string): Promise<string> {
    return this.getActionIdFunc(userIdentifier, userDefinedData);
  }

  async setConfig(configId: string, config: VerificationConfig): Promise<boolean> {
    const existed = this.configs.has(configId);
    this.configs.set(configId, config);
    return !existed;
  }

  async getConfig(configId: string): Promise<VerificationConfig> {
    return this.configs.get(configId);
  }
}
