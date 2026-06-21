// api/test-ping.js
//
// Minimal diagnostic function with zero external dependencies.
// If this doesn't respond, the problem is in platform/deploy config,
// not in the razorpay/googleapis/nodemailer code.

module.exports = (req, res) => {
  res.status(200).json({ ok: true, message: 'pong', time: new Date().toISOString() });
};
