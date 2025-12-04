import * as admin from 'firebase-admin';

// NOTE: In a real Netlify environment, you must add your service account JSON 
// to the Environment Variables as FIREBASE_SERVICE_ACCOUNT

let dbInstance: admin.firestore.Firestore | null = null;
let initError: string | null = null;

if (!admin.apps.length) {
  try {
    let serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      // 1. Clean up the string (common Netlify copy-paste issues)
      serviceAccountVar = serviceAccountVar.trim();
      
      // Remove outer quotes if present
      if ((serviceAccountVar.startsWith('"') && serviceAccountVar.endsWith('"')) ||
          (serviceAccountVar.startsWith("'") && serviceAccountVar.endsWith("'"))) {
        serviceAccountVar = serviceAccountVar.slice(1, -1);
      }

      // Restore newlines if they were escaped (e.g. "line1\\nline2" -> "line1\nline2")
      serviceAccountVar = serviceAccountVar.replace(/\\n/g, '\n');

      try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        dbInstance = admin.firestore();
        console.log("Firebase Admin Initialized Successfully");
      } catch (jsonError: any) {
        console.error("JSON Parse Error:", jsonError);
        initError = `Invalid JSON in FIREBASE_SERVICE_ACCOUNT: ${jsonError.message}`;
      }
    } else {
      console.error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
      initError = "Missing FIREBASE_SERVICE_ACCOUNT environment variable.";
    }
  } catch (e: any) {
    console.error("Firebase Admin Init Error:", e);
    initError = `Firebase Init Error: ${e.message}`;
  }
} else {
  // Already initialized
  try {
    dbInstance = admin.firestore();
  } catch(e: any) {
    console.error("Existing App Firestore Error:", e);
    initError = `Existing App Error: ${e.message}`;
  }
}

export const db = dbInstance;
export const dbInitError = initError;

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONs'
};

export const getClientIp = (event: any) => {
  return event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
};