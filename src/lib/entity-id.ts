export function fingerprintToUUID(fingerprint: string): string {
  let h1 = 0x6a09e667, h2 = 0xbb67ae85, h3 = 0x3c6ef372, h4 = 0xa54ff53a;
  for (let i = 0; i < fingerprint.length; i++) {
    const byte = fingerprint.charCodeAt(i);
    h1 = ((h1 << 5) - h1 + byte) | 0;
    h2 = ((h2 << 7) - h2 + byte) | 0;
    h3 = ((h3 << 11) - h3 + byte) | 0;
    h4 = ((h4 << 13) - h4 + byte) | 0;
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  const p3 = ((h3 >>> 0) & 0xffff).toString(16).padStart(4, "0");
  const p4 = ((h3 >>> 16) & 0xffff).toString(16).padStart(4, "0");
  const p5 = (h4 >>> 0).toString(16).padStart(8, "0");
  return `${p1}-${p2.slice(0, 4)}-${p3}-${p4}-${p2.slice(4, 8)}${p5}`;
}
