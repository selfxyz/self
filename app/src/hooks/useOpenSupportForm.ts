// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { supportFormUrl } from '@/consts/links';
import useHapticNavigation from '@/hooks/useHapticNavigation';

const useOpenSupportForm = () =>
  useHapticNavigation('WebView', {
    params: { url: supportFormUrl, title: 'Get Support' },
  });

export default useOpenSupportForm;
