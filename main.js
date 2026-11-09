/*
 * MD Junaid — portfolio. Built on the PRIOR GSAP scroll template by RelaxKartikey (Entospark Studios).
 * One Lenis instance + one GSAP ticker drive everything (smooth scroll, canvas scrub, cursor, 3D orb).
 */
(() => {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.add('fallback');
    const p = document.getElementById('preloader');
    if (p) p.remove();
    document.body.classList.remove('is-loading');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const HERO_FRAMES = 147;
  const VT_FRAMES = 168;
  const CRITICAL = 12;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const conn = navigator.connection;
  const saveData = !!(conn && (conn.saveData || /2g/.test(conn.effectiveType || '')));
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const tier = isMobile ? 'mobile' : 'desktop';
  const noVideo = isMobile || lowEnd || reduced || saveData;
  const clamp = gsap.utils.clamp;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  if (lowEnd) document.documentElement.classList.add('is-lite');
  if (noVideo) document.documentElement.classList.add('no-video');

  /* ---------- listener bookkeeping (cleaned up on pagehide) ---------- */
  const disposers = [];
  function on(target, evt, fn, opts) {
    target.addEventListener(evt, fn, opts);
    disposers.push(() => target.removeEventListener(evt, fn, opts));
  }

  /* ---------- Lenis: single instance, synced to GSAP ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    lenis.stop();
  }
  gsap.ticker.lagSmoothing(0);

  /* ---------- frame sequences (windowed loading + eviction) ---------- */
  function makeFrameSet(prefix, count, opts) {
    const ahead = opts.ahead, back = opts.back, keep = opts.keep;
    let frames = Array.from({ length: count }, () => new Image());
    const src = (i) => `${prefix}_${tier}/ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`;
    const ready = (img) => img.complete && img.naturalWidth > 0;
    const load = (i) => { const im = frames[i]; if (im && !im.getAttribute('src')) im.src = src(i); };

    function ensure(center) {
      const lo = Math.max(0, center - back), hi = Math.min(count - 1, center + ahead);
      for (let i = lo; i <= hi; i++) load(i);
      for (let i = 0; i < count; i++) {
        if ((i < center - keep || i > center + keep) && i >= CRITICAL && frames[i].getAttribute('src')) {
          frames[i] = new Image(); // drop decoded bitmap so memory stays bounded
        }
      }
    }
    function nearest(i) {
      if (ready(frames[i])) return frames[i];
      for (let d = 1; d < count; d++) {
        if (i - d >= 0 && ready(frames[i - d])) return frames[i - d];
        if (i + d < count && ready(frames[i + d])) return frames[i + d];
      }
      return null;
    }
    for (let i = 0; i < Math.min(CRITICAL, count); i++) load(i);
    return { frames, load, ensure, nearest, ready, count };
  }

  const hero = { set: null, canvas: $('#heroCanvas'), ctx: null, cur: 0, target: 0, drawn: -1, w: 0, h: 0, dirty: true };
  const vt = { set: null, canvas: $('#vtCanvas'), ctx: null, cur: 0, target: 0, drawn: -1, w: 0, h: 0, dirty: true, active: false };

  function sizeCanvas(o, force) {
    const w = window.innerWidth, h = window.innerHeight;
    // ignore mobile URL-bar height jitter
    if (!force && o.w === w && Math.abs(o.h - h) < 120) return;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    o.w = w; o.h = h;
    o.canvas.width = Math.round(w * dpr);
    o.canvas.height = Math.round(h * dpr);
    o.canvas.style.width = w + 'px';
    o.canvas.style.height = h + 'px';
    o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.dirty = true;
  }

  function paint(o) {
    const idx = Math.round(o.cur);
    if (!o.dirty && idx === o.drawn) return;
    const img = o.set.nearest(idx);
    if (!img) return;
    const s = Math.max(o.w / img.naturalWidth, o.h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    o.ctx.drawImage(img, (o.w - dw) / 2, (o.h - dh) / 2, dw, dh);
    o.drawn = idx;
    o.dirty = false;
  }

  /* ---------- text helpers ---------- */
  function splitHTML(el, mode) {
    const cls = mode === 'char' ? 'ch' : 'word';
    el.innerHTML = el.innerHTML.split(/(<[^>]+>)/).map((frag) => {
      if (frag.startsWith('<')) return frag;
      const parts = mode === 'char' ? Array.from(frag) : frag.split(/(\s+)/);
      return parts.map((p) => (p.trim() ? `<span class="${cls}">${p}</span>` : p)).join('');
    }).join('');
    return $$('.' + cls, el);
  }

  /* ---------- single ticker ---------- */
  const mouse = { x: innerWidth / 2, y: innerHeight * 0.45, cx: innerWidth / 2, cy: innerHeight / 2, gx: innerWidth / 2, gy: innerHeight * 0.45 };
  const cursor = $('#cursor');
  const glow = $('#heroGlow');
  let lastY = window.scrollY, skew = 0;
  const skewEls = reduced ? [] : $$('.big-heading, .case__title, .contact__heading');
  let orb = null;

  function tick(time) {
    if (lenis) lenis.raf(time * 1000);

    // canvas scrub with eased frame index
    hero.cur += (hero.target - hero.cur) * 0.2;
    if (Math.abs(hero.target - hero.cur) < 0.05) hero.cur = hero.target;
    paint(hero);
    if (vt.active) {
      vt.cur += (vt.target - vt.cur) * 0.2;
      if (Math.abs(vt.target - vt.cur) < 0.05) vt.cur = vt.target;
      paint(vt);
    }

    // scroll-velocity skew
    const y = window.scrollY;
    const v = clamp(-4, 4, (y - lastY) * -0.25);
    lastY = y;
    const next = skew + (v - skew) * 0.12;
    if (Math.abs(next - skew) > 0.005 || Math.abs(next) > 0.01) {
      skew = Math.abs(next) < 0.01 ? 0 : next;
      skewEls.forEach((el) => { el.style.transform = skew ? `skewY(${skew.toFixed(3)}deg)` : ''; });
    }

    if (fine && !reduced) {
      mouse.cx += (mouse.x - mouse.cx) * 0.22;
      mouse.cy += (mouse.y - mouse.cy) * 0.22;
      cursor.style.transform = `translate3d(${mouse.cx}px,${mouse.cy}px,0)`;
      mouse.gx += (mouse.x - mouse.gx) * 0.05;
      mouse.gy += (mouse.y - mouse.gy) * 0.05;
      glow.style.transform = `translate3d(${mouse.gx}px,${mouse.gy}px,0)`;
    }

    if (orb && orb.visible) orb.render(time, skew);
  }

  /* ---------- hero ---------- */
  function initHero() {
    hero.ctx = hero.canvas.getContext('2d');
    sizeCanvas(hero, true);
    hero.set.ensure(0);
    on(window, 'resize', () => sizeCanvas(hero));

    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom bottom',
      pin: '.hero__pin', pinSpacing: false,
      onUpdate: (self) => {
        hero.target = Math.round(self.progress * (HERO_FRAMES - 1));
        hero.set.ensure(hero.target);
      },
    });

    gsap.to('.hero__overlay', {
      opacity: 0.55, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '30% top', scrub: true },
    });
    gsap.to('.hero__content', {
      y: -140, opacity: 0, scale: 0.92, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '5% top', end: '20% top', scrub: true },
    });
    gsap.to('.hero__glow', {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '20% top', end: '45% top', scrub: true },
    });
    gsap.to('.hero__scroll-indicator', {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: '2% top', end: '8% top', scrub: true },
    });

    // pointer parallax on hero heading
    if (fine && !reduced) {
      const qx = gsap.quickTo('.hero__heading', 'x', { duration: 0.8, ease: 'power3.out' });
      const qy = gsap.quickTo('.hero__heading', 'y', { duration: 0.8, ease: 'power3.out' });
      on(window, 'pointermove', (e) => {
        qx((e.clientX / innerWidth - 0.5) * -24);
        qy((e.clientY / innerHeight - 0.5) * -16);
      }, { passive: true });
    }

    // hide fixed hero layers once covered, so the compositor has less to do
    ScrollTrigger.create({
      trigger: '.video-transition', start: 'top top',
      onEnter: () => document.body.classList.add('hero-done'),
      onLeaveBack: () => document.body.classList.remove('hero-done'),
    });
  }

  function heroIntro() {
    const chars = splitHTML($('.hero__line:nth-child(1)'), 'char').concat(splitHTML($('.hero__line:nth-child(2)'), 'char'));
    if (reduced) {
      gsap.set(['.hero__tag', '.hero__sub', '.btn', '.hero__scroll-indicator'], { opacity: 1 });
      return;
    }
    gsap.set(chars, { yPercent: 115, rotate: 6 });
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to('.hero__tag', { opacity: 1, duration: 0.8 }, 0.1)
      .to(chars, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.07 }, 0.15)
      .fromTo('.hero__sub', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0.9)
      .fromTo('.hero__ctas .btn', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 }, 1.1)
      .to('.hero__scroll-indicator', { opacity: 1, duration: 1 }, 1.6);
  }

  /* ---------- canvas transition (frames_2) ---------- */
  function initTransition() {
    const section = $('.video-transition');
    vt.ctx = vt.canvas.getContext('2d');
    vt.set = makeFrameSet('frames_2', VT_FRAMES, { ahead: isMobile ? 18 : 30, back: 6, keep: isMobile ? 30 : 50 });
    sizeCanvas(vt, true);
    on(window, 'resize', () => sizeCanvas(vt));

    ScrollTrigger.create({
      trigger: section, start: 'top bottom', end: 'bottom top',
      onToggle: (self) => { vt.active = self.isActive; if (self.isActive) vt.dirty = true; },
    });

    ScrollTrigger.create({
      trigger: section, start: 'top bottom+=1200', end: 'bottom top',
      onUpdate: (self) => {
        // map progress of the pinned range to frames
        const r = section.getBoundingClientRect();
        const total = section.offsetHeight - innerHeight;
        const p = clamp(0, 1, -r.top / total);
        vt.target = Math.round(p * (VT_FRAMES - 1));
        vt.set.ensure(vt.target);
      },
    });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.8, pin: '.video-transition__inner' },
    });
    tl.fromTo('.video-transition__frame',
      { clipPath: 'inset(30% 25% 30% 25% round 20px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'none' }, 0);
    if (!lowEnd) tl.fromTo('#vtCanvas', { scale: 1.3 }, { scale: 1, duration: 1, ease: 'none' }, 0);
    tl.to('.video-transition__overlay', { opacity: 0.15, duration: 0.6, ease: 'none' }, 0.3)
      .fromTo('.vt-word', { y: 40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, stagger: 0.08, ease: 'power3.out' }, 0.35)
      .fromTo('.vt-dot', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15, stagger: 0.08, ease: 'back.out(3)' }, 0.4)
      .to(['.vt-word', '.vt-dot'], { opacity: 0, y: -30, duration: 0.3, stagger: 0.03, ease: 'power2.in' }, 0.75)
      .to('.video-transition__frame', { clipPath: 'inset(5% 5% 5% 5% round 12px)', duration: 0.25, ease: 'none' }, 0.8)
      .to('.video-transition__overlay', { opacity: 0.8, duration: 0.2, ease: 'none' }, 0.8);
  }

  /* ---------- generic reveals ---------- */
  function revealHeadings() {
    $$('[data-split]').forEach((el) => {
      if (el.classList.contains('hero__line')) return;
      const words = splitHTML(el, 'word');
      if (reduced) return;
      gsap.from(words, {
        yPercent: 60, opacity: 0, rotateX: -40, transformOrigin: '0 100%',
        duration: 0.9, stagger: 0.05, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    $$('.section-label').forEach((el) => {
      if (reduced) return;
      gsap.from(el, { x: -24, opacity: 0, duration: 0.8, scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    $$('.reveal-up').forEach((el, i) => {
      if (reduced) return;
      gsap.to(el, {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: (i % 4) * 0.08,
        scrollTrigger: { trigger: el, start: 'top 90%' },
      });
    });
  }

  function initCounters() {
    $$('.count').forEach((el) => {
      const to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.dec || '0', 10);
      if (reduced) { el.textContent = to.toFixed(dec); return; }
      const o = { v: 0 };
      gsap.to(o, {
        v: to, duration: 1.8, ease: 'power2.out',
        onUpdate: () => { el.textContent = o.v.toFixed(dec); },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
  }

  /* ---------- about ---------- */
  function initAbout() {
    const v = $('.intro__video');
    if (v && !noVideo) {
      gsap.fromTo(v, { opacity: 0.15 }, {
        opacity: 0.4, ease: 'none',
        scrollTrigger: { trigger: '.intro', start: 'top 60%', end: 'bottom 40%', scrub: true },
      });
    }
  }

  /* ---------- skills ---------- */
  let activeGroup = 0;
  function initSkills() {
    const items = $$('.service-item');
    const numberEl = $('.services__number');
    const bg = $('.services__bg');

    ScrollTrigger.create({
      trigger: '.services', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => bg.classList.toggle('is-visible', self.isActive),
    });
    items.forEach((item, i) => {
      ScrollTrigger.create({
        trigger: item, start: 'top 65%', end: 'bottom 35%',
        onToggle: (self) => {
          item.classList.toggle('is-active', self.isActive);
          if (self.isActive) { activeGroup = i; numberEl.textContent = String(i + 1).padStart(2, '0'); }
        },
      });
      on(item, 'pointerenter', () => { activeGroup = i; });
    });
    if (reduced) items.forEach((i) => i.classList.add('is-active'));

    // lazy-load Three.js only when the skills section is near
    if (!isMobile && !lowEnd && !reduced) {
      ScrollTrigger.create({
        trigger: '.services', start: 'top bottom+=600', once: true,
        onEnter: loadThree,
      });
    }
  }

  function loadThree() {
    if (window.THREE) return buildOrb();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = buildOrb;
    s.onerror = () => { const o = $('#orb'); if (o) o.style.display = 'none'; };
    document.head.appendChild(s);
  }

  function buildOrb() {
    const canvas = $('#orbCanvas');
    if (!canvas || !window.THREE) return;
    const T = THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { $('#orb').style.display = 'none'; return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.z = 6.4;
    const group = new T.Group();
    scene.add(group);

    const ORANGE = 0xff5a1f, SOFT = 0xffb27a;
    const geos = [], mats = [];
    const track = (g, m) => { geos.push(g); mats.push(m); };

    const coreG = new T.IcosahedronGeometry(1.15, 1);
    const coreM = new T.MeshBasicMaterial({ color: ORANGE, wireframe: true, transparent: true, opacity: 0.55 });
    const core = new T.Mesh(coreG, coreM); group.add(core); track(coreG, coreM);
    const innerG = new T.IcosahedronGeometry(0.62, 0);
    const innerM = new T.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.2 });
    group.add(new T.Mesh(innerG, innerM)); track(innerG, innerM);

    const N = 650, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 2.1 + Math.random() * 0.7, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const ptsG = new T.BufferGeometry();
    ptsG.setAttribute('position', new T.BufferAttribute(pos, 3));
    const ptsM = new T.PointsMaterial({ color: SOFT, size: 0.028, transparent: true, opacity: 0.8, depthWrite: false });
    const pts = new T.Points(ptsG, ptsM); group.add(pts); track(ptsG, ptsM);

    const nodes = [];
    for (let i = 0; i < 5; i++) {
      const ringG = new T.TorusGeometry(1.85, 0.0035, 6, 120);
      const ringM = new T.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.35 });
      const ring = new T.Mesh(ringG, ringM);
      ring.rotation.set(i * 0.62, i * 0.9, i * 0.3);
      group.add(ring); track(ringG, ringM);
      const nG = new T.SphereGeometry(0.085, 12, 12);
      const nM = new T.MeshBasicMaterial({ color: ORANGE });
      const n = new T.Mesh(nG, nM);
      ring.add(n); track(nG, nM);
      nodes.push({ n, m: nM, a: (i / 5) * Math.PI * 2, s: 1 });
    }

    function resize() {
      const w = canvas.parentElement.clientWidth || 300;
      renderer.setSize(w, w, false);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    disposers.push(() => ro.disconnect());

    let rx = 0, ry = 0, last = 0;
    const white = new T.Color(0xffffff), orange = new T.Color(ORANGE);
    orb = {
      visible: false,
      render(time, vel) {
        const dt = Math.min(time - last, 0.05); last = time;
        group.rotation.y += dt * 0.25 + vel * 0.01;
        group.rotation.x += (((mouse.y / innerHeight) - 0.5) * 0.6 - group.rotation.x) * 0.04;
        core.rotation.y -= dt * 0.4;
        pts.rotation.y += dt * 0.05;
        nodes.forEach((o, i) => {
          o.a += dt * (0.5 + i * 0.12);
          o.n.position.set(Math.cos(o.a) * 1.85, Math.sin(o.a) * 1.85, 0);
          const on = i === activeGroup;
          o.s += ((on ? 2.2 : 1) - o.s) * 0.12;
          o.n.scale.setScalar(o.s);
          o.m.color.lerp(on ? white : orange, 0.15);
        });
        renderer.render(scene, camera);
      },
      dispose() { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); renderer.dispose(); },
    };
    disposers.push(() => orb && orb.dispose());
    ScrollTrigger.create({
      trigger: '#orb', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => { orb.visible = self.isActive; },
    });
    gsap.from('#orb', { opacity: 0, scale: 0.8, duration: 1.2, ease: 'power3.out' });
  }

  /* ---------- projects ---------- */
  function initProjects() {
    $$('.case').forEach((c) => {
      if (!reduced) {
        gsap.from($$('.case__meta > *:not(.case__title)', c), {
          y: 40, opacity: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out',
          scrollTrigger: { trigger: c, start: 'top 75%' },
        });
        if (!isMobile) gsap.fromTo($('.flow', c), { y: 50 }, {
          y: -50, ease: 'none',
          scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    });

    $$('[data-flow]').forEach((flow) => {
      const nodes = $$('.node', flow), pulse = $('.flow__pulse', flow), line = $('.flow__line', flow);
      if (reduced) { nodes.forEach((n) => n.classList.add('is-lit')); pulse.style.display = 'none'; return; }
      let lineH = 0;
      ScrollTrigger.create({
        trigger: flow, start: 'top 80%', end: 'bottom 45%',
        onRefresh: () => { lineH = line.offsetHeight; },
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(pulse, { y: p * lineH });
          const lit = Math.min(nodes.length, Math.floor(p * (nodes.length + 0.6)) + (p > 0 ? 1 : 0));
          nodes.forEach((n, i) => n.classList.toggle('is-lit', i < lit));
        },
      });

      // subtle 3D tilt toward the pointer
      if (fine) {
        gsap.set(flow, { transformPerspective: 900 });
        const rxQ = gsap.quickTo(flow, 'rotationX', { duration: 0.7, ease: 'power3.out' });
        const ryQ = gsap.quickTo(flow, 'rotationY', { duration: 0.7, ease: 'power3.out' });
        on(flow, 'pointermove', (e) => {
          const r = flow.getBoundingClientRect();
          ryQ(((e.clientX - r.left) / r.width - 0.5) * 8);
          rxQ(((e.clientY - r.top) / r.height - 0.5) * -8);
        });
        on(flow, 'pointerleave', () => { rxQ(0); ryQ(0); });
      }
    });
  }

  /* ---------- cinematic pinned break ---------- */
  function initCinematic() {
    const section = $('.cinematic');
    const countEl = $('.cinematic__count');
    const lines = $$('.cin-line');
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6, pin: '.cinematic__sticky',
        onUpdate: (self) => { countEl.textContent = String(Math.round(self.progress * 100)).padStart(2, '0'); },
      },
    });
    tl.fromTo('.cinematic__counter', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0)
      .fromTo('.cinematic__video-frame', { clipPath: 'inset(48% 40% 48% 40% round 8px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.6, ease: 'none' }, 0)
      .fromTo('.cinematic__video', { scale: 1.6 }, { scale: 1, duration: 0.6, ease: 'none' }, 0)
      .fromTo(lines, { y: 80, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.2, stagger: 0.06, ease: 'power3.out' }, 0.45)
      .to(lines, { y: -40, opacity: 0, duration: 0.15, stagger: 0.03, ease: 'power2.in' }, 0.8)
      .to('.cinematic__video-frame', { clipPath: 'inset(10% 10% 10% 10% round 16px)', duration: 0.2, ease: 'none' }, 0.85)
      .to('.cinematic__counter', { opacity: 0, duration: 0.1 }, 0.9);
  }

  /* ---------- experience + education ---------- */
  function initTimeline() {
    gsap.fromTo('#timelineFill', { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 60%', scrub: true },
    });
    if (reduced) { gsap.set('#timelineFill', { scaleY: 1 }); }
    else {
      gsap.from('.tl-item > *:not(.tl-dot)', {
        y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '.tl-item', start: 'top 75%' },
      });
      gsap.from('.tl-dot', { scale: 0, duration: 0.6, ease: 'back.out(3)', scrollTrigger: { trigger: '.tl-item', start: 'top 75%' } });
      gsap.from('.edu__text > *', {
        y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '.edu', start: 'top 75%' },
      });
    }
    const circ = 326.7, target = circ * (1 - 8.61 / 10);
    gsap.to('#ringFg', {
      strokeDashoffset: target, duration: reduced ? 0 : 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.edu', start: 'top 75%', once: true },
    });
  }

  /* ---------- nav, progress, cursor, magnetic, anchors ---------- */
  function initChrome() {
    const nav = $('#nav'), bar = $('#progress');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        bar.style.transform = `scaleX(${self.progress})`;
        const y = self.scroll();
        nav.classList.toggle('is-solid', y > 80);
        nav.classList.toggle('is-hidden', self.direction === 1 && y > 400);
        if (self.direction === -1) nav.classList.remove('is-hidden');
      },
    });
    $$('section[id]').forEach((sec) => {
      const link = $(`.nav__links a[href="#${sec.id}"]`);
      if (!link) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: (self) => link.classList.toggle('is-current', self.isActive),
      });
    });

    if (fine && !reduced) {
      cursor.classList.add('is-on');
      on(window, 'pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
      $$('a, button, [data-magnetic], .service-item, .chips span, .node').forEach((el) => {
        on(el, 'pointerenter', () => cursor.classList.add('is-hover'));
        on(el, 'pointerleave', () => cursor.classList.remove('is-hover'));
      });
      $$('[data-magnetic]').forEach((el) => {
        const qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,0.5)' });
        const qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,0.5)' });
        on(el, 'pointermove', (e) => {
          const r = el.getBoundingClientRect();
          qx((e.clientX - (r.left + r.width / 2)) * 0.3);
          qy((e.clientY - (r.top + r.height / 2)) * 0.3);
        });
        on(el, 'pointerleave', () => { qx(0); qy(0); });
      });
    }

    const toggle = $('.nav__toggle');
    if (toggle) {
      const setOpen = (o) => {
        nav.classList.toggle('is-open', o);
        toggle.setAttribute('aria-expanded', String(o));
        document.body.classList.toggle('menu-open', o);
        if (lenis) { if (o) lenis.stop(); else lenis.start(); }
      };
      on(toggle, 'click', () => setOpen(!nav.classList.contains('is-open')));
      $$('.nav__links a').forEach((a) => on(a, 'click', () => setOpen(false)));
      on(window, 'keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    }

    $$('a[href^="#"]').forEach((a) => {
      on(a, 'click', (e) => {
        const id = a.getAttribute('href');
        const target = id === '#' ? null : $(id);
        if (!target) return;
        e.preventDefault();
        const y = id === '#hero' ? 0 : target;
        if (lenis) lenis.scrollTo(y, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
        else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- videos: play only while near the viewport ---------- */
  function initVideos() {
    $$('video').forEach((v) => {
      if (noVideo) { v.pause(); return; }
      const sec = v.closest('section');
      ScrollTrigger.create({
        trigger: sec, start: 'top bottom+=300', end: 'bottom top-300',
        onToggle: (self) => {
          if (self.isActive) { v.preload = 'auto'; v.play().catch(() => sec.classList.add('video-failed')); }
          else v.pause();
        },
      });
    });
  }

  /* ---------- preloader ---------- */
  function preload(done) {
    const pre = $('#preloader'), bar = $('#preloaderBar'), pct = $('#preloaderPct');
    document.body.classList.add('is-loading');
    hero.set = makeFrameSet('frames_1', HERO_FRAMES, { ahead: isMobile ? 18 : 30, back: 6, keep: isMobile ? 30 : 50 });
    hero.ctx = hero.canvas.getContext('2d');
    sizeCanvas(hero, true);

    const items = hero.set.frames.slice(0, CRITICAL);
    let total = items.length + 1, loaded = 0, shown = 0, target = 0, finished = false;
    const mark = () => { loaded++; target = Math.min(100, Math.round((loaded / total) * 100)); };
    items.forEach((img) => {
      if (img.complete && img.naturalWidth) mark();
      else { img.addEventListener('load', mark, { once: true }); img.addEventListener('error', mark, { once: true }); }
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(mark); else mark();
    const cap = setTimeout(() => { loaded = total; target = 100; }, 6000);

    function step() {
      shown += (target - shown) * 0.12;
      const r = Math.round(shown);
      pct.textContent = r;
      bar.style.width = r + '%';
      if (r >= 100 && target >= 100 && !finished) {
        finished = true;
        clearTimeout(cap);
        paint(hero);
        setTimeout(reveal, 250);
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    function reveal() {
      document.body.classList.remove('is-loading');
      gsap.timeline({ onComplete: () => { pre.remove(); } })
        .to('.preloader__counter, .preloader__bar-wrap, .preloader__logo', { y: -20, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.in' }, 0)
        .to(pre, { yPercent: -100, duration: 0.9, ease: 'power3.inOut' }, 0.35);
      done();
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    preload(() => {
      initHero();
      initTransition();
      initAbout();
      initSkills();
      initProjects();
      initCinematic();
      initTimeline();
      revealHeadings();
      initCounters();
      initChrome();
      initVideos();
      heroIntro();
      gsap.ticker.add(tick);
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
    });
  }

  on(window, 'pageshow', (e) => { if (e.persisted) location.reload(); });
  on(window, 'load', () => { if (ScrollTrigger.getAll().length) ScrollTrigger.refresh(); });

  on(window, 'pagehide', () => {
    gsap.ticker.remove(tick);
    ScrollTrigger.getAll().forEach((t) => t.kill());
    if (lenis) lenis.destroy();
    disposers.splice(0).forEach((d) => d());
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
