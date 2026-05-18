// ============ Catalog page logic ============

const state = {
  search: '',
  categories: new Set(),
  price: 'all',
  sort: 'featured',
};

function init() {
  // Pre-select category from URL
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  if (cat) state.categories.add(cat);

  renderFilters();
  bindEvents();
  render();
}

function renderFilters() {
  const wrap = document.getElementById('category-filters');
  wrap.innerHTML = CATEGORIES.map(c => `
    <label class="filter-check">
      <input type="checkbox" value="${c.id}" ${state.categories.has(c.id) ? 'checked' : ''} />
      ${c.name}
    </label>
  `).join('');
  wrap.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', (e) => {
      if (e.target.checked) state.categories.add(e.target.value);
      else state.categories.delete(e.target.value);
      render();
    });
  });
}

function bindEvents() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    render();
  });
  document.getElementById('price-filter').addEventListener('change', (e) => {
    state.price = e.target.value;
    render();
  });
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    state.search = '';
    state.categories.clear();
    state.price = 'all';
    state.sort = 'featured';
    document.getElementById('search-input').value = '';
    document.getElementById('price-filter').value = 'all';
    document.getElementById('sort-select').value = 'featured';
    renderFilters();
    render();
  });
}

function filtered() {
  let list = PRODUCTS.slice();
  if (state.search) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(state.search) ||
      p.desc.toLowerCase().includes(state.search) ||
      p.sku.toLowerCase().includes(state.search)
    );
  }
  if (state.categories.size > 0) {
    list = list.filter(p => state.categories.has(p.category));
  }
  if (state.price !== 'all') {
    const [min, max] = state.price.split('-').map(Number);
    list = list.filter(p => p.price >= min && p.price <= max);
  }
  switch (state.sort) {
    case 'price-asc': list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    default: list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
  return list;
}

function render() {
  const list = filtered();
  const grid = document.getElementById('catalog-grid');
  const empty = document.getElementById('catalog-empty');
  const count = document.getElementById('results-count');
  count.textContent = `Showing ${list.length} of ${PRODUCTS.length} products.`;
  if (list.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
  } else {
    empty.hidden = true;
    grid.innerHTML = list.map(productCard).join('');
  }
}

document.addEventListener('DOMContentLoaded', init);
