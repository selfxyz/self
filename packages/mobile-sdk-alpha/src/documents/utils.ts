import { SelfClient } from '../types/public';

export const hasAnyValidRegisteredDocument = async (client: SelfClient): Promise<boolean> => {
  console.log("Checking if there are any valid registered documents");

  try {
    const catalog = await client.loadDocumentCatalog();

    return catalog.documents.some(doc => doc.isRegistered === true);
  } catch (error) {
    console.error('Error loading document catalog:', error);
    return false;
  }
}
