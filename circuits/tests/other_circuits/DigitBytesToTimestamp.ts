// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');
import path from 'path';

// Convert date to string format expected by circom
// ASCII encoding of YYYYMMDDHHMMSS
function getDataParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

describe('date-to-timestamp', function () {
  this.timeout(0);

  let circuit: any;

  this.beforeAll(async () => {
    circuit = await circom_tester(path.join(__dirname, './', 'circuits', 'timestamp-test.circom'), {
      recompile: true,
      include: [
        path.join(__dirname, '../node_modules'),
        path.join(__dirname, '../../../node_modules'),
      ],
    });
  });

  it('should calculate unix time for date string correctly', async () => {
    const now = new Date();
    const parts = getDataParts(now);
    const timestamp = Math.floor(now.getTime() / 1000);

    const witness = await circuit.calculateWitness({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    });

    await circuit.checkConstraints(witness);

    await circuit.assertOut(witness, {
      out: timestamp,
    });
  });

  it('should calculate unix time for date in a leap year before feb correctly', async () => {
    const now = new Date('2020-01-01T10:00:00.000Z');
    const parts = getDataParts(now);
    const timestamp = Math.floor(now.getTime() / 1000);

    const witness = await circuit.calculateWitness({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    });

    await circuit.assertOut(witness, {
      out: timestamp,
    });
  });

  it('should calculate unix time for date in a leap year after feb correctly', async () => {
    const now = new Date('2020-10-01T10:00:00.000Z');
    const parts = getDataParts(now);
    const timestamp = Math.floor(now.getTime() / 1000);

    const witness = await circuit.calculateWitness({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    });

    await circuit.assertOut(witness, {
      out: timestamp,
    });
  });

  it('should calculate timestamp rounded to hour correctly', async () => {
    const now = new Date('2020-10-01T10:00:00.000Z');
    const parts = getDataParts(now);
    const timestamp = Math.floor(now.getTime() / 1000);
    const roundedTimestamp = Math.floor(timestamp / 3600) * 3600;

    const witness = await circuit.calculateWitness({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: 0,
      second: 0,
    });

    await circuit.assertOut(witness, {
      out: roundedTimestamp,
    });
  });
});
