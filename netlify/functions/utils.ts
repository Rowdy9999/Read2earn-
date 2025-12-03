import * as admin from 'firebase-admin';

// NOTE: In a real Netlify environment, you must add your service account JSON 
// to the Environment Variables as FIREBASE_SERVICE_ACCOUNT

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Firebase Admin Init Error:", e);
  }
}

export const db = admin.firestore();

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONs'
};

export const getClientIp = (event: any) => {
  return event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
};