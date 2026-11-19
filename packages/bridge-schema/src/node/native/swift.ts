// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { GeneratedFile } from '../generate';
import type {
  ContractModel,
  EnumModel,
  FileModel,
  StructModel,
  TypeRef,
} from './model';
import {
  FILE_HEADER,
  joinFile,
  LINE_WIDTH,
  type NativeConstants,
  PROTOCOL_FILE,
  requireDistinct,
  STORAGE_POLICY_FILE,
  wordsOf,
  wrap,
} from './text';

export interface SwiftOptions {
  /** The directory of the generated files, relative to the output root. */
  readonly dir: string;
}

const KEYWORDS = new Set(
  'associatedtype break case catch class continue default defer deinit do else enum extension fallthrough false fileprivate for func guard if import in init inout internal is let nil operator private protocol public repeat rethrows return self static struct subscript super switch throw throws true try typealias var where while'.split(
    ' ',
  ),
);

const INDENT = '    ';

function identifier(name: string): string {
  return KEYWORDS.has(name) ? `\`${name}\`` : name;
}

/**
 * The case name of a wire value. `none` is not used: on an optional, `.none` reads as "no value",
 * so a missing protection class would compare equal to the class `none`.
 */
export function swiftCaseName(value: string): string {
  const [first, ...rest] = wordsOf(value);
  const name = [first, ...rest.map(w => w[0].toUpperCase() + w.slice(1))].join(
    '',
  );
  return name === 'none' ? 'noneValue' : identifier(name);
}

function literal(text: string): string {
  return `"${text.replace(/[\\"]/g, character => `\\${character}`)}"`;
}

function doc(text: string | undefined, indent: string): string[] {
  return text === undefined
    ? []
    : wrap(text, LINE_WIDTH - indent.length - 4).map(l => `${indent}/// ${l}`);
}

function typeOf(type: TypeRef): string {
  switch (type.kind) {
    case 'string':
      return 'String';
    case 'integer':
      return 'Int';
    case 'number':
      return 'Double';
    case 'boolean':
      return 'Bool';
    case 'json':
      return 'JSONValue';
    case 'jsonObject':
      return '[String: JSONValue]';
    case 'named':
      return type.name;
    case 'list':
      return `[${typeOf(type.item)}]`;
    case 'map':
      return `[String: ${typeOf(type.value)}${type.valueNullable ? '?' : ''}]`;
  }
}

function emitEnum(model: EnumModel): string[] {
  const names = model.values.map(swiftCaseName);
  requireDistinct(model.name, names);
  return [
    ...doc(model.doc, ''),
    `enum ${model.name}: String, CaseIterable, Sendable {`,
    ...model.values.map(
      (value, index) =>
        // A raw value equal to the case name is the default. swiftlint reports it when written.
        `${INDENT}case ${names[index]}${names[index] === value ? '' : ` = ${literal(value)}`}`,
    ),
    '}',
  ];
}

function emitStruct(model: StructModel): string[] {
  return [
    ...doc(model.doc, ''),
    `struct ${model.name}: Equatable, Sendable {`,
    ...model.fields.flatMap(field => [
      ...doc(field.doc, INDENT),
      `${INDENT}var ${identifier(field.name)}: ${typeOf(field.type)}${field.nullable ? '?' : ''}${field.required ? '' : ' = nil'}`,
    ]),
    '}',
  ];
}

function emitReasonLists(model: ContractModel): string[] {
  return [
    `extension ${model.errorCodeEnum} {`,
    `${INDENT}/// The \`details.reason\` values this code allows. Empty when the code takes no reason.`,
    `${INDENT}var allowedReasons: [String] {`,
    `${INDENT}${INDENT}switch self {`,
    ...model.reasonLists.flatMap(list => [
      `${INDENT}${INDENT}case .${swiftCaseName(list.code)}:`,
      `${INDENT}${INDENT}${INDENT}return ${list.enumName}.allCases.map(\\.rawValue)`,
    ]),
    `${INDENT}${INDENT}default:`,
    `${INDENT}${INDENT}${INDENT}return []`,
    `${INDENT}${INDENT}}`,
    `${INDENT}}`,
    '}',
  ];
}

function emitProtocol(constants: NativeConstants): string[] {
  return [
    ...doc(
      'The protocol version this library implements (BC 5.1). `major` is the `version` of every message.',
      '',
    ),
    'enum BridgeProtocol {',
    `${INDENT}static let major = ${constants.protocolVersion.major}`,
    `${INDENT}static let minor = ${constants.protocolVersion.minor}`,
    '}',
  ];
}

function emitStoragePolicy(constants: NativeConstants): string[][] {
  const protection = (value: string) => `.${swiftCaseName(value)}`;
  return [
    [
      '/// What the storage layer does with a key that matches a row.',
      'enum StoragePolicyRule: Equatable, Sendable {',
      `${INDENT}/// Store the key at no less than this class.`,
      `${INDENT}case minimum(StorageProtection)`,
      `${INDENT}/// Refuse every operation that names the key.`,
      `${INDENT}case forbidden`,
      '}',
    ],
    [
      '/// One row of the storage policy table. `pattern` must match the whole key.',
      'struct StoragePolicyRow: Equatable, Sendable {',
      `${INDENT}var namespace: StorageNamespace`,
      `${INDENT}var pattern: String`,
      `${INDENT}var rule: StoragePolicyRule`,
      `${INDENT}var item: String?`,
      '}',
    ],
    [
      '/// The content of `storage/policy.json` (SS 6.3). A key takes the first row of its namespace',
      '/// whose pattern matches the whole key.',
      'enum StoragePolicyTable {',
      `${INDENT}static let version = ${constants.storagePolicy.version}`,
      '',
      `${INDENT}/// The longest key of the web namespace (SS 5.2).`,
      `${INDENT}static let keyMaxLength = ${constants.storageKeyMaxLength}`,
      '',
      `${INDENT}/// The class of a key that no row matches (BC 8.2).`,
      `${INDENT}static let defaultProtection: StorageProtection = ${protection(constants.storageDefaultProtection)}`,
      '',
      `${INDENT}static let rows: [StoragePolicyRow] = [`,
      ...constants.storagePolicy.rows.flatMap(row => [
        `${INDENT}${INDENT}StoragePolicyRow(`,
        `${INDENT}${INDENT}${INDENT}namespace: .${swiftCaseName(row.namespace)},`,
        `${INDENT}${INDENT}${INDENT}pattern: ${literal(row.pattern)},`,
        `${INDENT}${INDENT}${INDENT}rule: ${row.forbidden ? '.forbidden' : `.minimum(${protection(row.minimumProtection)})`},`,
        `${INDENT}${INDENT}${INDENT}item: ${row.item === undefined ? 'nil' : literal(row.item)}`,
        `${INDENT}${INDENT}),`,
      ]),
      `${INDENT}]`,
      '}',
    ],
  ];
}

export function emitSwift(
  model: ContractModel,
  constants: NativeConstants,
  options: SwiftOptions,
): GeneratedFile[] {
  const file = (
    name: string,
    sections: readonly (readonly string[])[],
  ): GeneratedFile => ({
    path: `${options.dir}/${name}.swift`,
    content: joinFile([FILE_HEADER, ...sections]),
  });

  const modelFile = (source: FileModel): GeneratedFile => {
    const sections = source.types.map(type =>
      type.kind === 'enum' ? emitEnum(type) : emitStruct(type),
    );
    if (source.types.some(type => type.name === model.errorCodeEnum)) {
      sections.push(emitReasonLists(model));
    }
    return file(source.name, sections);
  };

  return [
    ...model.files.map(modelFile),
    file(PROTOCOL_FILE, [emitProtocol(constants)]),
    file(STORAGE_POLICY_FILE, emitStoragePolicy(constants)),
  ];
}
