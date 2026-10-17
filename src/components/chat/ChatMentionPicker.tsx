/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { AtSign, Circle } from 'lucide-react';
import type { ChatMentionCandidate } from '../../utils/chatMentions';
import { DecoratedAvatar } from '../decorations/DecoratedAvatar';
import { ChatRoleIcon } from './ChatRoleIcon';

interface ChatMentionPickerProps {
  id: string;
  open: boolean;
  suggestions: ChatMentionCandidate[];
  activeIndex: number;
  onSelect: (candidate: ChatMentionCandidate) => void;
  onHighlight: (index: number) => void;
}

export function ChatMentionPicker({
  id,
  open,
  suggestions,
  activeIndex,
  onSelect,
  onHighlight,
}: ChatMentionPickerProps) {
  if (!open || suggestions.length === 0) return null;

  return (
    <div className="ff-chat-mention-picker" id={id} role="listbox" aria-label="Gợi ý thành viên để nhắc">
      <div className="ff-chat-mention-picker__heading">
        <span><AtSign size={12} aria-hidden="true" /> Nhắc thành viên</span>
        <kbd>↑ ↓ · Enter</kbd>
      </div>
      <div className="ff-chat-mention-picker__list">
        {suggestions.map((member, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={member.id}
              type="button"
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={selected}
              className={`ff-chat-mention-option${selected ? ' is-active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHighlight(index)}
              onClick={() => onSelect(member)}
            >
              <span className="ff-chat-mention-option__avatar">
                <DecoratedAvatar
                  user={member.user}
                  fallbackSrc={member.avatar}
                  size={30}
                  animate={false}
                  alt=""
                />
                <span className={`ff-chat-mention-option__presence${member.isOnline ? ' is-online' : ''}`} aria-label={member.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'} />
              </span>
              <span className="ff-chat-mention-option__copy">
                <span className="ff-chat-mention-option__name">{member.name}</span>
                <span className="ff-chat-mention-option__meta">{member.isOnline ? 'Đang trực tuyến' : `Lv.${member.level || 1}`}</span>
              </span>
              <ChatRoleIcon user={member.user || { role: member.role || 'STUDENT', staffRole: member.staffRole }} size={12} />
              {member.isOnline && <Circle className="ff-chat-mention-option__live" size={6} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className="ff-chat-mention-picker__footnote">Chọn một người để gửi lời nhắc trong kênh này.</p>
    </div>
  );
}
