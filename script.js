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

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0T1gIy-XDXJv_IYaOOOlgaJ4y7yidX2PF7RZjYp7BZEQZ4ttjHg-fbcFqLGyFVBzmeVT0W7zzJXyy/pub?output=csv';

// CSV ORARI (metti file locale "orari.csv" nella root del sito, oppure un Google Sheet pubblicato output=csv)
const HOURS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vThV67Jsk8wnHdlvqTjio2GuPGg0NIdRNzT5tgL5TLSwBzA85jNWec6dG2nRxJqF5-pinUjY_v99rqn/pub?output=csv';

const CATEGORY_TITLES = {
  calde: 'Caffetteria',
  fredde: 'Bibite Fredde',
  aperitivi: 'Aperitivi & Cocktail',
  alcolici: 'Vini & Alcolici',
  food: 'Food & Snack',
  dolci: 'Dolci & Dessert',
  altro: 'Altro'
};

const PREFERRED_SUBCAT_ORDER = [
  'Aperitivi',
  'Cocktail',
  'Birre',
  'Vini',
  'Amari',
  'Liquori',
  'Grappe'
];

/* ===========================
   STATO
   =========================== */
let menuData = {};

// {0..6: [{start,end,startMin,endMin}, ...]}
let openingSchedule = {
  0: [{ start: '07:00', end: '24:00', startMin: 420, endMin: 1440 }],
  1: [{ start: '07:00', end: '24:00', startMin: 420, endMin: 1440 }],
  2: [{ start: '07:00', end: '24:00', startMin: 420, endMin: 1440 }],
  3: [{ start: '07:00', end: '24:00', startMin: 420, endMin: 1440 }],
  4: [{ start: '07:00', end: '24:00', startMin: 420, endMin: 1440 }],
  5: [{ start: '07:00', end: '24:00', startMin: 420, endMin: 1440 }],
  6: [{ start: '07:00', end: '24:00', startMin: 420, endMin: 1440 }]
};

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
  const m = raw.match(/'([^']+)'/); // prende la prima stringa tra apici
  return m ? m[1] : null;
}

/* ===========================
   ORARI: CSV -> TAB + STATUS
   =========================== */
function dayToIndex(day) {
  const m = {
    dom: 0,
    domenica: 0,
    lun: 1,
    lunedi: 1,
    lunedì: 1,
    mar: 2,
    martedi: 2,
    martedì: 2,
    mer: 3,
    mercoledi: 3,
    mercoledì: 3,
    gio: 4,
    giovedi: 4,
    giovedì: 4,
    ven: 5,
    venerdi: 5,
    venerdì: 5,
    sab: 6,
    sabato: 6
  };

  const k = safeTrim(day).toLowerCase();
  return m[k] ?? null;
}

function timeToMinutes(t) {
  const s = safeTrim(t);
  if (!s) return null;
  if (s.toUpperCase() === 'CHIUSO') return null;

  const parts = s.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? 0);

  // consenti "24:00"
  if (hh === 24 && mm === 0) return 1440;
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function parseHoursCsv(rows) {
  const schedule = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  rows.forEach((r) => {
    const d = dayToIndex(r.day);
    if (d === null) return;

    const startMin = timeToMinutes(r.start);
    const endMin = timeToMinutes(r.end);

    // "CHIUSO" => giorno senza fasce
    if (startMin === null || endMin === null) return;

    schedule[d].push({
      start: safeTrim(r.start),
      end: safeTrim(r.end),
      startMin,
      endMin
    });
  });

  // (opzionale) ordina le fasce per startMin
  for (let d = 0; d <= 6; d++) {
    schedule[d].sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));
  }

  return schedule;
}

function formatDaySlots(slots) {
  if (!slots?.length) return 'Chiuso';
  return slots.map((s) => `${s.start}–${s.end}`).join(' / ');
}

function renderOpeningHoursTable() {
  const box = document.getElementById('opening-hours-box');
  if (!box) return;

  const names = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const today = new Date().getDay();

  let html = `<div class="opening-hours-title">Orari</div>`;
  html += `<table class="opening-hours-table">`;

  for (let d = 0; d <= 6; d++) {
    const rowClass = d === today ? 'opening-hours-today' : '';
    html += `
      <tr class="${rowClass}">
        <td>${names[d]}</td>
        <td>${formatDaySlots(openingSchedule[d])}</td>
      </tr>
    `;
  }

  html += `</table>`;
  box.innerHTML = html;
}

function isOpenNow(dateObj) {
  const day = dateObj.getDay(); // 0..6
  const nowMin = dateObj.getHours() * 60 + dateObj.getMinutes();

  const todaySlots = openingSchedule[day] || [];
  const yday = (day + 6) % 7;
  const ydaySlots = openingSchedule[yday] || [];

  // Fasce di oggi (incluse quelle che passano mezzanotte)
  for (const s of todaySlots) {
    if (s.endMin > s.startMin) {
      if (nowMin >= s.startMin && nowMin < s.endMin) return true;
    } else if (s.endMin < s.startMin) {
      // fascia che passa mezzanotte: aperto se ora >= start
      if (nowMin >= s.startMin) return true;
    }
  }

  // Fasce di ieri che passano mezzanotte e arrivano a oggi
  for (const s of ydaySlots) {
    if (s.endMin < s.startMin) {
      if (nowMin < s.endMin) return true;
    }
  }

  return false;
}

function initOpeningHours() {
  // 1) cache immediata
  const cached = localStorage.getItem('openingHoursCache');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        openingSchedule = parsed;
      }
      renderOpeningHoursTable();
      checkOpenStatus();
    } catch (_) {}
  }

  // 2) fetch CSV in background
  Papa.parse(HOURS_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    transform: (v) => safeTrim(v),

    complete: (results) => {
      openingSchedule = parseHoursCsv(results.data);
      localStorage.setItem('openingHoursCache', JSON.stringify(openingSchedule));
      renderOpeningHoursTable();
      checkOpenStatus();
    },

    error: (err) => {
      console.error('Errore caricamento orari:', err);
      // se fallisce, resta la schedule di default + eventuale cache
      renderOpeningHoursTable();
      checkOpenStatus();
    }
  });
}

/* ===========================
   DATA FETCH / PARSE
   =========================== */
function initDataFetch() {
  // 1. TENTATIVO CACHE: Carica subito dalla memoria del telefono se esiste
  const cachedData = localStorage.getItem('menuDataCache');

  if (cachedData) {
    try {
      menuData = JSON.parse(cachedData);
      console.log('Menu caricato dalla cache (istantaneo)');

      // Renderizza subito la prima categoria (Calde) senza aspettare internet
      const caldeBtn = Array.from(document.querySelectorAll('.tab-btn'))
        .find(btn => getActiveCategoryFromOnclick(btn) === 'calde');
      if (caldeBtn) showCategory('calde', caldeBtn);
    } catch (e) {
      console.error('Cache corrotta, attendo rete...', e);
    }
  }

    // 2. RETE: Scarica comunque i dati aggiornati in background
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,

      // PULIZIA SPAZI AUTOMATICA (Fix "Bibite" doppie)
      transform: (value) => safeTrim(value),

      complete: (results) => {
        // Elabora i nuovi dati da Google
        transformCsvToMenu(results.data);

        // SALVA I NUOVI DATI IN CACHE (per la prossima volta)
        localStorage.setItem('menuDataCache', JSON.stringify(menuData));

        // Aggiorna la vista con i dati nuovi (live update)
        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn) {
          const currentCat = getActiveCategoryFromOnclick(activeBtn);
          if (currentCat) {
            // mantiene la categoria attualmente selezionata
            showCategory(currentCat, null);
          }
        } else {
          // nessun tab attivo: fallback esplicito su "calde"
          const caldeBtn = Array.from(document.querySelectorAll('.tab-btn'))
            .find((btn) => getActiveCategoryFromOnclick(btn) === 'calde');
          if (caldeBtn) {
            showCategory('calde', caldeBtn);
          }
        }

        console.log('Menu aggiornato da Google Sheets (Background)');
      },

      error: (err) => {
        console.error('Errore Google Sheets:', err);
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

  if (
    c.includes('alcol') ||
    c.includes('vin') ||
    c.includes('birr') ||
    c.includes('amar') ||
    c.includes('liquor') ||
    c.includes('grap')
  ) {
    return 'alcolici';
  }

  if (
    c.includes('cib') ||
    c.includes('food') ||
    c.includes('panin') ||
    c.includes('snack') ||
    c.includes('taglier') ||
    c.includes('focacc')
  ) {
    return 'food';
  }

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

// Se stai scrivendo e inizi a scrollare: chiudi subito la ricerca
if (document.activeElement === searchInput) {
  searchInput.blur(); // chiude tastiera + toglie focus
  navContainer?.classList.remove('nav-hidden'); // opzionale: evita sparizioni “brusche”
  if (window.syncSearchExpanded) window.syncSearchExpanded(); // richiude (toglie expanded)
  // NON fare return: lascia proseguire la logica di hide/show nav
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
   STATUS (APERTURA) - da CSV
   =========================== */
function checkOpenStatus() {
  const el = document.getElementById('status-indicator');
  if (!el) return;

  const isOpen = isOpenNow(new Date());

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

    // reset classi speciali
    weatherEl.classList.remove('snow');

    if (code <= 1) {
      iconSvg =
        `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    } else if (code <= 3) {
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
    } else if (code === 45 || code === 48) {
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M5 16h14"></path><path d="M5 20h14"></path><path d="M5 8h14"></path></svg>`;
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

  // Toggle classe
  const isLite = body.classList.toggle('lite-mode');

  // Salva preferenza PER SEMPRE (così se torno domani si ricorda)
  localStorage.setItem('liteMode', isLite);

  // Aggiorna icona
  updateLiteButton(btn, isLite);
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

   if (window.syncSearchExpanded) window.syncSearchExpanded();

  if (!isLite && btnElement) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
   
  const container = document.getElementById('menu-container');
  const data = menuData[catId];

 let targetBtn = btnElement;

 // Se non mi passi il bottone, lo cerco in base alla categoria
 if (!targetBtn) {
   targetBtn = Array.from(document.querySelectorAll('.tab-btn'))
     .find((b) => getActiveCategoryFromOnclick(b) === catId);
 }

 if (targetBtn) {
   document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
   targetBtn.classList.add('active');
 }


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
      container.innerHTML += `<h3 class="subcategory-title">${sub}</h3>`;
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

   const searchInput = document.getElementById('menu-search');
  const searchWrapper = searchInput?.closest('.search-input-wrapper');

function syncSearchExpanded() {
  if (!searchInput || !searchWrapper) return;
  const hasText = searchInput.value.trim().length > 0;
  const isFocused = document.activeElement === searchInput;
  searchWrapper.classList.toggle('expanded', hasText || isFocused);
}

if (searchInput && searchWrapper) {
  searchInput.addEventListener('input', syncSearchExpanded);
  searchInput.addEventListener('focus', syncSearchExpanded);
  searchInput.addEventListener('blur', syncSearchExpanded);
  syncSearchExpanded();
}

// se vuoi richiamarla anche da altre funzioni:
window.syncSearchExpanded = syncSearchExpanded;
  // Orari + tabella + status (da CSV)
  initOpeningHours();

  // Meteo + menu
  fetchWeather();
  initDataFetch();

  // Aggiorna badge aperto/chiuso ogni minuto (senza refresh)
  setInterval(checkOpenStatus, 60 * 1000);

  // Bottone lite: allinea l'icona allo stato reale del body
  const btn = document.getElementById('lite-switch');
  const isLiteNow = document.body.classList.contains('lite-mode');
  if (btn) updateLiteButton(btn, isLiteNow);
   
});
