/* Instituto Británico de Rivera — interactions (concept C: people first) */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desktop = window.matchMedia("(min-width: 921px) and (hover: hover) and (pointer: fine)");
  var wide = window.matchMedia("(min-width: 921px)");
  var hasScrollTL = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"));
  var hasViewTL = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));

  function $(id) { return document.getElementById(id); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  if (/[?&]slow\b/.test(location.search)) root.classList.add("slow-motion"); // review aid: stretches the load sequence 3x

  /* ---- Hero load sequence: wait for the variable font so the width animation is real ---- */
  var loaded = false;
  function go() { if (!loaded) { loaded = true; root.classList.add("is-loaded"); } }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('850 expanded 40px "Archivo"').then(go, go);
  }
  setTimeout(go, 1200); // never hold the hero hostage to a slow font

  /* ---- Header ---- */
  var top = $("top");
  var lastY = window.scrollY;

  /* ---- Mobile menu: page behind is inert, scroll locked on <html> ---- */
  var burger = $("burger");
  var nav = $("nav");
  var behind = ["main", ".foot", "#dock"].map(function (s) { return document.querySelector(s); });
  function setMenu(open) {
    root.classList.toggle("nav-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    behind.forEach(function (el) { if (el) el.inert = open; });
  }
  burger.addEventListener("click", function () { setMenu(!root.classList.contains("nav-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("nav-open")) { setMenu(false); burger.focus(); } });
  wide.addEventListener("change", function (e) { if (e.matches) setMenu(false); });

  /* ---- Current section in nav ---- */
  var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var a = byId[en.target.id]; // sections without a nav link (hero, gallery…) clear the highlight
      if (en.isIntersecting) {
        links.forEach(function (l) { l.classList.toggle("is-current", l === a); });
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main > section").forEach(function (el) { spy.observe(el); });

  /* ---- Hero: the letters are a window onto the same photo ----
     The window's image is sized to the hero box and offset by the mark's
     position, so what you see inside the letters lines up with what's outside. */
  var hero = $("inicio");
  var mark = $("mark");
  var markWin = $("markWin");
  var heroBg = $("heroBg");
  var markCap = $("markCap");
  function alignWindow() {
    var x = 0, y = 0, el = mark;
    while (el && el !== hero) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    mark.style.setProperty("--mx", x + "px");
    mark.style.setProperty("--my", y + "px");
    mark.style.setProperty("--hw", hero.clientWidth + "px");
    mark.style.setProperty("--hh", hero.clientHeight + "px");
    // the veil darkens a little more right behind the window, wherever it lands
    hero.style.setProperty("--mark-x", ((x + mark.offsetWidth / 2) / hero.clientWidth * 100).toFixed(1) + "%");
    hero.style.setProperty("--mark-y", ((y + mark.offsetHeight / 2) / hero.clientHeight * 100).toFixed(1) + "%");
  }

  /* Photos cycle through the window and the backdrop together (after load, so first paint pays for one) */
  var slides = [
    { src: "patio",   w: 1440, h: 1080, cap: "Estudiantes en el patio del instituto" },
    { src: "patio-2", w: 1440, h: 1080, cap: "Un grupo de Kids en el patio azul" },
    { src: "mascota", w: 1440, h: 1080, cap: "Una visita especial en el patio" }
  ];
  var bgImgs = [heroBg.querySelector("img")], winImgs = [markWin.querySelector("img")];
  var slide = 0, cycleTimer = 0, heroVisible = true;
  function mkImg(s) {
    var im = new Image();
    im.className = "hero-ph";
    // sizes/srcset before src, or the browser starts fetching the 1440px file on phones
    im.sizes = "(max-width: 760px) 50vw, 100vw";
    im.srcset = "assets/photos/" + s.src + "-800.webp 800w, assets/photos/" + s.src + ".webp 1440w";
    im.src = "assets/photos/" + s.src + ".webp";
    im.alt = ""; im.width = s.w; im.height = s.h; im.decoding = "async";
    return im;
  }
  function showSlide(i) {
    slide = i;
    bgImgs.forEach(function (im, k) { im.classList.toggle("is-on", k === i); });
    winImgs.forEach(function (im, k) { im.classList.toggle("is-on", k === i); });
    markCap.textContent = slides[i].cap;
  }
  function nextSlide() { if (!document.hidden && heroVisible) showSlide((slide + 1) % slides.length); }
  function startCycle() {
    if (reduce.matches || cycleTimer) return;
    for (var i = 1; i < slides.length; i++) {
      var a = mkImg(slides[i]), b = mkImg(slides[i]);
      heroBg.appendChild(a); markWin.appendChild(b);
      bgImgs.push(a); winImgs.push(b);
    }
    cycleTimer = setInterval(nextSlide, 6500);
  }
  window.addEventListener("load", function () { setTimeout(startCycle, 1800); });
  new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; }).observe(hero);

  /* ---- Line map: red fill advances with scroll, stations light up ---- */
  var map = $("map");
  var fill = $("spineFill");
  var stations = map ? Array.prototype.slice.call(map.querySelectorAll(".stations li")) : [];

  /* ---- Life gallery: the year as a line. Past photos in colour, the ones ahead still blue ---- */
  var life = $("vida");
  var pin = $("lifePin");
  var track = $("lifeTrack");
  var phs = Array.prototype.slice.call(track.querySelectorAll("figure.ph"));
  var prevBtn = $("lifePrev"), nextBtn = $("lifeNext"), nowEl = $("lifeNow"), railFill = $("railFill");
  var offL = [], widths = [];
  var pinned = false, travel = 0, tx = 0, cur = 0, curMo = -1;
  var duoLast = phs.map(function () { return -1; });
  function setupPin() {
    pinned = desktop.matches && !reduce.matches;
    life.classList.toggle("is-pinned", pinned);
    track.tabIndex = pinned ? -1 : 0; // pinned: the page scroll moves it, no need for its own tab stop
    if (!pinned) { tx = 0; track.style.removeProperty("--tx"); pin.style.removeProperty("--pin-h"); }
    else {
      travel = Math.max(0, track.scrollWidth - window.innerWidth);
      pin.style.setProperty("--pin-h", (window.innerHeight + travel * 0.8) + "px");
    }
    offL = phs.map(function (f) { return f.offsetLeft - track.offsetLeft; }); // relative to the track, whatever the offsetParent
    widths = phs.map(function (f) { return f.offsetWidth; });
  }
  track.addEventListener("scroll", function () { onScroll(); }, { passive: true });

  // Bring photo i to the spotlight (its centre a little left of the middle)
  function goTo(i) {
    i = Math.max(0, Math.min(phs.length - 1, i));
    var vw = window.innerWidth;
    var target = offL[i] + widths[i] / 2 - vw * 0.42;
    if (pinned) {
      var tr = track.getBoundingClientRect();
      var base = tr.left - tx; // untransformed left in the viewport (equals the page padding)
      var wantTx = -(target + base);
      var t = clamp(-wantTx / travel);
      var pinTop = pin.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.round(pinTop + t * (pin.offsetHeight - window.innerHeight)), behavior: reduce.matches ? "instant" : "smooth" });
    } else {
      track.scrollTo({ left: Math.max(0, target + parseFloat(getComputedStyle(track).paddingLeft) - vw * 0.08), behavior: reduce.matches ? "instant" : "smooth" });
    }
  }
  prevBtn.addEventListener("click", function () { goTo(cur - 1); });
  nextBtn.addEventListener("click", function () { goTo(cur + 1); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (e.target !== document.body && e.target !== track && !e.target.closest(".life")) return;
    var r = pin.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.4 || r.bottom < window.innerHeight * 0.6) return;
    e.preventDefault();
    goTo(cur + (e.key === "ArrowRight" ? 1 : -1));
  });
  // Tabbing into the pinned track: scroll the page to where that item is in view
  track.addEventListener("focusin", function (e) {
    if (!pinned || !travel) return;
    var it = e.target.closest(".ph") || e.target;
    var i = phs.indexOf(it);
    if (i >= 0) goTo(i);
  });
  function setNow(i) {
    if (i === cur && nowEl.dataset.set) return;
    cur = i; nowEl.dataset.set = "1";
    var f = phs[i];
    nowEl.innerHTML = "";
    var mo = document.createElement("span"); mo.className = "life-now-mo"; mo.textContent = f.dataset.mo || "en el año";
    var b = document.createElement("b"); b.textContent = f.dataset.t || "";
    nowEl.appendChild(mo); nowEl.appendChild(b);
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === phs.length - 1;
    // the ruler: marzo = 0 … diciembre = 9; an undated photo keeps the last month's position
    var m = f.getAttribute("data-m");
    if (m !== null && +m !== curMo) { curMo = +m; railFill.style.setProperty("--rp", ((curMo + .5) / 10).toFixed(3)); }
  }

  /* ---- Reveal fallbacks when scroll-driven animations aren't available ---- */
  if (!hasViewTL) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add(en.target.classList.contains("duo") ? "is-color" : "is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(document.querySelectorAll(".duo.reveal, .contact-title, .mini-line"), function (el) { io.observe(el); });
  }

  /* ---- Mobile dock: after the hero, hidden over contact ---- */
  var dock = $("dock");
  var contact = $("contacto");

  var ticking = false;
  function frame() {
    ticking = false;
    // reads first
    var y = window.scrollY, vh = window.innerHeight, vw = window.innerWidth;
    var mr = map && map.getBoundingClientRect();
    var pr = pinned && pin.getBoundingClientRect();
    var tr = track.getBoundingClientRect();
    var sl = pinned ? 0 : track.scrollLeft;
    var hb = dock && hero.getBoundingClientRect().bottom;
    var ct = dock && contact.getBoundingClientRect().top;

    // then writes
    top.classList.toggle("is-scrolled", y > 8);
    if (!root.classList.contains("nav-open")) {
      if (y > 600 && y > lastY + 6) top.classList.add("is-hidden");
      else if (y < lastY - 6 || y < 600) top.classList.remove("is-hidden");
    }
    lastY = y;

    if (!hasScrollTL && !reduce.matches) {
      hero.style.setProperty("--hp", clamp(y / (vh * 0.7)).toFixed(3));
    }

    if (mr && mr.bottom > -200 && mr.top < vh + 200) {
      var p = clamp((vh * 0.8 - mr.top) / (mr.height * 0.9));
      fill.style.setProperty("--p", p.toFixed(4));
      stations.forEach(function (li, i) { li.classList.toggle("on", p > 0 && p >= i / (stations.length - 1) - 0.001); });
    }

    var base = tr.left - tx; // track's untransformed left edge
    if (pinned) {
      tx = -clamp(-pr.top / (pr.height - vh)) * travel;
      track.style.setProperty("--tx", tx.toFixed(1) + "px");
    }
    if (tr.bottom > 0 && tr.top < vh) {
      var last = 0;
      phs.forEach(function (f, i) {
        var cx = base + tx + offL[i] + widths[i] / 2 - sl;  // photo centre in the viewport
        var on = cx < vw * 0.6;
        f.classList.toggle("on", on);
        if (on) last = i;
        if (!reduce.matches) {
          // colour leads: fully coloured once the centre passes 55% of the viewport, blue again by 95%
          var d = Math.round(clamp((cx - vw * 0.55) / (vw * 0.4)) * 20) / 20;
          if (d !== duoLast[i]) { duoLast[i] = d; f.firstElementChild.style.setProperty("--duo", d); }
        }
      });
      setNow(last);
    }

    if (dock) dock.classList.toggle("is-shown", hb < 0 && ct > vh);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  function relayout() { alignWindow(); setupPin(); onScroll(); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", relayout);
  desktop.addEventListener("change", relayout);
  reduce.addEventListener("change", relayout);
  window.addEventListener("load", relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
  frame();
})();
