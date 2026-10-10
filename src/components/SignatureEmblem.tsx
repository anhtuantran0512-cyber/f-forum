/* Icon đồng bộ Rank & Boutique: hình khối mảnh, bạc + điểm vàng; không neon nhiều màu. */
import { Archive, Award, Bird, Blocks, BookMarked, BookOpen, BookText, Bookmark, CalendarDays, CircleCheck, Clock3, Compass, DraftingCompass, Droplets, FlaskConical, Footprints, Frame, Gem, GraduationCap, Grid3X3, Hourglass, Lamp, LampDesk, Layers3, Leaf, LibraryBig, Lightbulb, ListChecks, MessageCircleQuestionMark, MessagesSquare, Microscope, Moon, MoonStar, Network, NotebookPen, Palette, PanelTop, Pencil, PencilLine, Pin, Presentation, Ruler, ScanSearch, ScrollText, Search, Share2, Sparkles, Square, SquarePen, Stamp, StickyNote, Sunrise, Timer, Trees, Users, UsersRound } from 'lucide-react';
import type { FC } from 'react';
import './SignatureEmblem.css';
const ICONS: Record<string, FC<{ size?: number; strokeWidth?: number }>> = { Archive, Award, Bird, Blocks, BookMarked, BookOpen, BookText, Bookmark, CalendarDays, CircleCheck, Clock3, Compass, DraftingCompass, Droplets, FlaskConical, Footprints, Frame, Gem, GraduationCap, Grid3X3, Hourglass, Lamp, LampDesk, Layers3, Leaf, LibraryBig, Lightbulb, ListChecks, MessageCircleQuestionMark, MessagesSquare, Microscope, Moon, MoonStar, Network, NotebookPen, Palette, PanelTop, Pencil, PencilLine, Pin, Presentation, Ruler, ScanSearch, ScrollText, Search, Share2, Sparkles, Square, SquarePen, Stamp, StickyNote, Sunrise, Timer, Trees, Users, UsersRound };
export const SignatureEmblem: FC<{ icon: string; rarity?: string; size?: number }> = ({ icon, rarity = 'common', size = 36 }) => {
  const Icon = ICONS[icon] || BookOpen;
  return <span className={`signature-emblem signature-emblem--${rarity}`} style={{ width: size, height: size }} aria-hidden="true">
    <Icon size={size * .48} strokeWidth={1.55} />
  </span>;
};
