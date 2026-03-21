// Netlify Serverless Function — create-payment-intent
// Called from checkout.html to create a Stripe PaymentIntent.
// The Stripe SECRET key lives only here (env var), never in the browser.
//
// Env vars required (set in Netlify → Site Settings → Environment Variables):
//   STRIPE_SECRET_KEY  — sk_live_... or sk_test_...

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment service not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { amount, currency = 'usd', carName, pickupDate, returnDate, customerEmail } = body;

  // Validate amount (must be a positive integer in cents)
  const amountCents = Math.round(Number(amount));
  if (!amountCents || amountCents < 50) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid amount' }) };
  }

  try {
    // Use Stripe REST API directly (no npm package needed in Netlify Functions)
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amountCents),
        currency,
        'automatic_payment_methods[enabled]': 'true',
        description: `Rental: ${carName || 'Vehicle'} (${pickupDate} – ${returnDate})`,
        ...(customerEmail ? { receipt_email: customerEmail } : {}),
        'metadata[car_name]':    carName    || '',
        'metadata[pickup_date]': pickupDate || '',
        'metadata[return_date]': returnDate || '',
      }).toString(),
    });

    const intent = await stripeRes.json();

    if (intent.error) {
      console.error('Stripe error:', intent.error);
      return { statusCode: 402, headers, body: JSON.stringify({ error: intent.error.message }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ clientSecret: intent.client_secret }),
    };
  } catch (err) {
    console.error('Payment intent creation failed:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment service error' }) };
  }
};
