const https = require('https');
const admin = require('firebase-admin');

// Helper to make HTTP requests without external dependencies
function request(url, options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonResult = data ? JSON.parse(data) : {};
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => jsonResult
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[capture-paypal-order] Firebase Admin initialized successfully.');
    } else {
      console.warn('[capture-paypal-order] FIREBASE_SERVICE_ACCOUNT is not set in environment.');
    }
  } catch (err) {
    console.error('[capture-paypal-order] Failed to initialize Firebase Admin:', err.message);
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { token } = JSON.parse(event.body);

    if (!token) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing token (Order ID)' }) };
    }

    const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_URL } = process.env;
    const apiUrl = PAYPAL_API_URL || 'https://api-m.paypal.com'; // Default: LIVE (nu sandbox!)

    console.log(`[capture-paypal-order] API URL: ${apiUrl}`);
    console.log(`[capture-paypal-order] Order token: ${token}`);

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('[capture-paypal-order] Missing PayPal credentials!');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'PayPal credentials not configured.' })
      };
    }

    // 1. Get Access Token
    const authString = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const tokenBody = 'grant_type=client_credentials';
    const tokenReq = await request(`${apiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenBody)
      }
    }, tokenBody);

    const tokenData = await tokenReq.json();
    if (!tokenReq.ok) {
      console.error('[capture-paypal-order] Token error:', JSON.stringify(tokenData));
      throw new Error(tokenData.error_description || `Token failed (${tokenReq.status})`);
    }
    const accessToken = tokenData.access_token;

    // 2. Capture Order
    const captureReq = await request(`${apiUrl}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const captureData = await captureReq.json();
    if (!captureReq.ok) {
      console.error('[capture-paypal-order] Capture error:', JSON.stringify(captureData));
      throw new Error(captureData.message || `Capture failed (${captureReq.status})`);
    }

    // 3. Extract custom_id
    const purchaseUnit = captureData.purchase_units && captureData.purchase_units[0];
    const customIdStr = purchaseUnit && purchaseUnit.custom_id;

    if (!customIdStr) {
      throw new Error('No custom_id found in captured order. Cannot identify user.');
    }

    const { uid, planId } = JSON.parse(customIdStr);
    console.log(`[capture-paypal-order] Updating plan for user ${uid} to ${planId}`);

    // 4. Update Firestore
    if (admin.apps.length) {
      const db = admin.firestore();
      await db.collection('users').doc(uid).set({
        plan: planId,
        lastPaymentId: token,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`[capture-paypal-order] Successfully updated plan for user ${uid} to ${planId}`);
    } else {
      console.warn('[capture-paypal-order] Firebase Admin not initialized, cannot update Firestore.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, planId }),
    };

  } catch (error) {
    console.error('[capture-paypal-order] Fatal error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
