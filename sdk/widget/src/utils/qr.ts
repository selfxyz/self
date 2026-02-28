// Lightweight QR code generation — no external dependency.
// Uses the QR code algorithm directly to produce an SVG string.
// For the widget we generate a simple URL-mode QR (alphanumeric/byte mode).

// We use a minimal vendored QR encoder. The full spec is large, but for our use case
// (URLs under 300 chars) we only need version <=10 with error correction level M.

// For now, we use a canvas-based approach with the browser's built-in capabilities
// via a small inline QR generator.

const EC_LEVEL = 1; // M = 1

// QR code matrix generation using the qr-creator algorithm (MIT licensed, ~3KB)
// We inline a minimal QR encoder to avoid any npm dependency for the CDN build.

interface QROptions {
  value: string;
  size: number;
  darkColor?: string;
  lightColor?: string;
  logoSvg?: string;
}

// Galois field and polynomial math for Reed-Solomon error correction
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function rsEncode(data: number[], ecCount: number): number[] {
  const gen: number[] = new Array(ecCount + 1).fill(0);
  gen[0] = 1;
  for (let i = 0; i < ecCount; i++) {
    for (let j = i + 1; j > 0; j--) {
      gen[j] = gen[j] ^ gfMul(gen[j - 1], GF256_EXP[i]);
    }
  }
  const result = new Array(ecCount).fill(0);
  for (const byte of data) {
    const lead = byte ^ result[0];
    for (let i = 0; i < ecCount - 1; i++) {
      result[i] = result[i + 1] ^ gfMul(gen[i + 1], lead);
    }
    result[ecCount - 1] = gfMul(gen[ecCount], lead);
  }
  return result;
}

// QR version capacity table (byte mode, EC level M)
// [totalCodewords, ecCodewordsPerBlock, numBlocks1, dataPerBlock1, numBlocks2?, dataPerBlock2?]
const VERSION_TABLE: number[][] = [
  [], // v0 placeholder
  [26, 10, 1, 16],
  [44, 16, 1, 28],
  [70, 26, 1, 44],
  [100, 18, 2, 32],
  [134, 24, 2, 43],
  [172, 16, 4, 27],
  [196, 18, 4, 31],
  [242, 22, 4, 38],
  [292, 22, 2, 36, 2, 46],
  [346, 26, 4, 43, 1, 45],
  [404, 30, 1, 50, 4, 51],
  [466, 22, 6, 36, 2, 37],
  [532, 22, 8, 37, 1, 38],
  [581, 24, 4, 40, 5, 41],
];

function getVersion(dataLen: number): number {
  for (let v = 1; v < VERSION_TABLE.length; v++) {
    const info = VERSION_TABLE[v];
    const totalBlocks = info[2] + (info[4] || 0);
    const totalData = info[0] - info[1] * totalBlocks;
    // Byte mode overhead: mode indicator (4) + char count (8 or 16 bits)
    const charCountBits = v <= 9 ? 8 : 16;
    const overhead = Math.ceil((4 + charCountBits) / 8);
    if (dataLen <= totalData - overhead) return v;
  }
  throw new Error('Data too long for QR code');
}

function encodeData(text: string, version: number): number[] {
  const size = version <= 9 ? 8 : 16;
  const bytes = new TextEncoder().encode(text);
  const bits: number[] = [];

  // Mode indicator: byte mode = 0100
  bits.push(0, 1, 0, 0);

  // Character count
  for (let i = size - 1; i >= 0; i--) {
    bits.push((bytes.length >> i) & 1);
  }

  // Data bytes
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((b >> i) & 1);
    }
  }

  // Terminator (up to 4 bits)
  const info = VERSION_TABLE[version];
  const totalBlocks = info[2] + (info[4] || 0);
  const totalData = info[0] - info[1] * totalBlocks;
  const totalBits = totalData * 8;

  for (let i = 0; i < 4 && bits.length < totalBits; i++) {
    bits.push(0);
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalBits) {
    for (let i = 7; i >= 0; i--) {
      bits.push((padBytes[padIdx] >> i) & 1);
    }
    padIdx = (padIdx + 1) % 2;
  }

  // Convert to byte array
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] || 0);
    }
    dataBytes.push(byte);
  }

  return dataBytes;
}

function interleaveBlocks(data: number[], version: number): number[] {
  const info = VERSION_TABLE[version];
  const ecPerBlock = info[1];
  const numBlocks1 = info[2];
  const dataPerBlock1 = info[3];
  const numBlocks2 = info[4] || 0;
  const dataPerBlock2 = info[5] || 0;

  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;

  for (let i = 0; i < numBlocks1; i++) {
    const block = data.slice(offset, offset + dataPerBlock1);
    blocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += dataPerBlock1;
  }

  for (let i = 0; i < numBlocks2; i++) {
    const block = data.slice(offset, offset + dataPerBlock2);
    blocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += dataPerBlock2;
  }

  const result: number[] = [];
  const maxDataLen = Math.max(dataPerBlock1, dataPerBlock2);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) result.push(ec[i]);
    }
  }

  return result;
}

// Alignment pattern positions per version
const ALIGNMENT_POSITIONS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
];

// Format info bits for EC level M + mask patterns 0-7
const FORMAT_INFO = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

function createMatrix(version: number): { modules: boolean[][]; reserved: boolean[][] } {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  // Finder patterns
  function addFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue;
        reserved[mr][mc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          modules[mr][mc] =
            r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0;
    reserved[6][i] = true;
    modules[i][6] = i % 2 === 0;
    reserved[i][6] = true;
  }

  // Alignment patterns
  if (version >= 2) {
    const positions = ALIGNMENT_POSITIONS[version];
    for (const row of positions) {
      for (const col of positions) {
        if (reserved[row][col]) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            reserved[row + r][col + c] = true;
            modules[row + r][col + c] =
              r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          }
        }
      }
    }
  }

  // Dark module
  modules[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true;
    reserved[8][size - 1 - i] = true;
    reserved[i][8] = true;
    reserved[size - 1 - i][8] = true;
  }
  reserved[8][8] = true;

  return { modules, reserved };
}

function placeData(modules: boolean[][], reserved: boolean[][], data: number[]): void {
  const size = modules.length;
  const bits: number[] = [];
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // Skip timing column

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (!reserved[row][cc]) {
          modules[row][cc] = bitIdx < bits.length ? bits[bitIdx] === 1 : false;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }
}

function applyMask(modules: boolean[][], reserved: boolean[][], mask: number): void {
  const size = modules.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      let invert = false;
      switch (mask) {
        case 0:
          invert = (r + c) % 2 === 0;
          break;
        case 1:
          invert = r % 2 === 0;
          break;
        case 2:
          invert = c % 3 === 0;
          break;
        case 3:
          invert = (r + c) % 3 === 0;
          break;
        case 4:
          invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
          break;
        case 5:
          invert = ((r * c) % 2) + ((r * c) % 3) === 0;
          break;
        case 6:
          invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
          break;
        case 7:
          invert = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
          break;
      }
      if (invert) modules[r][c] = !modules[r][c];
    }
  }
}

function placeFormatInfo(modules: boolean[][], version: number, mask: number): void {
  const size = version * 4 + 17;
  const formatBits = FORMAT_INFO[mask];

  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;

    // Around top-left finder
    if (i < 6) {
      modules[8][i] = bit;
    } else if (i < 8) {
      modules[8][i + 1] = bit;
    } else if (i < 9) {
      modules[8 - (i - 8)][8] = bit;
    } else {
      modules[14 - i][8] = bit;
    }

    // Around other finders
    if (i < 8) {
      modules[size - 1 - i][8] = bit;
    } else {
      modules[8][size - 15 + i] = bit;
    }
  }
}

function scoreMask(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;

  // Penalty 1: runs of same color
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === modules[r][c - 1]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else {
        run = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === modules[r - 1][c]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else {
        run = 1;
      }
    }
  }

  // Penalty 3: finder-like patterns
  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [...pattern1].reverse();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let match1 = true;
      let match2 = true;
      for (let i = 0; i < 11; i++) {
        if (modules[r][c + i] !== pattern1[i]) match1 = false;
        if (modules[r][c + i] !== pattern2[i]) match2 = false;
      }
      if (match1 || match2) score += 40;
    }
  }

  return score;
}

export function generateQRMatrix(text: string): boolean[][] {
  const version = getVersion(new TextEncoder().encode(text).length);
  const data = encodeData(text, version);
  const codewords = interleaveBlocks(data, version);

  let bestModules: boolean[][] | null = null;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const { modules, reserved } = createMatrix(version);
    placeData(modules, reserved, codewords);
    applyMask(modules, reserved, mask);
    placeFormatInfo(modules, version, mask);

    const score = scoreMask(modules);
    if (score < bestScore) {
      bestScore = score;
      bestModules = modules.map((row) => [...row]);
    }
  }

  return bestModules!;
}

export function renderQRToSVG(options: QROptions): string {
  const { value, size, darkColor = '#000000', lightColor = '#ffffff' } = options;
  const matrix = generateQRMatrix(value);
  const moduleCount = matrix.length;
  const quietZone = 2;
  const totalModules = moduleCount + quietZone * 2;
  const moduleSize = size / totalModules;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="${lightColor}"/>`;

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (matrix[row][col]) {
        const x = (col + quietZone) * moduleSize;
        const y = (row + quietZone) * moduleSize;
        svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${darkColor}"/>`;
      }
    }
  }

  // Logo overlay in center (clear area + logo)
  if (options.logoSvg) {
    const logoSize = size * 0.22;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;
    const bgPad = logoSize * 0.1;
    svg += `<rect x="${logoX - bgPad}" y="${logoY - bgPad}" width="${logoSize + bgPad * 2}" height="${logoSize + bgPad * 2}" fill="${lightColor}" rx="4"/>`;
    svg += `<g transform="translate(${logoX},${logoY})">`;
    // Embed the Self logo scaled to logoSize
    svg += `<svg width="${logoSize}" height="${logoSize}" viewBox="0 0 92 92">`;
    svg += `<rect width="92" height="92" fill="${lightColor}"/>`;
    svg += `<path d="M29.4862 38.0341C29.4862 32.8577 33.6281 28.6604 38.7362 28.6604H56.599L76.3837 8.61108H27.0606L9.3623 26.5461V56.0524H29.4862V38.0237V38.0341Z" fill="${darkColor}"/>`;
    svg += `<path d="M63.2384 36.0864V53.4903C63.2384 58.6666 59.0965 62.864 53.9884 62.864H36.8142L16.3409 83.6111H65.664L83.3623 65.6761V36.0968H63.2384V36.0864Z" fill="${darkColor}"/>`;
    svg += `<path d="M46.3726 37.3923H46.3623C41.6113 37.3923 37.7598 41.2959 37.7598 46.1111V46.1215C37.7598 50.9367 41.6113 54.8403 46.3623 54.8403H46.3726C51.1236 54.8403 54.9751 50.9367 54.9751 46.1215V46.1111C54.9751 41.2959 51.1236 37.3923 46.3726 37.3923Z" fill="${darkColor}"/>`;
    svg += `</svg></g>`;
  }

  svg += '</svg>';
  return svg;
}
