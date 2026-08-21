// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory } from '@selfxyz/common/types';
import {
  isUserRegistered,
  isUserRegisteredWithAlternativeCSCA,
} from '@selfxyz/common/utils/passports/validate';
import type { IDDocument } from '@selfxyz/common/utils/types';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  fetchAllTreesAndCircuits,
  getCommitmentTree,
} from '@selfxyz/mobile-sdk-alpha/stores';

import { getAlternativeCSCA } from '@/proving/alternativeCSCA';

type Environment = 'prod' | 'stg';

export interface RestoredDocumentRegistration {
  isRegistered: boolean;
  csca: string | null;
}

/**
 * Raised when the protocol data required to answer "is this document registered?"
 * could not be obtained. The commitment tree is the only universally required
 * input, so this always means the tree is missing — never that the document is
 * unregistered. Callers must offer a retry rather than telling the user their
 * document or recovery phrase is wrong.
 */
export class ProtocolDataUnavailableError extends Error {
  readonly documentCategory: DocumentCategory;

  constructor(
    documentCategory: DocumentCategory,
    options?: { cause?: unknown },
  ) {
    super(`Protocol data for ${documentCategory} documents is unavailable`);
    this.name = 'ProtocolDataUnavailableError';
    this.documentCategory = documentCategory;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * `LeanIMT.import` requires the serialized tree as a string, and the endpoint
 * returns it that way today, but the store types the field `any`. Serialize a
 * structured value rather than rejecting it as missing — a schema change should
 * not surface to the user as "check your connection".
 */
function serializeCommitmentTree(tree: unknown): string | null {
  if (typeof tree === 'string') {
    return tree.length > 0 ? tree : null;
  }
  if (tree !== null && typeof tree === 'object') {
    return JSON.stringify(tree);
  }
  return null;
}

/**
 * Of the seven fetchers behind passport/id_card `fetch_all`, only
 * `fetch_alternative_csca` consumes the authority key identifier. Without one
 * there is nothing to look up at `/ski-pems/`, so fetch just the commitment tree
 * and let the caller fall back to the document's own stored keys.
 */
async function fetchProtocolData(
  selfClient: SelfClient,
  document: IDDocument,
  documentCategory: DocumentCategory,
  environment: Environment,
): Promise<void> {
  const protocolState = selfClient.getProtocolState();

  if (documentCategory === 'passport' || documentCategory === 'id_card') {
    const authorityKeyIdentifier = document.dsc_parsed?.authorityKeyIdentifier;
    if (authorityKeyIdentifier) {
      await fetchAllTreesAndCircuits(
        selfClient,
        documentCategory,
        environment,
        authorityKeyIdentifier,
      );
      return;
    }
    await protocolState[documentCategory].fetch_identity_tree(environment);
    return;
  }

  // Unlike passport/id_card, these reject instead of resolving with null fields.
  try {
    await protocolState[documentCategory].fetch_all(environment);
  } catch (error) {
    throw new ProtocolDataUnavailableError(documentCategory, { cause: error });
  }
}

/**
 * Answers whether a document recovered from a backup is registered onchain,
 * fetching the protocol data the check depends on first.
 *
 * The screens that restore an account used to read `commitment_tree` and
 * `alternative_csca` straight out of the protocol store without ever fetching
 * them. Nothing else warms the store on those paths, so both were null and the
 * check either threw or reported a registered document as unregistered.
 *
 * @returns `csca` is the alternative CSCA that matched, or null when the
 * document's own stored keys were sufficient — callers should only re-store the
 * document when it is non-null.
 * @throws ProtocolDataUnavailableError when the commitment tree is unavailable.
 */
export async function checkRestoredDocumentRegistration(
  selfClient: SelfClient,
  document: IDDocument,
  secret: string,
): Promise<RestoredDocumentRegistration> {
  const documentCategory = document.documentCategory;
  const environment: Environment = document.mock ? 'stg' : 'prod';
  const { useProtocolStore } = selfClient;

  await fetchProtocolData(selfClient, document, documentCategory, environment);

  const readCommitmentTree = (category: DocumentCategory) => {
    const serialized = serializeCommitmentTree(
      getCommitmentTree(selfClient, category),
    );
    if (!serialized) {
      throw new ProtocolDataUnavailableError(category);
    }
    return serialized;
  };
  const readAlternativeCSCA = (category: DocumentCategory) =>
    getAlternativeCSCA(useProtocolStore, category);

  // passport/id_card fetchers swallow their errors and null the field, so a
  // resolved fetch is not proof the tree arrived. Check before running any
  // commitment maths so a missing tree can never read as "not registered".
  readCommitmentTree(documentCategory);

  const isMrzDocument =
    documentCategory === 'passport' || documentCategory === 'id_card';

  // Aadhaar and KYC seed their own key material inside the validator, so they
  // run the check even when the store holds no public keys. For passport and
  // id_card an empty map yields an empty commitment list, which would report a
  // registered document as unregistered.
  const hasAlternativeCSCA =
    Object.keys(readAlternativeCSCA(documentCategory)).length > 0;

  if (!isMrzDocument || hasAlternativeCSCA) {
    const { isRegistered, csca } = await isUserRegisteredWithAlternativeCSCA(
      document,
      secret,
      {
        getCommitmentTree: readCommitmentTree,
        getAltCSCA: readAlternativeCSCA,
      },
    );
    if (isRegistered) {
      return { isRegistered: true, csca: csca ?? null };
    }
  }

  // Falls back to the commitment built from the document's own DSC and CSCA,
  // which covers a stale or incomplete `/ski-pems/` response.
  if (isMrzDocument) {
    const isRegistered = await isUserRegistered(
      document,
      secret,
      readCommitmentTree,
    );
    return { isRegistered, csca: null };
  }

  return { isRegistered: false, csca: null };
}
