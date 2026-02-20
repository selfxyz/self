// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Generic mock for @tamagui/lucide-icons deep imports (e.g. /icons/Check).
// Uses a Proxy so any named export resolves to a lightweight mock component
// that renders with a predictable testID (e.g. icon-check, icon-chevron-down).

const toKebab = str =>
  str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

module.exports = new Proxy(
  { __esModule: true },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;

      const name = toKebab(prop);
      const Icon = props => ({
        $$typeof: Symbol.for('react.element'),
        type: `mock-icon-${name}`,
        props: { testID: `icon-${name}`, ...props },
        key: null,
        ref: null,
      });
      Icon.displayName = `MockIcon(${name})`;
      return Icon;
    },
  },
);
