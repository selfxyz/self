// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';
import { createKeychainDocumentsStore } from './KeychainDocumentsStore';

export interface DocumentsStore {
  loadCatalog(): Promise<unknown>;
  saveCatalog(catalog: unknown): Promise<void>;
  loadById(id: string): Promise<unknown>;
  save(id: string, data: unknown): Promise<void>;
  delete(id: string): Promise<void>;
}

const inMemoryDefault = (): DocumentsStore => {
  const catalog: { value: unknown } = { value: null };
  const docs = new Map<string, unknown>();
  return {
    async loadCatalog() {
      return catalog.value;
    },
    async saveCatalog(value) {
      catalog.value = value;
    },
    async loadById(id) {
      return docs.get(id) ?? null;
    },
    async save(id, data) {
      docs.set(id, data);
    },
    async delete(id) {
      docs.delete(id);
    },
  };
};

let warnedInMemory = false;

function fallbackInMemory(): DocumentsStore {
  if (!warnedInMemory) {
    warnedInMemory = true;
    console.warn(
      '[SelfSDK] react-native-keychain is not installed; documents will be held ' +
        'in memory and lost on restart. Install react-native-keychain or pass a ' +
        'documents store to SelfVerification.',
    );
  }
  return inMemoryDefault();
}

export class DocumentsHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'documents';
  private readonly store: DocumentsStore;

  constructor(store?: DocumentsStore) {
    this.store = store ?? createKeychainDocumentsStore() ?? fallbackInMemory();
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'loadCatalog': {
        return await this.store.loadCatalog();
      }
      case 'saveCatalog': {
        await this.store.saveCatalog(params.catalog);
        return null;
      }
      case 'loadById': {
        const id = params.id as string | undefined;
        if (!id) {
          throw new BridgeHandlerError('MISSING_ID', 'id parameter required');
        }
        return await this.store.loadById(id);
      }
      case 'save': {
        const id = params.id as string | undefined;
        if (!id) {
          throw new BridgeHandlerError('MISSING_ID', 'id parameter required');
        }
        await this.store.save(id, params.data);
        return null;
      }
      case 'delete': {
        const id = params.id as string | undefined;
        if (!id) {
          throw new BridgeHandlerError('MISSING_ID', 'id parameter required');
        }
        await this.store.delete(id);
        return null;
      }
      default:
        throw new BridgeHandlerError(
          'METHOD_NOT_FOUND',
          `Unknown documents method: ${method}`,
        );
    }
  }
}
