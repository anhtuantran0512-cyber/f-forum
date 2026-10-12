/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Đọc ZIP "chia phần byte" (avatar_1.zip … avatar_23.zip ghép lại = một archive):
 * tự nối các phần liên tiếp để tìm End-Of-Central-Directory, rồi đọc trực tiếp từng
 * entry (deflate qua node:zlib, CRC32 kiểm tra). Không cần thư viện ngoài.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

export function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

/** Ghép nhiều file (các phần của MỘT zip) thành một buffer đọc theo kiểu "siêu buffer". */
export function openZip(parts) {
  const bufs = parts.map((p) => fs.readFileSync(p));
  const totalBytes = bufs.reduce((sum, b) => sum + b.length, 0);
  const at = (offset) => {
    let pos = offset;
    for (const b of bufs) {
      if (pos < b.length) return b[pos];
      pos -= b.length;
    }
    return undefined;
  };
  const readUInt32LE = (offset) => (at(offset) | (at(offset + 1) << 8) | (at(offset + 2) << 16) | (at(offset + 3) << 24)) >>> 0;
  const readUInt16LE = (offset) => at(offset) | (at(offset + 1) << 8);

  /* EOCD: signature 0x06054b50, tìm từ cuối (comment tối đa 65535 byte). */
  let eocd = -1;
  const minStart = Math.max(0, totalBytes - 65557);
  for (let i = totalBytes - 22; i >= minStart; i -= 1) {
    if (at(i) === 0x50 && at(i + 1) === 0x4b && at(i + 2) === 0x05 && at(i + 3) === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Không tìm thấy End-Of-Central-Directory — thiếu phần zip?');
  const count = readUInt16LE(eocd + 10);
  const cdOffset = readUInt32LE(eocd + 16);

  const entries = new Map();
  let pos = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (readUInt32LE(pos) !== 0x02014b50) break;
    const compression = readUInt16LE(pos + 10);
    const crc = readUInt32LE(pos + 16);
    const compSize = readUInt32LE(pos + 20);
    const nameLen = readUInt16LE(pos + 28);
    const extraLen = readUInt16LE(pos + 30);
    const commentLen = readUInt16LE(pos + 32);
    const localOffset = readUInt32LE(pos + 42);
    let name = '';
    for (let c = 0; c < nameLen; c += 1) name += String.fromCharCode(at(pos + 46 + c));
    entries.set(name, { name, compression, crc, compSize, localOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }

  const readEntry = (entry) => {
    const { localOffset } = entry;
    if (readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Local header hỏng: ${entry.name}`);
    const nameLen = readUInt16LE(localOffset + 26);
    const extraLen = readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + nameLen + extraLen;
    const chunks = [];
    let remaining = entry.compSize;
    let offset = start;
    for (const b of bufs) {
      if (offset >= b.length) {
        offset -= b.length;
        continue;
      }
      const end = Math.min(b.length, offset + remaining);
      chunks.push(b.subarray(offset, end));
      remaining -= end - offset;
      offset = 0;
      if (remaining === 0) break;
    }
    let data = remaining === 0 ? Buffer.concat(chunks) : null;
    if (!data || data.length !== entry.compSize) throw new Error(`Entry cắt cụt: ${entry.name}`);
    if (entry.compression === 0) {
      data = Buffer.from(data);
    } else if (entry.compression === 8) {
      data = zlib.inflateRawSync(data);
    } else {
      throw new Error(`Method ${entry.compression} chưa hỗ trợ: ${entry.name}`);
    }
    const actual = crc32(data);
    if (actual !== entry.crc) throw new Error(`CRC lệch: ${entry.name} (mở ${actual.toString(16)}, đúng ${entry.crc.toString(16)})`);
    return data;
  };

  return { entries, readEntry, close() {}, totalBytes };
}
