import { db, headers } from './utils';
import * as admin from 'firebase-admin';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'ok' };

  try {
    const { withdrawalId, action, adminUid } = JSON.parse(event.body || '{}');

    // Verify Admin
    const adminRef = db.collection('users').doc(adminUid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
    
    await db.runTransaction(async (t) => {
      const wDoc = await t.get(withdrawalRef);
      if (!wDoc.exists) throw new Error("Withdrawal request not found");
      const wData = wDoc.data();

      if (wData.status !== 'pending') throw new Error("Request is not pending");

      if (action === 'approve') {
        // Deduct from wallet permanently
        const userRef = db.collection('users').doc(wData.userId);
        t.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(-wData.amount)
        });
        t.update(withdrawalRef, { status: 'approved' });
      } else {
        // Just mark rejected, funds stay in wallet (or logic can differ)
        t.update(withdrawalRef, { status: 'rejected' });
      }
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};