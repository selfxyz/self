// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

'use strict';

const { RuleTester } = require('eslint');
const rule = require('./handler-names');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
});

ruleTester.run('handler-names', rule, {
  valid: [
    {
      name: 'handleClose declaration is allowed',
      code: 'const handleClose = () => {};',
    },
    {
      name: 'handleBack declaration is allowed',
      code: 'const handleBack = () => {};',
    },
    {
      name: 'handleRetry declaration is allowed',
      code: 'const handleRetry = () => {};',
    },
    {
      name: 'handleContinue declaration is allowed',
      code: 'const handleContinue = () => {};',
    },
    {
      name: 'descriptive handleX (e.g. handleStartProving) is allowed',
      code: 'const handleStartProving = () => {};',
    },
    {
      // The ban applies to LOCAL declarations only. When a banned name
      // appears as a Euclid component's prop name, it's the prop's
      // identifier (not ours to rename) — the rule must not fire.
      name: 'banned name in Euclid prop position does not fire',
      code: 'const handleClose = () => {}; const el = <EuclidScreen onDismiss={handleClose} onCancel={handleClose} />;',
    },
    {
      name: 'banned name as an object property is not a declaration',
      code: 'const obj = { onDismiss: () => {}, onCancel: () => {} };',
    },
  ],
  invalid: [
    {
      name: 'local onDismiss declaration is banned',
      code: 'const onDismiss = () => {};',
      errors: [{ messageId: 'bannedHandler' }],
    },
    {
      name: 'local handleDismiss declaration is banned',
      code: 'const handleDismiss = () => {};',
      errors: [{ messageId: 'bannedHandler' }],
    },
    {
      name: 'local onCancel declaration is banned',
      code: 'const onCancel = () => {};',
      errors: [{ messageId: 'bannedHandler' }],
    },
    {
      name: 'local handleCancel declaration is banned',
      code: 'const handleCancel = () => {};',
      errors: [{ messageId: 'bannedHandler' }],
    },
    {
      name: 'local onEscape declaration is banned',
      code: 'const onEscape = () => {};',
      errors: [{ messageId: 'bannedHandler' }],
    },
    {
      name: 'function declaration with banned name is also banned',
      code: 'function onCancel() {}',
      errors: [{ messageId: 'bannedHandler' }],
    },
  ],
});

// eslint-disable-next-line no-console
console.log('handler-names rule tests: ok');
