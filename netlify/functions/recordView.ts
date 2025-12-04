import { db, headers, getClientIp } from './utils';
import * as admin from 'firebase-admin';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  // Critical Check: Is DB connected?
  if (!db) {
    console.error("Database connection missing. Check FIREBASE_SERVICE_ACCOUNT env var.");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server Configuration Error: Database not connected." })
    };
  }

  try {
    const { articleId, refUserId } = JSON.parse(event.body || '{}');
    
    // Only ArticleID is strictly required.
    if (!articleId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing articleId' }) };
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
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'View already counted recently (limit: 4h).' }) };
    }

    const earningPerView = parseFloat(process.env.EARNING_PER_VIEW || '0.05');
    let earnedAmount = 0;

    // Run Transaction
    await db.runTransaction(async (t) => {
      // 1. Get Article to check existence
      const articleRef = db!.collection('articles').doc(articleId);
      const articleDoc = await t.get(articleRef);
      if (!articleDoc.exists) throw new Error("Article not found");

      // 2. Get User (Conditional - only if refUserId provided)
      let userRef: admin.firestore.DocumentReference | null = null;
      if (refUserId) {
        userRef = db!.collection('users').doc(refUserId);
        const userDoc = await t.get(userRef);
        
        // If the refUser doesn't exist (e.g. bad link), we proceed without error but don't pay
        if (!userDoc.exists) {
           console.warn(`Referral User ${refUserId} not found. Proceeding with view only.`);
           userRef = null;
        }
      }

      // 3. Create View Record
      const viewRef = db!.collection('views').doc(); // Auto ID
      t.set(viewRef, {
        articleId,
        refUserId: refUserId || null,
        ip,
        viewId, // Compound index helper
        createdAt: admin.firestore.Timestamp.now()
      });

      // 4. Update Article Counter
      t.update(articleRef, {
        views: admin.firestore.FieldValue.increment(1)
      });

      // 5. Credit User Wallet (if valid user)
      if (userRef) {
        t.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(earningPerView),
          totalViews: admin.firestore.FieldValue.increment(1)
        });
        earnedAmount = earningPerView;
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, earned: earnedAmount })
    };

  } catch (error: any) {
    console.error("Record View Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};