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

  /* Section headwords rest in Spanish. Only when one is about to scroll up into
     view from below does it switch (unseen) to English, then roll back into
     Spanish once it is on screen. A skipped or hidden heading simply stays Spanish. */
  function armIntro(el, f) {
    let armed = false;
    let fallback = 0;
    const disarm = () => { armed = false; clearTimeout(fallback); f.show("a", true); };
    const near = new IntersectionObserver(([en]) => {
      if (armed || !en.isIntersecting || en.boundingClientRect.top < innerHeight) return;
      armed = true;
      f.show("b", true);
      fallback = setTimeout(disarm, 6000);
    }, { rootMargin: "0px 0px 35% 0px" });
    const seen = new IntersectionObserver(([en]) => {
      if (!armed || !en.isIntersecting) return;
      armed = false;
      clearTimeout(fallback);
      near.disconnect();
      seen.disconnect();
      setTimeout(() => f.show("a"), 200);
    }, { threshold: 0.6 });
    near.observe(el);
    seen.observe(el);
    document.addEventListener("visibilitychange", () => { if (document.hidden && armed) disarm(); });
  }

  let hero = null;

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
      // Section headword: Spanish at rest; arrives in English and rolls into Spanish.
      const f = makeFlip(el, "a");
      hoverSwap(el, f, "a", () => {});
      if (!reduce() && "IntersectionObserver" in window) armIntro(el, f);
      return;
    }

    if (mode === "hero") {
      // Rests on "Hello," from the first paint; the roll is only a visit to "Hola,".
      const f = makeFlip(el, "a");
      const stage = document.getElementById("hello");
      const timers = [];
      const stop = () => { timers.forEach(clearTimeout); timers.length = 0; };
      hoverSwap(stage, f, "a", stop);
      stage.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") stop(); });
      hero = { f, timers, stop };
    }
  });

  /* Hero greeting: Hello → Hola → Hello, all within five seconds, then it rests.
     It only plays in a visible tab; hiding the tab ends it on "Hello," at once,
     and a last timer puts "Hello," back no matter what happened before. */
  if (hero && !reduce()) {
    const finish = () => { hero.stop(); hero.f.show("a", true); };
    const play = () => {
      if (document.hidden) return;
      hero.timers.push(setTimeout(() => { if (!document.hidden) hero.f.show("b"); }, 1100));
      hero.timers.push(setTimeout(() => { if (!document.hidden) hero.f.show("a"); }, 3100));
      hero.timers.push(setTimeout(finish, 4800));
    };
    document.addEventListener("visibilitychange", () => { if (document.hidden) finish(); });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => requestAnimationFrame(play));
  }

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
       sticky switch, so the red bar and the blue bubbles are what you see next. */
    const switcher = document.getElementById("lvf");
    const header = document.getElementById("top");
    function reveal(key) {
      const row = rows[courses[key].from];
      const under = header.offsetHeight + (switcher ? switcher.offsetHeight : 0) + 10;
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
    document.querySelectorAll(".lvscale[data-course]").forEach((a) =>
      a.addEventListener("click", () => select(a.dataset.course, false))
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
