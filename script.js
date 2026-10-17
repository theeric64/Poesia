// ==========================================
// ESTADO GLOBAL Y CONFIGURACIÓN (ESPAÑOL)
// ==========================================
const BACKEND_URL = 'http://localhost:8080/api';

const POEMAS_ESPANOL = [
  {
    title: "Rima XXI",
    author: "Gustavo Adolfo Bécquer",
    lines: [
      "¿Qué es poesía?, dices mientras clavas",
      "en mi pupila tu pupila azul.",
      "¿Qué es poesía? ¿Y tú me lo preguntas?",
      "Poesía... eres tú."
    ]
  },
  {
    title: "Táctica y Estrategia",
    author: "Mario Benedetti",
    lines: [
      "Mi táctica es mirarte",
      "aprender como sos",
      "quererte como sos.",
      "",
      "Mi táctica es hablarte",
      "y escucharte",
      "construir con palabras un puente indestructible.",
      "",
      "Mi estrategia es en cambio",
      "más profunda y más simple",
      "mi estrategia es que un día cualquiera",
      "no sé cómo ni sé con qué pretexto",
      "por fin me necesites."
    ]
  },
  {
    title: "Si me quieres, quiéreme entera",
    author: "Dulce María Loynaz",
    lines: [
      "Si me quieres, quiéreme entera,",
      "no por zonas de luz o sombra...",
      "Si me quieres, quiéreme negra",
      "y blanca, y gris, verde y rubia,",
      "y morena...",
      "",
      "Quiéreme día,",
      "quiéreme noche...",
      "¡Y madrugada en la ventana abierta!..."
    ]
  },
  {
    title: "La Infinita",
    author: "Pablo Neruda",
    lines: [
      "Ves estas manos? Han medido la tierra,",
      "han separado los minerales y los cereales,",
      "han hecho la paz y la guerra,",
      "han derribado las distancias de todos los mares y ríos.",
      "",
      "Y sin embargo",
      "cuando me recorren a ti, amor, a tu pequeña nada,",
      "no alcanzan a abarcarte..."
    ]
  },
  {
    title: "El Poeta Pide a su Amor que le Escriba",
    author: "Federico García Lorca",
    lines: [
      "Amor de mis entrañas, viva muerte,",
      "en vano espero tu palabra escrita",
      "y pienso, con la flor que se marchita,",
      "que si vivo sin mí quiero perderte.",
      "",
      "El aire es inmortal. La piedra inerte",
      "ni conoce la sombra ni la evita.",
      "Corazón interior no necesita",
      "la miel helada que la luna vierte."
    ]
  }
];

let isRegisterMode = false;

let userState = {
  currentUser: JSON.parse(localStorage.getItem('pv_active_user')) || null,
  theme: localStorage.getItem('pv_theme') || 'light',
  fontSize: localStorage.getItem('pv_fontSize') || '18',
  currentPoem: null,
  location: { lat: null, lng: null, context: 'Desconocido' }
};

// ==========================================
// INICIALIZACIÓN Y SERVICE WORKER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  registerServiceWorker();
});

function initApp() {
  applySavedPreferences();
  updateAuthUI();
  requestGPSLocation();
  fetchRandomPoem();
  setupEventListeners();
  logTelemetry('APP_INIT', 'HomeScreen', { timestamp: new Date().toISOString() });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('🚀 [PWA Status] Service Worker registrado:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ [PWA Status] Error al registrar el Service Worker:', error);
        });
    });
  }
}

// ==========================================
// 1. MÓDULO DE AUTENTICACIÓN Y SESIÓN
// ==========================================
function openAuthModal() {
  if (userState.currentUser) {
    // Si ya está autenticado, funciona como botón de Salir (Logout)
    if (confirm(`¿Deseas cerrar sesión, ${userState.currentUser.name || userState.currentUser.email}?`)) {
      logTelemetry('LOGOUT', 'AuthModule', { email: userState.currentUser.email });
      userState.currentUser = null;
      localStorage.removeItem('pv_active_user');
      updateAuthUI();
    }
  } else {
    document.getElementById('auth-modal').style.display = 'flex';
  }
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  const title = document.getElementById('modal-title');
  const nameGroup = document.getElementById('name-group');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleText = document.getElementById('toggle-auth-text');
  const toggleLink = document.getElementById('toggle-auth-link');

  if (isRegisterMode) {
    title.innerText = 'Crear Cuenta';
    nameGroup.style.display = 'block';
    submitBtn.innerText = 'Registrarse';
    toggleText.innerText = '¿Ya tienes una cuenta?';
    toggleLink.innerText = 'Inicia Sesión';
  } else {
    title.innerText = 'Iniciar Sesión';
    nameGroup.style.display = 'none';
    submitBtn.innerText = 'Ingresar';
    toggleText.innerText = '¿No tienes cuenta?';
    toggleLink.innerText = 'Regístrate';
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();

  let users = JSON.parse(localStorage.getItem('pv_registered_users') || '[]');

  if (isRegisterMode) {
    // Proceso de Registro
    const userExists = users.some(u => u.email === email);
    if (userExists) {
      alert('El correo ya se encuentra registrado. Inicia sesión.');
      return;
    }

    const newUser = { id: 'usr_' + Date.now(), name: name || 'Lector', email: email, password: password };
    users.push(newUser);
    localStorage.setItem('pv_registered_users', JSON.stringify(users));

    userState.currentUser = { id: newUser.id, name: newUser.name, email: newUser.email };
    localStorage.setItem('pv_active_user', JSON.stringify(userState.currentUser));

    alert(`¡Bienvenido/a, ${userState.currentUser.name}! Tu cuenta ha sido creada.`);
    logTelemetry('REGISTER', 'AuthModule', { email: email });
  } else {
    // Proceso de Inicio de Sesión
    const validUser = users.find(u => u.email === email && u.password === password);
    if (!validUser) {
      alert('Credenciales incorrectas. Verifica tu correo y contraseña.');
      return;
    }

    userState.currentUser = { id: validUser.id, name: validUser.name, email: validUser.email };
    localStorage.setItem('pv_active_user', JSON.stringify(userState.currentUser));

    alert(`¡Hola de nuevo, ${userState.currentUser.name}!`);
    logTelemetry('LOGIN', 'AuthModule', { email: email });
  }

  updateAuthUI();
  closeAuthModal();
}

function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) {
    if (userState.currentUser) {
      authBtn.innerText = `Salir (${userState.currentUser.name.split(' ')[0]})`;
      authBtn.style.borderColor = '#27ae60';
    } else {
      authBtn.innerText = 'Ingresar';
      authBtn.style.borderColor = 'var(--border-color)';
    }
  }
}

// ==========================================
// 2. OBTENCIÓN DE POEMAS EN ESPAÑOL
// ==========================================
async function fetchRandomPoem() {
  showLoading(true);
  
  setTimeout(() => {
    const randomIndex = Math.floor(Math.random() * POEMAS_ESPANOL.length);
    const poem = POEMAS_ESPANOL[randomIndex];

    userState.currentPoem = poem;
    renderPoem(poem);
    logTelemetry('FETCH_POEM', 'HomeScreen', { title: poem.title, author: poem.author, lang: 'es' });
    showLoading(false);
  }, 300);
}

function searchPoem(query) {
  if (!query.trim()) return;
  showLoading(true);

  const cleanQuery = query.toLowerCase().trim();
  const foundPoem = POEMAS_ESPANOL.find(poem => 
    poem.title.toLowerCase().includes(cleanQuery) || 
    poem.author.toLowerCase().includes(cleanQuery)
  );

  setTimeout(() => {
    if (foundPoem) {
      userState.currentPoem = foundPoem;
      renderPoem(foundPoem);
      logTelemetry('SEARCH', 'SearchTab', { query: query, result: 'found' });
    } else {
      alert(`No se encontraron poemas en español para: "${query}". Prueba buscando por "Neruda", "Bécquer" o "Lorca".`);
    }
    showLoading(false);
  }, 200);
}

function renderPoem(poem) {
  const titleEl = document.getElementById('poem-title');
  const authorEl = document.getElementById('poem-author');
  const bodyEl = document.getElementById('poem-body');

  if (titleEl) titleEl.innerText = poem.title;
  if (authorEl) authorEl.innerText = `Por ${poem.author}`;
  if (bodyEl) {
    bodyEl.innerText = Array.isArray(poem.lines) ? poem.lines.join('\n') : poem.lines;
  }
}

function showLoading(isLoading) {
  const body = document.getElementById('poem-body');
  if (body) {
    if (isLoading) {
      body.style.opacity = '0.5';
      body.innerText = 'Cargando verso en español...';
    } else {
      body.style.opacity = '1';
    }
  }
}

// ==========================================
// 3. GEOLOCALIZACIÓN Y PREFERENCIAS
// ==========================================
function requestGPSLocation() {
  const gpsLabel = document.getElementById('gps-location-text');

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userState.location.lat = position.coords.latitude;
        userState.location.lng = position.coords.longitude;
        userState.location.context = 'Entorno Urbano / Parque';

        if (gpsLabel) {
          gpsLabel.innerText = `${userState.location.context}`;
        }
        
        logTelemetry('GPS_UPDATE', 'GPSModule', {
          lat: userState.location.lat,
          lng: userState.location.lng
        });
      },
      (error) => {
        if (gpsLabel) gpsLabel.innerText = 'GPS Desactivado';
        console.warn('Acceso a GPS denegado:', error.message);
      }
    );
  } else {
    if (gpsLabel) gpsLabel.innerText = 'GPS no soportado';
  }
}

function setTheme(themeName) {
  userState.theme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('pv_theme', themeName);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeName);
  });

  logTelemetry('CHANGE_THEME', 'Settings', { theme: themeName });
}

function changeFontSize(sizePx) {
  userState.fontSize = sizePx;
  document.documentElement.style.setProperty('--font-size-poem', `${sizePx}px`);
  localStorage.setItem('pv_fontSize', sizePx);

  const label = document.getElementById('font-size-val');
  if (label) label.innerText = `${sizePx}px`;

  logTelemetry('CHANGE_FONT_SIZE', 'Settings', { fontSize: sizePx });
}

function applySavedPreferences() {
  setTheme(userState.theme);
  changeFontSize(userState.fontSize);

  const slider = document.getElementById('font-slider');
  if (slider) slider.value = userState.fontSize;
}

// ==========================================
// 4. NOTIFICACIONES Y TELEMETRÍA
// ==========================================
function triggerNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('PoeticVerse 📜', {
      body: `Poema sugerido: "${userState.currentPoem?.title || 'Explora nuevos versos'}"`
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') triggerNotification();
    });
  } else {
    alert(`🔔 [Notificación PoeticVerse]\nPoema recomendado: "${userState.currentPoem?.title || 'Nuevo poema disponible'}"`);
  }
  logTelemetry('NOTIFICATION_TRIGGER', 'PushService', { status: 'executed' });
}

function logTelemetry(eventType, screenName, details = {}) {
  const payload = {
    userId: userState.currentUser ? userState.currentUser.id : 'guest',
    userEmail: userState.currentUser ? userState.currentUser.email : null,
    eventType: eventType,
    screenName: screenName,
    latitude: userState.location.lat,
    longitude: userState.location.lng,
    details: details,
    timestamp: new Date().toISOString()
  };

  console.log('📡 [TELEMETRÍA LOG]:', payload);

  fetch(`${BACKEND_URL}/tracking/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {
    // Silencia la excepción si el servidor local no está encendido
  });
}

// ==========================================
// 5. EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  const btnFavorite = document.getElementById('btn-favorite');
  if (btnFavorite) {
    btnFavorite.addEventListener('click', () => {
      let favorites = JSON.parse(localStorage.getItem('pv_favorites') || '[]');
      if (userState.currentPoem) {
        favorites.push({
          ...userState.currentPoem,
          savedBy: userState.currentUser ? userState.currentUser.email : 'guest',
          savedAt: new Date().toISOString(),
          location: userState.location
        });
        localStorage.setItem('pv_favorites', JSON.stringify(favorites));
        alert('❤️ Poema guardado en tus favoritos locales');
        logTelemetry('TOGGLE_FAVORITE', 'HomeScreen', { poemTitle: userState.currentPoem.title });
      }
    });
  }

  const btnSearch = document.getElementById('btn-search');
  if (btnSearch) {
    btnSearch.addEventListener('click', () => {
      const input = document.getElementById('search-input');
      if (input) searchPoem(input.value);
    });
  }

  const btnRandom = document.getElementById('btn-random');
  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      fetchRandomPoem();
    });
  }
}