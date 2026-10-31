/* Mayores en Forma OK · comportamiento de la web (sin dependencias).
   Movimiento según el manual de marca (cap. 13), menú, situaciones, carrusel, formulario de candidaturas y aviso de cookies. */
(function () {
  'use strict';
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Al entrar en una página se empieza por el encabezado, aunque el visor o el navegador quieran
  // conservar la posición de la página anterior. Se respetan los enlaces a una sección (#…) y el botón «Atrás».
  var nav = w.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (!location.hash && !(nav && nav.type === 'back_forward')) {
    var tocado = false, fin = Date.now() + 2000;
    var arriba = function () { if (!tocado && Date.now() < fin && w.scrollY) w.scrollTo(0, 0); };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { w.addEventListener(ev, function () { tocado = true; }, { once: true, passive: true }); });
    arriba(); d.addEventListener('DOMContentLoaded', arriba); w.addEventListener('load', arriba);
    w.addEventListener('scroll', arriba, { passive: true });
  }

  // Titular palabra a palabra (13.7): cada palabra sube desde su línea base, medio paso entre palabras
  d.querySelectorAll('.palabras').forEach(function (h) {
    var txt = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    // medio paso entre palabras, pero el titular entero nunca tarda más de 1,5 s en asentarse
    h.style.setProperty('--esc', Math.min(300, Math.round(1500 / Math.max(txt.length, 1))) + 'ms');
    h.innerHTML = txt.map(function (p, i) {
      return '<span class="pal" aria-hidden="true"><span style="--i:' + i + '">' + p.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>';
    }).join(' ');
  });

  // Aparición una sola vez al hacer scroll: solo ilustraciones, iconos y datos (13.10)
  var va = function (el) { el.classList.add('va'); };
  var obs = d.querySelectorAll('[data-va]');
  if (reduce || !('IntersectionObserver' in w)) obs.forEach(va);
  else {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { va(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    obs.forEach(function (el) { io.observe(el); });
  }
  // La portada entra al cargar: titular palabra a palabra y foto que se descubre de abajo arriba
  d.querySelectorAll('[data-portada]').forEach(va);

  // Cabecera con línea al hacer scroll
  var cab = d.querySelector('.cabecera');
  if (cab) {
    var f = function () { cab.classList.toggle('scroll', w.scrollY > 8); };
    f(); w.addEventListener('scroll', f, { passive: true });
  }

  // Menú móvil: entra desde la derecha, fondo oscurecido, se cierra con Escape o tocando fuera
  var abrir = d.querySelector('[data-menu-abrir]'), menu = d.getElementById('menu-movil');
  if (abrir && menu) {
    var cerrar = function () { menu.hidden = true; abrir.setAttribute('aria-expanded', 'false'); abrir.focus(); };
    abrir.addEventListener('click', function () {
      menu.hidden = false; abrir.setAttribute('aria-expanded', 'true');
      var b = menu.querySelector('[data-menu-cerrar]'); if (b) b.focus();
    });
    menu.addEventListener('click', function (e) { if (e.target === menu || e.target.closest('[data-menu-cerrar]')) cerrar(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) cerrar(); });
  }

  // Situaciones: la foto de la derecha cambia con la situación activa
  d.querySelectorAll('[data-situ]').forEach(function (bloque) {
    var items = bloque.querySelectorAll('.situ-item'), figs = bloque.querySelectorAll('.situ-foto figure');
    var activar = function (i) {
      items.forEach(function (it, k) { it.classList.toggle('activo', k === i); });
      figs.forEach(function (f, k) {
        var on = k === i; if (on === f.classList.contains('activo')) return;
        f.classList.toggle('activo', on);
        var r = f.querySelector('.revela'); if (on && r && !reduce) { r.classList.remove('va'); void r.offsetWidth; r.classList.add('va'); }
      });
    };
    items.forEach(function (it, i) {
      it.addEventListener('mouseenter', function () { activar(i); });
      it.addEventListener('focusin', function () { activar(i); });
      it.addEventListener('click', function () { activar(i); });
    });
  });

  // Barra inferior del móvil: se oculta cuando aparece el pie
  var sticky = d.querySelector('[data-sticky-cta]');
  var footer = d.querySelector('footer');
  if (sticky && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      sticky.classList.toggle('sticky-hidden', entries[0].isIntersecting);
    }, { threshold: 0.01 }).observe(footer);
  }

  // Formulario «Trabaja con nosotros»: marca los campos con error, comprueba el CV y envía sin recargar
  var form = d.querySelector('form[data-form="trabaja"]');
  if (form) {
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';
    var err = d.createElement('p'); err.setAttribute('role', 'alert'); err.className = 'form-error'; err.hidden = true;
    if (btn) btn.parentNode.insertBefore(err, btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      form.querySelectorAll('input,select,textarea').forEach(function (c) { if (!c.checkValidity()) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid'); });
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var cv = form.querySelector('input[type="file"]');
      if (cv && cv.files[0] && cv.files[0].size > 5 * 1024 * 1024) { err.textContent = 'El currículum no puede superar 5 MB.'; err.hidden = false; return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
        .then(function (json) {
          if (!json.success) throw new Error(json.error || 'Algo ha salido mal. Por favor, inténtalo de nuevo.');
          var card = form.parentNode;
          card.innerHTML = '<div class="form-ok" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg><h2 class="h3">¡Candidatura recibida!</h2><p class="p">Gracias por tu interés en formar parte del equipo de Mayores en Forma OK. Revisaremos tu candidatura y nos pondremos en contacto contigo en breve.</p></div>';
          card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        })
        .catch(function (ex) {
          err.textContent = ex && ex.message ? ex.message : 'Algo ha salido mal. Por favor, inténtalo de nuevo.';
          err.hidden = false;
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
    });
  }

  // Cookies: Google Analytics solo con consentimiento
  var KEY = 'mefok_cookies';
  var banner = d.getElementById('aviso-cookies');
  var gaEl = d.querySelector('[data-ga]');
  var gaId = gaEl && gaEl.getAttribute('data-ga');
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function loadGA() {
    if (!gaId || window.__gaLoaded) return; window.__gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { anonymize_ip: true });
    var s = d.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId); d.head.appendChild(s);
  }
  var choice = stored();
  if (choice === 'granted') loadGA();
  else if (!choice && banner) banner.removeAttribute('hidden');
  if (banner) banner.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cookies]'); if (!b) return;
    var v = b.getAttribute('data-cookies'); store(v); banner.setAttribute('hidden', '');
    if (v === 'granted') loadGA();
  });
})();

/* Carrusel de «¿Por qué elegir…?»: una tarjeta cada vez, flechas, puntos con barra de tiempo, arrastre, teclado y pausa.
   Avanza solo cada 4 s (como la web publicada). Se para mientras alguien lo usa y retoma a los 8 s;
   el botón de pausa lo detiene hasta que se vuelva a pulsar. Con movimiento reducido no avanza solo. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raton = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var PASO = 4000, ESPERA = 8000;
  document.querySelectorAll('[data-carrusel]').forEach(function (car) {
    var pista = car.querySelector('.car-pista'), items = car.querySelectorAll('.car-item'), puntos = car.querySelectorAll('.car-punto');
    var pausa = car.querySelector('[data-car-pausa]');
    var i = 0, n = items.length, t = null, espera = null, encima = false, parado = reduce;
    function ir(k) {
      i = (k + n) % n; pista.style.transform = 'translateX(' + (-i * 100) + '%)';
      puntos.forEach(function (p, j) { if (j === i) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
      items.forEach(function (it, j) { it.setAttribute('aria-hidden', j === i ? 'false' : 'true'); it.classList.toggle('activo', j === i); });
    }
    function quieto() { clearInterval(t); t = null; car.classList.remove('auto'); }
    function auto() {
      quieto(); if (parado || encima) return;
      void car.offsetWidth; car.classList.add('auto');       // reinicia la barra de tiempo
      t = setInterval(function () { ir(i + 1); }, PASO);
    }
    function usado() { quieto(); clearTimeout(espera); if (!parado) espera = setTimeout(auto, ESPERA); }
    puntos.forEach(function (p, j) { p.addEventListener('click', function () { ir(j); usado(); }); });
    var ant = car.querySelector('[data-car-ant]'), sig = car.querySelector('[data-car-sig]');
    if (ant) ant.addEventListener('click', function () { ir(i - 1); usado(); });
    if (sig) sig.addEventListener('click', function () { ir(i + 1); usado(); });
    if (pausa) {
      if (reduce) pausa.hidden = true;
      pausa.addEventListener('click', function () {
        parado = !parado; clearTimeout(espera);
        pausa.setAttribute('aria-pressed', parado ? 'true' : 'false');
        pausa.setAttribute('aria-label', parado ? 'Reanudar el carrusel' : 'Pausar el carrusel');
        if (parado) quieto(); else auto();
      });
    }
    if (raton) {
      car.addEventListener('mouseenter', function () { encima = true; quieto(); });
      car.addEventListener('mouseleave', function () { encima = false; auto(); });
    }
    car.addEventListener('focusin', function () { quieto(); });
    car.addEventListener('focusout', function (e) { if (!car.contains(e.relatedTarget)) usado(); });
    car.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { ir(i + 1); usado(); } if (e.key === 'ArrowLeft') { ir(i - 1); usado(); } });
    var x0 = null, dx = 0, ancho = 1;
    pista.addEventListener('pointerdown', function (e) { x0 = e.clientX; dx = 0; ancho = pista.offsetWidth || 1; pista.classList.add('arrastra'); quieto(); });
    window.addEventListener('pointermove', function (e) { if (x0 === null) return; dx = e.clientX - x0; pista.style.transform = 'translateX(calc(' + (-i * 100) + '% + ' + dx + 'px))'; });
    function suelta() { if (x0 === null) return; pista.classList.remove('arrastra'); x0 = null;
      if (Math.abs(dx) > ancho * 0.15) ir(i + (dx < 0 ? 1 : -1)); else ir(i); usado(); }
    window.addEventListener('pointerup', suelta); window.addEventListener('pointercancel', suelta);
    ir(0); auto();
  });
})();
