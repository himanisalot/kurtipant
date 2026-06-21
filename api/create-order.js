// api/create-order.js
//
// Vercel serverless function (Node.js runtime).
// Creates a Razorpay order. The amount is calculated SERVER-SIDE from a
// fixed price list, never trusted from the browser, so nobody can tamper
// with the price by editing the page or replaying a request.

const Razorpay = require('razorpay');

const PRICES = {
  kurti: 1650,
  pant: 950,
  combo: 2500,
};

const VALID_SIZES = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl'];
const VALID_COLORS = ['purple', 'orange', 'green', 'pink', 'blue'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { items, customer } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }

  let total = 0;
  for (const item of items) {
    if (!PRICES[item.type]) {
      res.status(400).json({ error: `Unknown item type: ${item.type}` });
      return;
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      res.status(400).json({ error: 'Invalid quantity' });
      return;
    }
    if (item.type !== 'pant' && !VALID_COLORS.includes(item.color)) {
      res.status(400).json({ error: 'Invalid color' });
      return;
    }
    if (!VALID_SIZES.includes(item.size)) {
      res.status(400).json({ error: 'Invalid size' });
      return;
    }
    total += PRICES[item.type] * qty;
  }

  if (!customer || !customer.name || !customer.address || !customer.contact || !customer.height) {
    res.status(400).json({ error: 'Missing customer details' });
    return;
  }
  if (!/^[0-9]{10}$/.test(String(customer.contact).replace(/\D/g, '').slice(-10))) {
    res.status(400).json({ error: 'Invalid contact number' });
    return;
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: total * 100,
      currency: 'INR',
      receipt: `cfh_${Date.now()}`,
      notes: {
        customer_name: customer.name,
        customer_contact: customer.contact,
      },
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    res.status(500).json({
      error: 'Could not create order. Please try again.',
      debug: err && err.message ? err.message : String(err),
      debugKeyIdPresent: !!process.env.RAZORPAY_KEY_ID,
      debugKeySecretPresent: !!process.env.RAZORPAY_KEY_SECRET,
    });
  }
};
