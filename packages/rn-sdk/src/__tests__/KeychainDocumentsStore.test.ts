// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { DocumentsHandler } from '../handlers/DocumentsHandler';
import { createKeychainDocumentsStore } from '../handlers/KeychainDocumentsStore';
import type { KeychainModule } from '../handlers/KeychainHandler';

function mockKeychain(): { module: KeychainModule; services: Map<string, { username: string; password: string }> } {
  const services = new Map<string, { username: string; password: string }>();
  const module: KeychainModule = {
    async getGenericPassword({ service }) {
      return services.get(service) ?? false;
    },
    async setGenericPassword(username, password, { service }) {
      services.set(service, { username, password });
      return true;
    },
    async resetGenericPassword({ service }) {
      return services.delete(service);
    },
  };
  return { module, services };
}

describe('createKeychainDocumentsStore', () => {
  it('round-trips the catalog and returns null when unset', async () => {
    const { module } = mockKeychain();
    const store = createKeychainDocumentsStore(module)!;

    expect(await store.loadCatalog()).toBeNull();

    const catalog = { documents: [{ id: 'abc', documentType: 'passport' }] };
    await store.saveCatalog(catalog);
    expect(await store.loadCatalog()).toEqual(catalog);
  });

  it('round-trips documents by id and deletes idempotently', async () => {
    const { module } = mockKeychain();
    const store = createKeychainDocumentsStore(module)!;

    expect(await store.loadById('abc')).toBeNull();

    const doc = { mrz: 'P<UTOERIKSSON<<ANNA<MARIA', mock: false };
    await store.save('abc', doc);
    expect(await store.loadById('abc')).toEqual(doc);

    await store.delete('abc');
    expect(await store.loadById('abc')).toBeNull();
    await expect(store.delete('abc')).resolves.toBeUndefined();
  });

  it('pins the keychain service names (renames lose user documents)', async () => {
    const { module, services } = mockKeychain();
    const store = createKeychainDocumentsStore(module)!;

    await store.saveCatalog({ documents: [] });
    await store.save('deadbeef', { mock: true });

    expect([...services.keys()]).toEqual(['self_docs_catalog', 'self_docs_doc_deadbeef']);
  });

  it('a document id cannot collide with the catalog service', async () => {
    const { module } = mockKeychain();
    const store = createKeychainDocumentsStore(module)!;

    await store.saveCatalog({ documents: [{ id: 'catalog' }] });
    await store.save('catalog', { mock: true });

    expect(await store.loadCatalog()).toEqual({ documents: [{ id: 'catalog' }] });
    expect(await store.loadById('catalog')).toEqual({ mock: true });
  });

  it('returns null for corrupted stored JSON', async () => {
    const { module, services } = mockKeychain();
    const store = createKeychainDocumentsStore(module)!;

    services.set('self_docs_catalog', { username: 'catalog', password: '{not json' });
    expect(await store.loadCatalog()).toBeNull();
  });

  it('returns null when react-native-keychain is unavailable', () => {
    // vitest cannot parse react-native-keychain's Flow syntax, so the lazy
    // require inside the factory throws and the factory must yield null.
    expect(createKeychainDocumentsStore()).toBeNull();
  });
});

describe('DocumentsHandler default store', () => {
  it('falls back to a working in-memory store when keychain is unavailable', async () => {
    const handler = new DocumentsHandler();
    await handler.handle('save', { id: 'x', data: { a: 1 } });
    expect(await handler.handle('loadById', { id: 'x' })).toEqual({ a: 1 });
  });
});
