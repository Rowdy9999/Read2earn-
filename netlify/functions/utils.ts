import * as admin from 'firebase-admin';
import { Buffer } from 'buffer';

// NOTE: In a real Netlify environment, you must add your service account JSON 
// to the Environment Variables.
// Recommended: FIREBASE_SERVICE_ACCOUNT_B64 (Base64 encoded JSON)
// Legacy: FIREBASE_SERVICE_ACCOUNT (Raw JSON string)

let dbInstance: admin.firestore.Firestore | null = null;
let initError: string | null = null;

if (!admin.apps.length) {
  try {
    let serviceAccount: any;
    
    // 1. Try Base64 Variable first (Most reliable method)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
        console.log("Loaded credentials from FIREBASE_SERVICE_ACCOUNT_B64");
      } catch (e: any) {
        throw new Error(`Failed to decode/parse FIREBASE_SERVICE_ACCOUNT_B64: ${e.message}`);
      }
    } 
    // 2. Fallback to Raw JSON Variable (Legacy method)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      
      // Clean up common Netlify copy-paste issues
      if ((serviceAccountVar.startsWith('"') && serviceAccountVar.endsWith('"')) ||
          (serviceAccountVar.startsWith("'") && serviceAccountVar.endsWith("'"))) {
        serviceAccountVar = serviceAccountVar.slice(1, -1);
      }
      serviceAccountVar = serviceAccountVar.replace(/\\n/g, '\n');

      try {
        serviceAccount = JSON.parse(serviceAccountVar);
        console.log("Loaded credentials from FIREBASE_SERVICE_ACCOUNT");
      } catch (jsonError: any) {
        throw new Error(`Invalid JSON in FIREBASE_SERVICE_ACCOUNT: ${jsonError.message}`);
      }
    } else {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_B64 (or FIREBASE_SERVICE_ACCOUNT) environment variable.");
    }

    // Initialize App
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    dbInstance = admin.firestore();
    console.log("Firebase Admin Initialized Successfully");

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