import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sdkMocks } from './mocks/sdk';

vi.mock('../src/providers/SelfClientProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

type ScreenContext = import('../src/screens').ScreenContext;

let latestContext: ScreenContext | null = null;
function createScreensModule() {
  const descriptors = [
    {
      id: 'generate',
      title: 'Generate Mock Document',
      subtitle: 'Create sample passport data for testing',
      sectionTitle: 'Main',
      status: 'working' as const,
      load: () => () => <div data-testid="screen-Generate Screen">Generate Screen</div>,
      getProps: ({ navigate, refreshDocuments }: ScreenContext) => ({
        onBack: () => navigate('home'),
        onNavigate: navigate,
        onDocumentStored: refreshDocuments,
      }),
    },
    {
      id: 'documents',
      title: 'Document List',
      subtitle: 'View and manage stored documents',
      sectionTitle: 'Main',
      status: 'working' as const,
      load: () => () => <div data-testid="screen-Documents Screen">Documents Screen</div>,
      getProps: ({ navigate, documentCatalog }: ScreenContext) => ({
        onBack: () => navigate('home'),
        catalog: documentCatalog,
      }),
    },
  ];

  const screenMap = descriptors.reduce<Record<string, any>>((acc, descriptor) => {
    acc[descriptor.id] = descriptor;
    return acc;
  }, {});

  const orderedSectionEntries = [{ title: 'Main', items: descriptors }];

  const HomeScreen = ({ screenContext }: { screenContext: ScreenContext }) => {
    latestContext = screenContext;
    return (
      <div>
        <h1>Self Demo App</h1>
        {orderedSectionEntries.map(section => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.items.map(descriptor => (
              <button
                key={descriptor.id}
                type="button"
                onClick={() => screenContext.navigate(descriptor.id as import('../src/screens').ScreenRoute)}
              >
                {descriptor.title}
              </button>
            ))}
          </section>
        ))}
      </div>
    );
  };

  return {
    __esModule: true as const,
    orderedSectionEntries,
    screenDescriptors: descriptors,
    screenMap,
    HomeScreen,
  };
}

vi.mock('../src/screens', () => {
  const moduleExports = createScreensModule();
  return moduleExports;
});

vi.mock('../src/screens/HomeScreen', () => ({
  __esModule: true,
  default: (props: { screenContext: ScreenContext }) => createScreensModule().HomeScreen(props),
}));

import App from '../App';

describe('App integration', () => {
  beforeEach(() => {
    latestContext = null;
  });

  it('fetches catalog and selected document on mount', async () => {
    const catalog = {
      documents: [{ id: 'doc-1', documentType: 'mock_passport' }],
      selectedDocumentId: 'doc-1',
    } as any;
    const selected = {
      metadata: { id: 'doc-1', documentType: 'mock_passport' },
      data: { id: 'doc-1' },
    } as any;

    sdkMocks.selfClient.loadDocumentCatalog.mockResolvedValueOnce(catalog);
    sdkMocks.loadSelectedDocumentMock.mockResolvedValueOnce(selected);

    render(<App />);

    await waitFor(() => {
      expect(sdkMocks.selfClient.loadDocumentCatalog).toHaveBeenCalled();
      expect(sdkMocks.loadSelectedDocumentMock).toHaveBeenCalled();
      expect(latestContext).not.toBeNull();
    });

    expect(screen.getByText(/Self Demo App/i)).toBeInTheDocument();
    expect(latestContext?.documentCatalog).toEqual(catalog);
    expect(latestContext?.selectedDocument).toEqual(selected);
  });

  it('navigates into descriptor screens from the home menu', async () => {
    sdkMocks.selfClient.loadDocumentCatalog.mockResolvedValueOnce({ documents: [] });
    sdkMocks.loadSelectedDocumentMock.mockResolvedValueOnce(null);

    render(<App />);

    await screen.findByText(/Self Demo App/i);

    await userEvent.click(screen.getByRole('button', { name: /document list/i }));

    expect(await screen.findByTestId('screen-Documents Screen')).toHaveTextContent('Documents Screen');

    await act(async () => {
      latestContext?.navigate('home');
    });

    await screen.findByText(/Self Demo App/i);
    await userEvent.click(screen.getByRole('button', { name: /generate mock document/i }));

    expect(await screen.findByTestId('screen-Generate Screen')).toHaveTextContent('Generate Screen');
  });

  it('resets catalog and selection when refresh fails', async () => {
    const catalog = {
      documents: [{ id: 'doc-2', documentType: 'mock_passport' }],
      selectedDocumentId: 'doc-2',
    } as any;
    const selected = {
      metadata: { id: 'doc-2', documentType: 'mock_passport' },
      data: { id: 'doc-2' },
    } as any;

    sdkMocks.selfClient.loadDocumentCatalog
      .mockResolvedValueOnce(catalog)
      .mockRejectedValueOnce(new Error('no catalog'));
    sdkMocks.loadSelectedDocumentMock.mockResolvedValueOnce(selected).mockRejectedValueOnce(new Error('no selection'));

    render(<App />);

    await waitFor(() => expect(latestContext?.selectedDocument).toEqual(selected));

    await act(async () => {
      await latestContext?.refreshDocuments();
    });

    await waitFor(() => {
      expect(latestContext?.documentCatalog.documents).toEqual([]);
      expect(latestContext?.selectedDocument).toBeNull();
    });
  });
});
