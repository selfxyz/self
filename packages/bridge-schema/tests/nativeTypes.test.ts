// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PROTOCOL_VERSION,
  SCHEMA_DIALECT,
  type SchemaDocument,
  STORAGE_DEFAULT_PROTECTION,
  STORAGE_KEY_MAX_LENGTH,
  type StoragePolicyTable,
} from '../src';
import {
  buildContractModel,
  CONTRACT_PLAN,
  type ContractPlan,
  createNativeTargets,
  emitKotlin,
  emitSwift,
  generate,
  loadSchemas,
  NATIVE_OUTPUT_DIRS,
  type NativeConstants,
} from '../src/node';
import { packageRoot } from './support';

const repoRoot = path.resolve(packageRoot, '..', '..');
const schemaDir = path.join(packageRoot, 'schema');

const storagePolicy = JSON.parse(
  readFileSync(path.join(packageRoot, 'storage', 'policy.json'), 'utf8'),
) as StoragePolicyTable;

const constants: NativeConstants = {
  protocolVersion: PROTOCOL_VERSION,
  storagePolicy,
  storageKeyMaxLength: STORAGE_KEY_MAX_LENGTH,
  storageDefaultProtection: STORAGE_DEFAULT_PROTECTION,
};

const realTargets = () =>
  createNativeTargets({ plan: CONTRACT_PLAN, ...constants });

function schema(id: string, body: Record<string, unknown>): SchemaDocument {
  return { $schema: SCHEMA_DIALECT, $id: id, ...body };
}

const colour = schema('test/colour', {
  title: 'A colour',
  enum: ['dark-red', 'LIGHT_BLUE', 'none', null],
});

const shape = schema('test/shape', {
  title: 'A shape',
  type: 'object',
  required: ['kind', 'name', 'sides', 'fill', 'extra'],
  properties: {
    kind: { const: 'shape' },
    name: { description: 'Shown to no one.', type: 'string', minLength: 1 },
    sides: { type: 'integer', minimum: 0 },
    fill: { $ref: 'colour' },
    border: { anyOf: [{ $ref: 'colour' }, { type: 'null' }] },
    tags: { type: ['array', 'null'], items: { type: 'string' } },
    extra: { type: ['object', 'null'] },
    payload: { description: 'Any JSON value.' },
  },
  if: { required: ['sides'] },
  then: { properties: { sides: { enum: [3, 4] } } },
});

const plan: ContractPlan = {
  files: [
    {
      name: 'Shapes',
      types: [
        { name: 'Colour', at: 'test/colour' },
        { name: 'Shape', at: 'test/shape' },
      ],
    },
  ],
};

const smallConstants: NativeConstants = {
  protocolVersion: { major: 7, minor: 3 },
  storagePolicy: {
    version: 1,
    rows: [
      {
        item: 'A "quoted" $name',
        namespace: 'native',
        pattern: 'a\\.b',
        minimumProtection: 'userPresence',
      },
      { namespace: 'web', pattern: 'secret', forbidden: true },
    ],
  },
  storageKeyMaxLength: 128,
  storageDefaultProtection: 'none',
};

describe('buildContractModel', () => {
  it('reads values, fields and nullability from the schema', () => {
    const model = buildContractModel([colour, shape], plan);

    expect(model.files[0].types).toEqual([
      {
        kind: 'enum',
        name: 'Colour',
        doc: 'A colour.',
        values: ['dark-red', 'LIGHT_BLUE', 'none'],
      },
      {
        kind: 'struct',
        name: 'Shape',
        doc: 'A shape.',
        fields: [
          {
            name: 'name',
            type: { kind: 'string' },
            nullable: false,
            required: true,
            doc: 'Shown to no one.',
          },
          {
            name: 'sides',
            type: { kind: 'integer' },
            nullable: false,
            required: true,
          },
          {
            name: 'fill',
            type: { kind: 'named', name: 'Colour' },
            nullable: true,
            required: true,
          },
          {
            name: 'border',
            type: { kind: 'named', name: 'Colour' },
            nullable: true,
            required: false,
          },
          {
            name: 'tags',
            type: { kind: 'list', item: { kind: 'string' } },
            nullable: true,
            required: false,
          },
          {
            name: 'extra',
            type: { kind: 'jsonObject' },
            nullable: true,
            required: true,
          },
          {
            name: 'payload',
            type: { kind: 'json' },
            nullable: true,
            required: false,
            doc: 'Any JSON value.',
          },
        ],
      },
    ]);
  });

  it.each([
    [
      'a keyword it does not read',
      { patternProperties: {} },
      /test\/shape: the generator does not read the keyword "patternProperties"/,
    ],
    [
      'a keyword it does not read on a property',
      { properties: { size: { type: 'number', multipleOf: 2 } } },
      /properties\/size: the generator does not read the keyword "multipleOf"/,
    ],
    [
      'an inline enum with no name in the plan',
      { properties: { size: { enum: ['s', 'm'] } } },
      /properties\/size: the plan must name this enum/,
    ],
    [
      'an inline object with no name in the plan',
      {
        properties: { size: { type: 'object', properties: { w: {} } } },
      },
      /properties\/size: the plan must name this object/,
    ],
    [
      'a choice between two types',
      {
        properties: {
          size: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        },
      },
      /properties\/size: "anyOf" must be one schema and null/,
    ],
    [
      'a rule list that adds a property',
      { allOf: [{ properties: { size: { type: 'number' } } }] },
      /allOf\/0: the generator does not read the keyword "properties"/,
    ],
  ])('throws for %s', (_case, change, message) => {
    const changed = schema('test/shape', {
      type: 'object',
      properties: { name: { type: 'string' } },
      ...change,
    });

    expect(() =>
      buildContractModel([changed], {
        files: [{ name: 'F', types: [{ name: 'Shape', at: 'test/shape' }] }],
      }),
    ).toThrow(message);
  });

  it('throws for a schema enum that the plan gives no type', () => {
    const unplanned = schema('test/size', { $defs: { size: { enum: ['s'] } } });

    expect(() => buildContractModel([colour, shape, unplanned], plan)).toThrow(
      /test\/size#\/\$defs\/size: the plan has no type for this enum/,
    );
  });

  it('throws for a place that holds no schema', () => {
    expect(() =>
      buildContractModel([colour], {
        files: [{ name: 'F', types: [{ name: 'Gone', at: 'test/gone' }] }],
      }),
    ).toThrow(/test\/gone: no schema has the \$id/);
  });
});

describe('the contract plan', () => {
  const schemas = loadSchemas(schemaDir);

  it('covers every schema enum and ties the three reason lists to their codes', () => {
    const model = buildContractModel(schemas, CONTRACT_PLAN);

    expect(model.reasonLists).toEqual([
      { code: 'UNSUPPORTED', enumName: 'BridgeUnsupportedReason' },
      { code: 'UNAVAILABLE', enumName: 'BridgeUnavailableReason' },
      { code: 'FAILED', enumName: 'BridgeFailedReason' },
    ]);
  });

  it('throws when a reason list is planned for the wrong code', () => {
    const lists = CONTRACT_PLAN.reasonLists!;
    const swapped: ContractPlan = {
      ...CONTRACT_PLAN,
      reasonLists: {
        ...lists,
        lists: lists.lists.map(list =>
          list.code === 'FAILED'
            ? { ...list, reasons: 'BridgeUnavailableReason' }
            : list,
        ),
      },
    };

    expect(() => buildContractModel(schemas, swapped)).toThrow(
      /no rule gives FAILED the reasons of BridgeUnavailableReason/,
    );
  });

  it('throws when the schema has a reason list the plan leaves out', () => {
    const lists = CONTRACT_PLAN.reasonLists!;
    const short: ContractPlan = {
      ...CONTRACT_PLAN,
      reasonLists: { ...lists, lists: lists.lists.slice(0, 2) },
    };

    expect(() => buildContractModel(schemas, short)).toThrow(
      /3 codes have a reason list, the plan has 2/,
    );
  });
});

describe('emitKotlin', () => {
  const files = emitKotlin(
    buildContractModel([colour, shape], plan),
    smallConstants,
    { dir: 'out', packageName: 'a.b.generated', jsonPackage: 'a.b' },
  );
  const content = (name: string) =>
    files.find(file => file.path === `out/${name}.kt`)?.content ?? '';

  it('emits one file per plan file, the protocol and the policy table', () => {
    expect(files.map(file => file.path)).toEqual([
      'out/Shapes.kt',
      'out/BridgeProtocol.kt',
      'out/StoragePolicyTable.kt',
    ]);
  });

  it('emits an enum with its wire names and a data class with defaults for optional fields', () => {
    const body = content('Shapes').split('package a.b.generated\n\n')[1];

    expect(body).toBe(`import a.b.JsonValue

/** A colour. */
internal enum class Colour(val wire: String) {
    DARK_RED("dark-red"),
    LIGHT_BLUE("LIGHT_BLUE"),
    NONE("none"),
    ;

    companion object {
        /** The value with this wire name, or null when the name is not in the contract. */
        fun fromWire(wire: String): Colour? = entries.firstOrNull { it.wire == wire }
    }
}

/** A shape. */
internal data class Shape(
    /** Shown to no one. */
    val name: String,
    val sides: Long,
    val fill: Colour?,
    val border: Colour? = null,
    val tags: List<String>? = null,
    val extra: Map<String, JsonValue>?,
    /** Any JSON value. */
    val payload: JsonValue? = null,
)
`);
  });

  it('escapes a backslash, a quote and a dollar sign in a string', () => {
    expect(content('StoragePolicyTable')).toContain('pattern = "a\\\\.b",');
    expect(content('StoragePolicyTable')).toContain(
      'item = "A \\"quoted\\" \\$name",',
    );
  });

  it('emits a forbidden row with no class, and the constants', () => {
    expect(content('StoragePolicyTable')).toContain(
      'rule = StoragePolicyRule.Forbidden,\n                item = null,',
    );
    expect(content('BridgeProtocol')).toContain('const val MAJOR: Long = 7');
    expect(content('BridgeProtocol')).toContain('const val MINOR: Long = 3');
  });
});

describe('emitSwift', () => {
  const files = emitSwift(
    buildContractModel([colour, shape], plan),
    smallConstants,
    { dir: 'out' },
  );
  const content = (name: string) =>
    files.find(file => file.path === `out/${name}.swift`)?.content ?? '';

  it('emits an enum with its wire names and a struct with defaults for optional fields', () => {
    const body = content('Shapes').split('run `generate`.\n\n')[1];

    expect(body).toBe(`/// A colour.
enum Colour: String, CaseIterable, Sendable {
    case darkRed = "dark-red"
    case lightBlue = "LIGHT_BLUE"
    case noneValue = "none"
}

/// A shape.
struct Shape: Equatable, Sendable {
    /// Shown to no one.
    var name: String
    var sides: Int
    var fill: Colour?
    var border: Colour? = nil
    var tags: [String]? = nil
    var extra: [String: JSONValue]?
    /// Any JSON value.
    var payload: JSONValue? = nil
}
`);
  });

  it('escapes a backslash and a quote in a string', () => {
    expect(content('StoragePolicyTable')).toContain('pattern: "a\\\\.b",');
    expect(content('StoragePolicyTable')).toContain(
      'item: "A \\"quoted\\" $name"',
    );
  });

  it('emits a forbidden row with no class, and the constants', () => {
    expect(content('StoragePolicyTable')).toContain(
      'rule: .forbidden,\n            item: nil',
    );
    expect(content('BridgeProtocol')).toContain('static let major = 7');
  });
});

describe('emitters', () => {
  const clash = schema('test/clash', { enum: ['no_module', 'noModule'] });
  const clashPlan: ContractPlan = {
    files: [{ name: 'F', types: [{ name: 'Clash', at: 'test/clash' }] }],
  };

  it('refuse two wire values that give one native name', () => {
    const model = buildContractModel([clash], clashPlan);

    expect(() =>
      emitKotlin(model, smallConstants, {
        dir: 'out',
        packageName: 'a',
        jsonPackage: 'a',
      }),
    ).toThrow(/Clash: two values give the name NO_MODULE/);
    expect(() => emitSwift(model, smallConstants, { dir: 'out' })).toThrow(
      /Clash: two values give the name noModule/,
    );
  });
});

describe('the committed native types', () => {
  it('are the output of the generator for the schema and the policy table as they stand', () => {
    const report = generate({
      schemaDir,
      outRoot: repoRoot,
      targets: realTargets(),
      check: true,
    });

    expect(report.changed).toEqual([]);
    expect(report.files).toHaveLength(12);
  });

  it('start with the licence header and hold no carriage return', () => {
    const header = [
      '// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.',
      '// SPDX-License-Identifier: BUSL-1.1',
      '// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.',
      '',
      '',
    ].join('\n');

    for (const target of realTargets()) {
      for (const file of target.emit(loadSchemas(schemaDir))) {
        expect(file.content.startsWith(header), file.path).toBe(true);
        expect(file.content.includes('\r'), file.path).toBe(false);
        expect(file.content.endsWith('}\n'), file.path).toBe(true);
      }
    }
  });

  it('go to a directory inside each native package', () => {
    expect(
      NATIVE_OUTPUT_DIRS.kotlin.startsWith('packages/native-sdk-android/'),
    ).toBe(true);
    expect(
      NATIVE_OUTPUT_DIRS.swift.startsWith('packages/native-sdk-ios/'),
    ).toBe(true);
  });

  it('refuse a policy table that a reader must not apply', () => {
    expect(() =>
      createNativeTargets({
        plan: CONTRACT_PLAN,
        ...constants,
        storagePolicy: { ...storagePolicy, version: 2 },
      }),
    ).toThrow(/Unknown storage policy version/);
  });
});
