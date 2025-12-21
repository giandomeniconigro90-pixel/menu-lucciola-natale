/* script.js - Bar La Lucciola */

const allergenMap = {
    'latte': { icon: '🥛', label: 'Latte' },
    'glutine': { icon: '🌾', label: 'Glutine' },
    'uova': { icon: '🥚', label: 'Uova' },
    'guscio': { icon: '🥜', label: 'Frutta a guscio' },
    'sedano': { icon: '🌿', label: 'Sedano' }
};

/* --- CONFIGURAZIONE GOOGLE SHEETS --- */
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0T1gIy-XDXJv_IYaOOOlgaJ4y7yidX2PF7RZjYp7BZEQZ4ttjHg-fbcFqLGyFVBzmeVT0W7zzJXyy/pub?output=csv';

let menuData = {};

function initDataFetch() {
    Papa.parse(SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        // PULIZIA SPAZI AUTOMATICA (Fix "Bibite" doppie)
        transform: function(value) {
            return value.trim();
        },
        complete: function(results) {
            transformCsvToMenu(results.data);
            const firstBtn = document.querySelector('.tab-btn');
            // Seleziona la prima categoria (Calde) all'avvio
            if (firstBtn) showCategory('calde', firstBtn);
        },
        error: function(err) {
            console.error("Errore nel caricamento del menu:", err);
            // Fallback silenzioso, l'utente vedrà la UI vuota o potrà ricaricare
        }
    });
}

function transformCsvToMenu(csvData) {
    menuData = {};

    // Reset Badge Avvisi (ora integrato nell'header)
    const banner = document.getElementById('alert-banner');
    if (banner) {
        banner.style.display = 'none';
        banner.textContent = '';
        banner.classList.add('festive-badge');
    }

    const titles = {
        'calde': 'Caffetteria',
        'fredde': 'Bibite Fredde',
        'aperitivi': 'Aperitivi & Cocktail',
        'alcolici': 'Vini & Alcolici',
        'food': 'Food & Snack',
        'dolci': 'Dolci & Dessert',
        'altro': 'Altro'
    };

    csvData.forEach(row => {
        if (!row.categoria || !row.nome) return;

        /* --- LOGICA AVVISI --- */
        if (row.categoria.toUpperCase().includes('AVVISO')) {
            if (row.disponibile && (row.disponibile.toLowerCase() === 'no' || row.disponibile.toLowerCase() === 'false')) return;

            const text = row.descrizione ? `${row.nome} - ${row.descrizione}` : row.nome;

            if (banner) {
                banner.textContent = text;
                banner.style.display = 'inline-flex'; 
            }
            return;
        }

        if (row.disponibile && (row.disponibile.toLowerCase() === 'no' || row.disponibile.toLowerCase() === 'false')) return;

        let catKey = normalizeCategory(row.categoria);

        if (!menuData[catKey]) {
            menuData[catKey] = {
                title: titles[catKey] || row.categoria,
                items: []
            };
        }

        let allergenesList = [];
        if (row.allergeni) {
            allergenesList = row.allergeni.split(',').map(s => s.trim().toLowerCase());
        }

        menuData[catKey].items.push({
            name: row.nome,
            price: parseFloat(String(row.prezzo || '').replace(',', '.')),
            description: row.descrizione || '',
            allergens: allergenesList,
            tag: row.tag || '',
            subcategory: row.categoria, // Mantiene la capitalizzazione originale
            soldOut: (row.disponibile || '').toLowerCase() === 'soldout'
        });
    });
}

function normalizeCategory(catString) {
    const c = catString.toLowerCase();

    // NUOVA LOGICA: Cerca prima Aperitivi
    if (c.includes('aperitiv') || c.includes('spritz') || c.includes('cocktail') || c.includes('prosecco') || c.includes('long drink')) return 'aperitivi';

    if (c.includes('caff') || c.includes('cald') || c.includes('tè') || c.includes('tisane')) return 'calde';
    if (c.includes('fredd') || c.includes('bibit') || c.includes('succh') || c.includes('acqu')) return 'fredde';

    // Alcolici rimane per il resto
    if (c.includes('alcol') || c.includes('vin') || c.includes('birr') || c.includes('amar') || c.includes('liquor') || c.includes('grap')) return 'alcolici';

    if (c.includes('cib') || c.includes('food') || c.includes('panin') || c.includes('snack') || c.includes('taglier') || c.includes('focacc')) return 'food';
    if (c.includes('dolc') || c.includes('dessert') || c.includes('gelat') || c.includes('tort')) return 'dolci';
    return 'altro';
}

/* --- FUNZIONI UI --- */

function openWifi() {
    const m = document.getElementById('wifi-modal');
    if (m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
    }
}

function closeWifi(e) {
    const m = document.getElementById('wifi-modal');
    if (m && (e.target === m || e.target.classList.contains('close-modal'))) {
        m.classList.remove('active');
        setTimeout(() => m.style.display = 'none', 300);
    }
}

/* --- LOGICA SCROLL --- */
let lastScrollTop = 0;
const navContainer = document.querySelector('.sticky-nav-container');
const backToTopBtn = document.getElementById('back-to-top');
const scrollDelta = 10;

window.addEventListener('scroll', function() {
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // 1. LITE MODE: barra sempre fissa
    if (document.body.classList.contains('lite-mode')) {
        if (navContainer) navContainer.classList.remove('nav-hidden');
        if (backToTopBtn) backToTopBtn.style.display = currentScroll > 300 ? 'flex' : 'none';
        return;
    }

    // 2. MODALITÀ NORMALE
    if (Math.abs(lastScrollTop - currentScroll) <= scrollDelta) return;

    if (currentScroll > lastScrollTop && currentScroll > 100) {
        // Scorri in BASSO oltre 100px → NASCONDI
        if (navContainer) navContainer.classList.add('nav-hidden');
    } else {
        // Scorri in ALTO: la barra riappare SOLO se sei quasi in cima
        if (currentScroll < 180) {   
            if (navContainer) navContainer.classList.remove('nav-hidden');
        }
        // altrimenti resta nascosta per non coprire il menù
    }

    lastScrollTop = currentScroll;

    // Pulsante "torna su"
    if (backToTopBtn) {
        backToTopBtn.style.display = currentScroll > 300 ? 'flex' : 'none';
    }
}, { passive: true });

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function checkOpenStatus() {
    const now = new Date();
    const hour = now.getHours();
    const el = document.getElementById('status-indicator');
    if (!el) return;

    // Modifica qui gli orari se necessario (es. 07:00 - 23:59)
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

async function fetchWeather() {
    const weatherEl = document.getElementById('weather-indicator');
    if (!weatherEl) return;

    const lat = 40.8106; // Coordinate Laceno
    const lon = 15.1127;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;

        // Mappatura icone meteo semplificata
        let iconSvg;
        if (code <= 1) { // Sole
            iconSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
        } else if (code <= 3) { // Nuvoloso
            iconSvg = `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
        } else if (code === 45 || code === 48) { // Nebbia
            iconSvg = `<svg viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M5 16h14"></path><path d="M5 20h14"></path><path d="M5 8h14"></path></svg>`;
        } else if (code >= 71 && code <= 77) { // Neve
            iconSvg = `<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line><path d="m20 16-4-4 4-4"></path><path d="m4 8 4 4-4 4"></path><path d="m16 4-4 4-4-4"></path><path d="m8 20 4-4 4 4"></path></svg>`;
            weatherEl.classList.add('snow');
        } else if (code >= 95) { // Temporale
            iconSvg = `<svg viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline></svg>`;
        } else { // Pioggia
            iconSvg = `<svg viewBox="0 0 24 24"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>`;
        }

        weatherEl.innerHTML = `${iconSvg} ${temp}°C`;
        weatherEl.style.display = 'inline-flex';

    } catch (e) {
        console.log("Meteo non disponibile");
    }
}

/* GESTIONE LITE MODE (Icona + Stato) */
function toggleLiteMode() {
    const body = document.body;
    const btn = document.getElementById('lite-switch');
    if (!btn) return;

    body.classList.toggle('lite-mode');
    const isLite = body.classList.contains('lite-mode');

    updateLiteButton(btn, isLite);
}

function updateLiteButton(btn, isLite) {
    if (!isLite) {
        // MODALITÀ NORMALE (Offri tasto per passare a Lite)
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
                <path d="M13 2L3 14h7l-1 8L21 10h-7l-1-8z"></path>
            </svg>
            <span>Lite</span>
        `;
    } else {
        // MODALITÀ LITE (Offri tasto per tornare Normal)
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

function showCategory(catId, btnElement) {
    const isLite = document.body.classList.contains('lite-mode');
    const searchInput = document.getElementById('menu-search');
    if (searchInput) searchInput.value = '';

    if (!isLite && btnElement) window.scrollTo({ top: 0, behavior: 'smooth' });

    const container = document.getElementById('menu-container');
    const data = menuData[catId];

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (data && container) {
        container.innerHTML = `<h3>${data.title}</h3>`;

        /* LOGICA SOTTOCATEGORIE */
        const subcats = [...new Set(data.items.map(i => i.subcategory))].sort();

        if (subcats.length > 1) {
            // Ordine preferenziale per alcolici (o altro)
            const preferredOrder = ['Aperitivi', 'Cocktail', 'Birre', 'Vini', 'Amari', 'Liquori', 'Grappe'];

            subcats.sort((a, b) => {
                const idxA = preferredOrder.indexOf(a);
                const idxB = preferredOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
            });

            subcats.forEach(sub => {
                // EVITA TITOLI RIDONDANTI
                const isRedundant = sub.toLowerCase() === data.title.toLowerCase() ||
                    (catId === 'fredde' && sub.toLowerCase() === 'bibite');

                if (!isRedundant) {
                    container.innerHTML += `<h4 class="subcategory-title">${sub}</h4>`;
                }

                const groupItems = data.items.filter(i => i.subcategory === sub);
                renderItems(groupItems, container, isLite);
            });
        } else {
            renderItems(data.items, container, isLite);
        }
    }
}

function searchMenu() {
    const searchInput = document.getElementById('menu-search');
    if (!searchInput) return;

    const filter = searchInput.value.toLowerCase();
    const container = document.getElementById('menu-container');

    if (filter.length === 0) {
        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn) showCategory(activeBtn.getAttribute('onclick').split("'")[1], activeBtn);
        return;
    }

    let allMatches = [];
    for (const [key, category] of Object.entries(menuData)) {
        const matches = category.items.filter(item => item.name.toLowerCase().includes(filter));
        allMatches = [...allMatches, ...matches];
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
        if (item.allergens && item.allergens.length > 0) {
            allergensHTML = `<div class="allergen-row">`;
            item.allergens.forEach(a => {
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
        </div>`;
    });
}

// --- AVVIO DELL'APPLICAZIONE ---
document.addEventListener('DOMContentLoaded', () => {
    checkOpenStatus();
    fetchWeather();
    initDataFetch();
    
    // Inizializza correttamente il bottone Lite Mode senza flash
    const btn = document.getElementById('lite-switch');
    if(btn) updateLiteButton(btn, false); // false = modalità normale di default
});
