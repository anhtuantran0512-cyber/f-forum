/* Bản quyền trí tuệ thuộc về BroAmStuck */
export type DimensionView =
  | 'landing'
  | 'home'
  | 'clubs'
  | 'qa'
  | 'threads'
  | 'chat'
  | 'memory'
  | 'chronicles'
  | 'coming-soon'
  | 'exam-vault';

export type ExamType =
  | 'Đề giữa kỳ 1'
  | 'Đề giữa kỳ 2'
  | 'Đề cuối kỳ 1'
  | 'Đề cuối kỳ 2'
  | 'Đề 15 phút'
  | 'Đề cương ôn tập'
  | 'Khảo sát chất lượng';

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  grade: number; /* 6..12 */
  examType: ExamType;
  province: string;
  school: string;
  schoolYear: string;
  format: 'PDF' | 'DOCX';
  fileSize: string;
  downloads: number;
  views: number;
  likes: number;
  verified: boolean;
  hasAnswer: boolean;
  pageCount: number;
  duration?: number;
  uploader: {
    id?: string;
    name: string;
    role?: string;
  };
  uploadDate: string;
  summary: string;
  sampleQuestions?: string[];
  status?: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string;
}

export type UserRole = 'SUPER_ADMIN' | 'CLUB_LEADER' | 'STUDENT';

export interface UserStats {
  thanksCount: number;
  bestCount: number;
  fiveStarCount: number;
  verifiedCount: number;
  helpedCount: number;
  answersCount: number;
  questionsCount: number;
  subjectDistribution?: Record<string, number>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  /** Vai trò kiểm duyệt được Super Admin cấp riêng, không thay quyền chủ nhiệm CLB. */
  staffRole?: 'MODERATOR' | 'TEACHER';
  /** ID vai trò tùy chỉnh (Epic 3 — mục 3.5); quyền thật đọc qua /api/admin/me. */
  customRole?: string;
  /** 0 = Premium vĩnh viễn; timestamp ms > 0 = ngày hết hạn. */
  premiumUntil?: number;
  premiumGrantedAt?: number;
  level: number;
  xp: number;
  coin?: number;
  fPoints?: number;
  streakCount?: number;
  bio: string;
  gender?: string;
  city?: string;
  className?: string;
  scopedClubIds: string[];
  equippedBadge?: string;
  inventory?: string[];
  reportedUsers?: string[];
  joinedAt?: string;
  bannerUrl?: string;
  profileGradient?: string;
  stats?: UserStats;
  /**
   * Trang trí Discord (Nhiệm vụ 10) — 3 slot, server sở hữu:
   * id trong inventory của user, null/undefined = đang để trống slot.
   */
  equippedDecorations?: EquippedDecorations;
  /** Trang trí yêu thích (wishlist) — id, tối đa 100. */
  wishlist?: string[];
}

export type ClubCategory = 'Công nghệ' | 'Nghệ thuật' | 'Thể thao' | 'Học thuật';

export interface Club {
  id: string;
  name: string;
  slogan: string;
  coverImage: string;
  category: ClubCategory;
  foundingMembers: string[];
  purpose: string;
  leaderId: string;
  leaderName: string;
  followerCount: number;
  membersCount: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  isSpotlight?: boolean;
  createdAt: string;
  rejectReason?: string;
}

export interface ClubPost {
  id: string;
  clubId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
}

export type SubjectTag =
  | 'toan'
  | 'ly'
  | 'hoa'
  | 'sinh'
  | 'anh'
  | 'tin'
  | 'van'
  | 'su'
  | 'hotro'
  | 'kinhnghiem'
  | 'share'
  | 'tamsu'
  | 'tamly';

export type QAReactionType = 'helpful' | 'mindblown' | 'thanks';
export type QAReactions = Partial<Record<QAReactionType, string[]>>;

export type QACommentableType = 'question' | 'answer';

export interface QAComment {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar: string;
  authorLevel?: number;
  content: string;
  commentableType: QACommentableType;
  commentableId: string;
  status: 'active' | 'hidden';
  createdAt: string;
  createdAtMs: number;
}

export type ModerationReasonCode =
  | 'inappropriate'
  | 'spam'
  | 'wrong_knowledge'
  | 'rule_violation'
  | 'other';

export interface ModerationLogEntry {
  id: string;
  moderatorId: string;
  moderatorEmail?: string;
  targetType: 'question' | 'answer';
  targetId: string;
  targetSnapshot: string;
  reasonCode: ModerationReasonCode;
  reasonNote?: string;
  createdAt: string;
  createdAtMs: number;
}

export interface Question {
  id: string;
  title: string;
  subject: SubjectTag;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isAnonymous: boolean;
  anonymousAlias?: string;
  anonymousMask?: string;
  createdAt: string;
  createdAtMs?: number;
  isSolved: boolean;
  bestSolutionId?: string;
  views: number;
  bountyCoin?: number;
  imageUrl?: string;
  images?: string[];
  status?: 'active' | 'deleted';
  reactions?: QAReactions;
}

/* AI Moderation v1.0 — phán quyết kiểm duyệt câu trả lời (xem
   server/answerModeration.ts). LuÔN do máy chủ sinh — client không thể tự
   khai ACCEPT. */
export type ModerationStatus = 'ACCEPT' | 'REJECT' | 'REVIEW';
export type RelevanceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ModerationVerdict {
  status: ModerationStatus;
  relevance: RelevanceLevel;
  reason: string;
  feedback: string;
  engine: 'ai' | 'heuristic';
  safety: { ok: boolean; flags: string[] };
  at: number;
  review?: { by: string; at: number; action: 'approve' | 'reject'; note?: string };
}

export interface Solution {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar: string;
  authorLevel: number;
  content: string;
  createdAt: string;
  createdAtMs?: number;
  isBest: boolean;
  upvotes: number;
  fiveStarCount?: number;
  rewardCoin?: number;
  imageUrl?: string;
  status?: 'active' | 'deleted' | 'review';
  reactions?: QAReactions;
  /** Phán quyết AI kiểm duyệt (lưu lại cho audit + hàng chờ quản trị). */
  moderation?: ModerationVerdict;
}

export type ChatChannelId = 'hallway' | 'quick-qa' | 'confessions' | 'club-hub';

export interface ChatChannel {
  id: ChatChannelId;
  name: string;
  description: string;
  iconName: string;
}

export interface ChatMessage {
  id: string;
  channelId: ChatChannelId;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar: string;
  authorLevel: number;
  content: string;
  timestamp: string;
  timestampMs?: number;
  senderId?: string;
}

/* Thread System v1.0 — mạng xã hội nội bộ (khác Forum có duyệt bài). */
export type ThreadReactionType = 'love' | 'haha' | 'fire' | 'wow' | 'support';
export type ThreadStatus = 'active' | 'under_review' | 'hidden';

export interface Thread {
  id: string;
  parentThreadId?: string;
  repostOfId?: string;
  repostType?: 'simple' | 'quote';
  authorId: string;
  authorEmail?: string;
  authorName: string;
  authorAvatar: string;
  authorLevel: number;
  content: string;
  imageUrl?: string;
  depthLevel: number;
  status: ThreadStatus;
  reactions: Record<string, ThreadReactionType[]>;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface OnlinePresenceUser {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  level?: number;
  email?: string;
  rank?: string;
  lastSeen?: number;
}

export interface FeedbackSubmission {
  id: string;
  name: string;
  email: string;
  category?: string;
  content: string;
  createdAt: string;
}

export type ShopTierColor = 'green' | 'blue' | 'red' | 'purple';

/** Loại asset của item shop (Nhiệm vụ 10). */
export type ShopAssetType = 'svg_custom' | 'image_static' | 'image_animated';

/** Loại trang trí Discord import. */
export type DecorationType = 'avatar_frame' | 'avatar_aura' | 'nameplate';

export type DecorationRarity = 'common' | 'rare' | 'epic' | 'mythic';

/** 3 slot trang trí trên hồ sơ (server sở hữu, client không tự gán). */
export interface EquippedDecorations {
  avatar_frame?: string | null;
  avatar_aura?: string | null;
  nameplate?: string | null;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  tierColor: ShopTierColor;
  description: string;
  iconType: string;
  category?: 'Khung avatar' | 'Hiệu ứng' | 'Theme Focus' | 'Góc hồ sơ' | 'Avatar Frame' | 'Avatar Aura' | 'Nameplate';
  /** Ngày phát hành (YYYY-MM-DD, giờ VN) — dùng cho nhãn "Mới". */
  addedAt?: string;
  /* ===== Nhiệm vụ 10: asset thật (Discord import) ===== */
  assetType?: ShopAssetType;
  /** Preview 128px (webp/png) — url gốc tuyệt đối /assets/... (client gắn BASE_URL). */
  previewUrl?: string | null;
  /** Ảnh tĩnh full (webp) làm fallback cho bản động. */
  fullAssetUrl?: string | null;
  /** WebM VP9 alpha — null nếu item tĩnh. */
  animatedAssetUrl?: string | null;
  /** Nguồn gốc: 'discord_import' (Nhiệm vụ 10) hoặc 'fforum_svg' (hệ cũ). */
  originalSource?: 'discord_import' | 'fforum_svg';
  rarity?: DecorationRarity;
  isAnimated?: boolean;
  /** Item SVG cũ bị soft-delete sau migration — không bán, không hiển thị. */
  isActive?: boolean;
  tags?: string[];
  nameEn?: string;
  originalName?: string;
  slug?: string;
  /** Điểm chất lượng 0–100 (Nhiệm vụ 10 — score-quality.mjs). */
  qualityScore?: number;
}

/* ===== Nhiệm vụ 10: thông báo ăn mừng sau migration A/B ===== */
/** Một item được tặng/hiển thị trong màn hình ăn mừng sau migration. */
export interface MigrationCelebrationGift {
  id: string;
  name: string;
  rarity: DecorationRarity;
  isAnimated: boolean;
  /** Preview 128px — url gốc /assets/... (client gắn BASE_URL). */
  previewUrl: string;
  /** Ảnh tĩnh full — url gốc /assets/... */
  fullUrl: string;
  /** Item này đã được tự động trang bị cho avatar. */
  equipped: boolean;
}

/** Payload của thông báo `server-migration-*` — màn hình ăn mừng đọc trường này. */
export interface MigrationCelebrationPayload {
  kind: 'migration-gift' | 'migration-refund' | 'migration-global';
  /** Item được tặng (phương án B) — có thể kèm slot đã trang bị. */
  gifts?: MigrationCelebrationGift[];
  /** Item trưng bày (thông báo toàn hệ thống / hoàn Coin). */
  showcase?: MigrationCelebrationGift[];
  plan?: 'A' | 'B';
}

export interface ReportSubmission {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
  targetEmail: string;
  createdAt: string;
}
