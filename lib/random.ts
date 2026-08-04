import { randomUUID } from 'node:crypto';

export type RandomSource = () => number;

const RNG_VERSION = 'v1';

function cyrb128(value: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ character, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ character, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ character, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ character, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0
  ];
}

function sfc32(a: number, b: number, c: number, d: number): RandomSource {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;

    let value = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    value = (value + d) | 0;
    c = (c + value) | 0;

    return (value >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed: string): RandomSource {
  return sfc32(...cyrb128(`${RNG_VERSION}:${seed}`));
}

export function generateSeed(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
}

export function normalizeSeed(seed?: string | null): string {
  const normalized = seed?.trim().slice(0, 64);
  return normalized || generateSeed();
}
