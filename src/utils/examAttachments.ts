/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ExamPaperFormat } from '../types';

export interface ExamAttachmentFileLike {
  name: string;
  type?: string;
  size?: number;
}

export const MAX_EXAM_SUBMISSION_FILES = 12;
export const MAX_EXAM_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_EXAM_SUBMISSION_BYTES = 18 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp']);
const extensionOf = (name: string): string => name.split('.').pop()?.trim().toLowerCase() || '';

export const isSupportedExamAttachment = (file: ExamAttachmentFileLike): boolean => {
  const extension = extensionOf(file.name);
  return (
    IMAGE_EXTENSIONS.has(extension) ||
    extension === 'pdf' ||
    extension === 'docx' ||
    extension === 'doc' ||
    extension === 'md' ||
    extension === 'markdown'
  );
};

export const examAttachmentFormat = (file: ExamAttachmentFileLike): ExamPaperFormat => {
  const extension = extensionOf(file.name);
  if (IMAGE_EXTENSIONS.has(extension)) return 'IMAGE';
  if (extension === 'docx') return 'DOCX';
  if (extension === 'doc') return 'DOC';
  if (extension === 'md' || extension === 'markdown') return 'MD';
  return 'PDF';
};

export const formatExamFileSize = (bytes: number): string => {
  const safeBytes = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  if (safeBytes < 1024 * 1024) return `${Math.max(1, Math.round(safeBytes / 1024))} KB`;
  return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
};
