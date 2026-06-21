# Creative Fashion by Himani — Setup Guide

This is your complete walkthrough: deploy the site, connect Razorpay in test mode, verify everything works, then flip the switch to go live.

---

## What you're getting

- `index.html`, `styles.css`, `app.js`, `products.js` — the storefront
- `netlify/functions/create-order.js` — creates a Razorpay order (server calculates the price, so nobody can tamper with it)
- `netlify/functions/verify-payment.js` — verifies the payment is real, logs it to Google Sheets, and emails you + the customer
- `assets/` — your logo and product photos

Prices baked in: **Kurti ₹1650 · Pant ₹950 · Combo ₹2500**. To change a price later, edit the number in **two places**: `products.js` (what shoppers see) and `netlify/functions/create-order.js` (what they're actually charged).

---

## Part 1 — Put the code on GitHub

Netlify deploys from a Git repo, so first the code needs a home there.

1. Go to [github.com](https://github.com) → **New repository** → name it `creative-fashion-by-himani` → Create.
2. On your computer, open a terminal in this project folder and run:
   ```
   git init
   git add .
   git commit -m "Initial storefront"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/creative-fashion-by-himani.git
   git push -u origin main
   ```

---

## Part 2 — Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Connect GitHub, pick your `creative-fashion-by-himani` repo.
3. Build settings: leave **Build command** empty, **Publish directory** as `.` — Netlify reads the rest from `netlify.toml` already in the project.
4. Click **Deploy**. You'll get a temporary URL like `random-name-123.netlify.app`. That's your site, live, immediately (checkout won't work yet — we wire that next).
5. Optional: **Site settings → Domain management** to add a custom domain or rename the Netlify subdomain to something like `creativefashionbyhimani.netlify.app`.

---

## Part 3 — Get your Razorpay test keys

1. Sign up / log in at [razorpay.com](https://razorpay.com).
2. Make sure the toggle in the top-left says **Test Mode** (not Live) — we test safely first.
3. Go to **Settings → API Keys → Generate Test Key**. Save the **Key ID** and **Key Secret** somewhere safe — the secret is shown only once.

---

## Part 4 — Set up Google Sheets logging

You said you have no Google API setup yet, so here's the full path.

### 4.1 Create the spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com), create a new sheet.
2. Rename the first tab to exactly `Orders` (case matters).
3. In row 1, add these headers across columns A–I:
   ```
   Timestamp | Order ID | Payment ID | Name | Contact | Address | Height | Items | Total
   ```
4. Copy the Sheet ID from the URL — it's the long string between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit`

### 4.2 Create a Google Cloud service account (this is what lets the website write to your sheet)

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a new project (any name, e.g. "CFH Store").
2. In the search bar, type **Google Sheets API** → open it → click **Enable**.
3. Go to **APIs & Services → Credentials → Create Credentials → Service account**.
4. Give it any name (e.g. `cfh-sheet-writer`) → Create and continue → Done (skip the optional role steps).
5. Click on the service account you just created → **Keys** tab → **Add Key → Create new key → JSON**. A `.json` file downloads — keep it safe, never share it publicly.
6. Open that JSON file. You need two values from it:
   - `client_email` — looks like `cfh-sheet-writer@your-project.iam.gserviceaccount.com`
   - `private_key` — a long block starting with `-----BEGIN PRIVATE KEY-----`

### 4.3 Share the sheet with the service account

1. Back in your Google Sheet, click **Share**.
2. Paste in the `client_email` from the JSON file, give it **Editor** access, send.

This step is the one people most often miss — without it, the function will fail to write rows even with correct keys.

---

## Part 5 — Set up email sending

The function uses standard SMTP, so any email provider works. Easiest: a **Gmail App Password**.

1. On the Google account you want to send from, turn on **2-Step Verification** (Google Account → Security).
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), create an app password for "Mail".
3. Copy the 16-character password shown.

You'll use: `smtp.gmail.com`, port `587`, your Gmail address as the user, and that app password.

*(If you'd rather use a different provider — Zoho, Outlook, a transactional service like Resend or Brevo — the same five environment variables below apply; just swap the host/port.)*

---

## Part 6 — Add environment variables to Netlify

In Netlify: **Site settings → Environment variables → Add a variable**. Add each of these:

| Key | Value |
|---|---|
| `RAZORPAY_KEY_ID` | your test Key ID from Part 3 |
| `RAZORPAY_KEY_SECRET` | your test Key Secret from Part 3 |
| `GOOGLE_CLIENT_EMAIL` | the `client_email` from your JSON file |
| `GOOGLE_PRIVATE_KEY` | the `private_key` from your JSON file, **paste it exactly as-is, including the `\n` characters** |
| `GOOGLE_SHEET_ID` | your Sheet ID from Part 4.1 |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | the app password from Part 5 |
| `NOTIFY_FROM_EMAIL` | same as `SMTP_USER` |
| `OWNER_EMAIL` | the email address **you** want order notifications sent to |

After adding these, go to **Deploys** and trigger **Deploy site** again so the functions pick up the new variables.

---

## Part 7 — Test the full flow end to end

1. Open your live Netlify URL.
2. Add a kurti, the pant, and a combo to the bag — try different sizes and quantities.
3. Scroll to **Your order**, fill in a real name/address/your own phone number, and your own email.
4. Click **Pay**. Razorpay's checkout window opens.
5. Use a Razorpay **test card**: card number `4111 1111 1111 1111`, any future expiry, any CVV, any name. For UPI testing, use `success@razorpay` as the VPA.
6. Complete payment. You should see the **Order confirmed** screen.
7. Check:
   - Your Google Sheet has a new row.
   - Your `OWNER_EMAIL` inbox got the order notification.
   - The email you entered as customer got a confirmation.
8. In the Razorpay dashboard (Test Mode), go to **Payments** — you should see the test transaction there too.

If the order screen shows but the sheet/email didn't update, check **Netlify → Functions → verify-payment → Logs** for the exact error — it'll usually be a typo in an environment variable or the sheet not being shared with the service account email.

---

## Part 8 — Go live

Once test payments work end-to-end:

1. In Razorpay, complete their **KYC / business verification** if you haven't already — Live mode requires it.
2. Switch the dashboard toggle from Test Mode to **Live Mode**.
3. Go to **Settings → API Keys → Generate Live Key**. You'll get a new Key ID and Secret — different from the test ones.
4. In Netlify, update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to these **live** values (same variable names, just replace the values).
5. Trigger a fresh deploy in Netlify so the live keys take effect.
6. Do **one real small test order yourself** with a real card/UPI to confirm everything still works with real money before sharing the link publicly.

No code changes are needed to go live — the same `create-order.js` and `verify-payment.js` work for both test and live, because they simply read whatever keys are in the environment variables. That's the whole reason test → live is just a key swap, not a redeploy of new logic.

---

## Quick reference: changing things later

- **Change a price** → edit `products.js` (display) and `netlify/functions/create-order.js` (charge) — keep both numbers identical.
- **Add a new colour** → add an entry to the `KURTIS` array in `products.js`, drop the photo in `assets/`, and add the colour name to `VALID_COLORS` in `create-order.js`.
- **Change owner notification email** → update `OWNER_EMAIL` in Netlify environment variables, redeploy.
- **Sheet not updating** → check the service account email still has Editor access on the sheet, and that the tab is still named exactly `Orders`.
