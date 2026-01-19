
export type OrderStatus = 'pending' | 'packaging' | 'shipped' | 'delivered' | 'canceled';
export type SellerRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'hero' | 'grand';

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
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  timestamp: any;
  isRead: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  likes: string[];
  timestamp: any;
}

export interface Product {
  id: string;
  name: string;
  category: 'mobile' | 'laptop' | 'clothes' | 'accessories';
  price: number;
  oldPrice?: number;
  description: string;
  image: string;
  stock: string; // Changed to string for 'instock', 'out of stock', 'pre order'
  sellerMention?: {
    uid: string;
    name: string;
    rank?: SellerRank;
  };
  specs?: Record<string, string>;
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
  transactionId: string;
  paymentMethod: 'bkash' | 'nagad';
  status: OrderStatus;
  address: {
    fullAddress: string;
    district: string;
    thana: string;
    postalCode: string;
  };
  timestamp: any;
}

export interface SellRequest {
  id: string;
  userId: string;
  userName: string;
  deviceName: string;
  details: string;
  expectedPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  timestamp: any;
}
