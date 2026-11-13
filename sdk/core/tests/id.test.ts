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
