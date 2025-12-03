import { db, headers, getClientIp } from './utils';
import * as admin from 'firebase-admin';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  try {
    const { articleId, refUserId } = JSON.parse(event.body || '{}');
    if (!articleId || !refUserId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing params' }) };
    }

    const ip = getClientIp(event);
    const viewId = `${articleId}_${ip}`;
    const now = new Date();
    
    // Check for recent view (simple rate limiting: 1 view per article per IP per 4 hours)
    const recentViewSnap = await db.collection('views')
      .where('viewId', '==', viewId)
      .where('createdAt', '>', new Date(now.getTime() - 4 * 60 * 60 * 1000))
      .get();

    if (!recentViewSnap.empty) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'View already recorded' }) };
    }

    const earningPerView = parseFloat(process.env.EARNING_PER_VIEW || '0.05');

    // Run Transaction
    await db.runTransaction(async (t) => {
      // 1. Get Article to check existence
      const articleRef = db.collection('articles').doc(articleId);
      const articleDoc = await t.get(articleRef);
      if (!articleDoc.exists) throw new Error("Article not found");

      // 2. Get User
      const userRef = db.collection('users').doc(refUserId);
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("User not found");

      // 3. Create View Record
      const viewRef = db.collection('views').doc(); // Auto ID
      t.set(viewRef, {
        articleId,
        refUserId,
        ip,
        viewId, // Compound index helper
        createdAt: admin.firestore.Timestamp.now()
      });

      // 4. Update Article Counter
      t.update(articleRef, {
        views: admin.firestore.FieldValue.increment(1)
      });

      // 5. Credit User Wallet
      t.update(userRef, {
        walletBalance: admin.firestore.FieldValue.increment(earningPerView),
        totalViews: admin.firestore.FieldValue.increment(1)
      });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, earned: earningPerView })
    };

  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};