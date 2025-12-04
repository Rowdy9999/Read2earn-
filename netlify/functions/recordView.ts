

import { db, dbInitError, headers, getClientIp } from './utils';
import * as admin from 'firebase-admin';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  // Critical Check: Is DB connected?
  if (!db) {
    console.error("Database connection failed:", dbInitError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: `Server Error: ${dbInitError || "Database not connected."}`
      })
    };
  }

  try {
    const { articleId, refUserId, fingerprint, viewType } = JSON.parse(event.body || '{}');
    
    // Only ArticleID is strictly required.
    if (!articleId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing articleId' }) };
    }

    const ip = getClientIp(event);
    const now = new Date();
    
    // --- FETCH SETTINGS (Earning & Cooldown) ---
    let earningPerView = 0.05; 
    let earningPerSelfView = 0.01;
    let cooldownMinutes = 240; // Default 4 hours

    try {
      const settingsDoc = await db.collection('settings').doc('global').get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data) {
          if (typeof data.earningPerView === 'number') earningPerView = data.earningPerView;
          if (typeof data.earningPerSelfView === 'number') earningPerSelfView = data.earningPerSelfView;
          if (typeof data.viewCooldownMinutes === 'number') cooldownMinutes = data.viewCooldownMinutes;
        }
      } else {
        earningPerView = parseFloat(process.env.EARNING_PER_VIEW || '0.05');
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
    // -------------------------------------------

    const cooldownMs = cooldownMinutes * 60 * 1000;
    const cooldownDate = new Date(now.getTime() - cooldownMs);

    // --- CHECK FOR DUPLICATES (IP or Fingerprint or User) ---
    // Firestore OR queries are limited, so we run checks in parallel or sequence.
    
    // Check 1: Recent View by IP
    const ipQuery = db.collection('views')
      .where('articleId', '==', articleId)
      .where('ip', '==', ip)
      .where('createdAt', '>', cooldownDate)
      .limit(1)
      .get();

    // Check 2: Recent View by Fingerprint (if provided)
    const fpQuery = fingerprint ? db.collection('views')
      .where('articleId', '==', articleId)
      .where('fingerprint', '==', fingerprint)
      .where('createdAt', '>', cooldownDate)
      .limit(1)
      .get() : Promise.resolve({ empty: true });

    // Check 3: Recent View by UserID (if logged in user is viewing/earning)
    // Note: 'refUserId' represents the person getting PAID. 
    // If user is reading their own link, refUserId == current user.
    // If user is reading generic link, refUserId might be null.
    // We strictly check the beneficiary.
    const userQuery = refUserId ? db.collection('views')
      .where('articleId', '==', articleId)
      .where('refUserId', '==', refUserId)
      .where('createdAt', '>', cooldownDate)
      .limit(1)
      .get() : Promise.resolve({ empty: true });

    const [ipSnap, fpSnap, userSnap] = await Promise.all([ipQuery, fpQuery, userQuery]);

    // If ANY check finds a document, it is a duplicate/cooldown hit.
    if (!ipSnap.empty || !fpSnap.empty || (!userSnap.empty)) {
      // SILENT SUCCESS: We return success=true so frontend doesn't error, 
      // but earned=0 so user knows nothing happened (or logic is hidden).
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ success: true, earned: 0, message: 'Cooldown active' }) 
      };
    }

    // Determine actual earning based on view type
    const amountToCredit = (viewType === 'self') ? earningPerSelfView : earningPerView;

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
        
        if (!userDoc.exists) {
           console.warn(`Referral User ${refUserId} not found. Proceeding with view only.`);
           userRef = null;
        }
      }

      // 3. Create View Record
      const viewRef = db!.collection('views').doc();
      t.set(viewRef, {
        articleId,
        refUserId: refUserId || null,
        ip,
        fingerprint: fingerprint || null,
        viewType: viewType || 'unknown',
        createdAt: admin.firestore.Timestamp.now()
      });

      // 4. Update Article Counter
      t.update(articleRef, {
        views: admin.firestore.FieldValue.increment(1)
      });

      // 5. Credit User Wallet (if valid user)
      if (userRef && amountToCredit > 0) {
        t.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(amountToCredit),
          totalViews: admin.firestore.FieldValue.increment(1)
        });
        earnedAmount = amountToCredit;
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
