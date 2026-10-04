const API_POETRY = 'https://poetrydb.org';
const BACKEND_URL = 'http://localhost:8080/api';

let userState = {
  userId: 'usr_demo_123',
  theme: localStorage.getItem('pv_theme') || 'light',
  fontSize: localStorage.getItem('pv_fontSize') || '16',
  currentPoem: null,
  location: { lat: null, lng: null, context: 'Desconocido' }
};
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  applySavedPreferences();
  requestGPSLocation();
  fetchRandomPoem();
  setupEventListeners();
  logTelemetry('APP_INIT', 'HomeScreen', { timestamp: new Date().toISOString() });
}


async function fetchRandomPoem() {
  showLoading(true);
  try {
    const response = await fetch(`${API_POETRY}/random/1`);
    const data = await response.json();

    if (data && data.length > 0) {
      userState.currentPoem = data[0];
      renderPoem(data[0]);
      logTelemetry('FETCH_POEM', 'HomeScreen', { title: data[0].title, author: data[0].author });
    }
  } catch (error) {
    console.error('Error al consultar PoetryDB:', error);
    document.getElementById('poem-body').innerText = 'No se pudo cargar el poema. Verifica tu conexión.';
  } finally {
    showLoading(false);
  }
}

async function searchPoem(query) {
  if (!query.trim()) return;
  showLoading(true);
  
  try {
    const response = await fetch(`${API_POETRY}/author,title/${encodeURIComponent(query)}`);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      renderPoem(data[0]);
      logTelemetry('SEARCH', 'SearchTab', { query: query, resultsFound: data.length });
    } else {
      alert('No se encontraron poemas con ese criterio.');
    }
  } catch (error) {
    console.error('Error en la búsqueda:', error);
  } finally {
    showLoading(false);
  }
}

function renderPoem(poem) {
  document.getElementById('poem-title').innerText = poem.title;
  document.getElementById('poem-author').innerText = `Por ${poem.author}`;
  document.getElementById('poem-body').innerText = Array.isArray(poem.lines) ? poem.lines.join('\n') : poem.lines;
}

function showLoading(isLoading) {
  const body = document.getElementById('poem-body');
  if (isLoading) {
    body.style.opacity = '0.5';
    body.innerText = 'Cargando verso desde PoetryDB...';
  } else {
    body.style.opacity = '1';
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
        gpsLabel.innerText = `${userState.location.context}`;
        
        logTelemetry('GPS_UPDATE', 'GPSModule', {
          lat: userState.location.lat,
          lng: userState.location.lng
        });
      },
      (error) => {
        gpsLabel.innerText = 'Ubicación desactivada';
        console.warn('GPS Denegado o no disponible:', error.message);
      }
    );
  } else {
    gpsLabel.innerText = 'GPS no soportado';
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
  document.getElementById('font-size-val').innerText = `${sizePx}px`;

  logTelemetry('CHANGE_FONT_SIZE', 'Settings', { fontSize: sizePx });
}

function applySavedPreferences() {
  setTheme(userState.theme);
  changeFontSize(userState.fontSize);
  document.getElementById('font-slider').value = userState.fontSize;
}


function triggerNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('PoeticVerse 📜', {
      body: `Poema del Día: "${userState.currentPoem?.title || 'Descubre versos nuevos'}"`
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') triggerNotification();
    });
  } else {
    alert(`🔔 [Notificación PoeticsVerse]\n¡Tu poema del día está listo!`);
  }
  logTelemetry('NOTIFICATION_CLICK', 'PushService', { status: 'triggered' });
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

  console.log('📡 [TELEMETRÍA ENVIADA AL BACKEND]:', payload);

  fetch(`${BACKEND_URL}/tracking/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {
  });
}


function setupEventListeners() {
  document.getElementById('btn-favorite')?.addEventListener('click', () => {
    let favorites = JSON.parse(localStorage.getItem('pv_favorites') || '[]');
    if (userState.currentPoem) {
      favorites.push({ ...userState.currentPoem, savedAt: new Date().toISOString(), location: userState.location });
      localStorage.setItem('pv_favorites', JSON.stringify(favorites));
      alert('❤️ Poema guardado en tus favoritos locales');
      logTelemetry('TOGGLE_FAVORITE', 'HomeScreen', { poemTitle: userState.currentPoem.title });
    }
  });

  document.getElementById('btn-search')?.addEventListener('click', () => {
    const input = document.getElementById('search-input').value;
    searchPoem(input);
  });

  document.getElementById('btn-random')?.addEventListener('click', () => {
    fetchRandomPoem();
  });
}