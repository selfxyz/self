import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import HomeScreen from '../../src/screens/HomeScreen';
import type { ScreenContext } from '../../src/screens';
import { orderedSectionEntries } from '../../src/screens';

describe('HomeScreen', () => {
  const createContext = (): ScreenContext => ({
    navigate: vi.fn(),
    goHome: vi.fn(),
    documentCatalog: { documents: [] },
    selectedDocument: null,
    refreshDocuments: vi.fn(async () => undefined),
  });

  it('renders sections and menu items from the screen descriptors', () => {
    const context = createContext();
    render(<HomeScreen screenContext={context} />);

    orderedSectionEntries.forEach(section => {
      expect(screen.getByText(section.title)).toBeInTheDocument();
      section.items.forEach(item => {
        const buttons = screen.getAllByRole('button', {
          name: new RegExp(item.title, 'i'),
        });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  it('navigates to the selected descriptor when a menu item is pressed', async () => {
    const context = createContext();
    render(<HomeScreen screenContext={context} />);

    await userEvent.click(screen.getByRole('button', { name: /document list/i }));
    expect(context.navigate).toHaveBeenCalledWith('documents');

    await userEvent.click(screen.getByRole('button', { name: /generate mock document/i }));
    expect(context.navigate).toHaveBeenCalledWith('generate');
  });
});
