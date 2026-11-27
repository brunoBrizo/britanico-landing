/* Instituto Británico — interactions (v2) */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function motionOff() {
    return prefersReduced || document.documentElement.getAttribute("data-motion") === "off";
  }

  /* ---- Header: scrolled state + hide on scroll down ---- */
  var header = document.querySelector(".site-header");
  var lastY = window.scrollY;
  function onScrollHeader() {
    var y = window.scrollY;
    if (y > 24) header.classList.add("scrolled");
    else header.classList.remove("scrolled");

    if (!document.body.classList.contains("nav-open")) {
      if (y > 420 && y > lastY + 4) header.classList.add("nav-hidden");
      else if (y < lastY - 4 || y <= 420) header.classList.remove("nav-hidden");
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---- Mobile nav (with iOS-proof scroll lock) ---- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("mainNav");
  var scrollLockY = 0;
  function setMenu(open) {
    if (open) {
      scrollLockY = window.scrollY;
      document.body.classList.add("nav-open");
      document.body.style.position = "fixed";
      document.body.style.top = -scrollLockY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
    } else {
      document.body.classList.remove("nav-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo({ top: scrollLockY, left: 0, behavior: "instant" });
    }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("nav-open"));
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        if (document.body.classList.contains("nav-open")) setMenu(false);
      });
    });
  }

  /* ---- Scroll progress line (mobile) ---- */
  var progressLine = document.getElementById("headerProgress");
  function onProgress() {
    if (!progressLine) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    progressLine.style.transform = "scaleX(" + p + ")";
  }
  window.addEventListener("scroll", onProgress, { passive: true });
  window.addEventListener("resize", onProgress);
  onProgress();

  /* ---- Course carousel dots (mobile) ---- */
  var courseGrid = document.querySelector(".course-grid");
  var dotsWrap = document.getElementById("courseDots");
  if (courseGrid && dotsWrap) {
    var cards = Array.prototype.slice.call(courseGrid.querySelectorAll(".course-card"));
    cards.forEach(function (card, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Curso " + (i + 1) + " de " + cards.length);
      b.addEventListener("click", function () {
        courseGrid.scrollTo({
          left: card.offsetLeft - (courseGrid.clientWidth - card.clientWidth) / 2,
          behavior: motionOff() ? "auto" : "smooth"
        });
      });
      dotsWrap.appendChild(b);
    });
    var dotEls = Array.prototype.slice.call(dotsWrap.querySelectorAll("button"));
    var dotsTick = false;
    function syncDots() {
      var center = courseGrid.scrollLeft + courseGrid.clientWidth / 2;
      var best = 0, bestD = Infinity;
      cards.forEach(function (card, i) {
        var d = Math.abs(card.offsetLeft + card.clientWidth / 2 - center);
        if (d < bestD) { bestD = d; best = i; }
      });
      dotEls.forEach(function (d, i) { d.classList.toggle("is-active", i === best); });
    }
    courseGrid.addEventListener("scroll", function () {
      if (!dotsTick) {
        dotsTick = true;
        requestAnimationFrame(function () { syncDots(); dotsTick = false; });
      }
    }, { passive: true });
    syncDots();
  }

  /* ---- Sticky bottom CTA (mobile): show after hero, hide at contact/footer ---- */
  var stickyCta = document.getElementById("stickyCta");
  var heroSection = document.getElementById("inicio");
  var contactSection2 = document.getElementById("contacto");
  var footerSection = document.querySelector(".site-footer");
  if (stickyCta && heroSection) {
    var heroVisible = true, contactVisible = false, footerVisible = false;
    function syncSticky() {
      stickyCta.classList.toggle("show", !heroVisible && !contactVisible && !footerVisible);
    }
    var ioCta = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === heroSection) heroVisible = en.isIntersecting;
        if (en.target === contactSection2) contactVisible = en.isIntersecting;
        if (en.target === footerSection) footerVisible = en.isIntersecting;
      });
      syncSticky();
    }, { threshold: 0.05 });
    ioCta.observe(heroSection);
    if (contactSection2) ioCta.observe(contactSection2);
    if (footerSection) ioCta.observe(footerSection);
  }

  /* ---- Marquee: duplicate track content for seamless loop ---- */
  var track = document.getElementById("marqueeTrack");
  if (track) {
    track.innerHTML = track.innerHTML + track.innerHTML;
  }

  /* ---- Scroll reveals ---- */
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal, .path-wrap").forEach(function (el) {
    io.observe(el);
  });

  /* ---- Gentle hero parallax ---- */
  var phMain = document.querySelector(".hero-photo-main");
  var phSub = document.querySelector(".hero-photo-sub");
  function onParallax() {
    if (motionOff() || !phMain) return;
    var y = window.scrollY;
    if (y > 900) return;
    phMain.style.translate = "0 " + y * 0.06 + "px";
    phSub.style.translate = "0 " + y * -0.04 + "px";
  }
  window.addEventListener("scroll", onParallax, { passive: true });

  /* ---- Contact big word: horizontal drift on scroll ---- */
  var bigword = document.getElementById("contactBigword");
  var contactSection = document.getElementById("contacto");
  function onBigword() {
    if (motionOff() || !bigword || !contactSection) return;
    var rect = contactSection.getBoundingClientRect();
    var vh = window.innerHeight;
    if (rect.top > vh || rect.bottom < 0) return;
    var progress = 1 - (rect.top + rect.height) / (vh + rect.height); // 0 → 1
    var drift = (progress - 0.5) * 120;
    bigword.style.transform = "translateX(calc(-50% + " + drift + "px))";
  }
  window.addEventListener("scroll", onBigword, { passive: true });

  /* ---- Magnetic primary buttons (desktop pointers only) ---- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      var strength = 6;
      btn.addEventListener("mousemove", function (e) {
        if (motionOff()) return;
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.style.translate = dx * strength + "px " + dy * strength + "px";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.translate = "0px 0px";
      });
    });
  }

  /* ---- Testimonials: auto-advancing crossfade ---- */
  var viewport = document.getElementById("testiViewport");
  var progress = document.getElementById("testiProgress");
  if (viewport && progress) {
    var slides = Array.prototype.slice.call(viewport.querySelectorAll(".testi-slide"));
    var bars = Array.prototype.slice.call(progress.querySelectorAll(".testi-bar"));
    var current = 0;
    var DURATION = 6500;
    var timer = null;
    var hovered = false;

    document.documentElement.style.setProperty("--testi-dur", DURATION + "ms");

    /* Size the viewport to its tallest slide so there is no dead space between
       the testimonial and the progress bars (slides are absolutely positioned,
       so the container can't size to content on its own). */
    function sizeViewport() {
      var max = 0;
      slides.forEach(function (s) {
        var pos = s.style.position;
        s.style.position = "static";
        var h = s.offsetHeight;
        s.style.position = pos;
        if (h > max) max = h;
      });
      if (max) viewport.style.minHeight = max + "px";
    }
    sizeViewport();
    window.addEventListener("load", sizeViewport);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeViewport);
    var sizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(sizeTimer);
      sizeTimer = setTimeout(sizeViewport, 150);
    }, { passive: true });

    function show(i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, idx) { s.classList.toggle("is-active", idx === current); });
      bars.forEach(function (b, idx) {
        b.classList.remove("is-active");
        var fill = b.querySelector("i");
        if (fill) { fill.style.animation = "none"; void fill.offsetWidth; fill.style.animation = ""; }
        if (idx === current) b.classList.add("is-active");
      });
      restart();
    }

    function restart() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        if (!hovered && !motionOff()) show(current + 1);
        else restart();
      }, DURATION);
    }

    bars.forEach(function (b, idx) {
      b.addEventListener("click", function () { show(idx); });
    });
    viewport.addEventListener("mouseenter", function () { hovered = true; });
    viewport.addEventListener("mouseleave", function () { hovered = false; });

    /* Swipe to navigate (mobile) */
    var startX = null;
    viewport.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    viewport.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 42) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });

    restart();
  }
})();
