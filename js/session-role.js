(function () {
  function getUserRole() {
    const role = localStorage.getItem('userRole');
    return role ? role.toLowerCase() : null;
  }

  function getUserName() {
    return localStorage.getItem('userName') || '';
  }

  function setBadge() {
    const name = getUserName();
    const role = getUserRole();

    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');
    const initialsEl = document.getElementById('userInitials');

    if (nameEl) nameEl.textContent = name || 'Usuario';
    if (roleEl) roleEl.textContent = role || 'Rol';

    if (initialsEl) {
      const initials = (name || 'U')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');
      initialsEl.textContent = initials || 'U';
    }
  }

  function enforceRoleVisibility() {
    const role = getUserRole();
    if (!role) return;

    // Hide elements whose data-roles does not include current role
    document.querySelectorAll('[data-roles]')?.forEach((el) => {
      const attr = el.getAttribute('data-roles') || '';
      const allowed = attr
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (allowed.length && !allowed.includes(role)) {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function redirectIfUnauthorized() {
    const role = getUserRole();
    if (!role) return;

    const path = window.location.pathname.toLowerCase();
    const isProductionArea =
      path.endsWith('/products.html') ||
      path.endsWith('/manufacturing.html') ||
      path.endsWith('/transport.html');

    if (role === 'cliente' && isProductionArea) {
      window.location.href = 'index.html';
    }
  }

  function init() {
    try {
      setBadge();
      enforceRoleVisibility();
      redirectIfUnauthorized();
    } catch (e) {
      console.warn('session-role init error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
