// Configuración global de la aplicación
const config = {
  apiUrl: 'https://api.ocaminimarkets.com',
  theme: {
    primaryColor: '#1a365d',
    secondaryColor: '#2c5282',
    textColor: '#181710',
    bgLight: '#f5f4f0',
    bgHover: '#e8e6e0',
    borderColor: '#e2e8f0'
  },
  routes: {
    dashboard: '/',
    products: '/products',
    clients: '/clients',
    orders: '/orders',
    finance: '/finance',
    settings: '/settings',
    login: '/auth/login',
    resetPassword: '/auth/reset-password'
  }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación OCA Minimarkets iniciada');
  
  // Verificar autenticación
  checkAuth();
  
  // Inicializar componentes
  initComponents();
  
  // Configurar enrutamiento
  setupRouting();
});

// Verificar estado de autenticación
function checkAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const currentPath = window.location.pathname;
  
  // Si no está autenticado y no está en la página de login o reset-password, redirigir a login
  if (!isLoggedIn && !currentPath.includes('login') && !currentPath.includes('reset-password')) {
    window.location.href = 'auth/login.html';
    return;
  }
  
  // Si está autenticado y está en la página de login, redirigir al dashboard
  if (isLoggedIn && (currentPath.includes('login') || currentPath === '/')) {
    window.location.href = 'views/dashboard.html';
  }
}

// Inicializar componentes de la interfaz
function initComponents() {
  // Inicializar tooltips
  initTooltips();
  
  // Inicializar modales
  initModals();
  
  // Inicializar menús desplegables
  initDropdowns();
}

// Configurar el enrutamiento de la aplicación
function setupRouting() {
  // Navegación mediante history API para SPA
  document.querySelectorAll('a[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = e.target.getAttribute('data-route');
      navigateTo(route);
    });
  });
  
  // Manejar el botón de retroceso/avance del navegador
  window.addEventListener('popstate', () => {
    loadView(window.location.pathname);
  });
}

// Navegar a una ruta específica
function navigateTo(route) {
  const path = route.startsWith('/') ? route : `/${route}`;
  window.history.pushState({}, '', path);
  loadView(path);
}

// Cargar una vista específica
async function loadView(path) {
  try {
    // Determinar la ruta del archivo de la vista
    let viewPath = '';
    
    if (path === '/' || path === '/dashboard') {
      viewPath = 'views/dashboard.html';
    } else if (path.startsWith('/products')) {
      viewPath = 'views/products.html';
    } else if (path.startsWith('/clients')) {
      viewPath = 'views/clients.html';
    } else if (path.startsWith('/orders')) {
      viewPath = 'views/orders.html';
    } else if (path.startsWith('/finance')) {
      viewPath = 'views/finance.html';
    } else if (path.startsWith('/settings')) {
      viewPath = 'views/settings.html';
    } else if (path.startsWith('/auth/login')) {
      viewPath = 'auth/login.html';
    } else if (path.startsWith('/auth/reset-password')) {
      viewPath = 'auth/reset-password.html';
    } else {
      // Ruta no encontrada, redirigir a dashboard o mostrar error 404
      viewPath = 'views/404.html';
    }
    
    // Cargar el contenido de la vista
    const response = await fetch(viewPath);
    
    if (!response.ok) {
      throw new Error(`Error al cargar la vista: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Actualizar el contenido principal
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.innerHTML = html;
    } else {
      // Si no hay un elemento main, reemplazar todo el body
      document.body.innerHTML = html;
    }
    
    // Inicializar componentes específicos de la vista
    initComponents();
    
  } catch (error) {
    console.error('Error al cargar la vista:', error);
    // Mostrar mensaje de error al usuario
    showNotification('Error', 'No se pudo cargar la página solicitada. Por favor, intente de nuevo más tarde.', 'error');
  }
}

// Mostrar notificación al usuario
function showNotification(title, message, type = 'info') {
  // Implementar lógica para mostrar notificaciones
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  
  // Aquí podrías integrar con alguna librería de notificaciones como Toastify o similar
  if (window.Toastify) {
    Toastify({
      text: `${title}: ${message}`,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      backgroundColor: getNotificationColor(type),
      stopOnFocus: true
    }).showToast();
  }
}

// Obtener color de notificación según el tipo
function getNotificationColor(type) {
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };
  
  return colors[type] || colors.info;
}

// Inicializar tooltips
function initTooltips() {
  // Implementar lógica de tooltips
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    const tooltipText = element.getAttribute('data-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    
    element.appendChild(tooltip);
    
    element.addEventListener('mouseenter', () => {
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
    });
    
    element.addEventListener('mouseleave', () => {
      tooltip.style.visibility = 'hidden';
      tooltip.style.opacity = '0';
    });
  });
}

// Inicializar modales
function initModals() {
  // Implementar lógica de modales
  const modalTriggers = document.querySelectorAll('[data-modal]');
  
  modalTriggers.forEach(trigger => {
    const modalId = trigger.getAttribute('data-modal');
    const modal = document.getElementById(modalId);
    
    if (modal) {
      // Abrir modal
      trigger.addEventListener('click', () => {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      });
      
      // Cerrar modal con botón de cerrar
      const closeButtons = modal.querySelectorAll('[data-close-modal]');
      closeButtons.forEach(button => {
        button.addEventListener('click', () => {
          modal.classList.add('hidden');
          document.body.style.overflow = 'auto';
        });
      });
      
      // Cerrar modal haciendo clic fuera del contenido
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          document.body.style.overflow = 'auto';
        }
      });
    }
  });
}

// Inicializar menús desplegables
function initDropdowns() {
  // Implementar lógica de menús desplegables
  const dropdownToggles = document.querySelectorAll('[data-dropdown-toggle]');
  
  dropdownToggles.forEach(toggle => {
    const dropdownId = toggle.getAttribute('data-dropdown-toggle');
    const dropdown = document.getElementById(dropdownId);
    
    if (dropdown) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });
      
      // Cerrar al hacer clic fuera del menú
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }
  });
}

// Funciones de utilidad
const utils = {
  // Formatear moneda
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  },
  
  // Formatear fecha
  formatDate: (date, format = 'es-AR') => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(date).toLocaleDateString(format, options);
  },
  
  // Validar email
  isValidEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },
  
  // Generar ID único
  generateId: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// Hacer las utilidades disponibles globalmente
window.utils = utils;
