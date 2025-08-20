(function(){
  // ===== Defaults and helpers =====
  const DEFAULTS = {
    language: 'es', // 'es' | 'en' | 'pt'
    timezone: 'America/Santiago', // GMT-4 (CL)
    theme: 'light', // 'light' | 'dark' | 'system'
    currency: 'CLP',
    currencyLocale: 'es-CL',
    currencyDisplay: 'symbol', // 'code' or 'symbol'
    currencyFractionDigits: 0,
    autosave: true,
    profile: { name:'', phone:'', email:'', address:'' },
  };

  const LOCALES_BY_LANG = { es: 'es-CL', en: 'en-US', pt: 'pt-BR' };

  // ===== Currency formatter =====
  const Currency = {
    get locale(){ return AppConfig.currencyLocale || LOCALES_BY_LANG[AppConfig.language] || 'es-CL'; },
    get code(){ return AppConfig.currency || 'CLP'; },
    get display(){ return AppConfig.currencyDisplay || 'symbol'; },
    get maximumFractionDigits(){ return (AppConfig.currencyFractionDigits ?? 0); },
    format(n){
      try{
        const value = Number(n) || 0;
        return new Intl.NumberFormat(this.locale, {
          style:'currency', currency:this.code, currencyDisplay:this.display,
          maximumFractionDigits: this.maximumFractionDigits
        }).format(value);
      }catch(e){ return `${this.code} ${(Number(n)||0).toFixed(this.maximumFractionDigits)}`; }
    }
  };

  // ===== Date/Time formatter =====
  function formatDateTime(dt){
    try{
      const d = (dt instanceof Date)? dt : new Date(dt||Date.now());
      const locale = LOCALES_BY_LANG[AppConfig.language] || 'es-CL';
      return new Intl.DateTimeFormat(locale, {
        dateStyle:'medium', timeStyle:'short', timeZone: AppConfig.timezone || 'UTC'
      }).format(d);
    }catch(_){ return new Date(dt||Date.now()).toLocaleString(); }
  }
  function formatDate(dt){
    try{
      const d = (dt instanceof Date)? dt : new Date(dt||Date.now());
      const locale = LOCALES_BY_LANG[AppConfig.language] || 'es-CL';
      return new Intl.DateTimeFormat(locale, { dateStyle:'medium', timeZone: AppConfig.timezone || 'UTC' }).format(d);
    }catch(_){ return new Date(dt||Date.now()).toLocaleDateString(); }
  }

  // ===== Simple i18n (data-i18n attributes) =====
  const I18N = {
    dict: {
      es: {
        'nav.home': 'Inicio',
        'nav.orders': 'Pedidos',
        'nav.products': 'Productos',
        'nav.clients': 'Clientes',
        'nav.finance': 'Finanzas',
        'nav.settings': 'Configuración',
        'settings.title': 'Configuración',
        'settings.general': 'General',
        'settings.language': 'Idioma',
        'settings.timezone': 'Zona Horaria',
        'settings.currency': 'Moneda',
        'settings.theme': 'Tema',
        'settings.autosave': 'Autoguardar',
        'settings.user_section': 'Datos del Usuario',
        'settings.user_name': 'Nombre',
        'settings.user_phone': 'Teléfono',
        'settings.user_email': 'Correo electrónico',
        'settings.user_address': 'Dirección',
        'action.save': 'Guardar cambios',
        'action.logout': 'Cerrar sesión',
        'action.switch_profile': 'Cambiar perfil',
      },
      en: {
        'nav.home': 'Home',
        'nav.orders': 'Orders',
        'nav.products': 'Products',
        'nav.clients': 'Clients',
        'nav.finance': 'Finance',
        'nav.settings': 'Settings',
        'settings.title': 'Settings',
        'settings.general': 'General',
        'settings.language': 'Language',
        'settings.timezone': 'Time Zone',
        'settings.currency': 'Currency',
        'settings.theme': 'Theme',
        'settings.autosave': 'Autosave',
        'settings.user_section': 'User Information',
        'settings.user_name': 'Name',
        'settings.user_phone': 'Phone',
        'settings.user_email': 'Email',
        'settings.user_address': 'Address',
        'action.save': 'Save Changes',
        'action.logout': 'Log out',
        'action.switch_profile': 'Switch profile',
      },
      pt: {
        'nav.home': 'Início',
        'nav.orders': 'Pedidos',
        'nav.products': 'Produtos',
        'nav.clients': 'Clientes',
        'nav.finance': 'Finanças',
        'nav.settings': 'Configurações',
        'settings.title': 'Configurações',
        'settings.general': 'Geral',
        'settings.language': 'Idioma',
        'settings.timezone': 'Fuso horário',
        'settings.currency': 'Moeda',
        'settings.theme': 'Tema',
        'settings.autosave': 'Salvar automaticamente',
        'settings.user_section': 'Dados do Usuário',
        'settings.user_name': 'Nome',
        'settings.user_phone': 'Telefone',
        'settings.user_email': 'E-mail',
        'settings.user_address': 'Endereço',
        'action.save': 'Salvar alterações',
        'action.logout': 'Sair',
        'action.switch_profile': 'Trocar perfil',
      }
    },
    t(key){ const d=this.dict[AppConfig.language]||this.dict.es; return d[key]||key; },
    apply(root){
      const r = root || document;
      r.querySelectorAll('[data-i18n]').forEach(el=>{ const k=el.getAttribute('data-i18n'); if(k) el.textContent = I18N.t(k); });
      r.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{ const k=el.getAttribute('data-i18n-placeholder'); if(k) el.setAttribute('placeholder', I18N.t(k)); });
      r.querySelectorAll('[data-i18n-title]').forEach(el=>{ const k=el.getAttribute('data-i18n-title'); if(k) el.setAttribute('title', I18N.t(k)); });
    }
  };

  // ===== AppConfig =====
  const AppConfig = {
    ...DEFAULTS,
    load(){
      try{ const raw = JSON.parse(localStorage.getItem('app_settings')||'{}'); Object.assign(this, DEFAULTS, raw); }
      catch(_){ Object.assign(this, DEFAULTS); }
      // Derive currency locale from language if not set
      if (!this.currencyLocale) this.currencyLocale = LOCALES_BY_LANG[this.language] || DEFAULTS.currencyLocale;
      return this;
    },
    save(){ localStorage.setItem('app_settings', JSON.stringify({
      language:this.language, timezone:this.timezone, theme:this.theme, currency:this.currency,
      currencyLocale:this.currencyLocale, currencyDisplay:this.currencyDisplay,
      currencyFractionDigits:this.currencyFractionDigits, autosave:this.autosave,
      profile:this.profile
    })); return this; },
    apply(){
      // Theme
      const root = document.documentElement; root.classList.remove('light','dark');
      let use = this.theme;
      if (use==='system'){
        try { use = window.matchMedia('(prefers-color-scheme: dark)').matches? 'dark':'light'; } catch(_){ use='light'; }
      }
      root.classList.add(use);
      // i18n
      try { I18N.apply(document); } catch(_){ }
      return this;
    },
    setLanguage(lang){ this.language = (['es','en','pt'].includes(lang)? lang : 'es'); this.currencyLocale = LOCALES_BY_LANG[this.language]; if(this.autosave) this.save(); this.apply(); },
    setTheme(theme){ this.theme = (['light','dark','system'].includes(theme)? theme : 'light'); if(this.autosave) this.save(); this.apply(); },
    setCurrency(code){ this.currency = code || 'CLP'; // simple defaults
      // adjust fraction digits for common currencies
      this.currencyFractionDigits = (this.currency==='CLP')? 0 : 2;
      if (this.autosave) this.save(); this.apply(); },
    setTimezone(tz){ this.timezone = tz || DEFAULTS.timezone; if(this.autosave) this.save(); this.apply(); },
    setAutosave(v){ this.autosave = !!v; this.save(); },
    setProfileField(key, value){ if(!this.profile) this.profile = {...DEFAULTS.profile}; if(key in this.profile){ this.profile[key] = value||''; if(this.autosave) this.save(); } return this; },
    setProfile(p){ this.profile = { ...DEFAULTS.profile, ...(p||{}) }; if(this.autosave) this.save(); return this; }
  };

  // ===== Expose globally =====
  AppConfig.load();
  window.AppConfig = AppConfig;
  window.Currency = Currency;
  window.formatCurrency = (n)=> Currency.format(n);
  window.formatDate = formatDate;
  window.formatDateTime = formatDateTime;
  window.setLanguage = (l)=> AppConfig.setLanguage(l);
  window.setTheme = (t)=> AppConfig.setTheme(t);
  window.setCurrency = (c)=> AppConfig.setCurrency(c);
  window.setTimezone = (z)=> AppConfig.setTimezone(z);

  // Apply on DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=> AppConfig.apply());
  else AppConfig.apply();
})();
