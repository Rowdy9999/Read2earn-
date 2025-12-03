import { db, headers } from './utils';
import * as admin from 'firebase-admin';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'ok' };

  try {
    const { uid, amount, method, details } = JSON.parse(event.body || '{}');

    // Basic Validation
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) throw new Error("User not found");
    const userData = userDoc.data();
    
    if (userData.walletBalance < amount) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Insufficient funds" }) };
    }

    // Create Request
    await db.collection('withdrawals').add({
      userId: uid,
      userEmail: userData.email,
      amount: parseFloat(amount),
      method,
      details,
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now()
    });

    return {
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ success: true }) 
    };

  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};