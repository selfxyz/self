// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { AppRegistry } = require('react-native');
const App = require('./App').default;
const appName = require('./app.json').name;

AppRegistry.registerComponent(appName, () => App);
