// ============ Checkout page ============

function renderSummary() {
  const items = Cart.detailedItems();
  const el = document.getElementById('checkout-summary');
  if (items.length === 0) {
    el.innerHTML = `
      <h3 style="margin-top:0;">Your cart</h3>
      <p style="color:var(--c-ink-3);">Your cart is empty.</p>
      <a href="products.html" class="btn btn-primary btn-block">Shop products</a>
    `;
    return;
  }

  const subtotal = Cart.subtotal();
  const shipping = subtotal >= 150 ? 0 : 12.99;
  const tax = +(subtotal * 0.0625).toFixed(2);
  const total = subtotal + shipping + tax;

  el.innerHTML = `
    <h3 style="margin-top:0;">Order summary</h3>
    ${items.map(i => `
      <div class="summary-item">
        <div class="si-thumb">${productSvg(i.product)}</div>
        <div class="si-name">
          <div>${i.product.name}</div>
          <div class="si-qty">Qty ${i.qty}</div>
        </div>
        <div>${formatPrice(i.product.price * i.qty)}</div>
      </div>
    `).join('')}
    <div class="summary-row" style="margin-top:14px;"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
    <div class="summary-row"><span>Tax</span><span>${formatPrice(tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  renderSummary();

  document.getElementById('checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (Cart.count() === 0) { showToast('Your cart is empty'); return; }
    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }
    const orderId = 'QM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    Cart.clear();
    document.querySelector('main').innerHTML = `
      <section class="section">
        <div class="container" style="max-width:640px; text-align:center;">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#10b981,#00b8a9);margin:0 auto 24px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:800;">✓</div>
          <h1>Order confirmed</h1>
          <p style="color:var(--c-ink-2); font-size:1.1rem;">Thank you — your order <strong>${orderId}</strong> has been received. A confirmation has been sent to your email.</p>
          <p style="color:var(--c-ink-3);">You'll receive tracking information once your shipment leaves our facility (typically within 1 business day).</p>
          <div style="margin-top:28px;">
            <a href="products.html" class="btn btn-primary">Continue shopping</a>
          </div>
        </div>
      </section>
    `;
  });
});

document.addEventListener('cart:change', renderSummary);
