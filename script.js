/* script.js - Bar La Lucciola */

/* ===========================
   COSTANTI / CONFIG
   =========================== */
const allergenMap = {
  latte: { icon: '🥛', label: 'Latte' },
  glutine: { icon: '🌾', label: 'Glutine' },
  uova: { icon: '🥚', label: 'Uova' },
  guscio: { icon: '🥜', label: 'Frutta a guscio' },
  sedano: { icon: '🌿', label: 'Sedano' }
};

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0T1gIy-XDXJv_IYaOOOlgaJ4y7yidX2PF7RZjYp7BZEQZ4ttjHg-fbcFqLGyFVBzmeVT0W7zzJXyy/pub?output=csv';

const CATEGORY_TITLES = {
  calde: 'Caffetteria',
  fredde: 'Bibite Fredde',
  aperitivi: 'Aperitivi & Cocktail',
  alcolici: 'Vini & Alcolici',
  food: 'Food & Snack',
  dolci: 'Dolci & Dessert',
  altro: 'Altro'
};

const PREFERRED_SUBCAT_ORDER = ['Aperitivi', 'Cocktail', 'Birre', 'Vini', 'Amari', 'Liquori', 'Grappe'];

/* ===========================
   STATO
   =========================== */
let menuData = {};

/* ===========================
   UTILS
   =========================== */
function safeTrim(value) {
  return String(value ?? '').trim();
}

function isFalseLike(value) {
  const v = safeTrim(value).toLowerCase();
  return v === 'no' || v === 'false';
}

function isSoldOutLike(value) {
  return safeTrim(value).toLowerCase() === 'soldout';
}

function getActiveCategoryFromOnclick(btn) {
  const raw = btn?.getAttribute?.('onclick') || '';
  const m = raw.match(/showCategory('([^']+)'/);
  return m ? m[1] : null;
}

/* ===========================
   DATA FETCH / PARSE
   =========================== */
function initDataFetch() {
  Papa.parse(SHEET_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,

    // PULIZIA SPAZI AUTOMATICA (Fix "Bibite" doppie)
    transform: (value) => safeTrim(value),

    complete: (results) => {
      transformCsvToMenu(results.data);
      const firstBtn = document.querySelector('.tab-btn');
      if (firstBtn) showCategory('calde', firstBtn);
    },

    error: (err) => {
      console.error('Errore nel caricamento del menu:', err);
    }
  });
}

function transformCsvToMenu(csvData) {
  menuData = {};
  const banner = document.getElementById('alert-banner');

  // Reset badge avvisi (integrato nell'header)
  if (banner) {
    banner.style.display = 'none';
    banner.textContent = '';
    banner.classList.add('festive-badge');
  }

  csvData.forEach((row) => {
    if (!row?.categoria || !row?.nome) return;

    // LOGICA AVVISI
    if (String(row.categoria).toUpperCase().includes('AVVISO')) {
      if (isFalseLike(row.disponibile)) return;

      const text = row.descrizione ? `${row.nome} - ${row.descrizione}` : row.nome;
      if (banner) {
        banner.textContent = text;
        banner.style.display = 'inline-flex';
      }
      return;
    }

    // Filtra elementi disabilitati
    if (isFalseLike(row.disponibile)) return;

    const catKey = normalizeCategory(row.categoria);

    if (!menuData[catKey]) {
      menuData[catKey] = {
        title: CATEGORY_TITLES[catKey] || row.categoria,
        items: []
      };
    }

    const allergensList = row.allergeni
      ? String(row.allergeni)
          .split(',')
          .map((s) => safeTrim(s).toLowerCase())
          .filter(Boolean)
      : [];

    menuData[catKey].items.push({
      name: row.nome,
      price: parseFloat(String(row.prezzo || '').replace(',', '.')),
      description: row.descrizione || '',
      allergens: allergensList,
      tag: row.tag || '',
      subcategory: row.categoria, // mantiene capitalizzazione originale
      soldOut: isSoldOutLike(row.disponibile)
    });
  });
}

function normalizeCategory(catString) {
  const c = String(catString || '').toLowerCase();

  // Cerca prima Aperitivi
  if (
    c.includes('aperitiv') ||
    c.includes('spritz') ||
    c.includes('cocktail') ||
    c.includes('prosecco') ||
    c.includes('long drink')
  ) {
    return 'aperitivi';
  }

  if (c.includes('caff') || c.includes('cald') || c.includes('tè') || c.includes('tisane')) return 'calde';
  if (c.includes('fredd') || c.includes('bibit') || c.includes('succh') || c.includes('acqu')) return 'fredde';

  if (c.includes('alcol') || c.includes('vin') || c.includes('birr') || c.includes('amar') || c.includes('liquor') || c.includes('grap'))
    return 'alcolici';

  if (c.includes('cib') || c.includes('food') || c.includes('panin') || c.includes('snack') || c.includes('taglier') || c.includes('focacc'))
    return 'food';

  if (c.includes('dolc') || c.includes('dessert') || c.includes('gelat') || c.includes('tort')) return 'dolci';

  return 'altro';
}

/* ===========================
   UI: WIFI MODAL
   =========================== */
function openWifi() {
  const m = document.getElementById('wifi-modal');
  if (!m) return;

  m.style.display = 'flex';
  setTimeout(() => m.classList.add('active'), 10);
}

function closeWifi(e) {
  const m = document.getElementById('wifi-modal');
  if (!m) return;

  if (e.target === m || e.target.classList.contains('close-modal')) {
    m.classList.remove('active');
    setTimeout(() => (m.style.display = 'none'), 300);
  }
}

/* ===========================
   SCROLL / NAV / BACK-TO-TOP
   =========================== */
let lastScrollTop = 0;
const navContainer = document.querySelector('.sticky-nav-container');
const backToTopBtn = document.getElementById('back-to-top');
const scrollDelta = 10;

window.addEventListener(
  'scroll',
  () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    const searchInput = document.getElementById('menu-search');

    // PROTEZIONE RICERCA (Fix Tastiera Mobile): se scrivi, la barra resta visibile
    if (document.activeElement === searchInput) {
      navContainer?.classList.remove('nav-hidden');
      return;
    }

    // Ignora tremolii
    if (Math.abs(lastScrollTop - currentScroll) <= scrollDelta) return;

    if (currentScroll > lastScrollTop && currentScroll > 150) {
      navContainer?.classList.add('nav-hidden');
    } else {
      if (currentScroll < 350) navContainer?.classList.remove('nav-hidden');
    }

    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;

    if (backToTopBtn) {
      backToTopBtn.style.display = currentScroll > 300 ? 'flex' : 'none';
    }
  },
  { passive: true }
);

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ===========================
   STATUS (APERTURA)
   =========================== */
function checkOpenStatus() {
  const hour = new Date().getHours();
  const el = document.getElementById('status-indicator');
  if (!el) return;

  const isOpen = hour >= 7 && hour < 24;

  if (isOpen) {
    el.innerHTML = `<span class="status-dot"></span> Aperto`;
    el.classList.add('open');
    el.classList.remove('closed');
  } else {
    el.innerHTML = `<span class="status-dot"></span> Chiuso`;
    el.classList.add('closed');
    el.classList.remove('open');
  }
}

/* ===========================
   METEO
   =========================== */
async function fetchWeather() {
  const weatherEl = document.getElementById('weather-indicator');
  if (!weatherEl) return;

  const lat = 40.8106;
  const lon = 15.1127;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;

    let iconSvg;

    if (code <= 1) {
      iconSvg =
        `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    } else if (code <= 3) {
      iconSvg =
        `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
    } else if (code === 45 || code === 48) {
      iconSvg =
        `<svg viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M5 16h14"></path><path d="M5 20h14"></path><path d="M5 8h14"></path></svg>`;
    } else if (code >= 71 && code <= 77) {
      iconSvg =
        `<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line><path d="m20 16-4-4 4-4"></path><path d="m4 8 4 4-4 4"></path><path d="m16 4-4 4-4-4"></path><path d="m8 20 4-4 4 4"></path></svg>`;
      weatherEl.classList.add('snow');
    } else if (code >= 95) {
      iconSvg =
        `<svg viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline></svg>`;
    } else {
      iconSvg =
        `<svg viewBox="0 0 24 24"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>`;
    }

    weatherEl.innerHTML = `${iconSvg} ${temp}°C`;
    weatherEl.style.display = 'inline-flex';
  } catch (e) {
    console.log('Meteo non disponibile');
  }
}

/* ===========================
   LITE MODE BUTTON
   =========================== */
function toggleLiteMode() {
  const body = document.body;
  const btn = document.getElementById('lite-switch');
  if (!btn) return;

  body.classList.toggle('lite-mode');
  updateLiteButton(btn, body.classList.contains('lite-mode'));
}

function updateLiteButton(btn, isLite) {
  if (!isLite) {
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
        <path d="M13 2L3 14h7l-1 8L21 10h-7l-1-8z"></path>
      </svg>
      <span>Lite</span>
    `;
  } else {
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
        <line x1="6" y1="1" x2="6" y2="4"></line>
        <line x1="10" y1="1" x2="10" y2="4"></line>
        <line x1="14" y1="1" x2="14" y2="4"></line>
      </svg>
      <span>Normal</span>
    `;
  }
}

/* ===========================
   MENU UI
   =========================== */
function showCategory(catId, btnElement) {
  const isLite = document.body.classList.contains('lite-mode');
  const searchInput = document.getElementById('menu-search');
  if (searchInput) searchInput.value = '';

  if (!isLite && btnElement) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const container = document.getElementById('menu-container');
  const data = menuData[catId];

  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  if (!data || !container) return;

  container.innerHTML = `<h3>${data.title}</h3>`;

  const subcats = [...new Set(data.items.map((i) => i.subcategory))];

  if (subcats.length <= 1) {
    renderItems(data.items, container, isLite);
    return;
  }

  subcats.sort((a, b) => {
    const idxA = PREFERRED_SUBCAT_ORDER.indexOf(a);
    const idxB = PREFERRED_SUBCAT_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  subcats.forEach((sub) => {
    const isRedundant =
      sub.toLowerCase() === data.title.toLowerCase() ||
      (catId === 'fredde' && sub.toLowerCase() === 'bibite');

    if (!isRedundant) {
      container.innerHTML += `<h4 class="subcategory-title">${sub}</h4>`;
    }

    const groupItems = data.items.filter((i) => i.subcategory === sub);
    renderItems(groupItems, container, isLite);
  });
}

function searchMenu() {
  const searchInput = document.getElementById('menu-search');
  if (!searchInput) return;

  const filter = searchInput.value.toLowerCase();
  const container = document.getElementById('menu-container');
  if (!container) return;

  if (filter.length === 0) {
    const activeBtn = document.querySelector('.tab-btn.active');
    const catId = getActiveCategoryFromOnclick(activeBtn);
    if (activeBtn && catId) showCategory(catId, activeBtn);
    return;
  }

  let allMatches = [];
  for (const category of Object.values(menuData)) {
    const matches = category.items.filter((item) => item.name.toLowerCase().includes(filter));
    allMatches = allMatches.concat(matches);
  }

  container.innerHTML = `<h3>Risultati ricerca (${allMatches.length})</h3>`;
  renderItems(allMatches, container, document.body.classList.contains('lite-mode'));
}

function renderItems(items, container, isLite) {
  items.forEach((item, index) => {
    const price = (Number.isFinite(item.price) ? item.price : 0).toFixed(2).replace('.', ',');
    const descHTML = item.description ? `<p>${item.description}</p>` : '';

    let tagHTML = '';
    if (item.tag === 'new') tagHTML = `<span class="tag-badge tag-new">Novità</span>`;
    if (item.tag === 'hot') tagHTML = `<span class="tag-badge tag-hot">Top</span>`;

    let allergensHTML = '';
    if (item.allergens?.length) {
      allergensHTML = `<div class="allergen-row">`;
      item.allergens.forEach((a) => {
        const data = allergenMap[a];
        if (data) allergensHTML += `<span class="allergen-tag">${data.icon} ${data.label}</span>`;
      });
      allergensHTML += `</div>`;
    }

    container.innerHTML += `
      <div class="menu-item ${item.soldOut ? 'sold-out' : ''}" style="animation-delay: ${isLite ? 0 : index * 0.05}s">
        <div class="item-info">
          <h4>${item.name} ${tagHTML}</h4>
          ${descHTML}
          ${allergensHTML}
        </div>
        <div class="item-price">€ ${price}</div>
      </div>
    `;
  });
}

/* ===========================
   BOOTSTRAP
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  checkOpenStatus();
  fetchWeather();
  initDataFetch();

  const btn = document.getElementById('lite-switch');
  if (btn) updateLiteButton(btn, false);
});
