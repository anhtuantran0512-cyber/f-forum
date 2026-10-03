/* Bản quyền trí tuệ thuộc về BroAmStuck */
export type DimensionView =
  | 'landing'
  | 'home'
  | 'clubs'
  | 'qa'
  | 'chat'
  | 'memory'
  | 'chronicles'
  | 'coming-soon';

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
  stats?: UserStats;
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
  isSolved: boolean;
  bestSolutionId?: string;
  views: number;
  bountyCoin?: number;
  imageUrl?: string;
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
  isBest: boolean;
  upvotes: number;
  rewardCoin?: number;
  imageUrl?: string;
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
  senderId?: string;
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

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  tierColor: ShopTierColor;
  description: string;
  iconType: string;
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
