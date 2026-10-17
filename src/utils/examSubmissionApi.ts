/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ExamAttachment, ExamInteractionMap, ExamInteractionSnapshot, ExamPaper } from '../types';
import { authHeaders } from './session';

export type { ExamInteractionMap, ExamInteractionSnapshot } from '../types';

export interface ExamSubmissionCollection {
  submissions: ExamPaper[];
  approvedSubmissions: ExamPaper[];
}

export interface ExamSubmissionDraft {
  title: string;
  subject: string;
  grade: number;
  examType: string;
  province: string;
  school: string;
  schoolYear: string;
  difficulty: string;
  notes: string;
  files: File[];
}

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result);
    else reject(new Error(`Không đọc được tệp “${file.name}”.`));
  };
  reader.onerror = () => reject(new Error(`Không đọc được tệp “${file.name}”.`));
  reader.readAsDataURL(file);
});

const responseData = async (response: Response): Promise<any> => {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Không thể hoàn tất yêu cầu với máy chủ.');
  }
  return data;
};

export const fetchExamSubmissions = async (): Promise<ExamSubmissionCollection> => {
  const response = await fetch('/api/exam-submissions', {
    headers: authHeaders(),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await responseData(response);
  return {
    submissions: Array.isArray(data.submissions) ? data.submissions as ExamPaper[] : [],
    approvedSubmissions: Array.isArray(data.approvedSubmissions) ? data.approvedSubmissions as ExamPaper[] : [],
  };
};

export const submitExamPaper = async (draft: ExamSubmissionDraft): Promise<ExamPaper> => {
  const attachments = [];
  for (const file of draft.files) {
    attachments.push({ name: file.name, size: file.size, dataUrl: await readFileAsDataUrl(file) });
  }

  const response = await fetch('/api/exam-submissions', {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify({
      title: draft.title,
      subject: draft.subject,
      grade: draft.grade,
      examType: draft.examType,
      province: draft.province,
      school: draft.school,
      schoolYear: draft.schoolYear,
      difficulty: draft.difficulty,
      notes: draft.notes,
      attachments,
    }),
  });
  const data = await responseData(response);
  return data.submission as ExamPaper;
};

export const reviewExamSubmission = async (
  submissionId: string,
  status: 'approved' | 'rejected',
  rejectionReason = '',
): Promise<ExamPaper> => {
  const response = await fetch(`/api/exam-submissions/${encodeURIComponent(submissionId)}/review`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify({ status, rejectionReason }),
  });
  const data = await responseData(response);
  return data.submission as ExamPaper;
};

export const examAttachmentUrl = (
  submissionId: string,
  attachment: Pick<ExamAttachment, 'id'> & { url?: string },
  inline = false,
): string => {
  if (attachment.url) return attachment.url;
  if (!attachment.id) throw new Error('Không tìm thấy mã tệp đính kèm.');
  const base = `/api/exam-submissions/${encodeURIComponent(submissionId)}/attachments/${encodeURIComponent(attachment.id)}`;
  return inline ? `${base}?inline=1` : base;
};

export const downloadExamAttachment = async (
  submissionId: string,
  attachment: ExamAttachment,
): Promise<void> => {
  if (attachment.url) {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const response = await fetch(
    examAttachmentUrl(submissionId, attachment),
    { headers: authHeaders(), credentials: 'same-origin', cache: 'no-store' },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Không thể tải tệp đính kèm.');
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = attachment.name;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

export const fetchExamInteractions = async (): Promise<ExamInteractionMap> => {
  const response = await fetch('/api/exam-interactions', {
    headers: authHeaders(),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await responseData(response);
  return data.interactions && typeof data.interactions === 'object'
    ? data.interactions as ExamInteractionMap
    : {};
};

const postExamInteraction = async (
  paperId: string,
  action: 'like' | 'rating' | 'reviews',
  payload: Record<string, unknown>,
): Promise<ExamInteractionSnapshot> => {
  const response = await fetch(`/api/exam-interactions/${encodeURIComponent(paperId)}/${action}`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await responseData(response);
  return data.interaction as ExamInteractionSnapshot;
};

export const setExamLike = (paperId: string, liked: boolean): Promise<ExamInteractionSnapshot> =>
  postExamInteraction(paperId, 'like', { liked });

export const rateExamPaper = (paperId: string, rating: number): Promise<ExamInteractionSnapshot> =>
  postExamInteraction(paperId, 'rating', { rating });

export const submitExamReview = (
  paperId: string,
  content: string,
  rating: number,
): Promise<ExamInteractionSnapshot> => postExamInteraction(paperId, 'reviews', { content, rating });
