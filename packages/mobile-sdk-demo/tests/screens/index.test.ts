import { describe, expect, it, vi } from 'vitest';

import type { ScreenContext } from '../../src/screens';
import { orderedSectionEntries, screenDescriptors, screenMap } from '../../src/screens';

describe('screen descriptor index', () => {
  const createContext = (): ScreenContext => ({
    navigate: vi.fn(),
    goHome: vi.fn(),
    documentCatalog: { documents: [] },
    selectedDocument: null,
    refreshDocuments: vi.fn(async () => undefined),
  });

  it('exposes each descriptor via the screenMap', () => {
    screenDescriptors.forEach(descriptor => {
      expect(screenMap[descriptor.id]).toBe(descriptor);
    });
  });

  it('groups descriptors into ordered sections', () => {
    const flattenedFromSections = orderedSectionEntries.flatMap(section => {
      section.items.forEach(item => {
        expect(item.sectionTitle).toBe(section.title);
      });
      return section.items.map(item => item.id);
    });

    const descriptorOrder = screenDescriptors.map(descriptor => descriptor.id);
    expect(flattenedFromSections).toEqual(descriptorOrder);
  });

  it('builds props that respect the provided screen context', async () => {
    const context = createContext();

    const generateProps = screenMap.generate.getProps?.(context) as any;
    expect(generateProps).toMatchObject({ onDocumentStored: context.refreshDocuments });
    await generateProps?.onNavigate?.('documents');
    expect(context.navigate).toHaveBeenCalledWith('documents');
    generateProps?.onBack?.();
    expect(context.navigate).toHaveBeenCalledWith('home');

    const registerProps = screenMap.register.getProps?.(context) as any;
    registerProps?.onSuccess?.();
    expect(context.refreshDocuments).toHaveBeenCalled();

    const documentsProps = screenMap.documents.getProps?.(context) as any;
    expect(documentsProps).toMatchObject({ catalog: context.documentCatalog });
    documentsProps?.onBack?.();
    expect(context.navigate).toHaveBeenCalledWith('home');
  });
});
