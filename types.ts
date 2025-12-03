export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'user' | 'admin';
  walletBalance: number;
  totalViews: number;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  content: string;
  views: number;
  createdAt: string; // ISO string
  active: boolean;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: string;
  details: string; // e.g., UPI ID or Bank details
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AppSettings {
  earningPerView: number;
  minWithdrawal: number;
  paymentMethods: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  earningPerView: 0.05,
  minWithdrawal: 50,
  paymentMethods: ['UPI', 'Paytm', 'Bank Transfer'],
};