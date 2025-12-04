
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
  earningPerSelfView?: number;
  minWithdrawal: number;
  paymentMethods: string[];
  viewCooldownMinutes: number;
  visitDurationSeconds?: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  earningPerView: 0.05,
  earningPerSelfView: 0.01,
  minWithdrawal: 50,
  paymentMethods: ['UPI', 'Paytm', 'Bank Transfer'],
  viewCooldownMinutes: 240, // 4 hours
  visitDurationSeconds: 15,
};