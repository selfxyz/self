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

export interface KotlinOptions {
  /** The directory of the generated files, relative to the output root. */
  readonly dir: string;
  readonly packageName: string;
  /** The package of the hand-written `JsonValue`. */
  readonly jsonPackage: string;
}

const HARD_KEYWORDS = new Set(
  'as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while'.split(
    ' ',
  ),
);

const INDENT = '    ';

function identifier(name: string): string {
  return HARD_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

export function kotlinConstantName(value: string): string {
  return wordsOf(value).join('_').toUpperCase();
}

function literal(text: string): string {
  return `"${text.replace(/[\\"$]/g, character => `\\${character}`)}"`;
}

function doc(text: string | undefined, indent: string): string[] {
  if (text === undefined) {
    return [];
  }
  const lines = wrap(
    text.replace(/\*\//g, '* /'),
    LINE_WIDTH - indent.length - 7,
  );
  return lines.length === 1
    ? [`${indent}/** ${lines[0]} */`]
    : [`${indent}/**`, ...lines.map(l => `${indent} * ${l}`), `${indent} */`];
}

function typeOf(type: TypeRef): string {
  switch (type.kind) {
    case 'string':
      return 'String';
    case 'integer':
      return 'Long';
    case 'number':
      return 'Double';
    case 'boolean':
      return 'Boolean';
    case 'json':
      return 'JsonValue';
    case 'jsonObject':
      return 'Map<String, JsonValue>';
    case 'named':
      return type.name;
    case 'list':
      return `List<${typeOf(type.item)}>`;
    case 'map':
      return `Map<String, ${typeOf(type.value)}${type.valueNullable ? '?' : ''}>`;
  }
}

function usesJson(type: TypeRef): boolean {
  switch (type.kind) {
    case 'json':
    case 'jsonObject':
      return true;
    case 'list':
      return usesJson(type.item);
    case 'map':
      return usesJson(type.value);
    default:
      return false;
  }
}

function emitEnum(model: EnumModel): string[] {
  const names = model.values.map(kotlinConstantName);
  requireDistinct(model.name, names);
  return [
    ...doc(model.doc, ''),
    `internal enum class ${model.name}(val wire: String) {`,
    ...model.values.map(
      (value, index) => `${INDENT}${names[index]}(${literal(value)}),`,
    ),
    `${INDENT};`,
    '',
    `${INDENT}companion object {`,
    `${INDENT}${INDENT}/** The value with this wire name, or null when the name is not in the contract. */`,
    `${INDENT}${INDENT}fun fromWire(wire: String): ${model.name}? = entries.firstOrNull { it.wire == wire }`,
    `${INDENT}}`,
    '}',
  ];
}

function emitStruct(model: StructModel): string[] {
  return [
    ...doc(model.doc, ''),
    `internal data class ${model.name}(`,
    ...model.fields.flatMap(field => [
      ...doc(field.doc, INDENT),
      `${INDENT}val ${identifier(field.name)}: ${typeOf(field.type)}${field.nullable ? '?' : ''}${field.required ? '' : ' = null'},`,
    ]),
    ')',
  ];
}

function emitReasonLists(model: ContractModel): string[] {
  const codes = model.errorCodeEnum;
  return [
    '/** The `details.reason` values this code allows. Empty when the code takes no reason. */',
    `internal val ${codes}.allowedReasons: List<String>`,
    `${INDENT}get() =`,
    `${INDENT}${INDENT}when (this) {`,
    ...model.reasonLists.map(
      list =>
        `${INDENT}${INDENT}${INDENT}${codes}.${kotlinConstantName(list.code)} -> ${list.enumName}.entries.map { it.wire }`,
    ),
    `${INDENT}${INDENT}${INDENT}else -> emptyList()`,
    `${INDENT}${INDENT}}`,
  ];
}

function emitProtocol(constants: NativeConstants): string[] {
  return [
    ...doc(
      'The protocol version this library implements (BC 5.1). `MAJOR` is the `version` of every message.',
      '',
    ),
    'internal object BridgeProtocol {',
    `${INDENT}const val MAJOR: Long = ${constants.protocolVersion.major}`,
    `${INDENT}const val MINOR: Long = ${constants.protocolVersion.minor}`,
    '}',
  ];
}

function emitStoragePolicy(constants: NativeConstants): string[][] {
  const protection = (value: string) =>
    `StorageProtection.${kotlinConstantName(value)}`;
  return [
    [
      '/** What the storage layer does with a key that matches a row. */',
      'internal sealed interface StoragePolicyRule {',
      `${INDENT}/** Store the key at no less than this class. */`,
      `${INDENT}data class Minimum(val protection: StorageProtection) : StoragePolicyRule`,
      '',
      `${INDENT}/** Refuse every operation that names the key. */`,
      `${INDENT}data object Forbidden : StoragePolicyRule`,
      '}',
    ],
    [
      '/** One row of the storage policy table. `pattern` must match the whole key. */',
      'internal data class StoragePolicyRow(',
      `${INDENT}val namespace: StorageNamespace,`,
      `${INDENT}val pattern: String,`,
      `${INDENT}val rule: StoragePolicyRule,`,
      `${INDENT}val item: String?,`,
      ')',
    ],
    [
      '/**',
      ' * The content of `storage/policy.json` (SS 6.3). A key takes the first row of its namespace',
      ' * whose pattern matches the whole key.',
      ' */',
      'internal object StoragePolicyTable {',
      `${INDENT}const val VERSION: Int = ${constants.storagePolicy.version}`,
      '',
      `${INDENT}/** The longest key of the web namespace (SS 5.2). */`,
      `${INDENT}const val KEY_MAX_LENGTH: Int = ${constants.storageKeyMaxLength}`,
      '',
      `${INDENT}/** The class of a key that no row matches (BC 8.2). */`,
      `${INDENT}val DEFAULT_PROTECTION: StorageProtection = ${protection(constants.storageDefaultProtection)}`,
      '',
      `${INDENT}val rows: List<StoragePolicyRow> =`,
      `${INDENT}${INDENT}listOf(`,
      ...constants.storagePolicy.rows.flatMap(row => [
        `${INDENT}${INDENT}${INDENT}StoragePolicyRow(`,
        `${INDENT}${INDENT}${INDENT}${INDENT}namespace = StorageNamespace.${kotlinConstantName(row.namespace)},`,
        `${INDENT}${INDENT}${INDENT}${INDENT}pattern = ${literal(row.pattern)},`,
        `${INDENT}${INDENT}${INDENT}${INDENT}rule = ${row.forbidden ? 'StoragePolicyRule.Forbidden' : `StoragePolicyRule.Minimum(${protection(row.minimumProtection)})`},`,
        `${INDENT}${INDENT}${INDENT}${INDENT}item = ${row.item === undefined ? 'null' : literal(row.item)},`,
        `${INDENT}${INDENT}${INDENT}),`,
      ]),
      `${INDENT}${INDENT})`,
      '}',
    ],
  ];
}

export function emitKotlin(
  model: ContractModel,
  constants: NativeConstants,
  options: KotlinOptions,
): GeneratedFile[] {
  const file = (
    name: string,
    imports: readonly string[],
    sections: readonly (readonly string[])[],
  ): GeneratedFile => ({
    path: `${options.dir}/${name}.kt`,
    content: joinFile([
      FILE_HEADER,
      [`package ${options.packageName}`],
      ...(imports.length > 0 ? [imports.map(i => `import ${i}`)] : []),
      ...sections,
    ]),
  });

  const modelFile = (source: FileModel): GeneratedFile => {
    const json = source.types.some(
      type => type.kind === 'struct' && type.fields.some(f => usesJson(f.type)),
    );
    const sections = source.types.map(type =>
      type.kind === 'enum' ? emitEnum(type) : emitStruct(type),
    );
    if (source.types.some(type => type.name === model.errorCodeEnum)) {
      sections.push(emitReasonLists(model));
    }
    return file(
      source.name,
      json ? [`${options.jsonPackage}.JsonValue`] : [],
      sections,
    );
  };

  return [
    ...model.files.map(modelFile),
    file(PROTOCOL_FILE, [], [emitProtocol(constants)]),
    file(STORAGE_POLICY_FILE, [], emitStoragePolicy(constants)),
  ];
}
