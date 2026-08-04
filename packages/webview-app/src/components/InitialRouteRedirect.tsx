// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Navigate, useLocation } from 'react-router-dom';

// Extension custody gate: the host boots index.html with ext_route when the
// vault is uninitialized or locked, so the app opens on that screen.
const EXT_ROUTES: Record<string, string> = {
  link: '/ext/link',
  unlock: '/ext/unlock',
};

export const InitialRouteRedirect: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const extRoute = params.get('ext_route');
  if (extRoute && EXT_ROUTES[extRoute]) {
    return <Navigate to={{ pathname: EXT_ROUTES[extRoute], search: location.search }} replace />;
  }
  if (params.has('disclosures') || params.has('proofItems')) {
    return <Navigate to={{ pathname: '/disclose/request', search: location.search }} replace />;
  }
  return <Navigate to="/" replace />;
};
