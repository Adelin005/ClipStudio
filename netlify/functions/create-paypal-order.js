const https = require('https');

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

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { planId, uid } = JSON.parse(event.body);

    if (!uid || !planId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing uid or planId' }) };
    }

    // Determine price based on planId
    let priceValue = '';
    if (planId === 'basic') {
      priceValue = '10.00';
    } else if (planId === 'pro') {
      priceValue = '20.00';
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) };
    }

    const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_URL } = process.env;
    const apiUrl = PAYPAL_API_URL || 'https://api-m.paypal.com'; // Default: LIVE (nu sandbox!)
    const baseUrl = process.env.URL || 'http://localhost:5173';

    console.log(`[create-paypal-order] API URL: ${apiUrl}`);
    console.log(`[create-paypal-order] Base URL: ${baseUrl}`);

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('[create-paypal-order] Missing PayPal credentials!');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'PayPal credentials not configured in environment.' })
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
      console.error('[create-paypal-order] Token error:', JSON.stringify(tokenData));
      throw new Error(tokenData.error_description || `Token failed (${tokenReq.status})`);
    }
    const accessToken = tokenData.access_token;

    // 2. Create Order
    const orderBody = JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: priceValue },
        custom_id: JSON.stringify({ uid, planId })
      }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: `${baseUrl}/?checkout=success`,
            cancel_url: `${baseUrl}/?checkout=cancel`,
            user_action: 'PAY_NOW',
            landing_page: 'GUEST_CHECKOUT'
          }
        }
      }
    });

    const orderReq = await request(`${apiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(orderBody)
      }
    }, orderBody);

    const orderData = await orderReq.json();
    if (!orderReq.ok) {
      console.error('[create-paypal-order] Order error:', JSON.stringify(orderData));
      throw new Error(orderData.message || `Order failed (${orderReq.status})`);
    }

    // Find the approval URL
    const approveLink = orderData.links.find(link => link.rel === 'payer-action' || link.rel === 'approve');
    if (!approveLink) throw new Error('No approval link found in PayPal response');

    return {
      statusCode: 200,
      body: JSON.stringify({ url: approveLink.href, id: orderData.id }),
    };

  } catch (error) {
    console.error('[create-paypal-order] Fatal error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
