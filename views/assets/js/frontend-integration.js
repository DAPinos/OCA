// Integración Frontend - Sistema de Autenticación OCA Minimarkets
class FrontendIntegration {
    constructor() {
        this.init();
    }

    init() {
        // Verificar autenticación al cargar cualquier página
        this.checkAuthentication();
        
        // Configurar interceptores para requests
        this.setupRequestInterceptors();
        
        // Configurar manejo de logout
        this.setupLogoutHandlers();
        
        // Configurar actualización automática de token
        this.setupTokenRefresh();
    }

    // Verificar autenticación
    checkAuthentication() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (!token || !userData) {
            this.redirectToLogin();
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            this.currentUser = user;
            
            // Verificar si el token ha expirado
            if (this.isTokenExpired(token)) {
                this.handleExpiredToken();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            this.clearSession();
            this.redirectToLogin();
            return false;
        }
    }

    // Verificar si el token ha expirado
    isTokenExpired(token) {
        if (token.startsWith('demo_')) {
            // Los tokens demo no expiran
            return false;
        }
        
        try {
            // Decodificar JWT (simplificado)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            return payload.exp < currentTime;
        } catch (error) {
            // Si no se puede decodificar, asumir que está expirado
            return true;
        }
    }

    // Manejar token expirado
    handleExpiredToken() {
        this.showNotification('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
        setTimeout(() => {
            this.clearSession();
            this.redirectToLogin();
        }, 3000);
    }

    // Redirigir al login
    redirectToLogin() {
        const currentPath = window.location.pathname;
        
        // No redirigir si ya estamos en una página de auth
        if (currentPath.includes('/auth/')) {
            return;
        }
        
        // Guardar la página actual para redirigir después del login
        localStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Determinar la ruta correcta según la ubicación actual
        const loginPath = this.getCorrectAuthPath('login.html');
        console.log('Redirigiendo al login desde:', currentPath, 'hacia:', loginPath);
        window.location.href = loginPath;
    }

    // Obtener la ruta correcta para archivos de autenticación
    getCorrectAuthPath(filename) {
        const currentPath = window.location.pathname;
        const currentUrl = window.location.href;
        
        console.log('Determinando ruta auth desde:', currentPath);
        
        // Si ya estamos en una página de auth, usar ruta relativa
        if (currentPath.includes('/auth/') || currentUrl.includes('/auth/')) {
            return filename; // Solo el nombre del archivo
        }
        
        // Si estamos en la raíz o en otra ubicación, usar auth/
        return `auth/${filename}`;
    }

    // Limpiar sesión
    clearSession() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('sessionActive');
        localStorage.removeItem('lastLogin');
        localStorage.removeItem('tempToken');
        localStorage.removeItem('tempUserData');
    }

    // Configurar interceptores para requests
    setupRequestInterceptors() {
        // Interceptar fetch requests para agregar token de autorización
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            const token = localStorage.getItem('authToken');
            
            if (token && !options.headers?.Authorization) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                };
            }
            
            try {
                const response = await originalFetch(url, options);
                
                // Manejar respuestas de autenticación
                if (response.status === 401) {
                    this.handleUnauthorized();
                }
                
                return response;
            } catch (error) {
                console.error('Error en request:', error);
                throw error;
            }
        };
    }

    // Manejar respuesta no autorizada
    handleUnauthorized() {
        this.showNotification('Sesión no válida. Redirigiendo al login...', 'error');
        setTimeout(() => {
            this.clearSession();
            this.redirectToLogin();
        }, 2000);
    }

    // Configurar manejadores de logout
    setupLogoutHandlers() {
        // Agregar event listeners a botones de logout
        document.addEventListener('click', (e) => {
            if (e.target.matches('.logout-btn, [data-action="logout"]')) {
                e.preventDefault();
                this.logout();
            }
        });
        
        // Manejar cierre de ventana/pestaña
        window.addEventListener('beforeunload', () => {
            // Opcional: notificar al servidor sobre el logout
            if (localStorage.getItem('authToken')) {
                navigator.sendBeacon('/api/auth/logout', JSON.stringify({
                    token: localStorage.getItem('authToken')
                }));
            }
        });
    }

    // Logout
    async logout() {
        const token = localStorage.getItem('authToken');
        
        try {
            // Notificar al servidor sobre el logout
            if (token && !token.startsWith('demo_')) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Error al notificar logout al servidor:', error);
        }
        
        // Limpiar sesión local
        this.clearSession();
        
        // Mostrar mensaje y redirigir
        this.showNotification('Sesión cerrada correctamente', 'success');
        setTimeout(() => {
            const loginPath = this.getCorrectAuthPath('login.html');
            console.log('Redirigiendo al login tras logout:', loginPath);
            window.location.href = loginPath;
        }, 1000);
    }

    // Configurar actualización automática de token
    setupTokenRefresh() {
        // Verificar token cada 5 minutos
        setInterval(() => {
            const token = localStorage.getItem('authToken');
            
            if (token && !token.startsWith('demo_')) {
                this.refreshTokenIfNeeded(token);
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    // Actualizar token si es necesario
    async refreshTokenIfNeeded(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            const timeUntilExpiry = payload.exp - currentTime;
            
            // Refrescar si quedan menos de 10 minutos
            if (timeUntilExpiry < 10 * 60) {
                await this.refreshToken();
            }
        } catch (error) {
            console.error('Error al verificar expiración de token:', error);
        }
    }

    // Refrescar token
    async refreshToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('authToken', data.token);
                console.log('Token actualizado correctamente');
            } else {
                throw new Error('Error al refrescar token');
            }
        } catch (error) {
            console.error('Error al refrescar token:', error);
            this.handleExpiredToken();
        }
    }

    // Obtener información del usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Verificar si el usuario tiene un rol específico
    hasRole(role) {
        return this.currentUser?.role === role;
    }

    // Verificar si el usuario tiene permisos para una acción
    hasPermission(permission) {
        const rolePermissions = {
            administrador: ['all'],
            produccion: ['production', 'inventory', 'reports'],
            vendedor: ['sales', 'clients', 'inventory_read'],
            cajero: ['pos', 'sales', 'clients_read'],
            inventario: ['inventory', 'reports'],
            cliente: ['profile', 'orders', 'payments']
        };
        
        const userPermissions = rolePermissions[this.currentUser?.role] || [];
        
        return userPermissions.includes('all') || userPermissions.includes(permission);
    }

    // Mostrar notificación
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `frontend-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;
        
        // Agregar estilos si no existen
        if (!document.getElementById('frontend-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'frontend-notification-styles';
            styles.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 4px;
                    margin-left: auto;
                }
                
                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease-in reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    // Obtener icono de notificación
    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Obtener color de notificación
    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }
}

// Inicializar integración frontend
document.addEventListener('DOMContentLoaded', () => {
    window.frontendIntegration = new FrontendIntegration();
});

// Funciones globales para uso en HTML
function logout() {
    if (window.frontendIntegration) {
        window.frontendIntegration.logout();
    }
}

function getCurrentUser() {
    return window.frontendIntegration?.getCurrentUser();
}

function hasRole(role) {
    return window.frontendIntegration?.hasRole(role) || false;
}

function hasPermission(permission) {
    return window.frontendIntegration?.hasPermission(permission) || false;
}
