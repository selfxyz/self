// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { StyleSheet } from 'react-native';

import {
  black,
  slate100,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export const aadhaarNameStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: slate500,
  },
  container: {
    flex: 1,
    backgroundColor: slate100,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: black,
    fontFamily: advercase,
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: slate500,
    fontFamily: dinot,
    lineHeight: 24,
    marginBottom: 32,
  },
  subtitleEmphasis: {
    fontSize: 17,
    color: black,
    fontWeight: '600',
    fontFamily: dinot,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: slate500,
    letterSpacing: 0.6,
    marginBottom: 16,
    fontFamily: dinot,
    textTransform: 'uppercase',
  },
  optionsList: {
    width: '100%',
  },
  nameOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    width: 250,
    justifyContent: 'flex-start',
  },
  nameOptionPressed: {
    backgroundColor: slate100,
  },
  nameLabel: {
    fontSize: 18,
    color: black,
    fontWeight: '500',
    fontFamily: dinot,
  },
  sectionWrapper: {
    width: '100%',
    marginBottom: 48,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: white,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});
