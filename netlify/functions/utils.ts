import * as admin from 'firebase-admin';

// NOTE: In a real Netlify environment, you must add your service account JSON 
// to the Environment Variables as FIREBASE_SERVICE_ACCOUNT

let dbInstance: admin.firestore.Firestore | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountVar) {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      dbInstance = admin.firestore();
    } else {
      console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
    }
  } catch (e) {
    console.error("Firebase Admin Init Error:", e);
  }
} else {
  // Already initialized
  try {
    dbInstance = admin.firestore();
  } catch(e) {
    console.error("Existing App Firestore Error:", e);
  }
}

export const db = dbInstance;

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONs'
};

export const getClientIp = (event: any) => {
  return event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
};