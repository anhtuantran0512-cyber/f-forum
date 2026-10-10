/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { FC } from 'react';
import { SignatureEmblem } from './SignatureEmblem';
export const ShopItemSvg: FC<{ type: string; size?: number; className?: string }> = ({ type, size = 40, className = '' }) => (
  <span className={className} style={{ display: 'inline-flex' }}><SignatureEmblem icon={shopIconKnown(type) ? type : 'BookOpen'} size={size} /></span>
);
// Danh mục icon minh bạch: mỗi vật phẩm dùng một hình riêng trong bộ nét thống nhất.
const shopIconKnown = (type: string): boolean => {
  switch (type) {
    case 'Frame':
    case 'Pin':
    case 'NotebookPen':
    case 'Search':
    case 'Ruler':
    case 'FlaskConical':
    case 'Compass':
    case 'Hourglass':
    case 'LampDesk':
    case 'GraduationCap':
    case 'Moon':
    case 'Gem':
    case 'Lamp':
    case 'Bird':
    case 'Square':
    case 'Grid3X3':
    case 'LibraryBig':
    case 'Sunrise':
    case 'DraftingCompass':
    case 'ScrollText':
    case 'BookOpen':
    case 'PencilLine':
    case 'Clock3':
    case 'StickyNote':
    case 'MoonStar':
    case 'Palette':
    case 'PanelTop':
    case 'Leaf':
    case 'Droplets':
    case 'Trees':
    case 'Bookmark':
    case 'CalendarDays':
    case 'Blocks':
    case 'Stamp':
    case 'Archive':
      return true;
    default: return false;
  }
};
export default ShopItemSvg;
