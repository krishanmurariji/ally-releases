/* Ally website: lens reveal hero, 3D logo, wipe-in plates, liquid-glass download button, live release info. */
(() => {
  const html = document.documentElement; html.classList.add('js')
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)]
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

  /* ---- scroll engine: one rAF loop turns scroll position into CSS custom properties; the 3D itself is plain CSS ---- */
  const root = document.documentElement
  const deepOk = () => !calm && matchMedia('(min-width: 900px) and (min-height: 560px)').matches
  const syncDeep = () => root.classList.toggle('deep', deepOk())
  syncDeep(); addEventListener('resize', syncDeep)
  window.__ally = { a: 0 }
  const webgl0 = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch (e) { return false } }
  const scenes = $$('[data-scene]'), chaps = $$('.chap'), rows = $$('[data-r]')
  const prog = el => { const r = el.getBoundingClientRect(), h = r.height - innerHeight; return h > 0 ? clamp(-r.top / h, 0, 1) : clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1) }
  const progress = $('.progress') || (() => { const el = document.createElement('div'); el.className = 'progress'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i><b></b></i><i><b></b></i><i><b></b></i><i><b></b></i>'; const st = $('.cstage'); st && st.appendChild(el); return el })()
  let lastY = scrollY, vel = 0, mx = 0, my = 0, tmx = 0, tmy = 0
  const frame = () => {
    const y = scrollY; vel += ((y - lastY) * 0.18 - vel) * 0.2; lastY = y
    root.style.setProperty('--sy', y.toFixed(0)); root.style.setProperty('--vel', clamp(vel, -9, 9).toFixed(2))
    mx += (tmx - mx) * 0.07; my += (tmy - my) * 0.07; root.style.setProperty('--mx', mx.toFixed(3)); root.style.setProperty('--my', my.toFixed(3))
    for (const el of scenes) { const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) continue; el.style.setProperty('--p', prog(el).toFixed(4)) }
    if (root.classList.contains('deep')) {
      const sec = $('#chapters'), p = prog(sec), raw = clamp(p * chaps.length - 0.5, 0, chaps.length - 1), fl = Math.floor(raw), t = clamp((raw - fl - 0.3) / 0.4, 0, 1), a = fl + t * t * (3 - 2 * t)   // 0 = first chapter centred; each chapter rests, then glides to the next
      window.__ally.a = a
      chaps.forEach((c, i) => { const d = i - a; c.style.setProperty('--d', d.toFixed(3)); c.style.setProperty('--ad', Math.abs(d).toFixed(3)); c.classList.toggle('on', Math.abs(d) < 0.5); c.style.zIndex = String(10 - Math.round(Math.abs(d) * 2)) })
      ;[...progress.children].forEach((b, i) => b.style.setProperty('--f', clamp(a - i + 1, 0, 1).toFixed(2)))
    }
    for (const r of rows) { const b = r.getBoundingClientRect(); r.style.setProperty('--r', clamp((innerHeight * 0.95 - b.top) / (innerHeight * 0.45), 0, 1).toFixed(3)) }
    requestAnimationFrame(frame)
  }
  // the real 3D scene (WebGL) replaces the CSS 3D stage on large screens; if anything goes wrong the CSS version stays
  if (deepOk() && webgl0()) import('./scene.js').then(m => m.start()).catch(err => { console.warn('3D scene unavailable, using the CSS version.', err); root.classList.toggle('gl', false); const c = document.getElementById('gl'); if (c) c.parentNode.removeChild(c) })
  if (!calm) { addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5 }, { passive: true }); requestAnimationFrame(frame) }
  else { scenes.forEach(el => el.style.setProperty('--p', 0.7)) }

  /* ---- 3D logo (36 slices of a crisp mask) ---- */
  const stack = $('#stack')
  if (stack) {
    const N = 30, GAP = 1.6
    for (let i = 0; i < N; i++) {
      const img = new Image(); img.src = 'assets/ally-mark-big.png'; img.alt = ''; img.className = 'layer'; img.decoding = 'async'
      const t = i / (N - 1)
      img.style.transform = `translateZ(${((i - N / 2) * GAP).toFixed(2)}px)`
      if (i < N - 1) img.style.filter = `brightness(${(0.45 + 0.55 * t).toFixed(2)})`
      stack.appendChild(img)
    }
    let px = 0, py = 0, rx = -6, ry = 14
    addEventListener('pointermove', e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5 }, { passive: true })
    const loop = t => {
      const a = calm ? 0 : Math.sin(t / 1800) * 14, gp = parseFloat(($('#get') || { style: { getPropertyValue: () => 0 } }).style.getPropertyValue('--p')) || 0
      ry += (14 + px * 50 + a + gp * 220 - ry) * 0.08; rx += (-6 - py * 28 - rx) * 0.08
      stack.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.18 })
  $$('.wipe, .rv').forEach(el => io.observe(el))

  /* ---- liquid glass on the download button (WebGL shader); plain CSS button stays as fallback ---- */
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } })()
  let glassInst = null
  addEventListener('ally-theme', () => setTimeout(() => { try { glassInst && glassInst.markChanged && glassInst.markChanged() } catch (_) {} }, 120))     // the glass button re-reads its backdrop
  const dl = $('#dlroot')
  const glass = async el => {
    if (!el || !webgl) return
    el.classList.add('lg-on')
    try {
      const { LiquidGlass } = await import('./assets/vendor/liquidglass.js')
      await (document.fonts && document.fonts.ready)
      await Promise.all([...el.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })))
      const els = [...el.querySelectorAll(':scope > .lg')].filter(e => e.getClientRects().length)
      if (els.length) { glassInst = await LiquidGlass.init({ root: el, glassElements: els }) } else el.classList.remove('lg-on')
    } catch (err) { el.classList.remove('lg-on'); console.warn('Liquid glass unavailable, using CSS glass.', err) }
  }
  if (dl) new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); glass(dl) } }, { rootMargin: '300px 0px' }).observe(dl)

  /* ---- latest release info (public repo; quietly skipped if the network blocks it) ---- */
  const fmt = n => n >= 1048576 ? (n / 1048576).toFixed(n >= 1e8 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
  fetch('https://api.github.com/repos/krishanmurariji/ally-releases/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject()).then(rel => {
      const web = (rel.assets || []).find(a => /^Ally-Setup\.exe$/i.test(a.name)), full = (rel.assets || []).find(a => /Full-Setup/i.test(a.name))
      if (rel.tag_name) $('#rel-ver').textContent = rel.tag_name.replace(/^v/, '') + ' · ' + new Date(rel.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      if (web) $('#rel-size').textContent = fmt(web.size)
      if (full) { const l = $('#dl-full'); l.href = full.browser_download_url; l.textContent = `Get the all-in-one installer (${fmt(full.size)})` }
    }).catch(() => {})
})()
