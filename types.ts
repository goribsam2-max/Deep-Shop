
export type OrderStatus = 'pending' | 'processing' | 'packaging' | 'shipped' | 'delivered' | 'canceled';
export type SellerRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'hero' | 'grand';
export type SellRequestStatus = 'pending' | 'approved' | 'rejected';
export type PromoteRequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  district?: string;
  thana?: string;
  postalCode?: string;
  isAdmin?: boolean;
  rewardPoints: number;
  rankOverride?: SellerRank;
  isBanned?: boolean;
  bannedDevices?: string[];
  pushNotificationsEnabled?: boolean;
}

export interface PromoteRequest {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  plan: '3days' | '7days';
  price: number;
  paymentMethod: 'bkash' | 'nagad';
  transactionId: string;
  status: PromoteRequestStatus;
  timestamp: any;
}

export interface SellRequest {
  id: string;
  userId: string;
  userName: string;
  deviceName: string;
  details: string;
  expectedPrice: number;
  condition: string;
  status: SellRequestStatus;
  timestamp: any;
}

export interface SiteConfig {
  bannerVisible: boolean;
  bannerText: string;
  bannerType: 'info' | 'success' | 'warning';
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  keywords: string;
  oneSignalAppId?: string;
  oneSignalRestKey?: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'mobile' | 'laptop' | 'clothes' | 'accessories';
  price: number;
  oldPrice?: number;
  description: string;
  image: string;
  stock: string;
  mentionedUserId?: string;
  mentionedUserName?: string;
  views?: number;
  isPromoted?: boolean;
  promoteExpiry?: any;
  timestamp?: any;
}

export interface Order {
  id: string;
  userInfo: {
    userId: string;
    userName: string;
    phone: string;
  };
  products: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[];
  totalAmount: number;
  advancePaid: number;
  transactionId?: string;
  paymentMethod: 'bkash' | 'nagad' | 'no-advance';
  status: OrderStatus;
  trustProof?: {
    idType: string;
    parentName: string;
    parentPhone: string;
  };
  address: {
    fullAddress: string;
    district: string;
    thana: string;
    postalCode: string;
  };
  timestamp: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  image?: string;
  isRead: boolean;
  timestamp: any;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  likes: string[];
  dislikes: string[];
  replies: any[];
  timestamp: any;
}
