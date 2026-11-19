// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SchemaDocument } from '../../schemaDocument';

export type TypeRef =
  | { readonly kind: 'string' | 'integer' | 'number' | 'boolean' }
  /** Any JSON value. */
  | { readonly kind: 'json' }
  /** A JSON object whose members the schema does not name. */
  | { readonly kind: 'jsonObject' }
  | { readonly kind: 'named'; readonly name: string }
  | { readonly kind: 'list'; readonly item: TypeRef }
  | {
      readonly kind: 'map';
      readonly value: TypeRef;
      readonly valueNullable: boolean;
    };

export interface FieldModel {
  readonly name: string;
  readonly type: TypeRef;
  /** The value can be `null`. True for every field the schema does not require: `null` equals absent. */
  readonly nullable: boolean;
  /** False: the field has the default `null` in a native type. */
  readonly required: boolean;
  readonly doc?: string;
}

export interface EnumModel {
  readonly kind: 'enum';
  readonly name: string;
  readonly doc?: string;
  /** Wire values, in schema order. */
  readonly values: readonly string[];
}

export interface StructModel {
  readonly kind: 'struct';
  readonly name: string;
  readonly doc?: string;
  readonly fields: readonly FieldModel[];
}

export type TypeModel = EnumModel | StructModel;

export interface ReasonListModel {
  /** The wire value of the error code. */
  readonly code: string;
  /** The name of the enum that lists the `details.reason` values of the code. */
  readonly enumName: string;
}

export interface FileModel {
  readonly name: string;
  readonly types: readonly TypeModel[];
}

export interface ContractModel {
  readonly files: readonly FileModel[];
  /** The name of the error code enum. Present when the plan has reason lists. */
  readonly errorCodeEnum?: string;
  readonly reasonLists: readonly ReasonListModel[];
}

/** A place in the schema set: `<$id>` or `<$id>#<JSON pointer>`. */
export type SchemaLocation = string;

export type TypePlan =
  /** An enum or a struct, read from the schema at `at`. */
  | {
      readonly name: string;
      readonly at: SchemaLocation;
      /** The type of a property the reader does not infer, by property name. */
      readonly fields?: Readonly<
        Record<string, { readonly type: TypeRef; readonly nullable?: boolean }>
      >;
    }
  /** An enum whose values are the `const` of each listed place. */
  | { readonly name: string; readonly consts: readonly SchemaLocation[] };

export interface ContractPlan {
  readonly files: readonly {
    readonly name: string;
    readonly types: readonly TypePlan[];
  }[];
  /**
   * The `details.reason` list of an error code. `when` is the schema that tests the code, and
   * `errorSchema` must tie it to the planned enum `reasons` with an `if` and `then` pair.
   */
  readonly reasonLists?: {
    readonly errorSchema: SchemaLocation;
    readonly errorCodeEnum: string;
    readonly lists: readonly {
      readonly code: string;
      readonly when: SchemaLocation;
      readonly reasons: string;
    }[];
  };
}

type Node = Readonly<Record<string, unknown>>;

/** Keywords that only validate. They add no type and no field. */
const VALIDATION_KEYWORDS = new Set([
  'pattern',
  'minimum',
  'minLength',
  'minItems',
  'maxItems',
  'if',
  'then',
  'else',
]);

const ANNOTATION_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$defs',
  'title',
  'description',
]);

const STRUCT_KEYWORDS = new Set(['type', 'required', 'properties', 'allOf']);

const FIELD_KEYWORDS = new Set([
  'type',
  'enum',
  '$ref',
  'anyOf',
  'items',
  // An object with named members is refused below, with a message that says what to do.
  'properties',
  'required',
]);

const SCALARS = new Set(['string', 'integer', 'number', 'boolean']);

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullSchema(value: unknown): boolean {
  return isNode(value) && value.type === 'null';
}

function splitLocation(location: SchemaLocation): {
  id: string;
  pointer: string;
} {
  const hash = location.indexOf('#');
  return hash === -1
    ? { id: location, pointer: '' }
    : { id: location.slice(0, hash), pointer: location.slice(hash + 1) };
}

function joinLocation(id: string, pointer: string): SchemaLocation {
  return pointer === '' ? id : `${id}#${pointer}`;
}

function child(location: SchemaLocation, ...segments: string[]): string {
  const { id, pointer } = splitLocation(location);
  return joinLocation(id, `${pointer}/${segments.join('/')}`);
}

function docOf(node: Node, withTitle: boolean): string | undefined {
  const parts = [withTitle ? node.title : undefined, node.description]
    .filter((part): part is string => typeof part === 'string')
    .map(part => (/[.:?!]$/.test(part) ? part : `${part}.`));
  return parts.length > 0 ? parts.join(' ') : undefined;
}

class ModelBuilder {
  private readonly schemas = new Map<string, SchemaDocument>();
  private readonly namedAt = new Map<SchemaLocation, string>();
  private readonly used = new Set<SchemaLocation>();

  constructor(
    schemas: readonly SchemaDocument[],
    private readonly plan: ContractPlan,
  ) {
    for (const schema of schemas) {
      this.schemas.set(schema.$id, schema);
    }
    const names = new Set<string>();
    for (const type of plan.files.flatMap(file => file.types)) {
      if (names.has(type.name)) {
        throw new Error(`The plan names two types ${type.name}`);
      }
      names.add(type.name);
      if ('at' in type) {
        if (this.namedAt.has(type.at)) {
          throw new Error(`The plan names ${type.at} twice`);
        }
        this.namedAt.set(type.at, type.name);
      }
    }
  }

  build(): ContractModel {
    const files = this.plan.files.map(file => ({
      name: file.name,
      types: file.types.map(type => this.buildType(type)),
    }));
    const model: ContractModel = {
      files,
      errorCodeEnum: this.plan.reasonLists?.errorCodeEnum,
      reasonLists: this.buildReasonLists(files),
    };
    this.requireEveryEnumPlanned();
    return model;
  }

  private nodeAt(location: SchemaLocation): Node {
    const { id, pointer } = splitLocation(location);
    let node: unknown = this.schemas.get(id);
    if (node === undefined) {
      throw new Error(`${location}: no schema has the $id "${id}"`);
    }
    for (const segment of pointer.split('/').slice(1)) {
      node = Array.isArray(node)
        ? node[Number(segment)]
        : isNode(node)
          ? node[segment]
          : undefined;
    }
    if (!isNode(node)) {
      throw new Error(`${location}: no schema at this place`);
    }
    return node;
  }

  private resolveRef(from: SchemaLocation, ref: string): SchemaLocation {
    const { id } = splitLocation(from);
    const target = splitLocation(ref);
    const base = id.slice(0, id.lastIndexOf('/') + 1);
    return joinLocation(
      target.id === '' ? id : `${base}${target.id}`,
      target.pointer,
    );
  }

  private requireKnownKeywords(
    node: Node,
    location: SchemaLocation,
    allowed: ReadonlySet<string>,
  ): void {
    for (const keyword of Object.keys(node)) {
      if (
        !allowed.has(keyword) &&
        !VALIDATION_KEYWORDS.has(keyword) &&
        !ANNOTATION_KEYWORDS.has(keyword)
      ) {
        throw new Error(
          `${location}: the generator does not read the keyword "${keyword}"`,
        );
      }
    }
  }

  private buildType(plan: TypePlan): TypeModel {
    if ('consts' in plan) {
      return {
        kind: 'enum',
        name: plan.name,
        values: plan.consts.map(location => {
          const value = this.nodeAt(location).const;
          if (typeof value !== 'string') {
            throw new Error(`${location}: no string "const"`);
          }
          this.used.add(location);
          return value;
        }),
      };
    }
    const node = this.nodeAt(plan.at);
    if (node.enum !== undefined) {
      return this.buildEnum(plan.name, plan.at, node);
    }
    return this.buildStruct(plan, node);
  }

  private buildEnum(name: string, location: string, node: Node): EnumModel {
    this.requireKnownKeywords(node, location, new Set(['type', 'enum']));
    const values = (node.enum as unknown[]).filter(value => value !== null);
    if (values.length === 0 || values.some(v => typeof v !== 'string')) {
      throw new Error(`${location}: an enum takes strings and null only`);
    }
    this.used.add(location);
    return {
      kind: 'enum',
      name,
      doc: docOf(node, true),
      values: values as string[],
    };
  }

  private buildStruct(
    plan: Extract<TypePlan, { at: string }>,
    node: Node,
  ): StructModel {
    this.requireKnownKeywords(node, plan.at, STRUCT_KEYWORDS);
    if (node.type !== 'object' || !isNode(node.properties)) {
      throw new Error(`${plan.at}: a struct needs "type": "object"`);
    }
    for (const [index, part] of ((node.allOf ?? []) as unknown[]).entries()) {
      // `allOf` on a struct holds rules only. A part that adds a property would be a missed field.
      this.requireKnownKeywords(
        part as Node,
        child(plan.at, 'allOf', String(index)),
        new Set(),
      );
    }
    const required = new Set((node.required ?? []) as string[]);
    for (const name of Object.keys(plan.fields ?? {})) {
      if (!(name in node.properties)) {
        throw new Error(`${plan.at}: the plan types "${name}", not a property`);
      }
    }
    const fields: FieldModel[] = [];
    for (const [name, property] of Object.entries(node.properties)) {
      const location = child(plan.at, 'properties', name);
      if (!isNode(property)) {
        throw new Error(`${location}: not a schema`);
      }
      if (property.const !== undefined) {
        continue;
      }
      const planned = plan.fields?.[name];
      const resolved = planned
        ? { type: planned.type, nullable: planned.nullable ?? false }
        : this.resolve(property, location);
      fields.push({
        name,
        type: resolved.type,
        nullable: resolved.nullable || !required.has(name),
        required: required.has(name),
        doc: docOf(property, false),
      });
    }
    return {
      kind: 'struct',
      name: plan.name,
      doc: docOf(node, true),
      fields,
    };
  }

  private resolve(
    node: Node,
    location: SchemaLocation,
  ): { type: TypeRef; nullable: boolean } {
    const named = this.namedAt.get(location);
    if (named !== undefined) {
      const nullable = Array.isArray(node.enum) && node.enum.includes(null);
      return { type: { kind: 'named', name: named }, nullable };
    }
    this.requireKnownKeywords(node, location, FIELD_KEYWORDS);

    if (typeof node.$ref === 'string') {
      const target = this.resolveRef(location, node.$ref);
      return this.resolve(this.nodeAt(target), target);
    }
    if (Array.isArray(node.anyOf)) {
      const others = node.anyOf.filter(option => !isNullSchema(option));
      if (node.anyOf.length !== 2 || others.length !== 1) {
        throw new Error(`${location}: "anyOf" must be one schema and null`);
      }
      const index = String(node.anyOf.indexOf(others[0]));
      const inner = this.resolve(
        others[0] as Node,
        child(location, 'anyOf', index),
      );
      return { type: inner.type, nullable: true };
    }
    if (node.enum !== undefined) {
      throw new Error(`${location}: the plan must name this enum`);
    }
    if (node.type === undefined) {
      return { type: { kind: 'json' }, nullable: true };
    }

    const types = Array.isArray(node.type) ? node.type : [node.type];
    const nullable = types.includes('null');
    const [type, ...rest] = types.filter(t => t !== 'null') as string[];
    if (type === undefined || rest.length > 0) {
      throw new Error(`${location}: "type" must be one type, or one and null`);
    }
    if (SCALARS.has(type)) {
      return { type: { kind: type } as TypeRef, nullable };
    }
    if (type === 'array') {
      if (!isNode(node.items)) {
        throw new Error(`${location}: an array needs "items"`);
      }
      const item = this.resolve(node.items, child(location, 'items'));
      if (item.nullable) {
        throw new Error(`${location}: an array of nullable items`);
      }
      return { type: { kind: 'list', item: item.type }, nullable };
    }
    if (type === 'object') {
      if (node.properties !== undefined) {
        throw new Error(`${location}: the plan must name this object`);
      }
      return { type: { kind: 'jsonObject' }, nullable };
    }
    throw new Error(`${location}: the type "${type}" is not supported`);
  }

  private buildReasonLists(files: readonly FileModel[]): ReasonListModel[] {
    const plan = this.plan.reasonLists;
    if (!plan) {
      return [];
    }
    const enums = new Map(
      files
        .flatMap(file => file.types)
        .filter((type): type is EnumModel => type.kind === 'enum')
        .map(type => [type.name, type]),
    );
    const codes = enums.get(plan.errorCodeEnum);
    if (!codes) {
      throw new Error(`The plan has no enum ${plan.errorCodeEnum}`);
    }
    const rules = (this.nodeAt(plan.errorSchema).allOf ?? []) as Node[];
    const conditional = rules.filter(
      rule => isNode(rule.if) && typeof rule.if.$ref === 'string',
    );
    if (conditional.length !== plan.lists.length) {
      throw new Error(
        `${plan.errorSchema}: ${conditional.length} codes have a reason list, the plan has ${plan.lists.length}`,
      );
    }

    return plan.lists.map(list => {
      const test = this.nodeAt(list.when);
      const tested = isNode(test.properties) ? test.properties.code : undefined;
      if (!isNode(tested) || tested.const !== list.code) {
        throw new Error(`${list.when}: does not test the code ${list.code}`);
      }
      if (!codes.values.includes(list.code)) {
        throw new Error(`${list.code} is not in ${plan.errorCodeEnum}`);
      }
      const expected = [...this.namedAt].find(
        ([, name]) => name === list.reasons,
      )?.[0];
      const tied = rules.some(rule => {
        const when = isNode(rule.if) ? rule.if.$ref : undefined;
        return (
          typeof when === 'string' &&
          this.resolveRef(plan.errorSchema, when) === list.when &&
          expected !== undefined &&
          this.reasonRefs(rule.then, plan.errorSchema).includes(expected)
        );
      });
      if (!tied) {
        throw new Error(
          `${plan.errorSchema}: no rule gives ${list.code} the reasons of ${list.reasons}`,
        );
      }
      return { code: list.code, enumName: list.reasons };
    });
  }

  /** Every place a `$ref` under `details.reason` of a `then` schema points at. */
  private reasonRefs(then: unknown, from: SchemaLocation): SchemaLocation[] {
    let node: unknown = then;
    for (const key of ['properties', 'details', 'properties', 'reason']) {
      node = isNode(node) ? node[key] : undefined;
    }
    const options = isNode(node) && Array.isArray(node.anyOf) ? node.anyOf : [];
    return options
      .filter(isNode)
      .map(option => option.$ref)
      .filter((ref): ref is string => typeof ref === 'string')
      .map(ref => this.resolveRef(from, ref));
  }

  /** A schema enum with no type would be a list that native code has to copy by hand. */
  private requireEveryEnumPlanned(): void {
    const visit = (value: unknown, location: SchemaLocation): void => {
      if (Array.isArray(value)) {
        value.forEach((item, index) =>
          visit(item, child(location, String(index))),
        );
        return;
      }
      if (!isNode(value)) {
        return;
      }
      if (Array.isArray(value.enum) && !this.used.has(location)) {
        throw new Error(`${location}: the plan has no type for this enum`);
      }
      for (const [key, inner] of Object.entries(value)) {
        // The branches of a condition repeat lists that the schema already states once.
        if (
          key !== 'if' &&
          key !== 'then' &&
          key !== 'else' &&
          key !== 'enum'
        ) {
          visit(inner, child(location, key));
        }
      }
    };
    for (const [id, schema] of this.schemas) {
      visit(schema, id);
    }
  }
}

/**
 * Reads the planned types from the schema set. Throws for a keyword it does not read, so that
 * a schema change is never left out of the native types without a change to the plan.
 */
export function buildContractModel(
  schemas: readonly SchemaDocument[],
  plan: ContractPlan,
): ContractModel {
  return new ModelBuilder(schemas, plan).build();
}
