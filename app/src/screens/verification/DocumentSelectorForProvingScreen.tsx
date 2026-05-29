// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Text, View, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';
import {
  getDocumentAttributes,
  isDocumentValidForProving,
  isGoogleUsatProofRequest,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import {
  getPerksForIdType,
  type Perk,
  type PerkId,
} from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

import type { IDSelectorState } from '@/components/documents';
import { IDSelectorSheet, isDisabledState } from '@/components/documents';
import {
  getSecurityLevel,
  type SecurityLevel,
} from '@/components/homescreen/cardSecurityBadge';
import {
  BottomActionBar,
  ConnectedWalletBadge,
  DisclosureItem,
  ProofRequestCard,
  proofRequestColors,
  truncateAddress,
  WalletAddressModal,
} from '@/components/proof-request';
import { useSelfAppData } from '@/hooks/useSelfAppData';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useVerificationGateStore } from '@/stores/verificationGateStore';
import {
  getDocumentTypeName,
  idTypeForDocumentCategory,
} from '@/utils/documentUtils';
import {
  evaluateGoogleUsatEligibilityForDocument,
  evaluateGoogleUsatGateForDocument,
  type IneligibleReason,
} from '@/utils/googleUsatGate';

function getIneligibleReasonLabel(
  reason: IneligibleReason | undefined,
): string | undefined {
  switch (reason) {
    case 'needs_nfc':
      return 'Needs an NFC-enabled passport.';
    case 'unsupported_id_type':
      return "This ID type isn't supported for this perk.";
    default:
      return undefined;
  }
}

function getDocumentDisplayName(
  metadata: DocumentMetadata,
  documentData?: IDDocument,
): string {
  const category = metadata.documentCategory || '';
  const isMock = metadata.mock;

  // Extract country information from document data
  let countryCode: string | null = null;
  if (documentData) {
    try {
      const attributes = getDocumentAttributes(documentData);
      countryCode = attributes.nationalitySlice || null;
    } catch {
      // If we can't extract attributes, continue without country
    }
  }

  const mockPrefix = isMock ? 'Dev ' : '';

  if (category === 'passport') {
    const base = 'Passport';
    return countryCode
      ? `${mockPrefix}${countryCode} ${base}`
      : `${mockPrefix}${base}`;
  } else if (category === 'id_card') {
    const base = 'ID Card';
    return countryCode
      ? `${mockPrefix}${countryCode} ${base}`
      : `${mockPrefix}${base}`;
  } else if (category === 'aadhaar') {
    return isMock ? 'Dev Aadhaar ID' : 'Aadhaar ID';
  } else if (category === 'kyc') {
    const idLabel = metadata.idType || 'Verified ID';
    return isMock ? `Dev ${idLabel}` : idLabel;
  }

  return isMock ? `Dev ${metadata.documentType}` : metadata.documentType;
}

function getSecurityLabelForDocument(
  documentData: IDDocument | undefined,
  isMock: boolean,
): string | undefined {
  if (!documentData) {
    return undefined;
  }
  if (!isMRZDocument(documentData) && !isAadhaarDocument(documentData)) {
    return undefined;
  }
  const level: SecurityLevel = getSecurityLevel(documentData, { mock: isMock });
  return level;
}

function getNationalityCodeForDocument(
  documentData: IDDocument | undefined,
): string | undefined {
  if (!documentData) {
    return undefined;
  }
  try {
    const attributes = getDocumentAttributes(documentData);
    return attributes.nationalitySlice || undefined;
  } catch {
    return undefined;
  }
}

function determineDocumentState(
  metadata: DocumentMetadata,
  documentData: IDDocument | undefined,
): IDSelectorState {
  // Use SDK to check if document is valid (not expired)
  if (!isDocumentValidForProving(metadata, documentData)) {
    return 'expired';
  }

  // UI-specific state mapping: Mock documents are selectable but marked as developer/mock
  if (metadata.mock) {
    return 'mock';
  }

  // Both registered and non-registered real documents are valid for selection
  // They will be registered during the proving flow if needed
  return 'verified';
}

const DocumentSelectorForProvingScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'DocumentSelectorForProving'>>();
  const entryPoint = route.params?.entryPoint ?? 'qr_scan';
  const selfClient = useSelfClient();
  const { useSelfAppStore } = selfClient;
  const selfApp = useSelfAppStore(state => state.selfApp);
  const { loadDocumentCatalog, getAllDocuments, setSelectedDocument } =
    usePassport();
  // Extract SelfApp data using hook
  const { logoSource, url, formattedUserId, disclosureItems } =
    useSelfAppData(selfApp);

  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [allDocuments, setAllDocuments] = useState<
    Record<string, { data: IDDocument; metadata: DocumentMetadata }>
  >({});
  const [selectedDocumentId, setSelectedDocumentId] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollOffsetRef = useRef(0);

  const pickInitialDocument = useCallback(
    (
      catalog: DocumentCatalog,
      docs: Record<string, { data: IDDocument; metadata: DocumentMetadata }>,
    ) => {
      if (catalog.selectedDocumentId) {
        const selectedMeta = catalog.documents.find(
          doc => doc.id === catalog.selectedDocumentId,
        );
        const selectedData = selectedMeta
          ? docs[catalog.selectedDocumentId]
          : undefined;

        if (selectedMeta && selectedData) {
          const state = determineDocumentState(selectedMeta, selectedData.data);
          if (!isDisabledState(state)) {
            return catalog.selectedDocumentId;
          }
        } else if (selectedMeta) {
          return catalog.selectedDocumentId;
        }
      }

      const firstValid = catalog.documents.find(doc => {
        const docData = docs[doc.id];
        const state = determineDocumentState(doc, docData?.data);
        return !isDisabledState(state);
      });

      return firstValid?.id;
    },
    [],
  );

  const loadDocuments = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const catalog = await loadDocumentCatalog();
      const docs = await getAllDocuments();

      // Don't update state if this request was aborted
      if (controller.signal.aborted) {
        return;
      }

      setDocumentCatalog(catalog);
      setAllDocuments(docs);
      setSelectedDocumentId(pickInitialDocument(catalog, docs));
    } catch (loadError) {
      // Don't show error if this request was aborted
      if (controller.signal.aborted) {
        return;
      }
      console.warn('Failed to load documents:', loadError);
      setError('Unable to load documents.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [getAllDocuments, loadDocumentCatalog, pickInitialDocument]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments]),
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const activePerkId: PerkId | undefined = useMemo(() => {
    if (selfApp && isGoogleUsatProofRequest(selfApp)) {
      return 'google_cloud_faucet';
    }
    return undefined;
  }, [selfApp]);

  const { documents, perksByDocumentId, ineligibleReasonByDocumentId } =
    useMemo(() => {
      const perksMap: Record<string, Perk[]> = {};
      const ineligibleMap: Record<string, IneligibleReason> = {};
      const rows = documentCatalog.documents
        .map(metadata => {
          const docData = allDocuments[metadata.id];
          const baseState = determineDocumentState(metadata, docData?.data);

          // Perks rail is USAT-only for this slice. We only populate
          // perksByDocumentId when the active proof request is gated by
          // a known perk policy AND the document passes that gate.
          // Ineligible map is built only in that same scope.
          if (activePerkId && selfApp && docData) {
            const eligibility = evaluateGoogleUsatEligibilityForDocument(
              selfApp,
              docData,
            );
            if (!eligibility.eligible) {
              ineligibleMap[metadata.id] =
                eligibility.reason ?? 'unsupported_id_type';
            } else if (!metadata.mock) {
              const idTypeCode = idTypeForDocumentCategory(
                metadata.documentCategory,
              );
              const perks = idTypeCode ? getPerksForIdType(idTypeCode) : [];
              if (perks.length > 0) {
                perksMap[metadata.id] = perks;
              }
            }
          }

          const isSelected = metadata.id === selectedDocumentId;
          const isIneligible = !!ineligibleMap[metadata.id];
          const itemState: IDSelectorState =
            isSelected && !isDisabledState(baseState) && !isIneligible
              ? 'active'
              : baseState;

          return {
            id: metadata.id,
            name: getDocumentDisplayName(metadata, docData?.data),
            state: itemState,
            idType: metadata.documentCategory,
            nationalityCode: getNationalityCodeForDocument(docData?.data),
            isMock: !!metadata.mock,
            securityLabel: getSecurityLabelForDocument(
              docData?.data,
              !!metadata.mock,
            ),
          };
        })
        .sort((a, b) => {
          // Get metadata for both documents
          const metaA = documentCatalog.documents.find(d => d.id === a.id);
          const metaB = documentCatalog.documents.find(d => d.id === b.id);

          // Sort real documents before mock documents
          if (metaA && metaB) {
            if (metaA.mock !== metaB.mock) {
              return metaA.mock ? 1 : -1; // Real first
            }
          }

          // Within same type (real/mock), sort alphabetically by name
          return a.name.localeCompare(b.name);
        });

      return {
        documents: rows,
        perksByDocumentId: perksMap,
        ineligibleReasonByDocumentId: activePerkId ? ineligibleMap : undefined,
      };
    }, [
      allDocuments,
      documentCatalog.documents,
      selectedDocumentId,
      selfApp,
      activePerkId,
    ]);

  const activeDocumentPerks =
    selectedDocumentId && activePerkId
      ? perksByDocumentId[selectedDocumentId]
      : undefined;

  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);
  const selectedIneligibleReason = selectedDocument
    ? ineligibleReasonByDocumentId?.[selectedDocument.id]
    : undefined;
  const canContinue =
    !!selectedDocument &&
    !isDisabledState(selectedDocument.state) &&
    !selectedIneligibleReason;

  // Get document type for the proof request message
  const selectedDocumentType = useMemo(() => {
    // If we have a preloaded document type from route params, use it while loading
    const preloadedType = route.params?.documentType;
    if (loading && preloadedType) {
      return preloadedType;
    }

    if (!selectedDocumentId) return preloadedType || '';
    const metadata = documentCatalog.documents.find(
      d => d.id === selectedDocumentId,
    );
    return getDocumentTypeName(metadata?.documentCategory, metadata?.idType);
  }, [
    selectedDocumentId,
    documentCatalog.documents,
    loading,
    route.params?.documentType,
  ]);

  const handleSelect = useCallback((documentId: string) => {
    setSelectedDocumentId(documentId);
  }, []);

  const handleSheetSelect = useCallback(async () => {
    if (!selectedDocumentId || !canContinue || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (selfApp) {
        const gate = await evaluateGoogleUsatGateForDocument(
          selfClient,
          selfApp,
          selectedDocumentId,
        );
        if (gate === 'block') {
          selfClient.trackEvent(ProofEvents.GOOGLE_USAT_BLOCKED, {
            entry_point: entryPoint,
            reason: 'no_high_security_doc',
          });
          useVerificationGateStore.getState().open({
            reason: 'google_usat_high_security_required',
            entryPoint,
            requesterName: selfApp.appName,
          });
          setSheetOpen(false);
          return;
        }
      }
      await setSelectedDocument(selectedDocumentId);
      setSheetOpen(false); // Close the sheet first
      navigation.navigate('Prove', { scrollOffset: scrollOffsetRef.current });
    } catch (selectionError) {
      console.error('Failed to set selected document:', selectionError);
      setError('Failed to select document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedDocumentId,
    canContinue,
    submitting,
    setSelectedDocument,
    navigation,
    selfApp,
    selfClient,
    entryPoint,
  ]);

  const handleApprove = async () => {
    if (!selectedDocumentId || !canContinue || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (selfApp) {
        const gate = await evaluateGoogleUsatGateForDocument(
          selfClient,
          selfApp,
          selectedDocumentId,
        );
        if (gate === 'block') {
          selfClient.trackEvent(ProofEvents.GOOGLE_USAT_BLOCKED, {
            entry_point: entryPoint,
            reason: 'no_high_security_doc',
          });
          useVerificationGateStore.getState().open({
            reason: 'google_usat_high_security_required',
            entryPoint,
            requesterName: selfApp.appName,
          });
          return;
        }
      }
      await setSelectedDocument(selectedDocumentId);
      navigation.navigate('Prove', { scrollOffset: scrollOffsetRef.current });
    } catch (selectionError) {
      console.error('Failed to set selected document:', selectionError);
      setError('Failed to select document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  // Loading state
  if (loading) {
    return (
      <View
        flex={1}
        backgroundColor={proofRequestColors.white}
        alignItems="center"
        justifyContent="center"
        testID="document-selector-loading-container"
      >
        <ActivityIndicator color={black} size="large" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View
        flex={1}
        backgroundColor={proofRequestColors.white}
        alignItems="center"
        justifyContent="center"
        gap={16}
      >
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={proofRequestColors.slate500}
          textAlign="center"
          testID="document-selector-error"
        >
          {error}
        </Text>
        <View
          paddingHorizontal={24}
          paddingVertical={12}
          borderRadius={8}
          borderWidth={1}
          borderColor={proofRequestColors.slate200}
          onPress={loadDocuments}
          pressStyle={{ opacity: 0.7 }}
          testID="document-selector-retry"
        >
          <Text
            fontFamily={dinot}
            fontSize={16}
            color={proofRequestColors.slate500}
          >
            Retry
          </Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <View
        flex={1}
        backgroundColor={proofRequestColors.white}
        alignItems="center"
        justifyContent="center"
      >
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={proofRequestColors.slate500}
          textAlign="center"
          paddingHorizontal={40}
          testID="document-selector-empty"
        >
          No documents found. Please scan a document first.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {/* Main Content - Proof Request Card */}
      <ProofRequestCard
        logoSource={logoSource}
        appName={selfApp?.appName || 'Self'}
        appUrl={url}
        documentType={selectedDocumentType}
        connectedWalletBadge={
          formattedUserId ? (
            <ConnectedWalletBadge
              address={
                selfApp?.userIdType === 'hex'
                  ? truncateAddress(selfApp?.userId || '')
                  : formattedUserId
              }
              userIdType={selfApp?.userIdType}
              onToggle={() => setWalletModalOpen(true)}
              testID="document-selector-wallet-badge"
            />
          ) : undefined
        }
        onScroll={handleScroll}
        testID="document-selector-card"
      >
        {/* Disclosure Items */}
        <YStack marginTop={0}>
          {disclosureItems.map((item, index) => (
            <DisclosureItem
              key={item.key}
              text={item.text}
              verified={true}
              isLast={index === disclosureItems.length - 1}
              testID={`document-selector-disclosure-${item.key}`}
            />
          ))}
        </YStack>
      </ProofRequestCard>

      {/* Bottom Action Bar */}
      <BottomActionBar
        selectedDocumentName={selectedDocument?.name || 'Select ID'}
        selectedDocumentNationalityCode={selectedDocument?.nationalityCode}
        selectedDocumentIsMock={selectedDocument?.isMock}
        selectedDocumentSecurityLabel={selectedDocument?.securityLabel}
        onDocumentSelectorPress={() => setSheetOpen(true)}
        onApprovePress={handleApprove}
        approveDisabled={!canContinue}
        approving={submitting}
        perks={activeDocumentPerks}
        ineligible={!!selectedIneligibleReason}
        ineligibleReasonLabel={getIneligibleReasonLabel(
          selectedIneligibleReason,
        )}
        testID="document-selector-action-bar"
      />

      {/* ID Selector Sheet */}
      <IDSelectorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        documents={documents}
        selectedId={selectedDocumentId}
        onSelect={handleSelect}
        onDismiss={() => setSheetOpen(false)}
        onApprove={handleSheetSelect}
        activePerkId={activePerkId}
        perksByDocumentId={perksByDocumentId}
        ineligibleReasonByDocumentId={ineligibleReasonByDocumentId}
        testID="document-selector-sheet"
      />

      {/* Wallet Address Modal */}
      {formattedUserId && selfApp?.userId && (
        <WalletAddressModal
          visible={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
          address={selfApp.userId}
          userIdType={selfApp?.userIdType}
          testID="document-selector-wallet-modal"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: white,
  },
});

export { DocumentSelectorForProvingScreen };
