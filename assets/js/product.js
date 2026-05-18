// ============ Product detail page ============

document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  const p = getProduct(id);
  const wrap = document.getElementById('product-detail');
  if (!p) {
    wrap.innerHTML = `<div class="empty-state"><h3>Product not found</h3><p><a href="products.html">Back to catalog</a></p></div>`;
    return;
  }

  document.title = `${p.name} — Quantum Medical Supply`;
  document.getElementById('bc-name').textContent = p.name;

  const cat = getCategory(p.category);
  const stockLabel = p.stock > 20 ? `In stock — ready to ship` : p.stock > 0 ? `Only ${p.stock} left in stock` : `Out of stock`;
  const stockClass = p.stock > 20 ? '' : 'low';
  const wasPrice = p.was ? `<span class="was">${formatPrice(p.was)}</span>` : '';

  wrap.innerHTML = `
    <div class="pd-media">${productSvg(p)}</div>
    <div class="pd-info">
      <div class="pd-cat">${cat.name}</div>
      <h1>${p.name}</h1>
      <div class="pd-price-row">
        <div class="pd-price">${wasPrice}${formatPrice(p.price)}</div>
      </div>
      <div class="pd-stock ${stockClass}">● ${stockLabel}</div>
      <p class="pd-desc">${p.desc}</p>
      <div class="pd-actions">
        <div class="qty">
          <button onclick="bumpQty(-1)" aria-label="Decrease">−</button>
          <input type="number" id="qty" value="1" min="1" max="${p.stock}" />
          <button onclick="bumpQty(1)" aria-label="Increase">+</button>
        </div>
        <button class="btn btn-primary" onclick="addToCart('${p.id}')">Add to cart</button>
        <button class="btn btn-ghost" onclick="buyNow('${p.id}')">Buy now</button>
      </div>
      <div class="pd-features">
        <h3>Features</h3>
        <ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
      </div>
      <div class="pd-meta">
        <dl>
          <dt>SKU</dt><dd>${p.sku}</dd>
          <dt>Brand</dt><dd>${p.brand}</dd>
          <dt>Category</dt><dd><a href="products.html?cat=${cat.id}">${cat.name}</a></dd>
          <dt>Ships</dt><dd>Next business day from Cambridge, MA</dd>
        </dl>
      </div>
    </div>
  `;

  // Related
  const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
  document.getElementById('related-grid').innerHTML = related.map(productCard).join('');
});

function bumpQty(delta) {
  const input = document.getElementById('qty');
  const next = Math.max(1, (parseInt(input.value, 10) || 1) + delta);
  input.value = next;
}
function addToCart(id) {
  const qty = Math.max(1, parseInt(document.getElementById('qty').value, 10) || 1);
  Cart.add(id, qty);
  showToast(`Added ${qty} × ${getProduct(id).name}`);
}
function buyNow(id) {
  addToCart(id);
  setTimeout(() => { location.href = 'checkout.html'; }, 200);
}
