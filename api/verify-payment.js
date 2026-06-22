// api/verify-payment.js
//
// Vercel serverless function (Node.js runtime).
// Verifies the Razorpay payment signature, then logs the order to Google
// Sheets and emails the owner + customer.
//
// If sheet/email steps fail, we still tell the browser the payment
// succeeded (the money has already moved), but we log the error so it
// can be fixed and the order re-entered by hand if needed.

const crypto = require('crypto');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const PRICES = { kurti: 1650, pant: 950, combo: 2500 };

function verifySignature(orderId, paymentId, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

function describeItems(items) {
  return items
    .map((i) => {
      const colorPart = i.color ? ` (${i.color})` : '';
      return `${i.type}${colorPart} x${i.qty} [size ${i.size.toUpperCase()}]`;
    })
    .join('; ');
}

async function appendToSheet({ orderId, paymentId, customer, items, total }) {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Orders!A:I',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        orderId,
        paymentId,
        customer.name,
        customer.contact,
        customer.address,
        customer.height,
        describeItems(items),
        total,
      ]],
    },
  });
}

async function sendEmails({ orderId, paymentId, customer, items, total }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const itemLines = items
    .map((i) => `  - ${i.type}${i.color ? ` (${i.color})` : ''} x${i.qty}, size ${i.size.toUpperCase()} — ₹${PRICES[i.type] * i.qty}`)
    .join('\n');

  const ownerText = `New order received!

Order ID: ${orderId}
Payment ID: ${paymentId}
Amount paid: ₹${total}

Customer: ${customer.name}
Contact: ${customer.contact}
Height: ${customer.height}
Address: ${customer.address}

Items:
${itemLines}
`;

  await transporter.sendMail({
    from: process.env.NOTIFY_FROM_EMAIL,
    to: process.env.OWNER_EMAIL,
    subject: `New order from ${customer.name} — ₹${total}`,
    text: ownerText,
  });

  if (customer.email) {
    const customerText = `Hi ${customer.name},

Thanks for shopping with Creative Fashion by Himani! Your order is confirmed.

Order ID: ${orderId}
Amount paid: ₹${total}

Items:
${itemLines}

We'll reach out on ${customer.contact} once your order ships.

Warmly,
Creative Fashion by Himani
`;
    await transporter.sendMail({
      from: process.env.NOTIFY_FROM_EMAIL,
      to: customer.email,
      subject: 'Your Creative Fashion by Himani order is confirmed',
      text: customerText,
    });
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, items } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment details' });
    return;
  }

  const isValid = verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    process.env.RAZORPAY_KEY_SECRET
  );

  if (!isValid) {
    console.error('Signature verification FAILED for order', razorpay_order_id);
    res.status(400).json({ error: 'Payment verification failed' });
    return;
  }

  const total = items.reduce((sum, i) => sum + PRICES[i.type] * Number(i.qty), 0);

  const orderDetails = {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    customer,
    items,
    total,
  };

  const errors = [];

  try {
    await appendToSheet(orderDetails);
  } catch (err) {
    console.error('Google Sheets append failed:', err);
    errors.push('sheet');
  }

  try {
    await sendEmails(orderDetails);
  } catch (err) {
    console.error('Email send failed:', err);
    errors.push('email');
  }

  res.status(200).json({
    verified: true,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    warnings: errors,
  });
};