import type { ObjectExpression, TypeCastExpression } from '@babel/types';
import { parse, makeMockImporter } from '../../../tests/utils';
import getPropertyName from '../getPropertyName.js';
import { describe, expect, test } from 'vitest';

describe('getPropertyName', () => {
  const mockImporter = makeMockImporter({
    foo: stmtLast =>
      stmtLast(`
      export default "name";
    `).get('declaration'),

    bar: stmtLast =>
      stmtLast(`
      export default { baz: "name" };
    `).get('declaration'),
  });

  test('returns the name for a normal property', () => {
    const def = parse.expression<ObjectExpression>('{ foo: 1 }');
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('foo');
  });

  test('returns the name of a object type spread property', () => {
    const def = parse.expression<TypeCastExpression>('(a: { ...foo })');
    const param = def
      .get('typeAnnotation')
      .get('typeAnnotation')
      .get('properties')[0];

    expect(getPropertyName(param)).toBe('foo');
  });

  test('returns the qualified name of a object type spread property', () => {
    const def = parse.expression<TypeCastExpression>('(a: { ...foo.bub })');
    const param = def
      .get('typeAnnotation')
      .get('typeAnnotation')
      .get('properties')[0];

    expect(getPropertyName(param)).toBe('foo.bub');
  });

  test('creates name for computed properties', () => {
    const def = parse.expression<ObjectExpression>('{ [foo]: 21 }');
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('@computed#foo');
  });

  test('creates name for computed properties from string', () => {
    const def = parse.expression<ObjectExpression>('{ ["foo"]: 21 }');
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('foo');
  });

  test('creates name for computed properties from int', () => {
    const def = parse.expression<ObjectExpression>('{ [31]: 21 }');
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('31');
  });

  test('returns null for computed properties from regex', () => {
    const def = parse.expression<ObjectExpression>('{ [/31/]: 21 }');
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe(null);
  });

  test('returns null for to complex computed properties', () => {
    const def = parse.expression<ObjectExpression>('{ [() => {}]: 21 }');
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe(null);
  });

  test('resolves simple variables', () => {
    const def = parse.expressionLast<ObjectExpression>(`
    const foo = "name";

    ({ [foo]: 21 });
    `);
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('name');
  });

  test('resolves imported variables', () => {
    const def = parse.expressionLast<ObjectExpression>(
      `
    import foo from 'foo';

    ({ [foo]: 21 });
    `,
      mockImporter,
    );
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('name');
  });

  test('resolves simple member expressions', () => {
    const def = parse.expressionLast<ObjectExpression>(`
    const a = { foo: "name" };

    ({ [a.foo]: 21 });
    `);
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('name');
  });

  test('resolves imported member expressions', () => {
    const def = parse.expressionLast<ObjectExpression>(
      `
    import bar from 'bar';

    ({ [bar.baz]: 21 });
    `,
      mockImporter,
    );
    const param = def.get('properties')[0];

    expect(getPropertyName(param)).toBe('name');
  });
});
