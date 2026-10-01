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
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDeletePost(postId);
        }}
        className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
      >
        <Trash2 size={12} /> Xóa bài viết
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEditPost(postId);
        }}
        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
      >
        <Edit3 size={12} /> Sửa nội dung
      </button>
    </div>
  );
};

export default ForumPostModeration;
