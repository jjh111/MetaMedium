// The digest sources are kept under: the published vectors, and the platform's own digest on every length that
// crosses a block boundary.

import { describe, it, expect } from 'vitest';
import { sha256Hex } from './sha256';

const text = (s: string) => new TextEncoder().encode(s);

async function platform(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(d).map((x) => x.toString(16).padStart(2, '0')).join('');
}

describe('sha256Hex', () => {
  it('matches the published vectors', () => {
    expect(sha256Hex(text(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex(text('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex(text('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  it('agrees with the platform on every length around a block, and on a view into a larger buffer', async () => {
    const big = new Uint8Array(400);
    for (let i = 0; i < big.length; i++) big[i] = (i * 31 + 7) & 255;
    for (let n = 0; n <= 200; n++) {
      const view = big.subarray(3, 3 + n);
      expect(sha256Hex(view)).toBe(await platform(view.slice()));
    }
    expect(sha256Hex(big)).toBe(await platform(big));
  });

  it('is 64 lower-case hex digits', () => {
    expect(sha256Hex(text('dyna.ink'))).toMatch(/^[0-9a-f]{64}$/);
  });
});
