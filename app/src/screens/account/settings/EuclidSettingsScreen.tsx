// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  type BottomSectionItem,
  type MenuSection,
  type MenuSectionItem,
  SettingsViewScreen,
} from '@selfxyz/euclid';
import {
  Cloud,
  FileText,
  HelpCircle,
  Info,
  MessageCircle,
  Settings2,
  Shield,
  SlidersHorizontal,
  X,
} from '@tamagui/lucide-icons';

import {
  appStoreUrl,
  discordUrl,
  playStoreUrl,
  privacyUrl,
  selfUrl,
  termsUrl,
} from '@/consts/links';
import { impactLight } from '@/integrations/haptics';
import { usePassport } from '@/providers/passportDataProvider';
import { STORAGE_NAME } from '@/services/cloud-backup';
import { useSettingStore } from '@/stores/settingStore';

import { version } from '../../../../package.json';

// Avoid importing RootStackParamList to prevent type cycles; use minimal typing
type MinimalRootStackParamList = Record<string, object | undefined>;

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const storeURL = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;

const iconFor = (Icon: IconComponent) => {
  return ({ size, color }: { size: number; color: string }) => (
    <Icon size={size} color={color} />
  );
};

const EuclidSettingsScreen: React.FC & {
  statusBarStyle: string;
  statusBarHidden: boolean;
} = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MinimalRootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { cloudBackupEnabled } = useSettingStore();
  const { loadDocumentCatalog } = usePassport();
  const [hasRealDocument, setHasRealDocument] = useState<boolean | null>(null);

  const refreshDocumentAvailability = useCallback(async () => {
    try {
      const catalog = await loadDocumentCatalog();
      if (!catalog?.documents || !Array.isArray(catalog.documents)) {
        console.warn('EuclidSettingsScreen: invalid catalog structure');
        setHasRealDocument(false);
        return;
      }
      setHasRealDocument(catalog.documents.some(doc => !doc.mock));
    } catch {
      console.warn('EuclidSettingsScreen: failed to load document catalog');
      setHasRealDocument(false);
    }
  }, [loadDocumentCatalog]);

  useFocusEffect(
    useCallback(() => {
      refreshDocumentAvailability();
    }, [refreshDocumentAvailability]),
  );

  const handleNavigate = useCallback(
    (routeName: string) => {
      impactLight();
      navigation.navigate(routeName as never);
    },
    [navigation],
  );

  const handleOpenUrl = useCallback((url: string) => {
    impactLight();
    Linking.openURL(url);
  }, []);

  const handleClose = useCallback(() => {
    impactLight();
    navigation.goBack();
  }, [navigation]);

  const hasConfirmedRealDocument = hasRealDocument === true;
  const showCloudBackup = Platform.OS !== 'android' || hasConfirmedRealDocument;

  const CTAs = useMemo<MenuSectionItem[]>(() => {
    if (!showCloudBackup || cloudBackupEnabled) {
      return [];
    }

    return [
      {
        icon: iconFor(Cloud),
        label: `Enable ${STORAGE_NAME} backup`,
        description: 'Secure your account with encrypted cloud backup.',
        onPress: () => handleNavigate('CloudBackupSettings'),
      },
    ];
  }, [cloudBackupEnabled, handleNavigate, showCloudBackup]);

  const sections = useMemo<MenuSection[]>(() => {
    const securityItems: MenuSectionItem[] = [];

    if (hasConfirmedRealDocument) {
      securityItems.push({
        icon: iconFor(Shield),
        label: 'Recovery phrase',
        description: 'View and copy your secret recovery phrase.',
        onPress: () => handleNavigate('ShowRecoveryPhrase'),
      });
    }

    if (showCloudBackup) {
      securityItems.push({
        icon: iconFor(Cloud),
        label: 'Cloud backup',
        description: `Manage your ${STORAGE_NAME} backup settings.`,
        onPress: () => handleNavigate('CloudBackupSettings'),
      });
    }

    securityItems.push({
      icon: iconFor(SlidersHorizontal),
      label: 'Proof settings',
      description: 'Control how proofs are shared and stored.',
      onPress: () => handleNavigate('ProofSettings'),
    });

    const documentsItems: MenuSectionItem[] = [];

    if (hasConfirmedRealDocument) {
      documentsItems.push({
        icon: iconFor(FileText),
        label: 'Document info',
        description: 'Review your verified document metadata.',
        onPress: () => handleNavigate('DocumentDataInfo'),
      });
    }

    documentsItems.push({
      icon: iconFor(Settings2),
      label: 'Manage documents',
      description: 'Add, remove, or edit your ID documents.',
      onPress: () => handleNavigate('ManageDocuments'),
    });

    return [
      {
        title: 'Security',
        items: securityItems,
      },
      {
        title: 'Documents',
        items: documentsItems,
      },
    ];
  }, [handleNavigate, hasConfirmedRealDocument, showCloudBackup]);

  const connectButtons = useMemo(
    () => [
      {
        variant: 'primary-stacked',
        text: 'Support',
        icon: iconFor(HelpCircle),
        onPress: () => handleOpenUrl(selfUrl),
      },
      {
        variant: 'secondary-stacked',
        text: 'Community',
        icon: iconFor(MessageCircle),
        onPress: () => handleOpenUrl(discordUrl),
      },
    ],
    [handleOpenUrl],
  );

  const bottomSectionItems = useMemo<BottomSectionItem[]>(
    () => [
      {
        label: 'Version',
        description: `v${version}`,
      },
      {
        label: 'Rate the app',
        description: 'Leave us a review in the store.',
        onPress: () => handleOpenUrl(storeURL),
      },
      {
        label: 'Terms of service',
        onPress: () => handleOpenUrl(termsUrl),
      },
      {
        label: 'Privacy policy',
        onPress: () => handleOpenUrl(privacyUrl),
      },
    ],
    [handleOpenUrl],
  );

  return (
    <SettingsViewScreen
      insets={insets}
      escapeIcon={iconFor(X)}
      infoIcon={iconFor(Info)}
      onClose={handleClose}
      showBackupInfoBox={hasConfirmedRealDocument}
      isBackupEnabled={cloudBackupEnabled}
      CTAs={CTAs}
      sections={sections}
      connectHeading="Connect"
      connectSubheading="Get help or join the community."
      connectButtons={connectButtons}
      bottomSectionItems={bottomSectionItems}
    />
  );
};

EuclidSettingsScreen.statusBarHidden = SettingsViewScreen.statusBar.hidden;
EuclidSettingsScreen.statusBarStyle = SettingsViewScreen.statusBar.style;

export default EuclidSettingsScreen;
