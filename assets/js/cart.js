// ============ Cart store — localStorage backed ============
const CART_KEY = 'qms_cart_v1';

const Cart = {
  load() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  },
  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:change'));
  },
  count() {
    return this.load().reduce((n, i) => n + i.qty, 0);
  },
  add(productId, qty = 1) {
    const items = this.load();
    const existing = items.find(i => i.id === productId);
    if (existing) existing.qty += qty;
    else items.push({ id: productId, qty });
    this.save(items);
  },
  setQty(productId, qty) {
    let items = this.load();
    if (qty <= 0) {
      items = items.filter(i => i.id !== productId);
    } else {
      const it = items.find(i => i.id === productId);
      if (it) it.qty = qty;
    }
    this.save(items);
  },
  remove(productId) {
    const items = this.load().filter(i => i.id !== productId);
    this.save(items);
  },
  clear() { this.save([]); },
  subtotal() {
    return this.load().reduce((sum, i) => {
      const p = getProduct(i.id);
      return sum + (p ? p.price * i.qty : 0);
    }, 0);
  },
  detailedItems() {
    return this.load().map(i => ({ ...i, product: getProduct(i.id) })).filter(i => i.product);
  },
};
