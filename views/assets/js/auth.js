// Sistema de Autenticación - OCA Minimarkets
class AuthSystem {
    constructor() {
        this.apiUrl = 'https://api.ocaminimarkets.com'; // Cambiar por tu API real
        this.googleClientId = 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
        this.appleClientId = 'com.ocaminimarkets.app';
        this.init();
    }

    init() {
        // Verificar si ya hay una sesión activa
        this.checkExistingSession();
        
        // Inicializar Google OAuth
        this.initGoogleAuth();
        
        // Inicializar Apple OAuth
        this.initAppleAuth();
        
        // Configurar event listeners
        this.setupEventListeners();
    }

    // Verificar sesión existente
    checkExistingSession() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('userData');
        
        if (token && user) {
            let parsedUser;
            try { parsedUser = JSON.parse(user); } catch(_) { parsedUser = null; }
            const isDemoToken = token.startsWith('demo_');
            const isLocalEnv = ['file:', 'http:'].includes(window.location.protocol) && (/localhost|127\.0\.0\.1/.test(window.location.hostname) || window.location.protocol === 'file:');

            if (isDemoToken || isLocalEnv) {
                // En modo demo o local, no validar contra API remota
                if (window.location.pathname.includes('login') || 
                    window.location.pathname.includes('register')) {
                    const targetUrl = this.getRedirectForRole(parsedUser && parsedUser.role);
                    console.log('Sesión detectada (demo/local). Redirigiendo a:', targetUrl);
                    window.location.replace(targetUrl);
                }
                return;
            }

            // Verificar si el token es válido (entorno real)
            this.validateToken(token).then(isValid => {
                if (isValid) {
                    if (window.location.pathname.includes('login') || 
                        window.location.pathname.includes('register')) {
                        const targetUrl = this.getRedirectForRole(parsedUser && parsedUser.role);
                        console.log('Sesión válida. Redirigiendo a:', targetUrl);
                        window.location.replace(targetUrl);
                    }
                } else {
                    // Token inválido, limpiar datos
                    this.logout();
                }
            });
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Forgot password form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        // Reset password form
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Google login button
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.loginWithGoogle());
        }

        // Apple login button
        const appleLoginBtn = document.getElementById('appleLoginBtn');
        if (appleLoginBtn) {
            appleLoginBtn.addEventListener('click', () => this.loginWithApple());
        }

        // Toggle between login and register
        const toggleToRegister = document.getElementById('toggleToRegister');
        const toggleToLogin = document.getElementById('toggleToLogin');
        
        if (toggleToRegister) {
            toggleToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }
        
        if (toggleToLogin) {
            toggleToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }
    }

    // Manejar login con email/contraseña
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validaciones frontend
        if (!this.validateEmail(email)) {
            this.showMessage('Por favor, ingresa un email válido.', 'error');
            return;
        }
        
        if (!password || password.length < 6) {
            this.showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Login exitoso
                this.handleAuthSuccess(data);
            } else {
                // Error en login
                this.showMessage(data.message || 'Error al iniciar sesión. Verifica tus credenciales.', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showMessage('Error de conexión. Por favor, intenta de nuevo.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Manejar registro con email/contraseña
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const role = (document.getElementById('registerRole') && document.getElementById('registerRole').value) || '';
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validaciones frontend
        if (!name || name.length < 2) {
            this.showMessage('El nombre debe tener al menos 2 caracteres.', 'error');
            return;
        }
        
        if (!this.validateEmail(email)) {
            this.showMessage('Por favor, ingresa un email válido.', 'error');
            return;
        }
        
        // Validar tipo de usuario
        const allowedRoles = ['administracion', 'cliente', 'produccion'];
        if (!allowedRoles.includes(role)) {
            this.showMessage('Selecciona un tipo de usuario válido (Administración, Cliente o Producción).', 'error');
            return;
        }
        
        if (!this.validatePassword(password)) {
            this.showMessage('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos.', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden.', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await response.json();

            if (response.ok) {
                // Registro exitoso
                this.showMessage('Cuenta creada exitosamente. Iniciando sesión...', 'success');
                setTimeout(() => {
                    this.handleAuthSuccess(data);
                }, 1500);
            } else {
                // Error en registro
                if (response.status === 409) {
                    this.showMessage('Este email ya está registrado. ¿Deseas iniciar sesión?', 'error');
                    setTimeout(() => {
                        this.showLoginForm();
                    }, 2000);
                } else {
                    this.showMessage(data.message || 'Error al crear la cuenta.', 'error');
                }
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showMessage('Error de conexión. Por favor, intenta de nuevo.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Manejar "Olvidé mi contraseña"
    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('forgotEmail').value;
        
        if (!this.validateEmail(email)) {
            this.showMessage('Por favor, ingresa un email válido.', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            // Siempre mostrar mensaje de éxito por seguridad
            this.showMessage('Si el email está registrado, recibirás un enlace para restablecer tu contraseña.', 'success');
            
            // Limpiar formulario
            document.getElementById('forgotEmail').value = '';
            
        } catch (error) {
            console.error('Error en forgot password:', error);
            this.showMessage('Error de conexión. Por favor, intenta de nuevo.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Manejar reset de contraseña
    async handleResetPassword(e) {
        e.preventDefault();
        
        const token = new URLSearchParams(window.location.search).get('token');
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        if (!token) {
            this.showMessage('Token inválido o expirado.', 'error');
            return;
        }
        
        if (!this.validatePassword(password)) {
            this.showMessage('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos.', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden.', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiUrl}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Contraseña actualizada exitosamente. Redirigiendo al login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                this.showMessage(data.message || 'Error al actualizar la contraseña.', 'error');
            }
        } catch (error) {
            console.error('Error en reset password:', error);
            this.showMessage('Error de conexión. Por favor, intenta de nuevo.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Inicializar Google OAuth
    initGoogleAuth() {
        // Cargar Google API
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api:client.js';
        script.onload = () => {
            gapi.load('auth2', () => {
                gapi.auth2.init({
                    client_id: this.googleClientId
                });
            });
        };
        document.head.appendChild(script);
    }

    // Login con Google
    async loginWithGoogle() {
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            const googleUser = await authInstance.signIn();
            const profile = googleUser.getBasicProfile();
            const idToken = googleUser.getAuthResponse().id_token;

            // Enviar token al backend para verificación
            const response = await fetch(`${this.apiUrl}/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    idToken,
                    email: profile.getEmail(),
                    name: profile.getName(),
                    picture: profile.getImageUrl()
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.handleAuthSuccess(data);
            } else {
                this.showMessage(data.message || 'Error al iniciar sesión con Google.', 'error');
            }
        } catch (error) {
            console.error('Error en Google login:', error);
            this.showMessage('Error al iniciar sesión con Google.', 'error');
        }
    }

    // Inicializar Apple OAuth
    initAppleAuth() {
        // Cargar Apple ID SDK
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.onload = () => {
            AppleID.auth.init({
                clientId: this.appleClientId,
                scope: 'name email',
                redirectURI: window.location.origin + '/auth/apple-callback',
                usePopup: true
            });
        };
        document.head.appendChild(script);
    }

    // Login con Apple
    async loginWithApple() {
        try {
            const data = await AppleID.auth.signIn();
            
            // Enviar datos al backend
            const response = await fetch(`${this.apiUrl}/auth/apple`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.handleAuthSuccess(result);
            } else {
                this.showMessage(result.message || 'Error al iniciar sesión con Apple.', 'error');
            }
        } catch (error) {
            console.error('Error en Apple login:', error);
            this.showMessage('Error al iniciar sesión con Apple.', 'error');
        }
    }

    // Manejar autenticación exitosa con redirección por rol
    handleAuthSuccess(data) {
        // Guardar datos de sesión
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        // Claves de conveniencia para UI
        if (data.user) {
            if (data.user.role) localStorage.setItem('userRole', data.user.role);
            if (data.user.name) localStorage.setItem('userName', data.user.name);
        }

        // Mensaje de bienvenida específico
        try { this.showMessage(this.getWelcomeMessage(data.user || {}), 'success'); } catch(_) { this.showMessage('¡Bienvenido! Redirigiendo...', 'success'); }

        // Redirigir según rol
        setTimeout(() => {
            const target = this.getRedirectForRole(data.user && data.user.role);
            window.location.href = target;
        }, 1200);
    }

    // Obtener ruta de redirección según rol
    getRedirectForRole(role) {
        switch ((role || '').toLowerCase()) {
            case 'administracion':
            case 'administrador':
                return 'index.html';
            case 'cliente':
                return 'orders.html';
            case 'produccion':
                return 'kds.html';
            default:
                return 'index.html';
        }
    }

    // Cerrar sesión
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        // Login está en views/login.html
        window.location.href = 'login.html';
    }

    // Validar token
    async validateToken(token) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Validaciones
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        // Al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }

    // UI Helpers
    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer') || this.createMessageContainer();
        
        messageContainer.innerHTML = `
            <div class="alert alert-${type} fade-in">
                <i class="fas ${this.getIconForType(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        messageContainer.style.display = 'block';
        
        // Auto-hide después de 5 segundos
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }

    createMessageContainer() {
        const container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
        return container;
    }

    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    showLoading(show) {
        const loadingElements = document.querySelectorAll('.loading-spinner');
        const submitButtons = document.querySelectorAll('button[type="submit"]');
        
        if (show) {
            loadingElements.forEach(el => el.style.display = 'inline-block');
            submitButtons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('loading');
            });
        } else {
            loadingElements.forEach(el => el.style.display = 'none');
            submitButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('loading');
            });
        }
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginFormContainer');
        const registerForm = document.getElementById('registerFormContainer');
        
        if (loginForm && registerForm) {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        }
    }

    showRegisterForm() {
        const loginForm = document.getElementById('loginFormContainer');
        const registerForm = document.getElementById('registerFormContainer');
        
        if (loginForm && registerForm) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }

    // Obtener mensaje de bienvenida personalizado
    getWelcomeMessage(user) {
        const messages = {
            administrador: `¡Bienvenido, ${user.name}! Accediendo al panel de administración...`,
            produccion: `¡Hola, ${user.name}! Redirigiendo al área de producción...`,
            cliente: `¡Bienvenido, ${user.name}! Accediendo a tu cuenta...`,
            vendedor: `¡Hola, ${user.name}! Accediendo al sistema de ventas...`,
            cajero: `¡Bienvenido, ${user.name}! Iniciando punto de venta...`,
            inventario: `¡Hola, ${user.name}! Accediendo al sistema de inventario...`
        };
        
        return messages[user.role] || `¡Bienvenido, ${user.name}! Redirigiendo al sistema...`;
    }

    // Redirigir al frontend con parámetros de sesión
    redirectToFrontend(user) {
        // Determinar la ruta correcta al index.html
        let baseUrl;
        const currentPath = window.location.pathname;
        const currentUrl = window.location.href;
        
        console.log('Ruta actual:', currentPath);
        console.log('URL actual:', currentUrl);
        
        if (currentPath.includes('/auth/') || currentUrl.includes('/auth/')) {
            // Estamos en la carpeta auth, ir un nivel arriba
            baseUrl = '../index.html';
        } else {
            // Estamos en la raíz
            baseUrl = 'index.html';
        }
        
        const params = new URLSearchParams({
            sessionId: localStorage.getItem('authToken'),
            userId: user.id,
            role: user.role,
            timestamp: Date.now()
        });
        
        // Comunicar con el frontend que hay una sesión activa
        localStorage.setItem('sessionActive', 'true');
        localStorage.setItem('lastLogin', new Date().toISOString());
        
        console.log('Redirigiendo al frontend:', `${baseUrl}?${params.toString()}`);
        
        // Usar replace para evitar que el usuario pueda volver atrás
        window.location.replace(`${baseUrl}?${params.toString()}`);
    }

    // Manejar login con usuarios de demostración
    handleDemoLogin(email, password, role) {
        const demoUsers = {
            'admin@ocaminimarkets.com': {
                id: 'demo_admin',
                name: 'Administrador Demo',
                email: 'admin@ocaminimarkets.com',
                role: 'administrador',
                department: 'administracion',
                isDemo: true
            },
            'cliente@ocaminimarkets.com': {
                id: 'demo_cliente',
                name: 'Cliente Demo',
                email: 'cliente@ocaminimarkets.com',
                role: 'cliente',
                department: null,
                isDemo: true
            },
            'produccion@ocaminimarkets.com': {
                id: 'demo_produccion',
                name: 'Producción Demo',
                email: 'produccion@ocaminimarkets.com',
                role: 'produccion',
                department: 'produccion',
                isDemo: true
            }
        };
        
        const user = demoUsers[email];
        if (user) {
            // Simular token demo
            const demoToken = `demo_${user.id}_${Date.now()}`;
            
            this.showMessage(`Iniciando sesión como ${user.name}...`, 'success');
            
            // Simular delay de autenticación
            setTimeout(() => {
                this.handleAuthSuccess({
                    token: demoToken,
                    user: user,
                    needsCompletion: false
                });
            }, 1000);
        } else {
            this.showMessage('Usuario de demostración no válido', 'error');
        }
    }

    // Llenar formulario con datos de demostración
    fillDemoUser(email, password, role) {
        const emailField = document.getElementById('email');
        const passwordField = document.getElementById('password');
        
        if (emailField) {
            emailField.value = email;
            emailField.classList.add('demo-filled');
            setTimeout(() => emailField.classList.remove('demo-filled'), 2000);
        }
        
        if (passwordField) {
            passwordField.value = password;
            passwordField.classList.add('demo-filled');
            setTimeout(() => passwordField.classList.remove('demo-filled'), 2000);
        }
        
        // Mostrar mensaje informativo
        this.showMessage('Datos de demostración cargados. Haz clic en "Iniciar Sesión" o usa "Acceso Rápido"', 'info');
        
        // Hacer scroll al formulario de login
        const loginForm = document.getElementById('loginFormContainer');
        if (loginForm) {
            loginForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Inicializar usuarios de demostración
    initDemoUsers() {
        // Agregar event listeners para usuarios demo (llenar formulario)
        const demoUsers = document.querySelectorAll('.demo-user');
        demoUsers.forEach(demoUser => {
            demoUser.addEventListener('click', () => {
                const email = demoUser.dataset.email;
                const password = demoUser.dataset.password;
                const role = demoUser.dataset.role;
                
                if (email && password && role) {
                    this.fillDemoUser(email, password, role);
                }
            });
        });
        
        // Agregar event listeners para botones de login rápido
        const quickLoginBtns = document.querySelectorAll('.quick-demo-login');
        quickLoginBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const email = btn.dataset.email;
                const password = btn.dataset.password;
                const role = btn.dataset.role;
                
                if (email && password && role) {
                    this.showLoading(true);
                    this.handleDemoLogin(email, password, role);
                }
            });
        });
    }
}

// Inicializar sistema de autenticación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
    
    // Inicializar usuarios demo después de que el sistema esté listo
    setTimeout(() => {
        if (window.authSystem) {
            window.authSystem.initDemoUsers();
        }
    }, 100);
});

// Función global para logout (puede ser llamada desde cualquier parte)
function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
}

// Función global para llenar datos de demo (compatibilidad con HTML original)
function fillDemoUser(email, password, role) {
    if (window.authSystem) {
        window.authSystem.fillDemoUser(email, password, role);
    }
}

// Función global para login rápido de demo
function quickDemoLogin(email, password, role) {
    if (window.authSystem) {
        window.authSystem.handleDemoLogin(email, password, role);
    }
}
