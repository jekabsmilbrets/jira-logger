import assert            from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { ESLint }        from 'eslint';
import { test }          from 'vitest';


const cwd = fileURLToPath(new URL('..', import.meta.url));
const filePath = 'src/style-check.ts';
const configured = new ESLint({
  cwd
});
const config = await configured.calculateConfigForFile(filePath);
const styleRules = [
  'local/multiline-parameters',
  '@stylistic/arrow-parens',
  '@stylistic/object-curly-spacing',
  '@stylistic/object-curly-newline',
  '@stylistic/object-property-newline',
  '@stylistic/comma-dangle',
  'curly',
  '@stylistic/curly-newline',
  '@stylistic/padding-line-between-statements'
];
const lint = new ESLint({
  cwd,
  fix: true,
  overrideConfig: {
    rules: Object.fromEntries(Object.entries(config.rules).map((
      [name, rule],
    ) => [
      name, styleRules.includes(name) ? rule : 'off'
    ]))
  }
});

test('function parameters match the multiline style and fixes are stable', async () => {
  const input = 'class Service {\n  async sync(id: string, date: string): Promise<void> {}\n}';
  const [result] = await lint.lintText(input, {
    filePath
  });
  assert.equal(result.output, 'class Service {\n  async sync(\n    id: string,\n    date: string,\n  ): Promise<void> {}\n}');
  assert.equal(result.errorCount, 0);
  const [again] = await lint.lintText(result.output, {
    filePath
  });
  assert.equal(again.output, undefined);
});

test('parameters cover constructors, arrows, signatures, comments and rest arguments', async () => {
  for (const input of [
    'function f(a: string, b = 1) {}',
    'class C { constructor(private a: string, b: number) {} }',
    'const f = value => value;',
    'const f = (a: string, ...rest: string[]) => a;',
    'interface C { f(a: string, b: number): void; }',
    'type F = (a: string, b: number) => void;',
    'declare function f(a: string, b: number): void;',
    'function f(a: string, /* keep */ b: number) {}',
    'function f({ a, b }: { a: string; b: number }, callback: (x: string) => void) {}'
  ]) {
    const [result] = await lint.lintText(input, {
      filePath
    });
    assert.ok(result.output, input);
    assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
    const [again] = await lint.lintText(result.output, {
      filePath
    });
    assert.equal(again.output, undefined, result.output);
    assert.equal(again.errorCount, 0);

    if (input.includes('/* keep */')) {
      assert.ok(result.output.includes('/* keep */'));
    }
  }
});

test('empty parameter lists and function calls retain their layout', async () => {
  const [result] = await lint.lintText('function f() {}\n\nf(1, 2);', {
    filePath
  });
  assert.equal(result.output, undefined);
  assert.equal(result.errorCount, 0);
});

test('one-line if and else bodies become multiline blocks', async () => {
  for (const input of ['if (ready) run();', 'if (ready) { run(); } else { stop(); }']) {
    const [result] = await lint.lintText(input, {
      filePath
    });
    assert.equal(result.errorCount, 0);
    assert.match(result.output, /\{\n/);
    assert.doesNotMatch(result.output, /\{[^\n]*run/);
    const [again] = await lint.lintText(result.output, {
      filePath
    });
    assert.equal(again.output, undefined);
  }
});

test('blank lines surround if statements and precede returns', async () => {
  const input = 'function f() {\n  prepare();\n  if (ready) {\n    run();\n  }\n  finish();\n  return result;\n}';
  const [result] = await lint.lintText(input, {
    filePath
  });
  assert.equal(result.output, 'function f() {\n  prepare();\n\n  if (ready) {\n    run();\n  }\n\n  finish();\n\n  return result;\n}');
  assert.equal(result.errorCount, 0);
  const [again] = await lint.lintText(result.output, {
    filePath
  });
  assert.equal(again.output, undefined);
});

test('inline import and destructuring braces have spaces', async () => {
  const [result] = await lint.lintText('import {name} from \'module\';\nconst {value} = source;', {
    filePath
  });
  assert.equal(result.output, 'import { name } from \'module\';\nconst { value } = source;');
  assert.equal(result.errorCount, 0);
});

test('non-empty objects are multiline with one property per line', async () => {
  for (const input of [
    'const value = {first: 1, second: 2};',
    'const value = {nested: {first: 1, second: 2}};'
  ]) {
    const [result] = await lint.lintText(input, {
      filePath
    });
    assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
    assert.match(result.output, /\{\n/);
    assert.match(result.output, /\n\}/);
    assert.doesNotMatch(result.output, /first: 1, second:/);
    const [again] = await lint.lintText(result.output, {
      filePath
    });
    assert.equal(again.output, undefined);
    assert.equal(again.errorCount, 0);
  }
});

test('empty objects stay inline and expanded empty objects collapse', async () => {
  const expected = 'const value = {};';

  for (const input of [expected, 'const value = {\n};']) {
    const [result] = await lint.lintText(input, {
      filePath
    });
    assert.equal(result.output ?? input, expected);
    assert.equal(result.errorCount, 0);
  }
});

test('blank lines surround block statements', async () => {
  for (const block of [
    'for (let i = 0; i < 2; i++) {\n  run();\n}',
    'for (const item of items) {\n  run();\n}',
    'for (const key in source) {\n  run();\n}',
    'while (ready) {\n  run();\n}',
    'do {\n  run();\n} while (ready);',
    'try {\n  run();\n} catch {\n  recover();\n} finally {\n  clean();\n}',
    'switch (value) {\n  case 1:\n    break;\n}',
    '{\n  run();\n}',
    'function f() {}',
    'class C {}'
  ]) {
    const input = `before();\n${ block }\nafter();`;
    const expected = `before();\n\n${ block }\n\nafter();`;
    const [result] = await lint.lintText(input, {
      filePath
    });
    assert.equal(result.output, expected);
    assert.equal(result.errorCount, 0, JSON.stringify(result.messages));
    const [again] = await lint.lintText(expected, {
      filePath
    });
    assert.equal(again.output, undefined);
  }
});

test('class members require explicit access modifiers', async () => {
  const rule = '@typescript-eslint/explicit-member-accessibility';

  for (const member of [
    'field: number = 1;',
    'static field: number = 1;',
    'method(): void {}',
    'get value(): number { return 1; }',
    'set value(value: number) {}'
  ]) {
    const [result] = await configured.lintText(`class C { ${ member } }`, {
      filePath
    });
    assert.equal(result.messages.filter(
      (
        message,
      ) => message.ruleId === rule,
    ).length, 1, member);
  }

  const [result] = await configured.lintText(`class C {
    public field: number = 1;
    private static count: number = 0;
    protected method(): void {}
    constructor(private readonly name: string) {}
    public get value(): number { return 1; }
    public set value(value: number) {}
  }`, {
    filePath
  });
  assert.equal(result.messages.filter(
    (
      message,
    ) => message.ruleId === rule,
  ).length, 0);
});
