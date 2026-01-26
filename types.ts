
export type TransactionType = 'deposit' | 'withdraw' | 'send' | 'receive' | 'donation';
export type TransactionStatus = 'pending' | 'completed' | 'rejected';
export type OrderStatus = 'pending' | 'processing' | 'packaging' | 'shipped' | 'delivered' | 'canceled';
export type SellerRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'hero' | 'grand';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  walletBalance: number;
  isAdmin?: boolean;
  isSellerApproved?: boolean;
  isShadowMode?: boolean;
  isBanned?: boolean;
  rankOverride?: SellerRank;
  rewardPoints?: number;
  paymentPin?: string;
  createdAt: string;
  address?: string;
  profilePic?: string;
}

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  category: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  sellerWhatsapp?: string;
  sellerPaymentEmail?: string;
  stock: 'instock' | 'outstock';
  views: number;
  timestamp: any;
}

export interface Chat {
  id: string;
  participants: string[];
  participantData: { [uid: string]: { name: string, pic: string } };
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: { [uid: string]: number };
  isGroup?: boolean;
  groupName?: string;
  groupPic?: string;
  ownerId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  images?: string[];
  timestamp: any;
  reactions?: { [uid: string]: string };
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPic: string;
  image: string;
  text?: string;
  link?: string;
  timestamp: any;
  reactions?: { [uid: string]: string };
}

export interface UserNote {
  id: string;
  userId: string;
  userName: string;
  userPic: string;
  text: string;
  timestamp: any;
  reactions?: { [uid: string]: string };
}

export interface Order {
  id: string;
  userInfo: {
    userId: string;
    userName: string;
    phone: string;
  };
  sellerId: string | null;
  products: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totalAmount: number;
  status: OrderStatus;
  address: {
    fullName: string;
    fullAddress: string;
    phone: string;
  };
  timestamp: any;
  verificationType: 'advance' | 'nid' | 'none';
  advancePaid?: number;
  paymentMethod?: string;
  transactionId?: string;
  parentInfo?: {
    parentType: 'Mother' | 'Father';
    parentName: string;
    parentPhone: string;
  };
}

export interface SiteConfig {
  maintenance?: boolean;
  headerNotification?: {
    enabled: boolean;
    text: string;
  };
  nidRequired?: boolean;
  advanceRequired?: boolean;
  advanceAmount?: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating?: number;
  comment: string;
  timestamp: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: any;
  read?: boolean;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  amount: number;
  fee?: number;
  type: TransactionType;
  method?: string;
  status: TransactionStatus;
  timestamp: any;
  trxId?: string;
  targetId?: string;
  targetName?: string;
  targetNumber?: string;
  fromId?: string;
  fromName?: string;
  note?: string;
}
