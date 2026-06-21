module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'pong',
    time: new Date().toISOString(),
    env_check: {
      RAZORPAY_KEY_ID_present: !!process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_ID_length: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.length : 0,
      RAZORPAY_KEY_ID_prefix: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.slice(0, 8) : null,
      RAZORPAY_KEY_SECRET_present: !!process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_KEY_SECRET_length: process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0
    }
  });
};
