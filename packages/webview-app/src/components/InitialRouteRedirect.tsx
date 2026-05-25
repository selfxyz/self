// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Navigate, useLocation } from 'react-router-dom';

export const InitialRouteRedirect: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (params.has('disclosures') || params.has('proofItems')) {
    return <Navigate to={{ pathname: '/proving', search: location.search }} replace />;
  }
  return <Navigate to="/" replace />;
};
