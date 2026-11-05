/* Ally website: the WebGL scene. One fixed canvas behind the page; scrolling flies the camera through it.
   The page text stays in the HTML (search engines and screen readers read that); this file only draws the world behind it.
   app.js loads it only on large screens with WebGL and without "reduce motion"; otherwise the CSS 3D page is used. */
import * as THREE from './assets/vendor/three.module.min.js'

const root = document.documentElement
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
const lerp = (a, b, t) => a + (b - a) * t
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const light = () => root.getAttribute('data-theme') === 'light'
const PAL = { dark: { bg: 0x080b10, grid: 0x2fe0cc, dust: [0x2fe0cc, 0xffffff, 0xf08a5d] }, light: { bg: 0xeef3f1, grid: 0x0d9993, dust: [0x0d9993, 0x2a3a42, 0xd9693a] } }

export async function start() {
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; canvas.setAttribute('aria-hidden', 'true')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace   // colours are used exactly as authored
  const dpr = () => Math.min(devicePixelRatio || 1, 1.75)
  renderer.setPixelRatio(dpr())
  const scene = new THREE.Scene(); const bg = new THREE.Color(PAL.dark.bg); scene.background = bg; scene.fog = new THREE.Fog(bg, 24, 95)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220)
  const bgU = { value: bg }   // shared with the panel shader so panels fade into the same colour as the fog

  /* ---------- textures ---------- */
  const loader = new THREE.TextureLoader(), maxAni = renderer.capabilities.getMaxAnisotropy()
  const tex = url => new Promise(res => loader.load(url, t => { t.anisotropy = maxAni; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; res(t) }, undefined, () => res(null)))

  const callTexture = () => {   // the video call everyone sees, drawn once
    const W = 1600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')
    g.fillStyle = '#0a0e14'; g.fillRect(0, 0, W, H)
    g.font = '500 22px "JetBrains Mono",monospace'; g.fillStyle = '#7f8c96'; g.textBaseline = 'middle'
    g.fillStyle = '#ff4d4d'; g.beginPath(); g.arc(58, 52, 8, 0, 7); g.fill(); g.fillStyle = '#7f8c96'; g.fillText('REC 00:41:07', 78, 52)
    g.textAlign = 'center'; g.fillText('PRODUCT SYNC · 12 PARTICIPANTS', W / 2, 52); g.textAlign = 'right'; g.fillStyle = '#3fdc9b'; g.fillText('SHARING YOUR SCREEN', W - 48, 52)
    const tiles = [['MR', '#126f78', '#1d4f7c'], ['JT', '#a85a44', '#8a3f5c'], ['PN', '#383f86', '#5a3d8a'], ['You', '#242c36', '#1a2028'], ['AK', '#14786a', '#1d5a54'], ['SL', '#8a5530', '#6a3a2a']]
    const pad = 40, top = 100, gap = 22, tw = (W - pad * 2 - gap * 2) / 3, th = (H - top - pad - gap) / 2
    tiles.forEach(([n, a, b], i) => {
      const x = pad + (i % 3) * (tw + gap), y = top + Math.floor(i / 3) * (th + gap), gr = g.createLinearGradient(x, y, x + tw, y + th); gr.addColorStop(0, a); gr.addColorStop(1, b)
      g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, tw, th, 26); g.fill()
      g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.arc(x + tw / 2, y + th / 2, 62, 0, 7); g.fill()
      g.fillStyle = '#fff'; g.font = '600 46px "Plus Jakarta Sans",system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(n, x + tw / 2, y + th / 2 + 2)
    })
    const t = new THREE.CanvasTexture(c); t.anisotropy = maxAni; return t
  }

  const [tAnswer, tNotes, tMaterials, tPresetsD, tPresetsL] = await Promise.all(['overlay-answer', 'overlay-notes', 'center-materials', 'center-presets', 'center-presets-light'].map(n => tex(`assets/shots/${n}.webp`)))
  if (!tAnswer || !tMaterials) throw new Error('shots missing')

  /* ---------- panels: rounded, glowing, fading into the fog ---------- */
  const panelMat = (map, glow) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: map }, uOpacity: { value: 1 }, uAspect: { value: 1 }, uGlow: { value: new THREE.Color(glow) }, uBg: bgU, uRim: { value: 0.5 }, uDim: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `
      uniform sampler2D map; uniform float uOpacity,uAspect,uRim,uDim; uniform vec3 uGlow,uBg; varying vec2 vUv; varying vec3 vW;
      float sdBox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
      void main(){
        vec2 p=(vUv-.5)*vec2(uAspect,1.); float d=sdBox(p, vec2(uAspect,1.)*.5, .045);
        float a=1.-smoothstep(-.004,.004,d); if(a<.003) discard;
        vec3 c=texture2D(map,vUv).rgb; c=mix(c,uBg,uDim);
        float rim=smoothstep(-.012,0.,d)*(1.-smoothstep(0.,.006,d)); c=mix(c,uGlow,rim*uRim);
        float dist=distance(vW,cameraPosition); float f=smoothstep(26.,95.,dist); c=mix(c,uBg,f*.9);
        gl_FragColor=vec4(c,a*uOpacity*(1.-f*.6)); }`
  })
  const glowMat = color => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.35 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity,uAspect; varying vec2 vUv; void main(){ vec2 p=(vUv-.5)*2.; float d=length(max(abs(p)-vec2(.55,.55),0.)); float a=exp(-d*d*7.)*uOpacity; gl_FragColor=vec4(uColor*a,a); }'
  })
  const panels = []
  const addPanel = (map, w, h, pos, o = {}) => {
    const g = new THREE.Group(); g.position.copy(pos)
    const m = panelMat(map, o.glow ?? 0x2fe0cc); m.uniforms.uAspect.value = w / h
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); g.add(mesh)
    const gm = glowMat(o.glow ?? 0x2fe0cc); gm.uniforms.uOpacity.value = o.glowAmt ?? 0.22
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, h * 1.5), gm); halo.position.z = -0.05; g.add(halo)
    scene.add(g); const p = { g, mesh, m, gm, base: pos.clone(), w, h, seed: Math.random() * 6.28, fade: o.fade !== false }; panels.push(p); return p
  }

  const call = addPanel(callTexture(), 13, 8.125, V(0, 0, 0), { glow: 0x1d4f7c, glowAmt: 0.12 })
  const ally = addPanel(tAnswer, 5.6, 5.6, V(5.4, 0.1, 3.6), { glowAmt: 0.4 })
  const P = [V(3.2, 0, -14), V(0, 0.6, -27), V(3.2, -0.4, -40), V(0, 0.4, -53)]
  const chapPanels = [
    addPanel(tAnswer, 5.4, 5.4, P[0]), addPanel(tMaterials, 9, 5.95, P[1]), addPanel(tNotes, 5.4, 5.4, P[2]),
    addPanel(tPresetsD || tMaterials, 9, 5.95, P[3])
  ]
  addEventListener('ally-theme', () => { if (tPresetsL) chapPanels[3].m.uniforms.map.value = light() ? tPresetsL : tPresetsD })

  /* ---------- the world: dust, floor, rings ---------- */
  const N = 2200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N)
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { uT: { value: 0 }, uPx: { value: dpr() }, uBg: bgU },
    vertexShader: 'attribute float aS; attribute float aP; attribute vec3 aC; varying vec3 vC; varying float vA; uniform float uT,uPx; void main(){ vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); float tw=.55+.45*sin(uT*1.3+aP); vA=tw*smoothstep(110.,20.,-mv.z)*smoothstep(0.,6.,-mv.z); gl_PointSize=aS*uPx*(150./-mv.z); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.05,d)*vA; if(a<.01) discard; gl_FragColor=vec4(vC,a); }'
  })
  const dust = new THREE.Points(new THREE.BufferGeometry(), dustMat); dust.frustumCulled = false
  const paintDust = () => {
    const cols = PAL[light() ? 'light' : 'dark'].dust.map(h => new THREE.Color(h))
    for (let i = 0; i < N; i++) { const c = cols[i % 3]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b }
    dust.geometry.attributes.aC && (dust.geometry.attributes.aC.needsUpdate = true)
  }
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 60; pos[i * 3 + 1] = (Math.random() - 0.5) * 30; pos[i * 3 + 2] = 24 - Math.random() * 140; size[i] = 0.5 + Math.random() * 1.6; ph[i] = Math.random() * 6.28 }
  dust.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dust.geometry.setAttribute('aC', new THREE.BufferAttribute(col, 3))
  dust.geometry.setAttribute('aS', new THREE.BufferAttribute(size, 1)); dust.geometry.setAttribute('aP', new THREE.BufferAttribute(ph, 1)); paintDust(); scene.add(dust)

  const floorMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uC: { value: new THREE.Color(PAL.dark.grid) }, uA: { value: 0.3 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform vec3 uC; uniform float uA; varying vec3 vW; void main(){ vec2 g=abs(fract(vW.xz/3.-.5)-.5)/fwidth(vW.xz/3.); float l=1.-min(min(g.x,g.y),1.); float d=distance(vW.xz,cameraPosition.xz); float f=1.-smoothstep(10.,70.,d); gl_FragColor=vec4(uC,l*f*uA); }'
  })
  floorMat.extensions = { derivatives: true }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -6.4; scene.add(floor)

  const rings = []
  const ringCols = [0x2fe0cc, 0xf08a5d, 0x3b64c4]
  for (let i = 0; i < 9; i++) {
    const r = 7.5 - i * 0.42, m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06 + (i % 3) * 0.02, 12, 200), new THREE.MeshBasicMaterial({ color: ringCols[i % 3], transparent: true, opacity: 0.85, fog: true }))
    m.position.set(0, 0, -72 - i * 6.5); m.userData = { i }; scene.add(m); rings.push(m)
  }

  /* ---------- camera path ---------- */
  const wide = () => innerWidth / innerHeight
  const H0 = () => ({ p: V(-1, 0.9, 18), l: V(-4.4, 0.2, 0) })
  const H1 = () => ({ p: V(2.2, 0.3, 11.5), l: V(4.9, 0.1, 3.6) })
  const chapStop = i => {   // the panel fills the right half of the screen; the text card owns the left half
    const pl = chapPanels[i], asp = Math.min(wide(), 2), dist = Math.max(8, pl.w / (0.381 * asp)), sx = 0.25 * 0.828 * dist * asp
    return { p: V(pl.base.x - sx, pl.base.y + 0.1, pl.base.z + dist), l: V(pl.base.x - sx + 0.4, pl.base.y, pl.base.z) }
  }
  const PV0 = { p: V(0, 0, -62), l: V(0, 0, -90) }, PV1 = { p: V(0, 0.2, -122), l: V(0, 0, -150) }
  const mix = (a, b, t) => ({ p: a.p.clone().lerp(b.p, t), l: a.l.clone().lerp(b.l, t) })
  const num = (el, name) => el ? parseFloat(el.style.getPropertyValue(name)) || 0 : 0
  const heroEl = document.getElementById('hero'), chapEl = document.getElementById('chapters'), privEl = document.getElementById('private'), faqEl = document.getElementById('faq')
  let roll = 0
  const target = () => {
    const vh = innerHeight, hp = num(heroEl, '--p'), cr = chapEl.getBoundingClientRect(), pr = privEl.getBoundingClientRect()
    const a = (window.__ally && window.__ally.a) || 0
    const hero = mix(H0(), H1(), sstep(hp))
    // between the hero and the chapters, and once the chapters are done, the camera flies on
    const toChap = sstep(1 - cr.top / vh)
    let s = mix(hero, chapStop(0), toChap)
    if (cr.top <= 0) {
      const i = clamp(Math.floor(a), 0, 2), f = clamp(a - i, 0, 1); s = mix(chapStop(i), chapStop(i + 1), sstep(f)); roll = Math.sin(Math.PI * f) * 0.05 * (i % 2 ? -1 : 1)
    } else roll *= 0.9
    const ep = clamp((vh - pr.top) / (vh + pr.height), 0, 1)   // progress through the privacy section
    if (pr.top < vh) {
      const enter = sstep(ep / 0.22); const fly = mix(PV0, PV1, sstep((ep - 0.18) / 0.82)); s = mix(chapStop(3), fly, enter); if (ep < 0.22) { /* chapters end first */ }
    }
    return s
  }

  /* ---------- loop ---------- */
  const cur = { p: V(-1, 0.9, 18), l: V(-4.4, 0.2, 0) }; let mx = 0, my = 0, tmx = 0, tmy = 0, t0 = performance.now(), visible = true, last = t0
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5 }, { passive: true })
  document.addEventListener('visibilitychange', () => { visible = !document.hidden })
  const size2 = () => { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(dpr()); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dustMat.uniforms.uPx.value = dpr() }
  addEventListener('resize', size2); size2()
  document.body.prepend(canvas)

  const applyTheme = () => {
    const k = PAL[light() ? 'light' : 'dark']; bg.setHex(k.bg); floorMat.uniforms.uC.value.setHex(k.grid); floorMat.uniforms.uA.value = light() ? 0.5 : 0.3; paintDust()
    root.classList.toggle('gl-light', light())
  }
  addEventListener('ally-theme', applyTheme); applyTheme()

  const proximity = (p, cam) => clamp((cam.z - p.g.position.z - 2.2) / 3, 0, 1)   // panels the camera is about to pass through fade out
  const frame = now => {
    requestAnimationFrame(frame)
    if (!visible) return
    const dt = Math.min(0.1, (now - last) / 1000); last = now; const T = (now - t0) / 1000
    const fq = faqEl.getBoundingClientRect().top, show = fq > -50
    const fade = 1 - sstep(1 - fq / (innerHeight * 0.9)); canvas.style.opacity = Math.max(0, Math.min(1, fade)).toFixed(3)
    if (!show || fade <= 0.001) { canvas.style.visibility = 'hidden'; return }
    canvas.style.visibility = 'visible'
    const tg = target(), k = 1 - Math.exp(-dt * 5.5)
    cur.p.lerp(tg.p, k); cur.l.lerp(tg.l, k); mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06
    camera.position.set(cur.p.x + mx * 1.3, cur.p.y - my * 0.8, cur.p.z); camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(cur.l.x + mx * 0.6, cur.l.y - my * 0.4, cur.l.z)
    dustMat.uniforms.uT.value = T
    const hp = num(heroEl, '--p')
    for (const p of panels) {
      p.g.position.y = p.base.y + Math.sin(T * 0.7 + p.seed) * 0.18; p.g.rotation.y = Math.sin(T * 0.4 + p.seed) * 0.04; p.g.rotation.x = Math.cos(T * 0.5 + p.seed) * 0.02
      p.m.uniforms.uOpacity.value = proximity(p, camera.position)
    }
    // the call dims as the private layer pulls out of it; the Ally window appears with the scroll
    call.m.uniforms.uDim.value = sstep(hp) * 0.55
    ally.m.uniforms.uOpacity.value *= sstep((hp - 0.06) / 0.3); ally.gm.uniforms.uOpacity.value = 0.4 * sstep((hp - 0.06) / 0.3)
    ally.g.position.z = lerp(2.2, 3.8, sstep(hp)); ally.g.position.x = 5.4
    rings.forEach(r => { const i = r.userData.i; r.rotation.z = T * (0.12 + i * 0.03) * (i % 2 ? -1 : 1); r.rotation.x = Math.sin(T * 0.3 + i) * 0.12; })
    renderer.render(scene, camera)
  }
  requestAnimationFrame(frame)
  root.classList.add('gl')
  return { renderer, scene, camera }
}
