/* Hero 3 · "Collage vivo" — header state, entrance, depth */
(() => {
  "use strict";

  const hero = document.getElementById("inicio");
  const header = document.getElementById("top");
  if (!hero || !header) return;

  const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = () => reduceMq.matches;

  /* ============================================================
     HEADER — blue while it sits on the hero, white after it
     ============================================================ */
  let headTick = false;
  const headState = () => {
    headTick = false;
    header.classList.toggle("is-past", hero.getBoundingClientRect().bottom <= header.offsetHeight + 1);
  };
  addEventListener("scroll", () => { if (!headTick) { headTick = true; requestAnimationFrame(headState); } }, { passive: true });
  addEventListener("resize", headState);
  headState();
  // rAF can be throttled in background tabs: settle the header on a timer too
  addEventListener("scroll", () => { clearTimeout(headState.t); headState.t = setTimeout(headState, 120); }, { passive: true });

  /* ============================================================
     ENTRANCE — the inline script parked the pieces (.hc-pre).
     Release them once the group photo can paint; a timer lands
     everything (.is-done) whether or not the transitions ran.
     ============================================================ */
  const land = () => hero.classList.add("is-in", "is-done");
  let started = false;
  const start = () => {
    if (started || !hero.classList.contains("hc-pre")) return;
    started = true;
    if (document.hidden) { land(); return; }
    hero.classList.add("is-in");
    setTimeout(land, 1900);
  };
  // the inline script parks the pieces in the first frame; release them once the group photo can paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!hero.classList.contains("hc-pre")) return;
    const patio = hero.querySelector(".hc-patio img");
    const ready = patio && patio.decode ? patio.decode().catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 450))]).then(() => requestAnimationFrame(start));
    setTimeout(start, 700); // if frames stall after the first one
  }));
  document.addEventListener("visibilitychange", () => { if (document.hidden) land(); });

  /* ============================================================
     DEPTH — each layer drifts at its own rate on scroll and, with
     a mouse, leans toward the pointer. data-d is the layer's depth:
     1 = the ground (far), 8 = the stamp (nearest).
     ============================================================ */
  const layers = [...hero.querySelectorAll("[data-d]")].map((el) => {
    const d = Number(el.dataset.d) || 3;
    return {
      el,
      scroll: (3.4 - d) * 0.045,        // far layers lag, near layers race ahead
      lean: (d - 2.6) * 3.4,            // px of pointer lean at the hero's edge
      spin: el.classList.contains("hc-seal") ? 0.05 : 0,
    };
  });
  if (!layers.length) return;

  const fine = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
  let visible = true;
  let px = 0, py = 0, tx = 0, ty = 0;   // pointer: current and target (-1…1)
  let raf = 0;

  const paint = () => {
    raf = 0;
    if (reduce()) { layers.forEach((l) => { l.el.style.transform = ""; }); return; }
    const s = Math.max(0, Math.min(scrollY, hero.offsetHeight));
    px += (tx - px) * 0.08;
    py += (ty - py) * 0.08;
    layers.forEach((l) => {
      const x = px * l.lean;
      const y = py * l.lean + s * l.scroll;
      l.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)` + (l.spin ? ` rotate(${(s * l.spin).toFixed(2)}deg)` : "");
    });
    if (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002) queue();
  };
  const queue = () => { if (!raf && visible) raf = requestAnimationFrame(paint); };

  addEventListener("scroll", queue, { passive: true });
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !fine.matches) return;
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    queue();
  });
  hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; queue(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) queue(); }).observe(hero);
  }
  reduceMq.addEventListener("change", queue);
  queue();
})();
