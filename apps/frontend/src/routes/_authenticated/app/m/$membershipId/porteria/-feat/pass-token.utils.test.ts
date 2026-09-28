import { describe, expect, it } from 'vitest';

import { parsePassToken } from './pass-token.utils';

const TOKEN = 'q3Zk9x_T-4bLmN0pQrStUv';

describe('parsePassToken', () => {
  it('accepts a bare token, trimming what the scanner or paste added', () => {
    expect(parsePassToken(TOKEN)).toBe(TOKEN);
    expect(parsePassToken(`  ${TOKEN}\n`)).toBe(TOKEN);
  });

  it('extracts the token from a full public Pase link', () => {
    expect(parsePassToken(`https://visitpass.co/p/${TOKEN}`)).toBe(TOKEN);
    expect(parsePassToken(`http://localhost:5650/p/${TOKEN}/`)).toBe(TOKEN);
    expect(parsePassToken(`https://visitpass.co/p/${TOKEN}?utm=wa#top`)).toBe(
      TOKEN
    );
    expect(parsePassToken(`/p/${TOKEN}`)).toBe(TOKEN);
  });

  it('rejects text that is not a Pase', () => {
    expect(parsePassToken('')).toBeNull();
    expect(parsePassToken('   ')).toBeNull();
    expect(parsePassToken('WIFI:S:Porteria;T:WPA;P:secreto;;')).toBeNull();
    expect(parsePassToken('https://example.com/menu')).toBeNull();
    expect(parsePassToken('abc123')).toBeNull();
    expect(parsePassToken('https://visitpass.co/p/%E0%A4%A')).toBeNull();
    expect(parsePassToken(`${TOKEN} ${TOKEN}`)).toBeNull();
  });
});
