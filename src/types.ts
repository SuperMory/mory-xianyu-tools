export type AccountStatus = 'online' | 'busy' | 'offline' | 'expired';

export interface XianYuAccount {
  id: string;
  nickname: string;
  avatar: string;
  uid: string;
  status: AccountStatus;
  cookies: string;
  mH5Tk: string;
  mH5TkEnc: string;
  cookie2: string;
  unb: string;
  expiresAt: string; // ISO string
  todayReplies: number;
  todayDeliveries: number;
  proxyIp?: string;
  autoReplyEnabled: boolean;
  autoDeliveryEnabled: boolean;
  lastHeartbeat: string;
  notes?: string;
}

export type MatchType = 'exact' | 'contains' | 'regex' | 'image' | 'item_specific' | 'default';

export interface AutoReplyRule {
  id: string;
  name: string;
  accountId: string; // 'all' or specific accountId
  matchType: MatchType;
  keywords: string[];
  imageKeywords?: string[]; // for image recognition simulation
  targetItemId?: string; // for item_specific
  targetItemTitle?: string;
  replyContent: string;
  randomDelayMin: number; // e.g. 1
  randomDelayMax: number; // e.g. 4
  cooldownSeconds: number; // per-buyer cooldown
  enabled: boolean;
  priority: number; // 1-100, higher evaluated first
  hitCount: number;
  createdAt: string;
}

export type DeliveryGoodsType = 'card' | 'virtual_link' | 'account_secret' | 'tutorial';

export interface CardSecretItem {
  id: string;
  category: string;
  goodsTitle: string;
  targetItemId?: string;
  secretContent: string; // e.g. "卡号: AB882-9918 密码: 8829"
  status: 'available' | 'dispatched' | 'reserved' | 'invalid';
  addedAt: string;
  dispatchedAt?: string;
  dispatchedToOrder?: string;
  dispatchedToBuyer?: string;
}

export interface AutoDeliveryApiConfig {
  id: string;
  name: string;
  enabled: boolean;
  targetItemId?: string; // 'all' or specific itemId
  goodsTitle?: string;
  url: string;
  method: 'GET' | 'POST_JSON' | 'POST_FORM';
  headers: { key: string; value: string }[];
  paramsTemplate: string;
  responseSuccessKey: string;
  responseSuccessVal: string;
  responseSecretPath: string;
  fallbackToLocalVault: boolean;
  customMessageTemplate: string;
  createdAt: string;
}

export interface DeliveryRecord {
  id: string;
  orderId: string;
  accountId: string;
  accountNickname: string;
  buyerUid: string;
  buyerNickname: string;
  goodsTitle: string;
  goodsType: DeliveryGoodsType;
  sourceType?: 'local_vault' | 'external_api' | 'fixed_template';
  apiConfigName?: string;
  content: string;
  status: 'success' | 'failed' | 'reissued';
  deliveryTime: string;
  reissueCount: number;
  failureReason?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'buyer' | 'system';
  senderNickname?: string;
  type?: 'text' | 'image' | 'card' | 'order_notice' | 'system';
  content: string;
  imageUrl?: string;
  timestamp: string;
  isAutoReplied?: boolean;
  matchedRuleName?: string;
  status: 'sent' | 'received' | 'pending';
}

export interface Conversation {
  id: string;
  accountId: string;
  buyerUid: string;
  buyerNickname: string;
  buyerAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isAutoReplyActive: boolean;
  currentTrade?: {
    itemId: string;
    itemTitle: string;
    itemPrice: number;
    itemCover: string;
    status: 'browsing' | 'consulting' | 'ordered' | 'paid' | 'delivered' | 'completed';
    orderId?: string;
  };
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskLog {
  id: string;
  accountId: string;
  accountNickname: string;
  type: 'sensitive_word' | 'rate_limit' | 'cookie_expired' | 'ip_risk' | 'anti_scraping';
  level: RiskLevel;
  title: string;
  detail: string;
  timestamp: string;
  resolved: boolean;
  actionTaken: string; // e.g. "自动降频拦截并转入人工", "阻止回复并告警"
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  date: string;
  tag: '规则变动' | '风控预警' | '版本更新' | '安全提醒';
  content: string;
}
