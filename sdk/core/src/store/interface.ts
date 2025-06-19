import { VerificationConfig } from "../types/types.js";

export interface IConfigStorage {
  /**
   * Get the verification config for a given id
   * @param id - An identifiier associated with the verification config
   * @returns The verification config
   */
  getConfig(id: string): Promise<VerificationConfig>;
  /**
   * Set the verification config for a given id
   * @param id - An identifiier associated with the verification config
   * @param config - The verification config
   * @returns True if the config was set successfully, false otherwise
   */
  setConfig(id: string, config: VerificationConfig): Promise<boolean>;
  /**
   * Get the action id for given user defined data passed in the frontend
   * @param data - The user defined data passed in the frontend
   * @returns The action id
   */
  getActionId(userIdentifier: string, data: string): Promise<string>;
}
