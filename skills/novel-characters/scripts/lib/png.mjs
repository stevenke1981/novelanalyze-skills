import { deflateSync, inflateSync } from 'node:zlib';

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? (0xedb88320 ^ (value >>> 1)) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

export function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBuffer, data]);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  typeBuffer.copy(header, 4);
  const trailer = Buffer.alloc(4);
  trailer.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([header, data, trailer]);
}

export function encodePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue] = pixel(x, y);
      const offset = row + 1 + x * 3;
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([PNG_SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export function encodeSolidPng(width, height, rgb = [0x80, 0x80, 0x80]) {
  return encodePng(width, height, () => rgb);
}

export function encodeCheckerPng(width, height, rgbA = [220, 40, 40], rgbB = [40, 40, 220]) {
  return encodePng(width, height, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? rgbA : rgbB));
}

export function readPngHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33) return null;
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.readUInt32BE(8) !== 13 || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    compression: buffer[26],
    filter: buffer[27],
    interlace: buffer[28],
  };
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  if (distanceUp <= distanceUpLeft) return up;
  return upLeft;
}

function unfilter(raw, width, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(stride * (raw.length / (stride + 1)));
  let source = 0;
  let dest = 0;
  let previous = Buffer.alloc(stride);
  while (source < raw.length) {
    const type = raw[source];
    source += 1;
    const row = raw.subarray(source, source + stride);
    source += stride;
    const current = Buffer.alloc(stride);
    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
      const up = previous[index];
      const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
      const byte = row[index];
      if (type === 0) current[index] = byte;
      else if (type === 1) current[index] = (byte + left) & 255;
      else if (type === 2) current[index] = (byte + up) & 255;
      else if (type === 3) current[index] = (byte + Math.floor((left + up) / 2)) & 255;
      else if (type === 4) current[index] = (byte + paeth(left, up, upLeft)) & 255;
      else return null;
    }
    current.copy(pixels, dest);
    dest += stride;
    previous = current;
  }
  return pixels;
}

export function decodePngRgb(buffer) {
  const header = readPngHeader(buffer);
  if (!header || header.bitDepth !== 8 || header.compression !== 0 || header.filter !== 0 || header.interlace !== 0) {
    return null;
  }
  if (header.colorType !== 2 && header.colorType !== 6) return null;
  const bytesPerPixel = header.colorType === 6 ? 4 : 3;
  const idat = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (!idat.length) return null;
  let raw;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }
  const expected = (header.width * bytesPerPixel + 1) * header.height;
  if (raw.length < expected) return null;
  const unpacked = unfilter(raw.subarray(0, expected), header.width, bytesPerPixel);
  if (!unpacked) return null;
  if (bytesPerPixel === 3) return { width: header.width, height: header.height, rgb: unpacked };
  const rgb = Buffer.alloc(header.width * header.height * 3);
  for (let index = 0, out = 0; index < unpacked.length; index += 4, out += 3) {
    rgb[out] = unpacked[index];
    rgb[out + 1] = unpacked[index + 1];
    rgb[out + 2] = unpacked[index + 2];
  }
  return { width: header.width, height: header.height, rgb };
}

export function parseAspectRatio(value) {
  const match = String(value ?? '').trim().match(/^(\d+)\s*:\s*(\d+)$/);
  if (!match || Number(match[2]) === 0) return null;
  return Number(match[1]) / Number(match[2]);
}

export function aspectMatches(width, height, ratio, tolerance = 0.06) {
  const expected = parseAspectRatio(ratio);
  if (!expected || !width || !height) return false;
  return Math.abs(width / height - expected) / expected <= tolerance;
}

export function averageHash(rgb, width, height) {
  const cells = [];
  for (let gridY = 0; gridY < 8; gridY += 1) {
    for (let gridX = 0; gridX < 8; gridX += 1) {
      const x0 = Math.floor((gridX * width) / 8);
      const x1 = Math.max(x0 + 1, Math.floor(((gridX + 1) * width) / 8));
      const y0 = Math.floor((gridY * height) / 8);
      const y1 = Math.max(y0 + 1, Math.floor(((gridY + 1) * height) / 8));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const offset = (y * width + x) * 3;
          sum += (rgb[offset] + rgb[offset + 1] + rgb[offset + 2]) / 3;
          count += 1;
        }
      }
      cells.push(count ? sum / count : 0);
    }
  }
  const average = cells.reduce((sum, value) => sum + value, 0) / cells.length;
  return cells.map((value) => (value >= average ? 1 : 0));
}

export function hammingDistance(left, right) {
  const length = Math.min(left.length, right.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance + Math.abs(left.length - right.length);
}
