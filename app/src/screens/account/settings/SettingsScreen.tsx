// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  Cloud,
  FileText,
  Heart,
  HelpCircle,
  Info,
  MessageCircle,
  Send,
  Settings2,
  Shield,
  SlidersHorizontal,
  X,
} from '@tamagui/lucide-icons';

import {
  type BottomSectionItem,
  type MenuSection,
  type MenuSectionItem,
  SettingsViewScreen,
} from '@selfxyz/euclid';

import {
  appStoreUrl,
  discordUrl,
  playStoreUrl,
  privacyUrl,
  selfUrl,
  supportFormUrl,
  termsUrl,
  xUrl,
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
  const IconWrapper = ({
    size = 24,
    color = '#000',
  }: {
    size?: number;
    color?: string;
  }) => <Icon size={size} color={color} />;
  IconWrapper.displayName = `IconWrapper(${Icon.displayName || Icon.name || 'Icon'})`;
  return IconWrapper;
};

const SettingsScreen: React.FC & {
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
        console.warn('SettingsScreen: invalid catalog structure');
        setHasRealDocument(false);
        return;
      }
      setHasRealDocument(catalog.documents.some(doc => !doc.mock));
    } catch {
      console.warn('SettingsScreen: failed to load document catalog');
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

  const handleOpenSupportForm = useCallback(() => {
    impactLight();
    Linking.openURL(supportFormUrl);
  }, []);

  const handleClose = useCallback(() => {
    impactLight();
    navigation.goBack();
  }, [navigation]);

  const hasConfirmedRealDocument = hasRealDocument === true;
  const showCloudBackup = Platform.OS !== 'android' || hasConfirmedRealDocument;

  // Feature cards (CTAs) - Backup enabled, Referrals, Push notifications
  const CTAs = useMemo<MenuSectionItem[]>(() => {
    const cards: MenuSectionItem[] = [];

    // Backup enabled card (only show if backup is enabled)
    if (cloudBackupEnabled && hasConfirmedRealDocument) {
      cards.push({
        icon: iconFor(Cloud),
        label: 'Backup enabled',
        description: 'Your account is safe.',
        onPress: () => handleNavigate('CloudBackupSettings'),
      });
    }

    // Referrals card
    cards.push({
      icon: iconFor(Heart),
      label: 'Referrals',
      description: 'Invite & earn Self Points.',
      onPress: () => handleNavigate('Referral'),
    });

    // Push notifications card (placeholder - can be enabled when notification settings exist)
    cards.push({
      icon: iconFor(Bell),
      label: 'Enable push notifications',
      description: 'Never miss an update from Self.',
      onPress: () => {
        // TODO: Navigate to notification settings when available
        impactLight();
      },
    });

    // Enable backup CTA (only show if backup is not enabled)
    if (!cloudBackupEnabled && showCloudBackup) {
      cards.push({
        icon: iconFor(Cloud),
        label: `Enable ${STORAGE_NAME} backup`,
        description: 'Secure your account with encrypted cloud backup.',
        onPress: () => handleNavigate('CloudBackupSettings'),
      });
    }

    return cards;
  }, [
    cloudBackupEnabled,
    handleNavigate,
    showCloudBackup,
    hasConfirmedRealDocument,
  ]);

  const sections = useMemo<MenuSection[]>(() => {
    // App settings section
    const appSettingsItems: MenuSectionItem[] = [];

    appSettingsItems.push({
      icon: iconFor(Settings2),
      label: 'Manage Documents',
      description: 'Recovery phrase, passport data.',
      onPress: () => handleNavigate('ManageDocuments'),
    });

    // Security item - combines recovery phrase and cloud backup
    const securitySubItems: string[] = [];
    if (hasConfirmedRealDocument) {
      securitySubItems.push('Recovery phrase');
    }
    if (showCloudBackup) {
      securitySubItems.push('Passport data');
    }
    const securityDescription =
      securitySubItems.length > 0
        ? securitySubItems.join(', ')
        : 'Recovery phrase, passport data.';

    appSettingsItems.push({
      icon: iconFor(Shield),
      label: 'Security',
      description: securityDescription,
      onPress: () => {
        // Navigate to recovery phrase if available, otherwise show security options
        if (hasConfirmedRealDocument) {
          handleNavigate('ShowRecoveryPhrase');
        } else if (showCloudBackup) {
          handleNavigate('CloudBackupSettings');
        }
      },
    });

    // Notifications item
    appSettingsItems.push({
      icon: iconFor(Bell),
      label: 'Notifications',
      description: 'Preferences, notification types.',
      onPress: () => {
        // TODO: Navigate to notification settings when available
        impactLight();
      },
    });

    // Proof settings item
    appSettingsItems.push({
      icon: iconFor(SlidersHorizontal),
      label: 'Proof settings',
      description: 'Control how proofs are shared and stored.',
      onPress: () => handleNavigate('ProofSettings'),
    });

    // Support & feedback section
    const supportItems: MenuSectionItem[] = [];

    supportItems.push({
      icon: iconFor(HelpCircle),
      label: 'Support',
      description: 'Help center & support.',
      onPress: () => handleOpenUrl(selfUrl),
    });

    supportItems.push({
      icon: iconFor(Send),
      label: 'Send feedback',
      description: 'Reach out to the Self team.',
      onPress: handleOpenSupportForm,
    });

    return [
      {
        title: 'App settings',
        items: appSettingsItems,
      },
      {
        title: 'Support & feedback',
        items: supportItems,
      },
    ];
  }, [
    handleNavigate,
    handleOpenUrl,
    handleOpenSupportForm,
    hasConfirmedRealDocument,
    showCloudBackup,
  ]);

  // Social links grid (2x2) - replaces connect buttons
  const connectButtons = useMemo(
    () =>
      [
        {
          variant: 'primary-stacked' as const,
          text: 'Follow on X',
          icon: iconFor(X),
          onPress: () => handleOpenUrl(xUrl),
        },
        {
          variant: 'secondary-stacked' as const,
          text: 'Send feedback',
          icon: iconFor(Send),
          onPress: handleOpenSupportForm,
        },
        {
          variant: 'secondary-stacked' as const,
          text: 'Join Discord',
          icon: iconFor(MessageCircle),
          onPress: () => handleOpenUrl(discordUrl),
        },
        {
          variant: 'secondary-stacked' as const,
          text: 'Visit the blog',
          icon: iconFor(FileText),
          onPress: () => handleOpenUrl(selfUrl),
        },
      ] as unknown as Parameters<
        typeof SettingsViewScreen
      >[0]['connectButtons'],
    [handleOpenUrl, handleOpenSupportForm],
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
      {
        label: 'Uninstalling this app will clear your history.',
        description:
          "You won't lose your points, but your proof history will reset.",
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
      connectHeading="CTA Label Placeholder"
      connectSubheading="This is a CTA description."
      connectButtons={connectButtons}
      bottomSectionItems={bottomSectionItems}
    />
  );
};

SettingsScreen.statusBarHidden = SettingsViewScreen.statusBar.hidden;
SettingsScreen.statusBarStyle = SettingsViewScreen.statusBar.style;

export default SettingsScreen;
