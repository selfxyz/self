// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { fireEvent, render } from '@testing-library/react-native';

import type { IDSelectorDocument } from '@/components/documents';
import { IDSelectorItem, IDSelectorSheet } from '@/components/documents';

describe('IDSelectorItem', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <IDSelectorItem
        documentName="EU ID"
        state="active"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );

    expect(getByTestId('test-item')).toBeTruthy();
  });

  it('calls onPress when pressed on active state', () => {
    const { getByTestId } = render(
      <IDSelectorItem
        documentName="EU ID"
        state="active"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );

    fireEvent.press(getByTestId('test-item'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when pressed on verified state', () => {
    const { getByTestId } = render(
      <IDSelectorItem
        documentName="FRA Passport"
        state="verified"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );

    fireEvent.press(getByTestId('test-item'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders different states correctly', () => {
    // Render active state
    const { rerender, getByTestId } = render(
      <IDSelectorItem
        documentName="EU ID"
        state="active"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(getByTestId('test-item')).toBeTruthy();

    // Rerender with verified state
    rerender(
      <IDSelectorItem
        documentName="FRA Passport"
        state="verified"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(getByTestId('test-item')).toBeTruthy();

    // Rerender with expired state
    rerender(
      <IDSelectorItem
        documentName="Aadhaar ID"
        state="expired"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(getByTestId('test-item')).toBeTruthy();

    // Rerender with mock state
    rerender(
      <IDSelectorItem
        documentName="Dev USA Passport"
        state="mock"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(getByTestId('test-item')).toBeTruthy();
  });
});

describe('IDSelectorSheet', () => {
  const mockDocuments: IDSelectorDocument[] = [
    { id: 'doc1', name: 'EU ID', state: 'verified' },
    { id: 'doc2', name: 'FRA Passport', state: 'verified' },
    { id: 'doc3', name: 'Dev USA Passport', state: 'mock' },
    { id: 'doc4', name: 'Aadhaar ID', state: 'expired' },
  ];

  const mockOnOpenChange = jest.fn();
  const mockOnSelect = jest.fn();
  const mockOnDismiss = jest.fn();
  const mockOnApprove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders document items with testIDs', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    // Document items use Pressable which properly passes testID
    expect(getByTestId('sheet-item-doc1')).toBeTruthy();
    expect(getByTestId('sheet-item-doc2')).toBeTruthy();
    expect(getByTestId('sheet-item-doc3')).toBeTruthy();
    expect(getByTestId('sheet-item-doc4')).toBeTruthy();
  });

  it('calls onSelect when a document item is pressed', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    // Press doc2 item
    fireEvent.press(getByTestId('sheet-item-doc2'));
    expect(mockOnSelect).toHaveBeenCalledWith('doc2');
  });

  it('renders empty list without document items', () => {
    const { queryByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={[]}
        selectedId={undefined}
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    expect(queryByTestId('sheet-item-doc1')).toBeNull();
    expect(queryByTestId('sheet-item-doc2')).toBeNull();
  });

  it('shows selected document as active', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    // The selected item should have the check icon (indicating active state)
    expect(getByTestId('icon-check')).toBeTruthy();
  });

  it('calls onSelect with different document IDs', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    // Press each item and verify the correct ID is passed
    fireEvent.press(getByTestId('sheet-item-doc1'));
    expect(mockOnSelect).toHaveBeenLastCalledWith('doc1');

    fireEvent.press(getByTestId('sheet-item-doc2'));
    expect(mockOnSelect).toHaveBeenLastCalledWith('doc2');

    fireEvent.press(getByTestId('sheet-item-doc3'));
    expect(mockOnSelect).toHaveBeenLastCalledWith('doc3');

    fireEvent.press(getByTestId('sheet-item-doc4'));
    expect(mockOnSelect).toHaveBeenLastCalledWith('doc4');
  });
});
