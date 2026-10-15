/* Bản quyền trí tuệ thuộc về BroAmStuck */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sniffImageFormat } from './mediaPipeline.ts';
import type { ExamPaperFormat } from '../src/types/index.ts';

export const MAX_EXAM_SUBMISSION_FILES = 12;
export const MAX_EXAM_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_EXAM_SUBMISSION_BYTES = 18 * 1024 * 1024;

export interface ExamSubmissionAttachmentInput {
  name: unknown;
  size?: unknown;
  dataUrl: unknown;
}

export interface StoredExamAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  format: ExamPaperFormat;
  storageExt: string;
}

interface DecodedExamAttachment extends StoredExamAttachment {
  buffer: Buffer;
}

export class ExamSubmissionFileError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ExamSubmissionFileError';
    this.status = status;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']);
const MIME_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  md: 'text/markdown; charset=utf-8',
  markdown: 'text/markdown; charset=utf-8',
  pdf: 'application/pdf',
  png: 'image/png',
  webp: 'image/webp',
};

const extensionOf = (name: string): string => name.split('.').pop()?.toLowerCase() || '';

const safeFileName = (value: unknown): { name: string; extension: string } => {
  if (typeof value !== 'string') throw new ExamSubmissionFileError('Tên tệp không hợp lệ.');
  const rawLeaf = value.replace(/\\/g, '/').split('/').pop() || '';
  const leaf = Array.from(rawLeaf)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join('')
    .trim();
  const extension = extensionOf(leaf);
  if (!extension || leaf.length < extension.length + 2) {
    throw new ExamSubmissionFileError('Mỗi tệp cần có tên và phần mở rộng hợp lệ.');
  }
  const dotExtension = `.${extension}`;
  const base = leaf.slice(0, -dotExtension.length).slice(0, 140 - dotExtension.length).trim();
  if (!base) throw new ExamSubmissionFileError('Tên tệp không hợp lệ.');
  return { name: `${base}${dotExtension}`, extension };
};

const dataUrlBytes = (value: unknown): Buffer => {
  if (typeof value !== 'string') throw new ExamSubmissionFileError('Thiếu nội dung tệp.');
  const match = /^data:[a-z0-9.+/-]+(?:;[a-z0-9=.+_-]+)*;base64,([a-z0-9+/=]+)$/i.exec(value);
  if (!match) throw new ExamSubmissionFileError('Không đọc được nội dung tệp đã chọn.');
  const encoded = match[1];
  if (encoded.length > Math.ceil((MAX_EXAM_ATTACHMENT_BYTES * 4) / 3) + 4) {
    throw new ExamSubmissionFileError('Mỗi tệp tối đa 10 MB.', 413);
  }
  if (encoded.length % 4 !== 0 || !/^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i.test(encoded)) {
    throw new ExamSubmissionFileError('Dữ liệu tệp không hợp lệ.');
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.length === 0) throw new ExamSubmissionFileError('Tệp không được để trống.');
  if (buffer.length > MAX_EXAM_ATTACHMENT_BYTES) {
    throw new ExamSubmissionFileError('Mỗi tệp tối đa 10 MB.', 413);
  }
  return buffer;
};

const decodeAttachment = (input: ExamSubmissionAttachmentInput): DecodedExamAttachment => {
  const { name, extension } = safeFileName(input.name);
  const buffer = dataUrlBytes(input.dataUrl);
  const reportedSize = Number(input.size);
  if (input.size !== undefined && Number.isFinite(reportedSize) && reportedSize !== buffer.length) {
    throw new ExamSubmissionFileError(`Kích thước tệp “${name}” không khớp nội dung tải lên.`);
  }

  let format: ExamPaperFormat;
  const mimeType = MIME_BY_EXTENSION[extension];
  if (IMAGE_EXTENSIONS.has(extension)) {
    const detected = sniffImageFormat(buffer);
    const expected = extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : extension;
    if (detected !== expected) throw new ExamSubmissionFileError(`Tệp “${name}” không phải ảnh ${extension.toUpperCase()} hợp lệ.`);
    format = 'IMAGE';
  } else if (extension === 'pdf') {
    if (buffer.length < 8 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new ExamSubmissionFileError(`Tệp “${name}” không phải PDF hợp lệ.`);
    }
    format = 'PDF';
  } else if (extension === 'docx') {
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new ExamSubmissionFileError(`Tệp “${name}” không phải DOCX hợp lệ.`);
    }
    format = 'DOCX';
  } else if (extension === 'doc') {
    const oleSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    if (buffer.length < oleSignature.length || !buffer.subarray(0, oleSignature.length).equals(oleSignature)) {
      throw new ExamSubmissionFileError(`Tệp “${name}” không phải DOC hợp lệ.`);
    }
    format = 'DOC';
  } else if (extension === 'md' || extension === 'markdown') {
    if (buffer.includes(0)) throw new ExamSubmissionFileError(`Tệp “${name}” không phải Markdown dạng văn bản.`);
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      throw new ExamSubmissionFileError(`Tệp “${name}” phải dùng mã hoá UTF-8.`);
    }
    format = 'MD';
  } else {
    throw new ExamSubmissionFileError('Chỉ nhận ảnh JPG, PNG, WebP, GIF, AVIF, PDF, DOC/DOCX và Markdown.');
  }

  return {
    id: crypto.randomUUID(),
    name,
    size: buffer.length,
    mimeType,
    format,
    storageExt: extension,
    buffer,
  };
};

export const isExamSubmissionUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export const examSubmissionsDirectory = (): string => {
  const dataDir = process.env.FFORUM_DATA_DIR
    ? path.resolve(process.env.FFORUM_DATA_DIR)
    : path.resolve(process.cwd(), 'data');
  return path.join(dataDir, 'exam-submissions');
};

export const storeExamSubmissionAttachments = async (
  submissionId: string,
  inputs: ExamSubmissionAttachmentInput[],
): Promise<StoredExamAttachment[]> => {
  if (!isExamSubmissionUuid(submissionId)) throw new ExamSubmissionFileError('Mã đề gửi lên không hợp lệ.');
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > MAX_EXAM_SUBMISSION_FILES) {
    throw new ExamSubmissionFileError(`Đính kèm từ 1 đến ${MAX_EXAM_SUBMISSION_FILES} tệp.`);
  }

  const decoded = inputs.map(decodeAttachment);
  const totalBytes = decoded.reduce((total, item) => total + item.size, 0);
  if (totalBytes > MAX_EXAM_SUBMISSION_BYTES) {
    throw new ExamSubmissionFileError('Tổng dung lượng tệp tối đa 18 MB.', 413);
  }

  const root = examSubmissionsDirectory();
  const finalDirectory = path.join(root, submissionId);
  const temporaryDirectory = path.join(root, `.tmp-${crypto.randomUUID()}`);
  try {
    await fs.promises.mkdir(root, { recursive: true, mode: 0o700 });
    await fs.promises.mkdir(temporaryDirectory, { mode: 0o700 });
    for (const item of decoded) {
      const target = path.join(temporaryDirectory, `${item.id}.${item.storageExt}`);
      await fs.promises.writeFile(target, item.buffer, { flag: 'wx', mode: 0o600 });
    }
    await fs.promises.rename(temporaryDirectory, finalDirectory);
    return decoded.map(({ buffer: _buffer, ...metadata }) => metadata);
  } catch (error) {
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
};

export const examSubmissionAttachmentPath = (
  submissionId: string,
  attachment: Pick<StoredExamAttachment, 'id' | 'storageExt'>,
): string | null => {
  if (!isExamSubmissionUuid(submissionId) || !isExamSubmissionUuid(attachment.id)) return null;
  if (!/^(?:avif|doc|docx|gif|jpeg|jpg|md|markdown|pdf|png|webp)$/.test(attachment.storageExt)) return null;
  return path.join(examSubmissionsDirectory(), submissionId, `${attachment.id}.${attachment.storageExt}`);
};

export const removeExamSubmissionFiles = async (submissionId: string): Promise<void> => {
  if (!isExamSubmissionUuid(submissionId)) return;
  await fs.promises.rm(path.join(examSubmissionsDirectory(), submissionId), { recursive: true, force: true });
};

export const removeExamSubmissionTemporaryDirectories = async (): Promise<void> => {
  const root = examSubmissionsDirectory();
  try {
    const entries = await fs.promises.readdir(root, { withFileTypes: true });
    await Promise.all(entries
      .filter((entry) => entry.isDirectory() && /^\.tmp-[0-9a-f-]{36}$/i.test(entry.name))
      .map((entry) => fs.promises.rm(path.join(root, entry.name), { recursive: true, force: true })));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};
