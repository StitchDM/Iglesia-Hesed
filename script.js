/* ============================================
   IGLESIA HESED — Scripts
   Menú móvil, animaciones y efectos de scroll
   ============================================ */

// === Mobile menu toggle ===
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

// Cerrar el menú móvil al hacer clic en un enlace
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('active'));
});

// === Scroll reveal animation ===
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, idx) => {
    if (entry.isIntersecting) {
      // Pequeño efecto escalonado en las apariciones
      setTimeout(() => entry.target.classList.add('visible'), idx * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


// === Video de estudios: toma automáticamente el último video de la playlist ===
const PLAYLIST_ID = 'PLyEwNc7bCIYXDODfXdSF9Zb6x0roC3KQY';
const FALLBACK_VIDEO_ID = 'B6HqRzcWHSA';

const studiesIframe = document.getElementById('studiesIframe');
const studiesPlayer = document.getElementById('studiesPlayer');

if (studiesIframe && studiesPlayer) {
  let latestVideoId = FALLBACK_VIDEO_ID;
  let playerReady = false;

  function loadVideo() {
    if (!studiesIframe.src) {
      studiesIframe.src = `https://www.youtube.com/embed/${latestVideoId}?autoplay=1&mute=1&rel=0&cc_load_policy=0&cc_lang_pref=none`;
    }
  }

  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (playerReady) loadVideo();
        videoObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  videoObserver.observe(studiesPlayer);

  fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`)
    .then(r => r.json())
    .then(data => {
      if (data.items && data.items.length) {
        const url = new URL(data.items[0].link);
        latestVideoId = url.searchParams.get('v') || FALLBACK_VIDEO_ID;
      }
    })
    .catch(() => {})
    .finally(() => {
      playerReady = true;
      if (!studiesIframe.src) loadVideo();
    });
}

// === Galería justified (sin recorte, rectángulo perfecto) ===
(function loadGallery() {
  const collage = document.getElementById('galleryCollage');
  if (!collage) return;

  const GAP = 10;
  const TARGET_ROW_H = 160;
  const MIN_IMGS = 8;
  const MAX_IMGS = 20;

  (function() {
    let paths = [
      'galeria/galeria-1.jpg','galeria/galeria-2.jpg','galeria/galeria-3.jpg',
      'galeria/galeria-4.jpg','galeria/galeria-5.jpg','galeria/galeria-6.jpg',
      'galeria/galeria-7.jpg','galeria/galeria-8.jpg','galeria/galeria-9.jpg',
      'galeria/galeria-10.jpg','galeria/galeria-11.jpg','galeria/galeria-12.jpg',
      'galeria/galeria-13.jpg',
    ];

    if (!paths.length) return;

      // Mezcla aleatoria (Fisher-Yates)
      for (let i = paths.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [paths[i], paths[j]] = [paths[j], paths[i]];
      }

      // Aplicar límites: si hay menos del mínimo, repetir hasta completar; si hay más del máximo, recortar
      while (paths.length < MIN_IMGS) paths = [...paths, ...paths].slice(0, MIN_IMGS);
      if (paths.length > MAX_IMGS) paths = paths.slice(0, MAX_IMGS);

      // Precargar para obtener dimensiones reales
      Promise.all(paths.map(path => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ path, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = path;
      }))).then(results => {
        let images = results.filter(Boolean);
        if (window.innerWidth < 768) images = images.filter(img => img.w > img.h);
        if (!images.length) return;

        const containerW = collage.offsetWidth || (window.innerWidth - 96);

        // Agrupar en filas
        const rows = [];
        let row = [], rowW = 0;

        images.forEach(img => {
          const scaledW = (img.w / img.h) * TARGET_ROW_H;
          const needed = rowW + scaledW + (row.length ? GAP : 0);
          if (row.length && needed > containerW) {
            rows.push(row);
            row = [];
            rowW = 0;
          }
          row.push({ ...img, scaledW });
          rowW += scaledW + (row.length > 1 ? GAP : 0);
        });
        if (row.length) rows.push(row);

        // Renderizar: escalar cada fila para que ocupe el ancho exacto
        collage.innerHTML = rows.map(row => {
          const totalGap = GAP * (row.length - 1);
          const totalW = row.reduce((s, img) => s + img.scaledW, 0);
          const scale = (containerW - totalGap) / totalW;
          const rowH = Math.round(TARGET_ROW_H * scale);

          const items = row.map(img => {
            const iw = Math.round(img.scaledW * scale);
            return `<div class="gallery-item reveal" style="width:${iw}px;height:${rowH}px;flex-shrink:0;">
              <img src="${img.path}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block;">
            </div>`;
          }).join('');

          return `<div class="gallery-row">${items}</div>`;
        }).join('');

        collage.querySelectorAll('.gallery-item').forEach(el => observer.observe(el));
      });
  })();
})();

// === Badge EN VIVO ===
// Horarios: Martes 20:00, Viernes 20:00, Domingo 11:00 (duración estimada 2h)
const liveSchedule = [
  { day: 2, start: 20, end: 22 }, // Martes
  { day: 5, start: 20, end: 21 }, // Viernes
  { day: 0, start: 11, end: 13 }, // Domingo
];

function checkLive() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const min = now.getMinutes();
  const timeNow = hour + min / 60;

  const isLive = liveSchedule.some(s => s.day === day && timeNow >= s.start && timeNow < s.end);
  const isStudyLive = day === 2 && timeNow >= 20 && timeNow < 22;

  document.getElementById('navLive').classList.toggle('active', isLive);
  const studiesBadge = document.getElementById('studiesLiveBadge');
  if (studiesBadge) studiesBadge.classList.toggle('active', isStudyLive);
}

checkLive();
setInterval(checkLive, 60000);


// === Botón scroll to top ===
const scrollTopBtn = document.getElementById('scrollTop');
const heroSection = document.getElementById('inicio');

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// === Spotify toggle ===
const spotifyFloat  = document.getElementById('spotifyFloat');
const spotifyToggle = document.getElementById('spotifyToggle');
const spotifyPanel  = document.getElementById('spotifyPanel');

spotifyToggle.addEventListener('click', () => {
  spotifyPanel.classList.toggle('cerrado');
});

// === Sombra en navegación al hacer scroll ===
const nav = document.querySelector('nav');

window.addEventListener('scroll', () => {
  const heroHeight = heroSection.offsetHeight;

  if (window.scrollY > 50) {
    nav.style.boxShadow = '0 4px 20px rgba(108, 14, 35, 0.08)';
  } else {
    nav.style.boxShadow = 'none';
  }

  const pastHero = window.scrollY > heroHeight;
  scrollTopBtn.classList.toggle('visible', pastHero);
  spotifyFloat.classList.toggle('hidden', pastHero);

  const atBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 20;
  scrollTopBtn.classList.toggle('levantado', atBottom);
  spotifyFloat.classList.toggle('bajado', window.scrollY > 50);
});
