// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const makeDirectory = uri => ({
  uri,
  exists: true,
  create: () => {},
  delete: () => {},
});

class Paths {
  static get bundle() {
    return makeDirectory('file:///test-bundle/');
  }
  static get document() {
    return makeDirectory('file:///test-documents/');
  }
  static get cache() {
    return makeDirectory('file:///test-cache/');
  }
  static join(...parts) {
    return parts.join('/');
  }
  static dirname(uri) {
    return uri.slice(0, uri.lastIndexOf('/'));
  }
  static basename(uri) {
    return uri.slice(uri.lastIndexOf('/') + 1);
  }
  static extname(uri) {
    const base = uri.slice(uri.lastIndexOf('/') + 1);
    const dot = base.lastIndexOf('.');
    return dot === -1 ? '' : base.slice(dot);
  }
}

class File {
  constructor(...uris) {
    this.uri = uris
      .map(u => (typeof u === 'string' ? u : (u?.uri ?? '')))
      .join('/');
    this.exists = false;
  }
  create() {}
  delete() {}
  text() {
    return '';
  }
  write() {}
}

class Directory {
  constructor(...uris) {
    this.uri = uris
      .map(u => (typeof u === 'string' ? u : (u?.uri ?? '')))
      .join('/');
    this.exists = false;
  }
  create() {}
  delete() {}
  list() {
    return [];
  }
}

module.exports = { Paths, File, Directory };
