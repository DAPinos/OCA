// Product Selector with Quantity Management for Orders
let selectedProductsForOrder = {};
let availableProducts = [];

// Initialize product selector functionality
function initializeProductSelector() {
  loadAvailableProducts();
  setupProductSelectorEventListeners();
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
  });
}

// Open product selector modal
window.openProductSelectorModal = function() {
  loadAvailableProducts();
  renderProductSelectorTable();
  document.getElementById('productSelectorModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Close product selector modal  
window.closeProductSelectorModal = function() {
  document.getElementById('productSelectorModal').classList.add('hidden');
  document.body.style.overflow = 'auto';
}

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
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    // Determine stock status
    let stockStatus = 'En Stock';
    let stockStatusClass = 'bg-green-100 text-green-800';
    
    if (product.stock === 0) {
      stockStatus = 'Sin Stock';
      stockStatusClass = 'bg-red-100 text-red-800';
    } else if (product.stock < 10) {
      stockStatus = 'Stock Bajo';
      stockStatusClass = 'bg-yellow-100 text-yellow-800';
    }
    
    const stockDisplay = `${product.stock} ${product.stockUnit}`;
    const priceDisplay = `ARS ${product.price.toFixed(2)}/${product.priceType}`;
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
        <div class="flex items-center space-x-2">
          <button onclick="decreaseProductQuantity('${product.id}')" class="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${product.stock === 0 ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          </button>
          <input 
            type="number" 
            id="quantity_${product.id}" 
            min="0" 
            max="${product.stock}" 
            value="${currentQuantity}" 
            class="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onchange="updateProductSelection('${product.id}', this.value)"
            ${product.stock === 0 ? 'disabled' : ''}
          >
          <button onclick="increaseProductQuantity('${product.id}')" class="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${product.stock === 0 ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button id="addBtn_${product.id}" class="text-blue-600 hover:text-blue-900 ${currentQuantity > 0 ? '' : 'opacity-50 cursor-not-allowed'}" onclick="addSelectedProductToOrder('${product.id}')" ${currentQuantity > 0 ? '' : 'disabled'}>
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
  const product = availableProducts.find(p => p.id === productId);
  if (!product) return;
  
  const input = document.getElementById(`quantity_${productId}`);
  const currentValue = parseInt(input.value) || 0;
  
  if (currentValue < product.stock) {
    const newValue = currentValue + 1;
    input.value = newValue;
    updateProductSelection(productId, newValue);
  }
}

// Decrease product quantity
function decreaseProductQuantity(productId) {
  const input = document.getElementById(`quantity_${productId}`);
  const currentValue = parseInt(input.value) || 0;
  
  if (currentValue > 0) {
    const newValue = currentValue - 1;
    input.value = newValue;
    updateProductSelection(productId, newValue);
  }
}

// Update product selection
function updateProductSelection(productId, quantity) {
  const product = availableProducts.find(p => p.id === productId);
  if (!product) return;
  
  const qty = parseInt(quantity) || 0;
  const addBtn = document.getElementById(`addBtn_${productId}`);
  
  if (qty > 0 && qty <= product.stock) {
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
    totalElement.textContent = 'ARS 0.00';
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
      <div class="text-sm font-semibold text-gray-900">ARS ${item.subtotal.toFixed(2)}</div>
    </div>
  `).join('');
  
  const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
  totalElement.textContent = `ARS ${total.toFixed(2)}`;
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
  document.getElementById(`quantity_${productId}`).value = 0;
  
  // Update displays
  updateSelectedProductsDisplay();
  updateAddAllButton();
  
  // Update add button state
  const addBtn = document.getElementById(`addBtn_${productId}`);
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
  const searchTerm = document.getElementById('productSearch').value.toLowerCase();
  const categoryFilter = document.getElementById('productCategory').value;
  
  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = !searchTerm || product.name.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
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
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    // Determine stock status
    let stockStatus = 'En Stock';
    let stockStatusClass = 'bg-green-100 text-green-800';
    
    if (product.stock === 0) {
      stockStatus = 'Sin Stock';
      stockStatusClass = 'bg-red-100 text-red-800';
    } else if (product.stock < 10) {
      stockStatus = 'Stock Bajo';
      stockStatusClass = 'bg-yellow-100 text-yellow-800';
    }
    
    const stockDisplay = `${product.stock} ${product.stockUnit}`;
    const priceDisplay = `ARS ${product.price.toFixed(2)}/${product.priceType}`;
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
        <div class="flex items-center space-x-2">
          <button onclick="decreaseProductQuantity('${product.id}')" class="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${product.stock === 0 ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          </button>
          <input 
            type="number" 
            id="quantity_${product.id}" 
            min="0" 
            max="${product.stock}" 
            value="${currentQuantity}" 
            class="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onchange="updateProductSelection('${product.id}', this.value)"
            ${product.stock === 0 ? 'disabled' : ''}
          >
          <button onclick="increaseProductQuantity('${product.id}')" class="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${product.stock === 0 ? 'disabled' : ''}>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button id="addBtn_${product.id}" class="text-blue-600 hover:text-blue-900 ${currentQuantity > 0 ? '' : 'opacity-50 cursor-not-allowed'}" onclick="addSelectedProductToOrder('${product.id}')" ${currentQuantity > 0 ? '' : 'disabled'}>
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
