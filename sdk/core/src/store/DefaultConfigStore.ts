import { VerificationConfig } from 'src/types/types.js';
import { IConfigStorage } from './interface.js';

export class DefaultConfigStore implements IConfigStorage {
  constructor(private config: VerificationConfig) {}

  async getConfig(_id: string): Promise<VerificationConfig> {
    return this.config;
  }

  async setConfig(_id: string, config: VerificationConfig): Promise<boolean> {
    this.config = config;
    return true;
  }

  async getActionId(_userIdentifier: string, _data: string): Promise<string> {
    return 'random-id';
  }
}
