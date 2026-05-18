// ============ Full cart page ============

function renderPage() {
  const items = Cart.detailedItems();
  const itemsEl = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');

  if (items.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <h3>Your cart is empty</h3>
        <p style="color:var(--c-ink-3);margin:6px 0 20px;">Find what you need in our catalog.</p>
        <a href="products.html" class="btn btn-primary">Browse products</a>
      </div>
    `;
    summaryEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = items.map(i => `
    <div class="cart-row">
      <a href="product.html?id=${i.product.id}" class="cart-thumb">${productSvg(i.product)}</a>
      <div>
        <h3 class="cart-name"><a href="product.html?id=${i.product.id}" style="color:inherit;text-decoration:none;">${i.product.name}</a></h3>
        <div class="cart-cat">${getCategory(i.product.category).name} · ${i.product.sku}</div>
      </div>
      <div class="qty">
        <button onclick="changeQty('${i.id}', -1)">−</button>
        <input type="number" value="${i.qty}" min="1" onchange="setQty('${i.id}', this.value)" />
        <button onclick="changeQty('${i.id}', 1)">+</button>
      </div>
      <div class="cart-price">${formatPrice(i.product.price * i.qty)}</div>
      <button class="cart-remove" onclick="removeItem('${i.id}')">Remove</button>
    </div>
  `).join('');

  const subtotal = Cart.subtotal();
  const shipping = subtotal >= 150 ? 0 : 12.99;
  const tax = +(subtotal * 0.0625).toFixed(2);
  const total = subtotal + shipping + tax;

  summaryEl.innerHTML = `
    <h3 style="margin-top:0;">Order summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
    <div class="summary-row"><span>Estimated tax</span><span>${formatPrice(tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
    <a href="checkout.html" class="btn btn-primary btn-block" style="margin-top:18px;">Proceed to checkout</a>
    <a href="products.html" class="btn btn-ghost btn-block" style="margin-top:8px;">Continue shopping</a>
    ${shipping > 0 ? `<p style="font-size:.8rem;color:var(--c-ink-3);margin-top:14px;text-align:center;">Add ${formatPrice(150 - subtotal)} to unlock free shipping.</p>` : ''}
  `;
}

function changeQty(id, delta) {
  const items = Cart.load();
  const it = items.find(i => i.id === id);
  if (!it) return;
  Cart.setQty(id, Math.max(1, it.qty + delta));
  renderPage();
}
function setQty(id, val) {
  const n = Math.max(1, parseInt(val, 10) || 1);
  Cart.setQty(id, n);
  renderPage();
}
function removeItem(id) {
  Cart.remove(id);
  renderPage();
  showToast('Item removed');
}

document.addEventListener('DOMContentLoaded', renderPage);
document.addEventListener('cart:change', renderPage);
