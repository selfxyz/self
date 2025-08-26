import fetchMock from 'jest-fetch-mock';
import { fetchOfacTrees } from '@/utils/ofac';

fetchMock.enableMocks();

describe('fetchOfacTrees', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('fetches passport variant in prod', async () => {
    fetchMock.mockResponses(
      [JSON.stringify({ status: 'success', data: 'pp' }), { status: 200 }],
      [JSON.stringify({ status: 'success', data: 'dob' }), { status: 200 }],
      [JSON.stringify({ status: 'success', data: 'yob' }), { status: 200 }],
    );

    const result = await fetchOfacTrees('prod', 'passport');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      passportNoAndNationality: 'pp',
      nameAndDob: 'dob',
      nameAndYob: 'yob',
    });
  });

  it('fetches id_card variant in staging', async () => {
    fetchMock.mockResponses(
      [JSON.stringify({ status: 'success', data: 'dob' }), { status: 200 }],
      [JSON.stringify({ status: 'success', data: 'yob' }), { status: 200 }],
    );

    const result = await fetchOfacTrees('stg', 'id_card');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      passportNoAndNationality: null,
      nameAndDob: 'dob',
      nameAndYob: 'yob',
    });
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResponseOnce('', { status: 500 });

    await expect(fetchOfacTrees('prod', 'id_card')).rejects.toThrow('HTTP error');
  });

  it('throws on invalid response body', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ status: 'error' }),
      { status: 200 },
    );

    await expect(fetchOfacTrees('prod', 'id_card')).rejects.toThrow('Failed to fetch tree');
  });
});

