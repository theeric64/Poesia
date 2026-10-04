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

let userState = {
  userId: 'usr_demo_123',
  theme: localStorage.getItem('pv_theme') || 'light',
  fontSize: localStorage.getItem('pv_fontSize') || '18',
  currentPoem: null,
  location: { lat: null, lng: null, context: 'Desconocido' }
};
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  registerServiceWorker();
});

function initApp() {
  applySavedPreferences();
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
    userId: userState.userId,
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
  });
}

function setupEventListeners() {
  const btnFavorite = document.getElementById('btn-favorite');
  if (btnFavorite) {
    btnFavorite.addEventListener('click', () => {
      let favorites = JSON.parse(localStorage.getItem('pv_favorites') || '[]');
      if (userState.currentPoem) {
        favorites.push({
          ...userState.currentPoem,
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