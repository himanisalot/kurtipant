// app.js
// Renders product cards, manages cart state in memory, drives the
// checkout form, and talks to the two Netlify functions:
//   /.netlify/functions/create-order   -> get a Razorpay order to pay
//   /.netlify/functions/verify-payment -> confirm + log + email after pay

(function () {
  'use strict';

  const COLOR_LABEL = { purple: 'Orchid Purple', orange: 'Rust Orange', green: 'Olive Green', pink: 'Dusty Pink', blue: 'Cobalt Blue' };

  /** @type {Array<{key:string,type:string,color:string|null,size:string,qty:number,price:number,label:string}>} */
  let cart = [];

  // ---------- Rendering product cards ----------

  function sizeOptionsHtml() {
    return SIZES.map((s) => `<option value="${s}">${s.toUpperCase()}</option>`).join('');
  }

  function kurtiCardHtml(p) {
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-img-wrap">
          <img src="${p.img}" alt="${p.label}" loading="lazy">
        </div>
        <div class="product-body">
          <h3 class="product-name">${p.label}</h3>
          <p class="product-price">₹${p.price}</p>
          <label class="product-field">
            <span>Size</span>
            <select class="size-select">${sizeOptionsHtml()}</select>
          </label>
          <label class="product-field">
            <span>Qty</span>
            <input type="number" class="qty-input" min="1" max="20" value="1">
          </label>
          <button class="btn btn-add" data-type="${p.type}" data-color="${p.color}" data-price="${p.price}" data-label="${p.label}">Add to bag</button>
        </div>
      </article>`;
  }

  function extraCardHtml(p) {
    const isCombo = p.type === 'combo';
    const colorField = isCombo
      ? `<label class="product-field">
           <span>Kurti colour</span>
           <select class="color-select">
             ${KURTIS.map((k) => `<option value="${k.color}">${COLOR_LABEL[k.color]}</option>`).join('')}
           </select>
         </label>`
      : '';
    return `
      <article class="product-card product-card--extra" data-id="${p.id}">
        <div class="product-img-wrap">
          <img src="${p.img}" alt="${p.label}" loading="lazy">
        </div>
        <div class="product-body">
          <h3 class="product-name">${p.label}</h3>
          <p class="product-note">${p.note}</p>
          <p class="product-price">₹${p.price}</p>
          ${colorField}
          <label class="product-field">
            <span>Size</span>
            <select class="size-select">${sizeOptionsHtml()}</select>
          </label>
          <label class="product-field">
            <span>Qty</span>
            <input type="number" class="qty-input" min="1" max="20" value="1">
          </label>
          <button class="btn btn-add" data-type="${p.type}" data-price="${p.price}" data-label="${p.label}">Add to bag</button>
        </div>
      </article>`;
  }

  function renderProducts() {
    document.getElementById('kurtiGrid').innerHTML = KURTIS.map(kurtiCardHtml).join('');
    document.getElementById('extraGrid').innerHTML = EXTRAS.map(extraCardHtml).join('');
  }

  // ---------- Cart logic ----------

  function cartKey(type, color, size) {
    return `${type}__${color || 'none'}__${size}`;
  }

  function addToCart({ type, color, size, qty, price, label }) {
    const key = cartKey(type, color, size);
    const existing = cart.find((c) => c.key === key);
    if (existing) {
      existing.qty = Math.min(20, existing.qty + qty);
    } else {
      cart.push({ key, type, color, size, qty, price, label });
    }
    renderCart();
    openDrawer();
  }

  function removeFromCart(key) {
    cart = cart.filter((c) => c.key !== key);
    renderCart();
  }

  function updateQty(key, qty) {
    const item = cart.find((c) => c.key === key);
    if (!item) return;
    item.qty = Math.max(1, Math.min(20, qty));
    renderCart();
  }

  function cartTotal() {
    return cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  }

  function cartItemRowHtml(c) {
    const colorPart = c.color ? ` · ${COLOR_LABEL[c.color] || c.color}` : '';
    return `
      <li class="cart-item" data-key="${c.key}">
        <div class="cart-item-info">
          <p class="cart-item-name">${c.label}${colorPart}</p>
          <p class="cart-item-meta">Size ${c.size.toUpperCase()} · ₹${c.price} each</p>
        </div>
        <div class="cart-item-controls">
          <input type="number" class="cart-qty" min="1" max="20" value="${c.qty}" data-key="${c.key}">
          <button class="cart-remove" data-key="${c.key}" aria-label="Remove item">✕</button>
        </div>
      </li>`;
  }

  function renderCart() {
    const listHtml = cart.map(cartItemRowHtml).join('');
    const total = cartTotal();
    const count = cart.reduce((n, c) => n + c.qty, 0);

    document.getElementById('cartList').innerHTML = listHtml;
    document.getElementById('drawerCartList').innerHTML = listHtml;
    document.getElementById('cartTotal').textContent = `₹${total}`;
    document.getElementById('drawerCartTotal').textContent = `₹${total}`;
    document.getElementById('cartCount').textContent = String(count);

    const isEmpty = cart.length === 0;
    document.getElementById('cartEmpty').hidden = !isEmpty;
    document.getElementById('cartTotalRow').hidden = isEmpty;

    const payBtn = document.getElementById('payBtn');
    const payLabel = document.getElementById('payBtnLabel');
    payBtn.disabled = isEmpty;
    payLabel.textContent = isEmpty ? 'Add an item to continue' : `Pay ₹${total} to confirm order`;

    // wire up qty + remove for both lists
    document.querySelectorAll('.cart-qty').forEach((el) => {
      el.addEventListener('change', (e) => updateQty(e.target.dataset.key, Number(e.target.value)));
    });
    document.querySelectorAll('.cart-remove').forEach((el) => {
      el.addEventListener('click', (e) => removeFromCart(e.target.dataset.key));
    });
  }

  function wireAddButtons() {
    document.querySelectorAll('.btn-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.product-card');
        const size = card.querySelector('.size-select').value;
        const qty = Number(card.querySelector('.qty-input').value) || 1;
        const colorSelect = card.querySelector('.color-select');
        const color = colorSelect
          ? colorSelect.value
          : (btn.dataset.color && btn.dataset.color !== 'null' ? btn.dataset.color : null);
        addToCart({
          type: btn.dataset.type,
          color,
          size,
          qty,
          price: Number(btn.dataset.price),
          label: btn.dataset.label,
        });
      });
    });
  }

  // ---------- Drawer open/close ----------

  function openDrawer() {
    document.getElementById('cartDrawer').classList.add('is-open');
    document.getElementById('cartOverlay').classList.add('is-open');
  }
  function closeDrawer() {
    document.getElementById('cartDrawer').classList.remove('is-open');
    document.getElementById('cartOverlay').classList.remove('is-open');
  }

  // ---------- Checkout ----------

  function setFormNote(msg, isError) {
    const note = document.getElementById('formNote');
    note.textContent = msg || '';
    note.classList.toggle('form-note--error', !!isError);
  }

  function validateCustomer() {
    const name = document.getElementById('custName').value.trim();
    const height = document.getElementById('custHeight').value.trim();
    const contactRaw = document.getElementById('custContact').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const contact = contactRaw.replace(/\D/g, '').slice(-10);

    if (!name) return { error: 'Please enter your name.' };
    if (!height) return { error: 'Please enter your height.' };
    if (contact.length !== 10) return { error: 'Please enter a valid 10-digit contact number.' };
    if (!address || address.length < 10) return { error: 'Please enter your full delivery address.' };

    return { customer: { name, height, contact, email, address } };
  }

  async function handleCheckout(e) {
    e.preventDefault();
    setFormNote('', false);

    if (cart.length === 0) {
      setFormNote('Your bag is empty. Add an item first.', true);
      return;
    }

    const { customer, error } = validateCustomer();
    if (error) {
      setFormNote(error, true);
      return;
    }

    const payBtn = document.getElementById('payBtn');
    payBtn.disabled = true;
    document.getElementById('payBtnLabel').textContent = 'Preparing payment…';

    const items = cart.map((c) => ({ type: c.type, color: c.color, size: c.size, qty: c.qty }));

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.debug ? `${data.error} (debug: ${data.debug})` : (data.error || 'Could not start payment'));

      const rzp = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'Creative Fashion by Himani',
        description: `${items.length} item${items.length > 1 ? 's' : ''}`,
        prefill: {
          name: customer.name,
          contact: customer.contact,
          email: customer.email || undefined,
        },
        theme: { color: '#A6195C' },
        handler: async function (response) {
          await handlePaymentSuccess(response, customer, items);
        },
        modal: {
          ondismiss: function () {
            payBtn.disabled = false;
            document.getElementById('payBtnLabel').textContent = `Pay ₹${cartTotal()} to confirm order`;
            setFormNote('Payment was cancelled. You can try again whenever you\u2019re ready.', false);
          },
        },
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      payBtn.disabled = false;
      document.getElementById('payBtnLabel').textContent = `Pay ₹${cartTotal()} to confirm order`;
      setFormNote(err.message || 'Something went wrong. Please try again.', true);
    }
  }

  async function handlePaymentSuccess(response, customer, items) {
    setFormNote('Payment received — confirming your order…', false);
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          customer,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'Could not verify payment');

      cart = [];
      renderCart();
      closeDrawer();
      showSuccessState(data.orderId);
    } catch (err) {
      console.error(err);
      setFormNote(
        'Your payment went through, but we couldn\u2019t confirm it automatically. Please screenshot this and message us on Instagram with your payment ID: ' + response.razorpay_payment_id,
        true
      );
    }
  }

  function showSuccessState(orderId) {
    const form = document.getElementById('checkoutForm');
    form.innerHTML = `
      <div class="success-state">
        <p class="success-icon">✓</p>
        <h3>Order confirmed!</h3>
        <p>Thank you — we\u2019ve received your payment and your order is in our queue.</p>
        <p class="success-order-id">Order ref: ${orderId}</p>
        <p>We\u2019ll reach out shortly with delivery updates.</p>
      </div>`;
  }

  // ---------- Init ----------

  function init() {
    renderProducts();
    wireAddButtons();
    renderCart();

    document.getElementById('cartToggle').addEventListener('click', openDrawer);
    document.getElementById('cartClose').addEventListener('click', closeDrawer);
    document.getElementById('cartOverlay').addEventListener('click', closeDrawer);
    document.getElementById('drawerCheckoutBtn').addEventListener('click', closeDrawer);
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
