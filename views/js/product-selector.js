// Product Selector with Quantity Management for Orders
let selectedProductsForOrder = {};
let availableProducts = [];

// Initialize product selector functionality
function initializeProductSelector() {
  loadAvailableProducts();
  setupProductSelectorEventListeners();
}

// Create a DOM-safe id from any product id
function computeDomId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Normalize strings for robust comparison
function norm(v) {
  return (v == null ? '' : String(v))
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .trim();
}

// Load persistent categories from localStorage (shared with products page)
function loadPersistentCategories(){
  try{
    const arr = JSON.parse(localStorage.getItem('product_categories') || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch(_){ return []; }
}

// Populate category select from available products
function populateCategorySelect() {
  const sel = document.getElementById('productCategory');
  if (!sel) return;
  const current = sel.value;
  const map = new Map(); // normalized -> original display
  (availableProducts || []).forEach(p => {
    const raw = p && p.category != null ? String(p.category) : '';
    const parts = raw.split(/[|,/]/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) parts.push(raw.trim());
    parts.forEach(part => {
      const key = norm(part);
      if (key && !map.has(key)) map.set(key, part);
    });
  });
  // Also include persistent categories even if not present in products yet
  const persistent = loadPersistentCategories();
  persistent.forEach(cat => {
    const key = norm(cat);
    if (key && !map.has(key)) map.set(key, cat);
  });
  // Build options: first the "Todas" option
  const opts = [{ value: '', label: 'Todas las categorías' }];
  Array.from(map.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([key, label]) => opts.push({ value: key, label }));
  // Replace options only if changed
  sel.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  // Try to restore previous selection (by normalized)
  const wanted = norm(current);
  const has = opts.some(o => o.value === wanted);
  sel.value = has ? wanted : '';
}

// Helper: determine if a product has unlimited stock
function isUnlimitedStock(product){
  // Explicit flags for no stock control
  const noControl = product?.noStockControl === true
    || product?.stockControl === false
    || product?.manageStock === false
    || product?.controlStock === false;
  if (noControl) return true;

  // Other common flags
  const explicitUnlimited = product?.unlimited === true
    || product?.stockUnlimited === true
    || product?.infiniteStock === true;
  if (explicitUnlimited) return true;

  const s = product?.stock;
  // Missing/empty/invalid stock is treated as unlimited
  if (s === undefined || s === null || s === '') return true;
  if (typeof s === 'string') {
    const txt = s.trim().toLowerCase();
    if (txt === 'ilimitado' || txt === 'infinito' || txt === 'unlimited' || txt === 'na' || txt === 'n/a' || txt === 'null') return true;
    const n = Number(txt);
    if (!Number.isFinite(n)) return true;
  }
  if (typeof s === 'number' && !Number.isFinite(s)) return true;
  if (typeof s === 'number' && s < 0) return true;
  return false;
}

// Load products from localStorage
function loadAvailableProducts() {
  availableProducts = JSON.parse(localStorage.getItem('products') || '[]');
}

// Setup event listeners for product selector
function setupProductSelectorEventListeners() {
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    loadAvailableProducts();
    populateCategorySelect();
    // Hook up filters
    const sel = document.getElementById('productCategory');
    if (sel) sel.addEventListener('change', () => searchProducts());
    const q = document.getElementById('productSearch');
    if (q) q.addEventListener('input', () => searchProducts());
  });
}

// Ensure filters are wired even if script loads after DOMContentLoaded
function ensureProductSelectorWired() {
  try {
    loadAvailableProducts();
    const sel = document.getElementById('productCategory');
    const q = document.getElementById('productSearch');
    if (sel) {
      // Populate categories if only placeholder present
      if (sel.options && sel.options.length <= 1) {
        populateCategorySelect();
      }
      if (!sel.dataset.wired) {
        sel.addEventListener('change', () => searchProducts());
        sel.dataset.wired = '1';
      }
    }
    if (q && !q.dataset.wired) {
      q.addEventListener('input', () => searchProducts());
      q.dataset.wired = '1';
    }
    // If list container exists, render with current filters
    if (document.getElementById('productList')) {
      if (sel || q) {
        searchProducts();
      } else {
        renderProductSelectorTable();
      }
    }
  } catch (e) {
    // Avoid throwing in UI
    console && console.warn && console.warn('ensureProductSelectorWired error', e);
  }
}

// Open product selector modal
window.openProductSelectorModal = function() {
  // Ensure inputs are wired irrespective of load order
  ensureProductSelectorWired();
  loadAvailableProducts();
  populateCategorySelect();
  // Render respecting current filters (categoría y búsqueda)
  if (document.getElementById('productCategory') || document.getElementById('productSearch')) {
    searchProducts();
  } else {
    renderProductSelectorTable();
  }
  document.getElementById('productSelectorModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Close product selector modal  
window.closeProductSelectorModal = function() {
  document.getElementById('productSelectorModal').classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// Backward-compatible aliases expected by HTML
window.openProductSelector = window.openProductSelectorModal;
window.closeProductSelector = window.closeProductSelectorModal;

// Make functions available globally for onclick handlers
window.closeProductSelector = window.closeProductSelectorModal;
window.clearAllSelections = clearAllSelections;
window.addAllSelectedProducts = addAllSelectedProducts;
window.decreaseProductQuantity = decreaseProductQuantity;
window.increaseProductQuantity = increaseProductQuantity;
window.updateProductSelection = updateProductSelection;
window.addSelectedProductToOrder = addSelectedProductToOrder;

// Render product selector table with quantity controls
function renderProductSelectorTable() {
  const productList = document.getElementById('productList');
  if (!productList) return;
  
  productList.innerHTML = '';
  
  availableProducts.forEach(product => {
    const domId = computeDomId(product.id);
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    // Determine stock status
    let unlimited = isUnlimitedStock(product);
    const stockNum = Number(product.stock);
    if (!unlimited && !Number.isFinite(stockNum)) {
      unlimited = true;
    }
    let stockStatus = unlimited ? 'Ilimitado' : 'En Stock';
    let stockStatusClass = unlimited ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    
    if (!unlimited && stockNum === 0) {
      stockStatus = 'Sin Stock';
      stockStatusClass = 'bg-red-100 text-red-800';
    } else if (!unlimited && stockNum < 10) {
      stockStatus = 'Stock Bajo';
      stockStatusClass = 'bg-yellow-100 text-yellow-800';
    }
    const stockDisplay = unlimited ? 'Ilimitado' : `${stockNum} ${product.stockUnit||''}`.trim();
    const priceDisplay = `CLP ${product.price.toFixed(2)}/${product.priceType}`;
    const currentQuantity = selectedProductsForOrder[product.id]?.quantity || 0;
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <img src="${product.image || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80'}" alt="${product.name}" class="flex-shrink-0 h-10 w-10 rounded-md object-cover">
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900">${product.name}</div>
            <div class="text-sm text-gray-500">${product.barcode || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${product.category}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${priceDisplay}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${stockDisplay}</div>
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stockStatusClass}">
          ${stockStatus}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center justify-center gap-2">
          <button data-pid="${product.id}" data-did="${domId}" onclick="decreaseProductQuantity(this.dataset.pid)" class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 inline-flex items-center justify-center text-sm ${(!unlimited && stockNum === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}" ${(!unlimited && stockNum === 0) ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          </button>
          <input 
            type="number" 
            id="quantity_${domId}" 
            min="0" 
            ${unlimited ? '' : `max="${stockNum}"`} 
            value="${currentQuantity}" 
            class="w-16 h-8 text-center border border-gray-300 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onchange="updateProductSelection(this.dataset.pid || '${product.id}', this.value)"
            data-pid="${product.id}"
            ${(!unlimited && stockNum === 0) ? 'disabled' : ''}
          >
          <button data-pid="${product.id}" data-did="${domId}" onclick="increaseProductQuantity(this.dataset.pid)" class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 inline-flex items-center justify-center text-sm ${(!unlimited && stockNum === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}" ${(!unlimited && stockNum === 0) ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button id="addBtn_${domId}" data-pid="${product.id}" class="text-blue-600 hover:text-blue-900 ${currentQuantity > 0 ? '' : 'opacity-50 cursor-not-allowed'}" onclick="addSelectedProductToOrder(this.dataset.pid)" ${currentQuantity > 0 ? '' : 'disabled'}>
          Agregar
        </button>
      </td>
    `;
    
    productList.appendChild(row);
  });
  
  updateSelectedProductsDisplay();
}

// Increase product quantity
function increaseProductQuantity(productId) {
  const product = availableProducts.find(p => String(p.id) === String(productId));
  if (!product) return;
  const unlimited = isUnlimitedStock(product);
  const domId = computeDomId(productId);
  const input = document.getElementById(`quantity_${domId}`);
  if (!input) return;
  const currentValue = parseInt(input.value) || 0;
  
  if (unlimited || currentValue < Number(product.stock)) {
    const newValue = currentValue + 1;
    input.value = newValue;
    updateProductSelection(productId, newValue);
  }
}

// Decrease product quantity
function decreaseProductQuantity(productId) {
  const domId = computeDomId(productId);
  const input = document.getElementById(`quantity_${domId}`);
  if (!input) return;
  const currentValue = parseInt(input.value) || 0;
  
  if (currentValue > 0) {
    const newValue = currentValue - 1;
    input.value = newValue;
    updateProductSelection(productId, newValue);
  }
}

// Update product selection
function updateProductSelection(productId, quantity) {
  const product = availableProducts.find(p => String(p.id) === String(productId));
  if (!product) return;
  const unlimited = isUnlimitedStock(product);
  
  const qty = parseInt(quantity) || 0;
  const domId = computeDomId(productId);
  const addBtn = document.getElementById(`addBtn_${domId}`);
  
  if (qty > 0 && (unlimited || qty <= Number(product.stock))) {
    selectedProductsForOrder[productId] = {
      ...product,
      quantity: qty,
      subtotal: product.price * qty
    };
    
    // Enable add button
    addBtn.disabled = false;
    addBtn.className = 'text-blue-600 hover:text-blue-900';
  } else {
    delete selectedProductsForOrder[productId];
    
    // Disable add button
    addBtn.disabled = true;
    addBtn.className = 'text-blue-600 hover:text-blue-900 opacity-50 cursor-not-allowed';
  }
  
  updateSelectedProductsDisplay();
  updateAddAllButton();
}

// Update selected products display
function updateSelectedProductsDisplay() {
  const container = document.getElementById('selectedProductsList');
  const totalElement = document.getElementById('selectedProductsTotal');
  
  if (!container || !totalElement) return;
  
  const selectedItems = Object.values(selectedProductsForOrder);
  
  if (selectedItems.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No hay productos seleccionados</p>';
    totalElement.textContent = 'CLP 0.00';
    return;
  }
  
  container.innerHTML = selectedItems.map(item => `
    <div class="flex items-center justify-between p-2 bg-white rounded border">
      <div class="flex items-center space-x-3">
        <img src="${item.image || 'https://via.placeholder.com/32'}" alt="${item.name}" class="w-8 h-8 rounded object-cover">
        <div>
          <span class="text-sm font-medium text-gray-900">${item.name}</span>
          <span class="text-xs text-gray-500 ml-2">x${item.quantity}</span>
        </div>
      </div>
      <div class="text-sm font-semibold text-gray-900">CLP ${item.subtotal.toFixed(2)}</div>
    </div>
  `).join('');
  
  const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
  totalElement.textContent = `CLP ${total.toFixed(2)}`;
}

// Update "Add All Selected" button state
function updateAddAllButton() {
  const addAllBtn = document.getElementById('addAllSelectedBtn');
  if (!addAllBtn) return;
  
  const hasSelections = Object.keys(selectedProductsForOrder).length > 0;
  
  if (hasSelections) {
    addAllBtn.disabled = false;
    addAllBtn.className = 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center';
  } else {
    addAllBtn.disabled = true;
    addAllBtn.className = 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center opacity-50 cursor-not-allowed';
  }
}

// Add individual selected product to order
function addSelectedProductToOrder(productId) {
  const selectedProduct = selectedProductsForOrder[productId];
  if (!selectedProduct) return;
  
  const orderItem = {
    productId: selectedProduct.id,
    name: selectedProduct.name,
    price: selectedProduct.price,
    priceType: selectedProduct.priceType,
    quantity: selectedProduct.quantity,
    subtotal: selectedProduct.subtotal,
    image: selectedProduct.image,
    addedAt: new Date().toISOString()
  };
  
  addToGlobalOrder(orderItem);
  
  // Reset selection for this product
  delete selectedProductsForOrder[productId];
  const domId = computeDomId(productId);
  document.getElementById(`quantity_${domId}`).value = 0;
  
  // Update displays
  updateSelectedProductsDisplay();
  updateAddAllButton();
  
  // Update add button state
  const addBtn = document.getElementById(`addBtn_${domId}`);
  addBtn.disabled = true;
  addBtn.className = 'text-blue-600 hover:text-blue-900 opacity-50 cursor-not-allowed';
  
  showOrderNotification(`${selectedProduct.name} agregado al pedido`);
}

// Add all selected products to order
function addAllSelectedProducts() {
  const selectedItems = Object.values(selectedProductsForOrder);
  if (selectedItems.length === 0) return;
  
  selectedItems.forEach(item => {
    const orderItem = {
      productId: item.id,
      name: item.name,
      price: item.price,
      priceType: item.priceType,
      quantity: item.quantity,
      subtotal: item.subtotal,
      image: item.image,
      addedAt: new Date().toISOString()
    };
    
    addToGlobalOrder(orderItem);
  });
  
  // Clear all selections
  clearAllSelections();
  
  showOrderNotification(`${selectedItems.length} productos agregados al pedido`);
}

// Clear all product selections
function clearAllSelections() {
  selectedProductsForOrder = {};
  
  // Reset all quantity inputs
  Object.keys(selectedProductsForOrder).forEach(productId => {
    const input = document.getElementById(`quantity_${productId}`);
    if (input) input.value = 0;
    
    const addBtn = document.getElementById(`addBtn_${productId}`);
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.className = 'text-blue-600 hover:text-blue-900 opacity-50 cursor-not-allowed';
    }
  });
  
  // Reset all inputs to 0
  const allQuantityInputs = document.querySelectorAll('[id^="quantity_"]');
  allQuantityInputs.forEach(input => {
    input.value = 0;
    const productId = input.id.replace('quantity_', '');
    const addBtn = document.getElementById(`addBtn_${productId}`);
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.className = 'text-blue-600 hover:text-blue-900 opacity-50 cursor-not-allowed';
    }
  });
  
  updateSelectedProductsDisplay();
  updateAddAllButton();
}

// Add product to global order
function addToGlobalOrder(orderItem) {
  // Get current global order or create new one
  let globalOrder = JSON.parse(localStorage.getItem('currentOrder') || 'null');
  
  if (!globalOrder) {
    globalOrder = {
      id: 'ORD-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6),
      items: [],
      total: 0,
      createdAt: new Date().toISOString(),
      status: 'Pendiente',
      customer: ''
    };
  }
  
  // Check if product already exists in order
  const existingItemIndex = globalOrder.items.findIndex(item => item.productId === orderItem.productId);
  
  if (existingItemIndex >= 0) {
    // Update existing item quantity
    globalOrder.items[existingItemIndex].quantity += orderItem.quantity;
    globalOrder.items[existingItemIndex].subtotal = globalOrder.items[existingItemIndex].price * globalOrder.items[existingItemIndex].quantity;
  } else {
    // Add new item
    globalOrder.items.push(orderItem);
  }
  
  // Recalculate total
  globalOrder.total = globalOrder.items.reduce((sum, item) => sum + item.subtotal, 0);
  globalOrder.updatedAt = new Date().toISOString();
  
  // Save to localStorage
  localStorage.setItem('currentOrder', JSON.stringify(globalOrder));
  
  // Update current order display
  if (typeof updateOrderDisplay === 'function') {
    updateOrderDisplay();
  }
  
  // Dispatch custom event for cross-window communication
  window.dispatchEvent(new CustomEvent('orderUpdated', { detail: globalOrder }));
}

// Search products in selector
window.searchProducts = function() {
  const searchTerm = norm((document.getElementById('productSearch') || {}).value || '');
  const rawCat = (document.getElementById('productCategory') || {}).value || '';
  const categoryFilter = norm(rawCat);
  
  const filteredProducts = availableProducts.filter(product => {
    const name = norm(product && product.name);
    const matchesSearch = !searchTerm || name.includes(searchTerm);
    // Category can be string or list-like; compare normalized tokens
    const raw = product && product.category != null ? String(product.category) : '';
    const parts = raw.split(/[|,/]/).map(s => norm(s)).filter(Boolean);
    const matchesCategory = !categoryFilter || parts.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });
  
  renderFilteredProducts(filteredProducts);
}

// Render filtered products
function renderFilteredProducts(products) {
  const productList = document.getElementById('productList');
  if (!productList) return;
  
  productList.innerHTML = '';
  
  products.forEach(product => {
    const domId = computeDomId(product.id);
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    // Determine stock status with unlimited support
    let unlimited = isUnlimitedStock(product);
    const stockNum = Number(product.stock);
    if (!unlimited && !Number.isFinite(stockNum)) unlimited = true;
    let stockStatus = unlimited ? 'Ilimitado' : 'En Stock';
    let stockStatusClass = unlimited ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    if (!unlimited && stockNum === 0) { stockStatus = 'Sin Stock'; stockStatusClass = 'bg-red-100 text-red-800'; }
    else if (!unlimited && stockNum < 10) { stockStatus = 'Stock Bajo'; stockStatusClass = 'bg-yellow-100 text-yellow-800'; }
    const stockDisplay = unlimited ? 'Ilimitado' : `${stockNum} ${product.stockUnit||''}`.trim();
    const priceDisplay = `CLP ${product.price.toFixed(2)}/${product.priceType}`;
    const currentQuantity = selectedProductsForOrder[product.id]?.quantity || 0;
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <img src="${product.image || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80'}" alt="${product.name}" class="flex-shrink-0 h-10 w-10 rounded-md object-cover">
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900">${product.name}</div>
            <div class="text-sm text-gray-500">${product.barcode || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${product.category}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${priceDisplay}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${stockDisplay}</div>
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stockStatusClass}">
          ${stockStatus}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center justify-center gap-2">
          <button data-pid="${product.id}" data-did="${domId}" onclick="decreaseProductQuantity(this.dataset.pid)" class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 inline-flex items-center justify-center text-sm ${(!unlimited && stockNum === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}" ${(!unlimited && stockNum === 0) ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          </button>
          <input 
            type="number" 
            id="quantity_${domId}" 
            min="0" 
            ${unlimited ? '' : `max="${stockNum}"`} 
            value="${currentQuantity}" 
            class="w-16 h-8 text-center border border-gray-300 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onchange="updateProductSelection(this.dataset.pid || '${product.id}', this.value)"
            data-pid="${product.id}"
            ${(!unlimited && stockNum === 0) ? 'disabled' : ''}
          >
          <button data-pid="${product.id}" data-did="${domId}" onclick="increaseProductQuantity(this.dataset.pid)" class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 inline-flex items-center justify-center text-sm ${(!unlimited && stockNum === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}" ${(!unlimited && stockNum === 0) ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button id="addBtn_${domId}" data-pid="${product.id}" class="text-blue-600 hover:text-blue-900 ${currentQuantity > 0 ? '' : 'opacity-50 cursor-not-allowed'}" onclick="addSelectedProductToOrder(this.dataset.pid)" ${currentQuantity > 0 ? '' : 'disabled'}>
          Agregar
        </button>
      </td>
    `;
    
    productList.appendChild(row);
  });
  updateSelectedProductsDisplay();
}

// Initialize when script loads
if (typeof window !== 'undefined') {
  initializeProductSelector();
}
