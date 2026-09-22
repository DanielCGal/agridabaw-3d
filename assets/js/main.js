/* AgriDabaw-3D — promotional site behaviour
   Mobile nav, scroll reveal, section highlighting, screenshot lightbox. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile nav ---------- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealables = document.querySelectorAll('.reveal');

  /* Shows everything that is already on screen. The observer below normally
     does this, but it only runs while the page is being painted, so a tab that
     opens in the background or a browser that throttles the callback could
     otherwise leave the first screenful blank. */
  function revealInView() {
    Array.prototype.forEach.call(revealables, function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
    });
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el, i) {
      // Stagger cards inside the same grid so they cascade rather than pop together.
      var siblingIndex = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.transitionDelay = Math.min(siblingIndex, 5) * 70 + 'ms';
      revealObserver.observe(el);
    });

    window.addEventListener('load', revealInView);
  }

  /* ---------- Active section in the nav ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav__menu a[href^="#"]:not(.btn)')
  );
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  /* ---------- Deep links ---------- */
  /* A page opened straight at a fragment - the shared #about link, for example -
     can stay at the top, because Chrome makes the jump while the images further
     down are still loading and the root scrolls smoothly. Re-aim at the target
     once the page has finished loading, but only if nothing scrolled at all, so
     a reader who has already moved is never yanked back. */
  if (location.hash.length > 1) {
    var deepTarget = null;
    try { deepTarget = document.querySelector(location.hash); } catch (err) { deepTarget = null; }

    if (deepTarget) {
      window.addEventListener('load', function () {
        if (window.scrollY < 4) {
          // Land on the section rather than animating the whole page past every
          // other one, which is what the smooth root scrolling would otherwise do.
          var root = document.documentElement;
          var previous = root.style.scrollBehavior;
          root.style.scrollBehavior = 'auto';
          deepTarget.scrollIntoView();
          root.style.scrollBehavior = previous;
        }
        setTimeout(revealInView, 0);
      });
    }
  }

  /* ---------- Screenshot lightbox ---------- */
  var grid = document.getElementById('galleryGrid');
  var box = document.getElementById('lightbox');
  var boxImg = document.getElementById('lbImg');
  var boxCap = document.getElementById('lbCap');
  var btnClose = document.getElementById('lbClose');
  var btnPrev = document.getElementById('lbPrev');
  var btnNext = document.getElementById('lbNext');

  if (grid && box) {
    var buttons = Array.prototype.slice.call(grid.querySelectorAll('.gal'));
    var current = 0;
    var lastFocused = null;

    function show(i) {
      current = (i + buttons.length) % buttons.length;
      var img = buttons[current].querySelector('img');
      var label = buttons[current].querySelector('span');
      boxImg.src = img.src;
      boxImg.alt = img.alt;
      boxCap.textContent = label ? label.textContent : '';
    }

    function open(i) {
      lastFocused = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      btnClose.focus();
    }

    function close() {
      box.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { open(i); });
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(current - 1); });
    btnNext.addEventListener('click', function () { show(current + 1); });

    // Click the backdrop (but not the image or the controls) to dismiss.
    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'Tab') {
        // Keep focus inside the dialog while it is open.
        var focusables = [btnClose, btnPrev, btnNext];
        var idx = focusables.indexOf(document.activeElement);
        e.preventDefault();
        var next = e.shiftKey ? idx - 1 : idx + 1;
        focusables[(next + focusables.length) % focusables.length].focus();
      }
    });
  }

  /* ---------- Year in the footer, if the page ever outlives 2026 ---------- */
  var yearHolder = document.querySelector('[data-year]');
  if (yearHolder) yearHolder.textContent = String(new Date().getFullYear());
})();
