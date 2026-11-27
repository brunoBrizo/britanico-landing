/* Instituto Británico de Rivera — landing v4 · "Hello, Rivera" */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = () => reduceMq.matches;

  /* Remember how the last interaction happened: mouse hovers, fingers tap. */
  let lastPointer = "mouse";
  addEventListener("pointerdown", (e) => { lastPointer = e.pointerType || "mouse"; }, true);

  /* ============================================================
     FLIP — a word and its translation trade places, letter by letter
     ============================================================ */
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function split(face) {
    const text = face.textContent.replace(/\s+/g, " ").trim();
    const readable = !face.closest('[aria-hidden="true"]');
    let n = 0;
    const glyphs = text
      .split(" ")
      .map((w) => '<span class="wd">' + [...w].map((ch) => `<span class="ch" style="--i:${n++}">${esc(ch)}</span>`).join("") + "</span>")
      .join(" ");
    face.innerHTML = (readable ? `<span class="sr-only">${esc(text)}</span>` : "") + `<span aria-hidden="true">${glyphs}</span>`;
  }

  const ROLL_MS = 720;   // matches .ch transition in styles-v4.css
  const STAGGER_MS = 34;

  function makeFlip(el, startSide) {
    const [a, b] = el.querySelectorAll(":scope > .face");
    split(a);
    split(b);
    const longest = Math.max(a.querySelectorAll(".ch").length, b.querySelectorAll(".ch").length);
    let cur = startSide === "b" ? b : a;
    let settleTimer = 0;

    // Final state, applied without transitions: the word on show is complete,
    // the other one is gone. Nothing can stay half-rolled after this runs.
    const settle = () => {
      clearTimeout(settleTimer);
      cur.dataset.st = "rest";
      (cur === a ? b : a).dataset.st = "gone";
    };
    settle();
    el.classList.add("is-ready");

    const api = {
      get side() { return cur === a ? "a" : "b"; },
      show(side, instant) {
        const next = side === "a" ? a : b;
        if (next === cur) return;
        const prev = cur;
        cur = next;
        if (instant || document.hidden || reduce()) { settle(); return; }
        next.dataset.st = "wait";
        void next.offsetWidth; // park the incoming word below the line before it rolls in
        next.dataset.st = "in";
        prev.dataset.st = "out";
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, ROLL_MS + longest * STAGGER_MS + 80);
      },
      toggle() { api.show(api.side === "a" ? "b" : "a"); },
      settle,
    };
    return api;
  }

  const other = (s) => (s === "a" ? "b" : "a");

  function hoverSwap(target, flip, rest, onTouch) {
    target.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") flip.show(other(rest)); });
    target.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") flip.show(rest); });
    if (onTouch) target.addEventListener("click", () => { if (lastPointer !== "mouse") { onTouch(); flip.toggle(); } });
  }

  /* Words trade languages on one shared beat: every CYCLE_MS each flip that is
     on screen rolls to its other language, all together. Off screen, in a hidden
     tab or with reduced motion a word simply rests on its first face.
     A click or tap on a word pauses it on its resting face; another resumes. */
  const CYCLE_MS = 2200;
  const cycling = new Set();
  const flipOf = new WeakMap();
  let beat = "a";
  const onScreen = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        const f = flipOf.get(en.target);
        if (en.isIntersecting) cycling.add(f);
        else { cycling.delete(f); f.show("a", true); }
      }))
    : null;
  function cycle(el, f, clickTarget) {
    if (!onScreen) return;
    flipOf.set(el, f);
    onScreen.observe(el);
    (clickTarget || el).addEventListener("click", () => { f.paused = !f.paused; if (f.paused) f.show("a"); });
  }
  setInterval(() => {
    if (document.hidden || reduce()) return;
    beat = other(beat);
    cycling.forEach((f) => { if (!f.paused) f.show(beat); });
  }, CYCLE_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { beat = "a"; cycling.forEach((f) => f.show("a", true)); }
  });

  document.querySelectorAll("[data-flip]").forEach((el) => {
    const mode = el.dataset.flip;

    if (mode === "hover") {
      // Nav: Spanish at rest, English on hover/focus.
      const f = makeFlip(el, "a");
      const link = el.closest("a");
      hoverSwap(link, f, "a");
      link.addEventListener("focus", () => { if (link.matches(":focus-visible")) f.show("b"); });
      link.addEventListener("blur", () => f.show("a"));
      return;
    }

    if (mode === "intro") {
      // Section headword: Spanish first, trading places with English on the shared beat.
      cycle(el, makeFlip(el, "a"));
      return;
    }

    if (mode === "hero") {
      // "Hello," from the first paint, trading places with "Hola," on the shared beat.
      cycle(el, makeFlip(el, "a"), document.getElementById("hello"));
    }
  });

  /* ============================================================
     HEADER — hairline once the page moves; mobile menu sheet
     ============================================================ */
  const top = document.getElementById("top");
  const onScroll = () => top.classList.toggle("is-scrolled", scrollY > 4);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("nav");
  const menuLabel = menuBtn.querySelector(".menu-btn-t");
  const deskMq = matchMedia("(min-width: 1180px)");

  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    root.classList.toggle("menu-open", open);
    menuLabel.textContent = open ? "Cerrar" : "Menú";
    if (open) {
      const first = nav.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    }
  }
  menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a") && !deskMq.matches) setMenu(false); });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
  });
  deskMq.addEventListener("change", () => setMenu(false));

  /* ============================================================
     NIVELES — pick a course, the red "i" bar spans its levels
     ============================================================ */
  const ladder = document.getElementById("ladder");
  if (ladder) {
    const rows = [...ladder.querySelectorAll(".lv")];
    const bar = document.getElementById("lvBar");
    const barText = document.getElementById("lvBarT");
    const buttons = [...document.querySelectorAll(".lvf-btns button")];
    const now = document.getElementById("lvfNow");
    const names = [...ladder.querySelectorAll(".lv-in span[data-c]")];

    const courses = {
      kids:      { from: 0, to: 2, label: "Kids",      say: "Kids: de Pre-A1 a A2, desde los 4 años." },
      teens:     { from: 2, to: 4, label: "Teens",     say: "Teens: de A2 a B2, durante el liceo." },
      adults:    { from: 1, to: 6, label: "Adults",    say: "Adults: de A1 a C2, desde cero." },
      cambridge: { from: 4, to: 6, label: "Cambridge", say: "Cambridge: B2 First, C1 y C2." },
    };
    let current = "kids";

    function place(animate) {
      const c = courses[current];
      const first = rows[c.from];
      const last = rows[c.to];
      const inset = 14;
      const y = first.offsetTop + inset;
      const h = last.offsetTop + last.offsetHeight - inset - y;
      bar.classList.toggle("no-anim", !animate || reduce());
      bar.style.setProperty("--y", y + "px");
      bar.style.height = h + "px";
    }

    function select(key, animate = true) {
      if (!courses[key]) return;
      current = key;
      const c = courses[key];
      rows.forEach((r, i) => r.classList.toggle("is-on", i >= c.from && i <= c.to));
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.course === key)));
      names.forEach((s) => s.classList.toggle("is-hl", s.dataset.c === key));
      barText.textContent = c.label;
      now.textContent = c.say;
      place(animate);
    }

    /* After a choice, bring the first level of that course up to just under the
       sticky switch, so the red bar and the blue bubbles are what you see next.
       `fromCard`: the jump starts far above Niveles, where the switch isn't stuck
       yet, so the landing uses the height it will have once it is stuck. */
    const switcher = document.getElementById("lvf");
    const header = document.getElementById("top");
    function stuckHeight() {
      if (switcher.classList.contains("is-stuck")) return switcher.offsetHeight;
      switcher.classList.add("is-stuck");
      const h = switcher.offsetHeight;
      switcher.classList.remove("is-stuck");
      return h;
    }
    function reveal(key, fromCard) {
      const row = rows[courses[key].from];
      const under = header.offsetHeight + (switcher ? (fromCard ? stuckHeight() : switcher.offsetHeight) : 0) + 10;
      const rowTop = row.getBoundingClientRect().top;
      if (rowTop >= under && rowTop <= innerHeight * 0.45) return; // already in place
      scrollTo({ top: rowTop + scrollY - under, behavior: reduce() ? "instant" : "smooth" });
    }
    buttons.forEach((b) => b.addEventListener("click", () => { select(b.dataset.course); reveal(b.dataset.course); }));
    if (switcher) {
      const stuck = () => switcher.classList.toggle("is-stuck", switcher.getBoundingClientRect().top <= header.offsetHeight + 1);
      addEventListener("scroll", stuck, { passive: true });
      stuck();
    }
    /* A course card's level bar picks that course. On phones and tablets it also
       lands on the course's first level under the switch (instead of the Niveles
       heading, with the highlighted rows off-screen); desktop keeps the plain jump. */
    const narrowMq = matchMedia("(max-width: 1023.98px)");
    document.querySelectorAll(".lvscale[data-course]").forEach((a) =>
      a.addEventListener("click", (e) => {
        select(a.dataset.course, false);
        if (!narrowMq.matches) return;
        e.preventDefault();
        reveal(a.dataset.course, true);
      })
    );

    select("kids", false);
    if ("ResizeObserver" in window) new ResizeObserver(() => place(false)).observe(ladder);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(false));
  }

  /* ============================================================
     WHATSAPP BAR — full width on phones, once the hero button is
     gone and until the contact block takes over
     ============================================================ */
  const dock = document.getElementById("dock");
  const heroCta = document.getElementById("heroCta");
  const contact = document.getElementById("contacto");
  const red = document.getElementById("testimonios");
  let tint = () => {};
  if (dock && red) {
    // over the red section the red bar would vanish: it turns blue there
    let ticking = false;
    tint = () => {
      ticking = false;
      const r = red.getBoundingClientRect();
      const y = innerHeight - dock.offsetHeight / 2;
      dock.classList.toggle("on-red", r.top < y && r.bottom > y);
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tint); } }, { passive: true });
    tint();
  }
  if (dock && heroCta && contact && "IntersectionObserver" in window) {
    let pastHero = false;
    let atContact = false;
    let atCards = false;
    const update = () => {
      const on = pastHero && !atContact && !atCards;
      dock.classList.toggle("is-on", on);
      tint();
      dock.setAttribute("aria-hidden", String(!on));
      dock.tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(([en]) => {
      pastHero = !en.isIntersecting && en.boundingClientRect.top < 0;
      update();
    }).observe(heroCta);
    // retire at Contacto and stay retired over the footer
    const ends = new Map();
    const endObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => ends.set(en.target, en.isIntersecting));
      atContact = [...ends.values()].some(Boolean);
      update();
    }, { rootMargin: "0px 0px -30% 0px" });
    endObserver.observe(contact);
    const foot = document.querySelector(".foot");
    if (foot) endObserver.observe(foot);
    const cards = document.querySelector(".cgrid");
    if (cards) new IntersectionObserver(([en]) => { atCards = en.isIntersecting; update(); }).observe(cards);
  }
})();


/* ---- hero: "La pared azul" (merged from hero-1.js) ---- */
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
  // Desktop only. On phones and tablets the words and the photo scroll as
  // one, so the group can never slide over the greeting.
  const wideMq = matchMedia("(min-width: 1024px)");
  let lastY = -1;
  function parallax() {
    if (reduce) return;
    if (!wideMq.matches) {
      if (lastY !== -2) {
        lastY = -2;
        head.style.transform = "";
        layers.forEach((l) => { l.style.transform = ""; });
      }
      return;
    }
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

  // Phones and tablets: if the first frame comes late, the page wasn't being
  // drawn (a background tab, a preview, a slow in-app browser); the words then
  // simply stay where they are instead of vanishing for the rise.
  const narrow = matchMedia("(max-width: 1023.98px)").matches;
  const t0 = performance.now();
  requestAnimationFrame(() => {
    if (settled || document.hidden) return;
    if (narrow && performance.now() - t0 > 400) { settled = true; return; }
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
