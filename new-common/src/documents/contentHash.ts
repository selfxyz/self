import type { IDDocument } from '../foundation/types/document.js';
import { createDocument } from './factory.js';

export function calculateContentHash(data: IDDocument): string {
  return createDocument(data).getContentHash();
}
