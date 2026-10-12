/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Đọc metadata PNG / APNG trực tiếp từ chunk (không cần thư viện):
 * kích thước, có animation không (chunk acTL), số frame, số vòng lặp, tổng thời
 * lượng (cộng delay của từng fcTL). Dùng cho audit Bước 1.1.
 */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const COLOR_TYPES = {
  0: 'grayscale',
  2: 'rgb',
  3: 'palette',
  4: 'grayscale-alpha',
  6: 'rgba',
};

export function readPngInfo(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return { valid: false };
  }
  const info = {
    valid: true,
    width: 0,
    height: 0,
    bitDepth: 0,
    colorType: 'unknown',
    hasTransparency: false,
    animated: false,
    frames: 1,
    loops: null,
    durationMs: 0,
  };
  let durationSec = 0;
  let pos = 8;
  while (pos + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('latin1', pos + 4, pos + 8);
    const body = pos + 8;
    if (type === 'IHDR') {
      info.width = buffer.readUInt32BE(body);
      info.height = buffer.readUInt32BE(body + 4);
      info.bitDepth = buffer.readUInt8(body + 8);
      info.colorType = COLOR_TYPES[buffer.readUInt8(body + 9)] || `type-${buffer.readUInt8(body + 9)}`;
      if (info.colorType === 'grayscale-alpha' || info.colorType === 'rgba') info.hasTransparency = true;
    } else if (type === 'tRNS') {
      info.hasTransparency = true;
    } else if (type === 'acTL') {
      info.animated = true;
      info.frames = buffer.readUInt32BE(body);
      info.loops = buffer.readUInt16BE(body + 4);
    } else if (type === 'fcTL') {
      const delayNum = buffer.readUInt16BE(body + 16);
      const delayDen = buffer.readUInt16BE(body + 18) || 100;
      durationSec += delayNum / delayDen;
    }
    if (type === 'IEND') break;
    pos += 12 + length;
  }
  info.durationMs = Math.round(durationSec * 1000);
  return info;
}

/*
 * Bỏ các chunk phụ (tEXt/iTXt/zTXt/tIME/eXIf…) khỏi PNG/APNG, giữ nguyên chunk bắt buộc,
 * chunk APNG và chunk màu. Một số file Discord chèn tEXt giữa fcTL và IDAT khiến demuxer
 * APNG của ffmpeg báo "Invalid data". Mỗi chunk có CRC riêng nên chỉ cần bỏ, không tính lại.
 */
const KEEP_CHUNKS = new Set(['IHDR', 'PLTE', 'tRNS', 'acTL', 'fcTL', 'IDAT', 'fdAT', 'IEND', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'bKGD', 'pHYs']);

export function stripAncillaryChunks(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_MAGIC)) return buffer;
  const parts = [buffer.subarray(0, 8)];
  let pos = 8;
  let removed = 0;
  while (pos + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('latin1', pos + 4, pos + 8);
    const end = pos + 12 + length;
    if (end > buffer.length) break;
    if (KEEP_CHUNKS.has(type)) parts.push(buffer.subarray(pos, end));
    else removed += 1;
    pos = end;
    if (type === 'IEND') break;
  }
  return removed ? Buffer.concat(parts) : buffer;
}
