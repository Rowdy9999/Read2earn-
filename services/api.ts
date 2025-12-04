
// Wrapper to call Netlify functions
// In a local development environment without Netlify CLI, these will 404.

const BASE_URL = '/.netlify/functions';

export const api = {
  async recordView(articleId: string, refUserId: string | null) {
    // Removed the "if (!refUserId) return" check to allow recording anonymous views
    // and to ensure logic works if checking against logged-in user ID
    
    try {
      const response = await fetch(`${BASE_URL}/recordView`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, refUserId }),
      });
      return await response.json();
    } catch (error) {
      console.error("API Error (recordView):", error);
      return { success: false, error: 'Network error' };
    }
  },

  async requestWithdrawal(uid: string, amount: number, method: string, details: string) {
    try {
      const response = await fetch(`${BASE_URL}/requestWithdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, amount, method, details }),
      });
      return await response.json();
    } catch (error) {
      console.error("API Error (requestWithdrawal):", error);
      return { success: false, error: 'Network error' };
    }
  },

  async approveWithdrawal(withdrawalId: string, action: 'approve' | 'reject', adminUid: string) {
    try {
      const response = await fetch(`${BASE_URL}/approveWithdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action, adminUid }),
      });
      return await response.json();
    } catch (error) {
      console.error("API Error (approveWithdrawal):", error);
      return { success: false, error: 'Network error' };
    }
  },

  async promoteToAdmin(uid: string, secret: string) {
    try {
      const response = await fetch(`${BASE_URL}/promoteToAdmin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, secret }),
      });
      return await response.json();
    } catch (error) {
      console.error("API Error (promoteToAdmin):", error);
      return { error: 'Network error' };
    }
  }
};