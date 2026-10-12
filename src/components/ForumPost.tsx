/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { Trash2, Edit3 } from 'lucide-react';

export interface ForumPostModerationProps {
  postId: string;
  onDeletePost: (postId: string) => void;
  onEditPost: (postId: string) => void;
  isSuperAdmin: boolean;
}

export const ForumPostModeration: React.FC<ForumPostModerationProps> = ({
  postId,
  onDeletePost,
  onEditPost,
  isSuperAdmin,
}) => {
  if (!isSuperAdmin) return null;

  return (
    <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-white/10 flex-wrap">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEditPost(postId);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/12 hover:bg-amber-500/22 border border-amber-400/30 text-xs font-semibold text-amber-200 hover:text-amber-100 transition-colors cursor-pointer"
      >
        <Edit3 size={13} /> Sửa nội dung
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDeletePost(postId);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/12 hover:bg-rose-500/22 border border-rose-400/30 text-xs font-semibold text-rose-200 hover:text-rose-100 transition-colors cursor-pointer"
      >
        <Trash2 size={13} /> Xóa bài viết
      </button>
    </div>
  );
};

export default ForumPostModeration;
