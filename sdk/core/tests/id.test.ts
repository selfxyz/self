import test from 'node:test';
import assert from 'node:assert';
import { formatMrzNameForDisplay, splitMrzName } from '../src/utils/id.js';

test('splits surname and given names at the first <<', () => {
  assert.deepStrictEqual(splitMrzName('DOE<<JANE<MARIE<<<<<<'), {
    surname: 'DOE',
    givenNames: 'JANE MARIE',
  });
});

test('keeps a compound surname as space-separated words', () => {
  assert.deepStrictEqual(splitMrzName('GARCIA<LOPEZ<<MARIA<<<'), {
    surname: 'GARCIA LOPEZ',
    givenNames: 'MARIA',
  });
});

test('omits givenNames when nothing follows <<', () => {
  assert.deepStrictEqual(splitMrzName('DOE<<<<<<<<'), { surname: 'DOE' });
  assert.deepStrictEqual(splitMrzName('MADONNA<<<<'), { surname: 'MADONNA' });
});

test('returns undefined when there is no << boundary', () => {
  assert.strictEqual(splitMrzName('MADONNA'), undefined);
});

test('ignores null byte padding', () => {
  assert.deepStrictEqual(splitMrzName('DOE<<JANE<MARIE\x00\x00'), {
    surname: 'DOE',
    givenNames: 'JANE MARIE',
  });
});

test('handles a truncated name', () => {
  assert.deepStrictEqual(splitMrzName('WOLFESCHLEGEL<<HUBERT<BLAINE<CHARLE'), {
    surname: 'WOLFESCHLEGEL',
    givenNames: 'HUBERT BLAINE CHARLE',
  });
});

test('returns undefined for an empty string', () => {
  assert.strictEqual(splitMrzName(''), undefined);
});

test('formatMrzNameForDisplay keeps the existing display name', () => {
  assert.strictEqual(formatMrzNameForDisplay('DOE<<JANE<MARIE<<<'), 'DOE JANE MARIE');
});

test('formatMrzNameForDisplay still glues one-letter words', () => {
  // `name` is hashed by consumers, so this quirk must not change. The split
  // parts below deliberately differ from it.
  assert.strictEqual(formatMrzNameForDisplay('DOE<<J<MARIE<<<'), 'DOE JMARIE');
});

test('keeps initials as separate given-name words', () => {
  assert.deepStrictEqual(splitMrzName('DOE<<J<MARIE<<<'), {
    surname: 'DOE',
    givenNames: 'J MARIE',
  });
});

test('returns undefined when the surname is empty', () => {
  assert.strictEqual(splitMrzName('<<JANE'), undefined);
});

test('returns undefined when a surname fills the field with no <<', () => {
  assert.strictEqual(splitMrzName('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLM'), undefined);
});
