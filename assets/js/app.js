// ============ Shell: header, footer, drawer, toasts ============

function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  el.className = 'header';
  el.innerHTML = `
    <div class="header-top">
      <div class="container">
        <span>Free shipping on orders over $150 · Next-day to most US ZIPs</span>
        <span><a href="contact.html">Open a facility account →</a></span>
      </div>
    </div>
    <div class="header-main">
      <div class="container">
        <a href="index.html" class="brand">
          <span class="brand-mark"></span>
          <span class="brand-name">Quantum<span>Medical</span></span>
        </a>
        <nav class="nav">
          <a href="products.html">Shop</a>
          <a href="products.html?cat=diagnostics">Diagnostics</a>
          <a href="products.html?cat=ppe">PPE</a>
          <a href="products.html?cat=monitoring">Monitoring</a>
          <a href="contact.html">Contact</a>
        </nav>
        <div class="header-actions">
          <button class="icon-btn menu-btn" aria-label="Menu" onclick="toggleMobileNav()">☰</button>
          <a href="cart.html" class="icon-btn" aria-label="Cart" onclick="event.preventDefault(); openCart();">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            <span class="cart-count" data-count="0">0</span>
          </a>
        </div>
      </div>
    </div>
  `;
  updateCartBadge();
}

function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.className = 'footer';
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="brand">
            <span class="brand-mark"></span>
            <span class="brand-name">Quantum<span>Medical</span></span>
          </a>
          <p>Hospital-grade medical equipment and supplies, sourced from manufacturers you trust and delivered when you need them.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><a href="products.html">All products</a></li>
            <li><a href="products.html?cat=diagnostics">Diagnostics</a></li>
            <li><a href="products.html?cat=ppe">PPE</a></li>
            <li><a href="products.html?cat=mobility">Mobility</a></li>
            <li><a href="products.html?cat=respiratory">Respiratory</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="contact.html">Contact</a></li>
            <li><a href="contact.html">Facility accounts</a></li>
            <li><a href="#">About</a></li>
            <li><a href="#">Careers</a></li>
          </ul>
        </div>
        <div>
          <h4>Support</h4>
          <ul>
            <li><a href="#">Order status</a></li>
            <li><a href="#">Returns</a></li>
            <li><a href="#">Shipping</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Quantum Medical Supply, Inc. · All rights reserved.</span>
        <span>FDA Registered · HIPAA Aware · ISO 13485</span>
      </div>
    </div>
  `;
}

function updateCartBadge() {
  const el = document.querySelector('.cart-count');
  if (!el) return;
  const n = Cart.count();
  el.textContent = n;
  el.dataset.count = n;
}

function toggleMobileNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  nav.style.display = nav.style.display === 'flex' ? '' : 'flex';
  nav.style.flexDirection = 'column';
  nav.style.position = 'absolute';
  nav.style.top = '100%';
  nav.style.left = '0';
  nav.style.right = '0';
  nav.style.background = '#fff';
  nav.style.padding = '14px 24px';
  nav.style.borderBottom = '1px solid var(--c-line)';
}

// ===== Product card render =====
function productCard(p) {
  const stockLabel = p.stock > 20 ? `In stock` : p.stock > 0 ? `Only ${p.stock} left` : `Out of stock`;
  const stockClass = p.stock > 20 ? '' : 'low';
  const badge = p.badge ? `<span class="product-badge ${p.badge}">${p.badge}</span>` : '';
  const wasPrice = p.was ? `<span class="was">${formatPrice(p.was)}</span>` : '';
  const cat = getCategory(p.category);
  return `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-thumb">
        ${badge}
        ${productSvg(p)}
      </a>
      <div class="product-info">
        <div class="product-cat">${cat ? cat.name : ''}</div>
        <h3 class="product-name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
        <div class="product-stock ${stockClass}">● ${stockLabel}</div>
        <div class="product-price-row">
          <div class="product-price">${wasPrice}${formatPrice(p.price)}</div>
          <button class="add-btn" onclick="quickAdd('${p.id}')">Add</button>
        </div>
      </div>
    </article>
  `;
}

function quickAdd(id) {
  const p = getProduct(id);
  Cart.add(id, 1);
  showToast(`${p.name} added to cart`);
}

function renderCategories(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = CATEGORIES.map(c => {
    const count = PRODUCTS.filter(p => p.category === c.id).length;
    return `
      <a href="products.html?cat=${c.id}" class="category-card">
        <span class="cat-count">${count} items</span>
        <span class="cat-icon" style="background:${c.color}">${c.icon}</span>
        <h3>${c.name}</h3>
        <p>${c.blurb}</p>
      </a>
    `;
  }).join('');
}

function renderFeatured(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const featured = PRODUCTS.filter(p => p.featured).slice(0, 8);
  el.innerHTML = featured.map(productCard).join('');
}

// ===== Cart drawer =====
function openCart() {
  ensureDrawerBackdrop();
  const drawer = document.getElementById('cart-drawer');
  drawer.classList.add('open');
  document.querySelector('.drawer-backdrop').classList.add('open');
  renderDrawer();
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  const bd = document.querySelector('.drawer-backdrop');
  if (bd) bd.classList.remove('open');
}
function ensureDrawerBackdrop() {
  if (!document.querySelector('.drawer-backdrop')) {
    const bd = document.createElement('div');
    bd.className = 'drawer-backdrop';
    bd.onclick = closeCart;
    document.body.appendChild(bd);
  }
}
function renderDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const items = Cart.detailedItems();
  const subtotal = Cart.subtotal();
  if (items.length === 0) {
    drawer.innerHTML = `
      <div class="drawer-head">
        <h3>Your cart</h3>
        <button class="drawer-close" onclick="closeCart()">×</button>
      </div>
      <div class="drawer-body">
        <div class="cart-empty" style="padding:30px 14px;">
          <p style="margin:0 0 12px;color:var(--c-ink-3);">Your cart is empty.</p>
          <a href="products.html" class="btn btn-primary btn-sm">Browse products</a>
        </div>
      </div>
    `;
    return;
  }
  drawer.innerHTML = `
    <div class="drawer-head">
      <h3>Your cart (${Cart.count()})</h3>
      <button class="drawer-close" onclick="closeCart()">×</button>
    </div>
    <div class="drawer-body">
      ${items.map(i => `
        <div class="drawer-row">
          <div class="dr-thumb">${productSvg(i.product)}</div>
          <div>
            <p class="dr-name">${i.product.name}</p>
            <div class="dr-meta">Qty ${i.qty} · ${formatPrice(i.product.price)}</div>
          </div>
          <div class="dr-price">${formatPrice(i.product.price * i.qty)}</div>
        </div>
      `).join('')}
    </div>
    <div class="drawer-foot">
      <div class="summary-row total"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <a href="cart.html" class="btn btn-ghost" style="flex:1;">View cart</a>
        <a href="checkout.html" class="btn btn-primary" style="flex:1;">Checkout</a>
      </div>
    </div>
  `;
}

// ===== Toast =====
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
});
document.addEventListener('cart:change', () => {
  updateCartBadge();
  if (document.getElementById('cart-drawer')?.classList.contains('open')) renderDrawer();
});
