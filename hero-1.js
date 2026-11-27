/* hero variant 1 — "La pared azul"
   1. Header: white on the wall, normal white bar once the wall has gone by.
   2. Load: "Hello, Rivera." rises from behind the group onto the wall.
      CSS holds the final state; this only adds a start state and always
      removes it again on a timer, so nothing waits on an animation.
   3. Scroll: the photo moves a little, the words less, so the kids rise in
      front of the greeting as the wall scrolls away. No scroll-jacking. */
(() => {
  "use strict";

  const root = document.documentElement;
  const hero = document.getElementById("inicio");
  const top = document.getElementById("top");
  if (!hero || !top || !hero.classList.contains("wall")) return;

  const tab = hero.querySelector(".wall-tab");
  const head = hero.querySelector(".wall-head");
  const layers = [...hero.querySelectorAll(".wall-ph")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. header ---------- */
  // CSS draws the bar on the wall by default (no flash on load); it turns
  // back into the white bar once the white tab reaches it
  let off = null;
  function header() {
    const edge = (tab || hero).getBoundingClientRect().top;
    const v = edge <= top.offsetHeight - 2;
    if (v !== off) { off = v; top.classList.toggle("off-wall", v); }
  }

  /* ---------- 3. scroll response ---------- */
  const K_WORDS = 0.42;
  const K_PHOTO = 0.12;
  let lastY = -1;
  function parallax() {
    if (reduce) return;
    const h = hero.offsetHeight;
    const y = Math.min(Math.max(scrollY, 0), h);
    if (y === lastY) return;
    lastY = y;
    head.style.transform = y ? `translate3d(0, ${(y * K_WORDS).toFixed(1)}px, 0)` : "";
    const p = y ? `translate3d(0, ${(y * K_PHOTO).toFixed(1)}px, 0)` : "";
    layers.forEach((l) => { l.style.transform = p; });
  }

  let ticking = false;
  function frame() { ticking = false; header(); parallax(); }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener("resize", () => { lastY = -1; frame(); }, { passive: true });
  frame();

  /* ---------- 2. load ----------
     The words are only ever hidden from inside an animation frame, so a page
     that isn't drawing frames (background tab, throttled browser) never hides
     them. After that, timers run the show: a stalled clock is detected and
     skipped, and the final state is forced well inside two seconds. */
  if (reduce || document.hidden || scrollY > hero.offsetHeight / 2) return;
  const first = hero.querySelector(".hello-ln");
  const FONT_WAIT_MS = 600;   // longest the words wait, hidden, for the display face
  const RISE_MS = 1400;       // 1.2 s rise + 0.14 s stagger (hero-1.css)
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    root.classList.remove("wall-intro", "wall-go");
  };
  const lift = () => (new DOMMatrixReadOnly(getComputedStyle(first).transform)).m42;
  document.addEventListener("visibilitychange", () => { if (document.hidden) settle(); });

  requestAnimationFrame(() => {
    if (settled || document.hidden) return;
    root.classList.add("wall-intro");
    const start = lift();
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, FONT_WAIT_MS))]).then(() => {
      if (settled) return;
      root.classList.add("wall-go");
      // if the clock isn't moving, don't wait for it
      setTimeout(() => { if (start > 0 && lift() > start * 0.92) settle(); }, 320);
      setTimeout(settle, RISE_MS + 120);
    });
    setTimeout(settle, FONT_WAIT_MS + RISE_MS + 300);
  });
})();
