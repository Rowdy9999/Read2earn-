
import { db, headers } from './utils';
import * as admin from 'firebase-admin';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  try {
    const { uid, secret } = JSON.parse(event.body || '{}');

    if (!uid) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing UID' }) };
    }

    // Password Check
    if (secret !== 'gajeamit') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Invalid password' }) };
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
    }

    // Update role to admin
    await userRef.update({
      role: 'admin'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'User promoted to admin' })
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