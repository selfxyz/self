// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

'use strict';

const BANNED = new Set(['onDismiss', 'handleDismiss', 'onCancel', 'handleCancel', 'onEscape']);

const CANONICAL_HINT =
  'Use one of: `handleClose` (cluster-exit; body should call `useClusterClose()`), ' +
  '`handleBack` (walks back; body is `navigate(-1)` or `navigate(state.backPath ?? -1)`), ' +
  '`handleRetry` (re-attempt the current step in place), or ' +
  '`handleContinue` (advance forward; a more descriptive name is fine when the target is fixed, ' +
  'e.g. `handleStartProving`).';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow ad-hoc local handler names (onDismiss/handleDismiss/onCancel/handleCancel/onEscape) in screens. Rename the local declaration to one of the canonical four (handleClose, handleBack, handleRetry, handleContinue).',
      recommended: false,
      url: 'https://github.com/selfxyz/self/blob/main/packages/webview-app/AGENTS.md#handler-naming',
    },
    schema: [],
    messages: {
      bannedHandler:
        '`{{name}}` is a banned local handler name. {{hint}} Euclid prop names (e.g. `<EuclidFoo onDismiss={handleClose}>`) are unaffected — this rule targets LOCAL declarations only.',
    },
  },

  create(context) {
    function checkIdentifierName(node, name) {
      if (!BANNED.has(name)) return;
      context.report({
        node,
        messageId: 'bannedHandler',
        data: { name, hint: CANONICAL_HINT },
      });
    }

    return {
      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier') {
          checkIdentifierName(node.id, node.id.name);
        }
      },
      FunctionDeclaration(node) {
        if (node.id && node.id.type === 'Identifier') {
          checkIdentifierName(node.id, node.id.name);
        }
      },
    };
  },
};
