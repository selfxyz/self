// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';

import { impactLight } from '@/integrations/haptics';
import { openSupportForm } from '@/services/support';

/**
 * Hook wrapper around openSupportForm that adds haptic feedback.
 * Use this inside screen components. For code outside the navigation tree
 * (providers, modals rendered at root), call openSupportForm() directly.
 */
const useOpenSupportForm = () =>
  useCallback(() => {
    impactLight();
    openSupportForm();
  }, []);

export default useOpenSupportForm;
