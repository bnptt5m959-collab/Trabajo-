// 09 · Viaje en miniatura — «El tren de la nieve»
// Un valle nevado de juguete al caer la tarde: la locomotora sale de un túnel con el faro encendido
// echando vapor, recorre un bosque denso de pinos con las ventanas cálidas encendidas mientras nieva,
// la cámara sube a vista de maqueta (valle, río helado, puente y pueblo con chimeneas) y termina a ras
// del hielo viendo cómo el tren cruza el puente, reflejado en el río, con el pueblo iluminado detrás.
export const ajustes = {
  duracion: 11.5, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.08,
    bloom: { fuerza: 0.45, radio: 0.5, umbral: 1.8 },
    ao: { fuerza: 1, radio: 0.3 },
    grano: 0.04, vineta: 0.4, aberracion: 1.0,
    grado: { contraste: 1.06, saturacion: 1.08, temperatura: -0.1, sombras: '#2b3f8f', luces: '#ffb27a', mezcla: 0.12 },
  },
};

export function crear(THREE, ctx) {
  const { escena, camara } = ctx;
  const V = ctx.vertical;
  // ---------- Paleta: nieve azulada · cielo de crepúsculo (azul a melocotón) · rojo del tren · ámbar de ventanas ----------
  const NIEVE = new THREE.Color('#e9f0fb'), NIEVE_SOMBRA = new THREE.Color('#b8c6e6'), ROCA = new THREE.Color('#5d6478');
  const ROJO = '#d42f3a', AZUL = '#2f5fbf', AMBAR = '#ffb25a', CALIDO = '#ffcf8f';
  const Y = new THREE.Vector3(0, 1, 0);

  ctx.fondo(['#08142f', '#1f3266', '#7a6f9e', '#e7a585']);
  ctx.niebla('#53618f', 20, 52);
  ctx.entornoEstudio({
    fondo: '#26345f', suelo: '#0d1020', intensidad: 0.6,
    paneles: [{ pos: [-8, 1.5, 6], tam: [12, 3], color: '#ffb27a', fuerza: 2.5 }, { pos: [0, 9, 0], tam: [10, 10], color: '#7f95d6', fuerza: 1.2 }, { pos: [8, 2, -4], tam: [2, 6], color: '#9fb4ff', fuerza: 2 }],
  });
  const hemi = new THREE.HemisphereLight('#7088cf', '#2a2440', 0.75); escena.add(hemi);
  const sol = new THREE.DirectionalLight('#ffb07a', 1.9);
  sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
  Object.assign(sol.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 80 });
  sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.04; sol.shadow.radius = 3;
  escena.add(sol); escena.add(sol.target);
  const DIR_SOL = new THREE.Vector3(-0.78, 0.32, 0.55).normalize();
  const luna = new THREE.DirectionalLight('#8fa6ff', 0.55); luna.position.set(6, 14, -8); escena.add(luna);

  // ---------- Ruido determinista ----------
  const rn = ctx.azar(77);
  const Pm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rn() * (i + 1)); [Pm[i], Pm[j]] = [Pm[j], Pm[i]]; }
  const Vr = Array.from({ length: 256 }, () => rn());
  const hash = (i, j) => Vr[(Pm[i & 255] + j) & 255];
  const suav = x => x * x * (3 - 2 * x);
  function ruido(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = suav(x - xi), zf = suav(z - zi); const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1); return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf; }
  const cresta = (x, z) => { let s = 0, a = 0.55, f = 1; for (let o = 0; o < 4; o++) { s += a * (1 - Math.abs(2 * ruido(x * f, z * f) - 1)); a *= 0.5; f *= 2.1; } return s; };
  const paso = (a, b, x) => { const k = ctx.limitar((x - a) / (b - a)); return k * k * (3 - 2 * k); };

  // ---------- Vía ----------
  const VIA_Y = 0.9;
  const curvaVia = new THREE.CatmullRomCurve3([[-24, 0, 8.5], [-17, 0, 6.5], [-11, 0, 3.0], [-6, 0, 1.6], [-1, 0, 1.2], [3.5, 0, 0.4], [8, 0, -1.8], [12, 0, -5.0], [16, 0, -9.0]].map(p => new THREE.Vector3(p[0], VIA_Y, p[2])), false, 'centripetal');
  const NR = 420, LARGO = curvaVia.getLength(), muestras = curvaVia.getSpacedPoints(NR);
  function cercaVia(x, z) { let m = 1e9; for (let i = 0; i <= NR; i += 3) { const p = muestras[i]; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); }
  const rioX = z => -1.2 + 0.9 * Math.sin(z * 0.33);
  function altura(x, z) {
    const d = cercaVia(x, z);
    let h = VIA_Y - 0.05 + cresta(x * 0.085 + 2, z * 0.085 + 5) * 6.2 * paso(2.0, 11, d) + 0.18 * Math.max(0, d - 3);
    const dr = Math.abs(x - rioX(z)), zanja = (1 - paso(1.1, 2.7, dr)) * (1 - paso(5, 9, d));
    return ctx.mezcla(h, -0.55, zanja);
  }

  // ---------- Terreno de facetas nevado ----------
  let geo = new THREE.PlaneGeometry(76, 56, 130, 96);
  geo.rotateX(-Math.PI / 2); geo.translate(-3, 0, -2);
  geo = geo.toNonIndexed();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, altura(pos.getX(i), pos.getZ(i)));
  const colores = new Float32Array(pos.count * 3), tmp = new THREE.Color();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    va.fromBufferAttribute(pos, i); vb.fromBufferAttribute(pos, i + 1); vc.fromBufferAttribute(pos, i + 2);
    nrm.subVectors(vb, va).cross(vc.clone().sub(va)).normalize();
    const pend = 1 - Math.abs(nrm.y), cy = (va.y + vb.y + vc.y) / 3, cx = (va.x + vb.x + vc.x) / 3, cz = (va.z + vb.z + vc.z) / 3;
    if (pend > 0.5 || (cy < 0.3 && cy > -0.4)) tmp.copy(ROCA).offsetHSL(0, 0, (ruido(cx, cz) - 0.5) * 0.08);
    else tmp.copy(NIEVE).lerp(NIEVE_SOMBRA, ctx.limitar(pend * 1.5 + (ruido(cx * 1.3, cz * 1.3) - 0.5) * 0.35));
    for (let k = 0; k < 3; k++) { colores[(i + k) * 3] = tmp.r; colores[(i + k) * 3 + 1] = tmp.g; colores[(i + k) * 3 + 2] = tmp.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geo.computeVertexNormals();
  const terreno = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0 }));
  terreno.receiveShadow = true; terreno.castShadow = true;
  escena.add(terreno);
  // río helado que refleja (espejo debajo + capa de hielo translúcida con grietas)
  const texHielo = ctx.textura2d(512, 512, (g, w) => {
    g.fillStyle = '#9ec3df'; g.fillRect(0, 0, w, w);
    const r = ctx.azar(8); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { let x = r() * w, y = r() * w; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
  });
  texHielo.wrapS = texHielo.wrapT = THREE.RepeatWrapping; texHielo.repeat.set(10, 10);
  ctx.sueloEspejo({ material: new THREE.MeshStandardMaterial({ map: texHielo, color: '#c8dcf0', roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.55 }), y: -0.4, tam: 80 });

  // ---------- Balasto, traviesas y raíles ----------
  function cinta(ancho, alto, mat, desplaza = 0) {
    const v = [], ix = [];
    for (let i = 0; i <= NR; i++) {
      const p = muestras[i], tg = curvaVia.getTangentAt(i / NR), lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
      [-1, 1].forEach(s => { const q = p.clone().addScaledVector(lado, desplaza + s * ancho / 2); v.push(q.x, p.y + alto, q.z); });
      if (i < NR) { const a = i * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(ix); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; escena.add(m); return m;
  }
  cinta(1.0, 0.0, new THREE.MeshStandardMaterial({ color: '#6f6a72', roughness: 0.95, side: THREE.DoubleSide }));
  const mRail = ctx.mat.metal('#c3c9d4', { roughness: 0.25 });
  [-0.2, 0.2].forEach(dz => { const r = cinta(0.045, 0.1, mRail, dz); r.material.side = THREE.DoubleSide; });
  const nTrav = Math.floor(LARGO / 0.3);
  const traviesas = ctx.instancias(new ctx.RoundedBoxGeometry(0.14, 0.05, 0.62, 2, 0.012), ctx.mat.mate('#5e3e2a', { roughness: 0.9 }), nTrav, (i, o) => { const u = i / nTrav, p = curvaVia.getPointAt(u), tg = curvaVia.getTangentAt(u); o.pos = [p.x, p.y + 0.04, p.z]; o.rot = [0, Math.atan2(-tg.z, tg.x), 0]; });
  escena.add(traviesas);

  // ---------- Túnel al principio (colina nevada con boca de piedra) ----------
  const S_BOCA = 3.4;
  const pBoca = curvaVia.getPointAt(S_BOCA / LARGO), tBoca = curvaVia.getTangentAt(S_BOCA / LARGO);
  const yawBoca = Math.atan2(-tBoca.z, tBoca.x);
  const colina = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ color: '#e3ebf8', roughness: 0.85, flatShading: true }));
  { const cp = colina.geometry.attributes.position; for (let i = 0; i < cp.count; i++) { const k = 1 + (ruido(cp.getX(i) * 3 + 9, cp.getZ(i) * 3) - 0.5) * 0.35; cp.setXYZ(i, cp.getX(i) * k, cp.getY(i) * k, cp.getZ(i) * k); } colina.geometry.computeVertexNormals(); }
  colina.scale.set(4.1, 3.3, 4.4); colina.position.copy(pBoca).addScaledVector(tBoca, -4.0).setY(VIA_Y - 0.9); colina.rotation.y = yawBoca;
  colina.castShadow = colina.receiveShadow = true; escena.add(colina);
  const tunel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#05060a', side: THREE.BackSide }));
  tunel.rotation.set(0, yawBoca, Math.PI / 2); tunel.position.copy(pBoca).addScaledVector(tBoca, -3).setY(VIA_Y + 0.35); escena.add(tunel);
  const bocaF = new THREE.Shape(); bocaF.moveTo(-1.05, -0.2); bocaF.lineTo(1.05, -0.2); bocaF.lineTo(1.05, 1.5); bocaF.lineTo(-1.05, 1.5); bocaF.lineTo(-1.05, -0.2);
  const hueco = new THREE.Path(); hueco.moveTo(-0.6, -0.2); hueco.lineTo(-0.6, 0.55); hueco.absarc(0, 0.55, 0.6, Math.PI, 0, true); hueco.lineTo(0.6, -0.2); hueco.lineTo(-0.6, -0.2); bocaF.holes.push(hueco);
  const texPiedra = ctx.textura2d(1024, 1024, (g, w) => {
    g.fillStyle = '#5f5866'; g.fillRect(0, 0, w, w);
    const r = ctx.azar(4), fh = 64, cw = 128;
    for (let y = 0; y < w / fh; y++) for (let x = -1; x < w / cw + 1; x++) {
      const k = 118 + r() * 42, ox = (y % 2) * cw / 2;
      g.fillStyle = `rgb(${k},${k - 8},${k + 6})`; g.beginPath(); g.roundRect(x * cw + ox + 4, y * fh + 4, cw - 8, fh - 8, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x * cw + ox + 8, y * fh + 6, cw - 16, 6);
    }
  });
  texPiedra.wrapS = texPiedra.wrapT = THREE.RepeatWrapping; texPiedra.repeat.set(0.9, 0.9);
  const boca = ctx.extruir(bocaF, 0.35, new THREE.MeshStandardMaterial({ map: texPiedra, roughness: 0.85 }), 0.04);
  boca.rotation.y = yawBoca + Math.PI / 2; boca.position.copy(pBoca).setY(VIA_Y - 0.05); escena.add(boca);
  const nieveBoca = ctx.caja(0.5, 0.14, 2.3, ctx.mat.mate('#f4f7ff', { roughness: 0.85 }), 0.06); nieveBoca.rotation.y = yawBoca; nieveBoca.position.copy(pBoca).setY(VIA_Y + 1.46); escena.add(nieveBoca);
  const dovela = ctx.toro(0.66, 0.06, new THREE.MeshStandardMaterial({ map: texPiedra, roughness: 0.8, color: '#d9d0c4' }), Math.PI); dovela.rotation.y = yawBoca + Math.PI / 2; dovela.position.copy(pBoca).addScaledVector(tBoca, 0.19).setY(VIA_Y + 0.5); escena.add(dovela);
  const cartelT = ctx.textura2d(256, 64, (g, w, h) => { g.fillStyle = '#20263d'; g.fillRect(0, 0, w, h); g.fillStyle = CALIDO; g.font = '600 26px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '4px'; g.fillText('PICO NORTE · 1890', w / 2, h / 2); });
  const placa = ctx.plano(1.1, 0.26, new THREE.MeshStandardMaterial({ map: cartelT, roughness: 0.5 })); placa.rotation.y = yawBoca + Math.PI / 2; placa.position.copy(pBoca).addScaledVector(tBoca, 0.19).setY(VIA_Y + 1.28); escena.add(placa);
  [-1, 1].forEach(l => { const ld = new THREE.Vector3(-tBoca.z, 0, tBoca.x).normalize(); ctx.practica(pBoca.clone().addScaledVector(ld, l * 0.85).addScaledVector(tBoca, 0.25).setY(VIA_Y + 1.15).toArray(), { color: AMBAR, intensidad: 1.6, distancia: 2.5, radio: 0.04, brillo: 7 }); });

  // ---------- Puente de piedra con arcos y farolas ----------
  let sCruce = 0, mejor = 1e9;
  for (let i = 0; i <= NR; i++) { const p = muestras[i]; const d = Math.abs(p.x - rioX(p.z)); if (d < mejor) { mejor = d; sCruce = i / NR * LARGO; } }
  const puente = new THREE.Group();
  const mPiedra = new THREE.MeshStandardMaterial({ map: texPiedra, roughness: 0.85, color: '#d8ccbf' });
  const mBaranda = ctx.mat.plastico(ROJO, { roughness: 0.4 });
  for (let k = -9; k <= 9; k++) {
    const s = sCruce + k * 0.32, u = s / LARGO, p = curvaVia.getPointAt(u), tg = curvaVia.getTangentAt(u), yaw = Math.atan2(-tg.z, tg.x);
    const tablero = ctx.caja(0.36, 0.18, 1.2, mPiedra, 0.02); tablero.position.set(p.x, VIA_Y - 0.09, p.z); tablero.rotation.y = yaw; puente.add(tablero);
    [-1, 1].forEach(l => { const lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize().multiplyScalar(l * 0.56); if (k % 2 === 0) { const b = ctx.cilindro(0.022, 0.022, 0.3, mBaranda, 8); b.position.set(p.x + lado.x, VIA_Y + 0.15, p.z + lado.z); puente.add(b); } });
  }
  [-1, 1].forEach(l => {
    const pts = [];
    for (let k = -9; k <= 9; k++) { const s = sCruce + k * 0.32, u = s / LARGO, p = curvaVia.getPointAt(u), tg = curvaVia.getTangentAt(u); const lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize().multiplyScalar(l * 0.56); pts.push([p.x + lado.x, VIA_Y + 0.3, p.z + lado.z]); }
    puente.add(ctx.tubo(pts, 0.026, mBaranda, 40));
  });
  // arcos bajo el tablero
  const arcoF = new THREE.Shape(); arcoF.moveTo(-1.2, -1.4); arcoF.lineTo(1.2, -1.4); arcoF.lineTo(1.2, 0); arcoF.lineTo(-1.2, 0); arcoF.lineTo(-1.2, -1.4);
  const ojo = new THREE.Path(); ojo.moveTo(-0.85, -1.4); ojo.absarc(0, -1.4, 0.85, Math.PI, 0, true); ojo.lineTo(-0.85, -1.4); arcoF.holes.push(ojo);
  [-1.25, 1.25].forEach(k => {
    const u = (sCruce + k) / LARGO, p = curvaVia.getPointAt(u), tg = curvaVia.getTangentAt(u);
    const a = ctx.extruir(arcoF, 0.95, mPiedra, 0.03); a.position.set(p.x, VIA_Y - 0.17, p.z); a.rotation.y = Math.atan2(-tg.z, tg.x); puente.add(a);
  });
  ctx.sombras(puente); escena.add(puente);
  const puntoPuente = curvaVia.getPointAt(sCruce / LARGO).clone().setY(VIA_Y + 0.35);
  [-2.9, 2.9].forEach(k => { const u = (sCruce + k) / LARGO, p = curvaVia.getPointAt(u), tg = curvaVia.getTangentAt(u), lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize().multiplyScalar(-0.62); const poste = ctx.cilindro(0.02, 0.025, 0.85, ctx.mat.metal('#2a2f3c', { roughness: 0.4 }), 8); poste.position.set(p.x + lado.x, VIA_Y + 0.42, p.z + lado.z); escena.add(poste); ctx.practica([p.x + lado.x, VIA_Y + 0.9, p.z + lado.z], { color: CALIDO, intensidad: 1.8, distancia: 2.6, radio: 0.04, brillo: 8 }); });

  // ---------- Pueblo al otro lado del río (ventanas, chimeneas con humo, farolas) ----------
  const casas = [[2.6, 3.6, 0.3], [4.3, 4.8, -0.4], [1.0, 5.6, 0.2], [5.6, 2.6, 0.6], [3.4, -2.6, 0.1], [5.4, -3.6, -0.3], [7.0, 3.6, 0.2]];
  const humos = [];
  const texVentana = ctx.textura2d(128, 128, (g, w) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, w); [[18, 40], [74, 40]].forEach(([x, y]) => { const gr = g.createLinearGradient(0, y, 0, y + 44); gr.addColorStop(0, '#ffd99a'); gr.addColorStop(1, '#ff9e4a'); g.fillStyle = gr; g.fillRect(x, y, 36, 44); }); });
  casas.forEach(([x, z, r], i) => {
    const h = altura(x, z), g = new THREE.Group();
    const color = ['#c9563f', '#e2c48e', '#5a76b8', '#d9d2c4', '#8f4a5a', '#c9563f', '#e2c48e'][i];
    const muro = ctx.caja(0.9, 0.62, 0.7, ctx.mat.mate(color, { roughness: 0.8 }), 0.03); muro.position.y = 0.31;
    const tejadoF = new THREE.Shape(); tejadoF.moveTo(-0.55, 0); tejadoF.lineTo(0.55, 0); tejadoF.lineTo(0, 0.42); tejadoF.lineTo(-0.55, 0);
    const tejado = ctx.extruir(tejadoF, 0.82, ctx.mat.mate('#f2f5fb', { roughness: 0.7 }), 0.02); tejado.position.y = 0.62;
    const chim = ctx.caja(0.12, 0.3, 0.12, ctx.mat.mate('#6e5a52'), 0.015); chim.position.set(0.22, 0.88, -0.12);
    [-1, 1].forEach(l => { const v = ctx.plano(0.55, 0.42, new THREE.MeshStandardMaterial({ map: texVentana, emissiveMap: texVentana, emissive: '#ffffff', emissiveIntensity: 2.2, transparent: true, alphaMap: texVentana, roughness: 0.3 })); v.position.set(0, 0.32, l * 0.356); if (l < 0) v.rotation.y = Math.PI; g.add(v); });
    g.add(muro, tejado, chim);
    g.position.set(x, h - 0.03, z); g.rotation.y = r; escena.add(g);
    const pc = new THREE.Vector3(0.22, 1.05, -0.12).applyAxisAngle(Y, r).add(g.position);
    const hu = ctx.vapor({ origen: pc.toArray(), cantidad: 16, altura: 1.3, ancho: 0.18, tam: 0.32, color: '#c8cfe6', opacidad: 0.4, velocidad: 0.35, semilla: 20 + i });
    escena.add(hu); humos.push(hu);
    if (i % 2 === 0) ctx.practica([x + 0.6, h + 0.5, z + 0.5], { color: AMBAR, intensidad: 1.4, distancia: 2.4, bombilla: false });
  });
  [[6.4, 1.5], [4.8, -0.9], [2.6, -1.3]].forEach(([x, z]) => { const h = altura(x, z); const poste = ctx.cilindro(0.018, 0.024, 0.75, ctx.mat.metal('#2a2f3c'), 8); poste.position.set(x, h + 0.37, z); escena.add(poste); ctx.practica([x, h + 0.78, z], { color: CALIDO, intensidad: 1.6, distancia: 2.2, radio: 0.035, brillo: 7 }); });

  // ---------- El tren de juguete ----------
  const mNegro = ctx.mat.plastico('#1c1f2c', { roughness: 0.35 }), mOro = ctx.mat.metal('#e2b64c', { roughness: 0.25 }), mRojo = ctx.mat.brillante(ROJO, { roughness: 0.25 });
  function ruedas(g, xs, r) {
    const lista = [];
    xs.forEach(x => [-1, 1].forEach(l => {
      const w = new THREE.Group();
      const llanta = ctx.cilindroBisel(r, 0.06, mRojo, { bisel: 0.015 }); llanta.rotation.x = Math.PI / 2;
      const buje = ctx.cilindro(r * 0.35, r * 0.35, 0.07, mOro, 12); buje.rotation.x = Math.PI / 2;
      const radio = ctx.caja(r * 1.7, 0.02, 0.065, mOro, 0.005); radio.rotation.x = Math.PI / 2;
      w.add(llanta, buje, radio); w.position.set(x, r, l * 0.27); g.add(w); lista.push(w);
    }));
    return lista;
  }
  const loco = new THREE.Group();
  const chasis = ctx.caja(1.4, 0.1, 0.54, mNegro, 0.03); chasis.position.set(0, 0.2, 0);
  const caldera = ctx.cilindroBisel(0.21, 0.8, mRojo, { bisel: 0.03 }); caldera.rotation.z = -Math.PI / 2; caldera.position.set(0.22, 0.46, 0);
  [0.0, 0.25, 0.48].forEach(x => { const a = ctx.toro(0.215, 0.012, mOro); a.rotation.y = Math.PI / 2; a.position.set(x, 0.46, 0); loco.add(a); });
  const frente = ctx.cilindroBisel(0.22, 0.08, mNegro, { bisel: 0.02 }); frente.rotation.z = -Math.PI / 2; frente.position.set(0.64, 0.46, 0);
  const chimenea = ctx.torno([[0, 0], [0.07, 0], [0.07, 0.18], [0.12, 0.3], [0.125, 0.34], [0.1, 0.345], [0, 0.34]], mNegro, 24); chimenea.position.set(0.5, 0.62, 0);
  const cupula = ctx.esfera(0.09, mOro, 18); cupula.position.set(0.18, 0.67, 0);
  const cabina = ctx.caja(0.5, 0.52, 0.54, ctx.mat.brillante(AZUL, { roughness: 0.25 }), 0.05); cabina.position.set(-0.36, 0.5, 0);
  const techoC = ctx.caja(0.62, 0.06, 0.64, ctx.mat.brillante('#f4f1ea'), 0.03); techoC.position.set(-0.36, 0.79, 0);
  const ventanaC = ctx.caja(0.22, 0.17, 0.56, ctx.mat.luz(CALIDO, 2.2), 0.02); ventanaC.position.set(-0.36, 0.58, 0); ventanaC.castShadow = false;
  const quita = ctx.cono(0.2, 0.22, mOro, 4); quita.rotation.z = -Math.PI / 2; quita.position.set(0.76, 0.17, 0); quita.scale.set(1, 1, 1.25);
  const farol = ctx.cilindroBisel(0.055, 0.08, mNegro, { bisel: 0.01 }); farol.rotation.z = -Math.PI / 2; farol.position.set(0.7, 0.66, 0);
  const lente = ctx.esfera(0.042, ctx.mat.luz('#fff1c4', 9), 14); lente.position.set(0.745, 0.66, 0); lente.castShadow = false;
  const biela = ctx.caja(0.5, 0.025, 0.02, mOro, 0.006); biela.position.set(0.2, 0.13, 0.31);
  loco.add(chasis, caldera, frente, chimenea, cupula, cabina, techoC, ventanaC, quita, farol, lente, biela);
  const texHazT = ctx.textura2d(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const haz = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.6), new THREE.MeshBasicMaterial({ map: texHazT, color: new THREE.Color('#ffe8b8').multiplyScalar(0.28), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  haz.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); haz.position.set(2.0, -0.08, 0); loco.add(haz);
  const luzFaro = new THREE.PointLight('#ffe7b8', 3.2, 4, 1.6); luzFaro.position.set(1.0, 0.5, 0); loco.add(luzFaro);
  const ruedasLoco = ruedas(loco, [0.4, 0.06, -0.3], 0.13);
  escena.add(loco);
  // vagones con ventanas encendidas y pasajeros
  const texVag = ctx.textura2d(512, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const r = ctx.azar(12);
    for (let i = 0; i < 4; i++) {
      const x = 24 + i * 122, gr = g.createLinearGradient(0, 20, 0, 108); gr.addColorStop(0, '#ffdca0'); gr.addColorStop(1, '#ffa452');
      g.fillStyle = gr; g.beginPath(); g.roundRect(x, 20, 96, 88, 14); g.fill();
      g.fillStyle = 'rgba(60,30,20,0.75)';
      for (let k = 0; k < 2; k++) if (r() < 0.8) { const px = x + 22 + k * 46; g.beginPath(); g.arc(px, 62, 11, 0, Math.PI * 2); g.fill(); g.fillRect(px - 15, 76, 30, 32); }
    }
  });
  const COLORES_V = ['#f2b531', '#3a9a68', AZUL];
  const vagones = COLORES_V.map((c, i) => {
    const g = new THREE.Group();
    const base = ctx.caja(0.96, 0.08, 0.5, mNegro, 0.02); base.position.y = 0.19;
    const caja = ctx.caja(0.86, 0.44, 0.5, ctx.mat.brillante(c, { roughness: 0.25 }), 0.05); caja.position.y = 0.45;
    const techo = ctx.caja(0.96, 0.08, 0.6, ctx.mat.brillante('#f7f9fc'), 0.035); techo.position.y = 0.71;
    const nieveT = ctx.caja(0.8, 0.035, 0.46, ctx.mat.mate('#ffffff', { roughness: 0.9 }), 0.015); nieveT.position.y = 0.765;
    g.add(base, caja, techo, nieveT);
    [-1, 1].forEach(l => { const v = ctx.plano(0.78, 0.2, new THREE.MeshStandardMaterial({ map: texVag, emissiveMap: texVag, emissive: '#ffffff', emissiveIntensity: 2.4, roughness: 0.2 })); v.position.set(0, 0.5, l * 0.254); if (l < 0) v.rotation.y = Math.PI; g.add(v); });
    const luz = new THREE.PointLight('#ffb870', 1.4, 1.8, 1.6); luz.position.set(0, 0.5, 0); g.add(luz);
    g.userData.ruedas = ruedas(g, [0.28, -0.28], 0.1);
    escena.add(g);
    return g;
  });
  const SEPARA = [0, 1.34, 2.44, 3.54];

  // vapor de la locomotora: bocanadas nacidas en el pasado (se quedan atrás, en el mundo)
  const N_HUMO = 22, VIDA = 1.7;
  const humo = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 2), new THREE.MeshStandardMaterial({ color: '#f4f2fb', roughness: 1, emissive: '#3a2f45', emissiveIntensity: 0.4 }), N_HUMO);
  humo.castShadow = true; humo.frustumCulled = false; escena.add(humo);

  // ---------- Movimiento del tren (frena algo al llegar al puente para el plano final) ----------
  const T_PUENTE = 9.7, VEL = 2.55;
  const tabla = [0]; for (let i = 1; i <= 1200; i++) { const t = i * 0.01; const v = VEL * (1 - 0.5 * paso(7.4, 9.8, t)); tabla.push(tabla[i - 1] + v * 0.01); }
  const recorrido = t => { const k = ctx.limitar(t / 0.01, 0, 1199.999), i = Math.floor(k), f = k - i; return tabla[i] + (tabla[i + 1] - tabla[i]) * f; };
  const S0 = sCruce + 1.4 - recorrido(T_PUENTE);
  const sLoco = t => S0 + recorrido(t);
  const mB = new THREE.Matrix4();
  function pose(s) { const u = ctx.limitar(s / LARGO, 0, 1), p = curvaVia.getPointAt(u), tg = curvaVia.getTangentAt(u), z = tg.clone().cross(Y).normalize(); return { p, tg, z }; }
  function colocar(obj, s) { const { p, tg, z } = pose(s); mB.makeBasis(tg, Y, z); obj.quaternion.setFromRotationMatrix(mB); obj.position.set(p.x, VIA_Y + 0.1, p.z); }

  // ---------- Cámara: túnel → acompaña por el bosque → maqueta → a ras del hielo bajo el puente ----------
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function rig(t) {
    const pl = pose(sLoco(t)).p.clone().setY(VIA_Y + 0.4), tl = pose(sLoco(t)).tg, zl = pose(sLoco(t)).z;
    const ld = new THREE.Vector3(-tBoca.z, 0, tBoca.x).normalize();
    // 1 · frente al túnel, bajo, el tren sale hacia la cámara
    const c1 = pBoca.clone().addScaledVector(tBoca, 3.4).addScaledVector(ld, -1.25).setY(VIA_Y + 0.55), m1 = pBoca.clone().addScaledVector(tBoca, 0.6).setY(VIA_Y + 0.55);
    // 2 · al lado del tren, a la altura de las ventanas
    const c2 = pl.clone().addScaledVector(zl, V ? 4.0 : 3.3).addScaledVector(tl, 0.4).add(V3(0, 0.75, 0)), m2 = pl.clone().addScaledVector(tl, -1.3).add(V3(0, 0.1, 0));
    // 3 · maqueta desde arriba y por detrás
    const c3 = pl.clone().add(V3(-5.2, 6.6, 7.6)), m3 = pl.clone().addScaledVector(tl, 2.6);
    // 4 · a ras del río helado, aguas abajo del puente
    const zp = puntoPuente.z + (V ? 8.0 : 6.6);
    const c4 = V3(rioX(zp) + 0.2, 0.55, zp), m4 = puntoPuente.clone().add(V3(V ? 0.3 : 1.1, V ? 0.7 : 0.62, 0));
    const w12 = ctx.entre(t, 1.5, 2.6, 'suave'), w23 = ctx.entre(t, 3.6, 5.2, 'suave'), w34 = ctx.entre(t, 6.4, 7.6, 'suave');
    const k1 = ctx.entre(t, 0, 1.5, 'suave'), kf = ctx.entre(t, 7.6, 11.5, 'suave');
    c1.addScaledVector(tBoca, -0.5 * k1); c4.add(V3(0, 0.05 * kf, -0.7 * kf));
    const p = c1.lerp(c2, w12).lerp(c3, w23).lerp(c4, w34), m = m1.lerp(m2, w12).lerp(m3, w23).lerp(m4, w34);
    const fov = ctx.mezcla(ctx.mezcla(ctx.mezcla(34, 32, w12), 30, w23), 30, w34);
    const foco = pl.clone().addScaledVector(tl, 0.6).lerp(pl, w12).lerp(pl, w23).lerp(puntoPuente.clone().add(V3(0.6, 0.3, 0)), w34);
    const ap = ctx.mezcla(ctx.mezcla(ctx.mezcla(0.7, 0.5, w12), 1.15, w23), 0.45, w34);
    return { p, m, fov, ap, foco, w23, w34 };
  }

  // ---------- Pinos densos (sin tapar a la cámara) ----------
  const rayos = [];
  for (let t = 0; t <= 11.51; t += 0.2) { const R = rig(t), tren = pose(sLoco(t) - 1.6).p.clone().setY(VIA_Y + 0.4); for (let f = 0; f <= 0.92; f += 0.08) rayos.push([R.p.clone().lerp(tren, f), f]); }
  const tapa = (x, h, z) => { for (const [q, f] of rayos) { const dx = q.x - x, dz = q.z - z, dy = q.y - (h + 0.8); if (dx * dx + dz * dz < (f < 0.3 ? 2.6 : 1.1) ** 2 && dy < 1.4) return true; } return false; };
  const ra = ctx.azar(13), sitios = [];
  for (let n = 0; sitios.length < 520 && n < 9000; n++) {
    const x = -30 + ra() * 50, z = -22 + ra() * 34, d = cercaVia(x, z);
    if (d < 1.3) continue;
    if (Math.abs(x - rioX(z)) < 2.4 && d < 9) continue;
    if (casas.some(([cx, cz]) => (cx - x) ** 2 + (cz - z) ** 2 < 1.4)) continue;
    if (colina.position.distanceTo(V3(x, colina.position.y, z)) < 4.2) continue;
    const h = altura(x, z);
    if (h > 5.5) continue;
    if (ruido(x * 0.3, z * 0.3) < 0.36 && ra() < 0.7) continue;
    if (tapa(x, h, z)) continue;
    sitios.push([x, h, z, 0.55 + ra() * 0.7, ra()]);
  }
  const geoPino = (() => { const a = new THREE.ConeGeometry(0.42, 0.7, 8); a.translate(0, 0.6, 0); const b = new THREE.ConeGeometry(0.32, 0.6, 8); b.translate(0, 0.95, 0); const c = new THREE.ConeGeometry(0.2, 0.45, 8); c.translate(0, 1.25, 0); return ctx.BufferGeometryUtils.mergeGeometries([a, b, c]); })();
  const geoNieve = (() => { const a = new THREE.ConeGeometry(0.215, 0.24, 8); a.translate(0, 1.36, 0); const b = new THREE.ConeGeometry(0.3, 0.16, 8); b.translate(0, 1.13, 0); const c = new THREE.ConeGeometry(0.4, 0.14, 8); c.translate(0, 0.83, 0); return ctx.BufferGeometryUtils.mergeGeometries([a, b, c]); })();
  const pinos = ctx.instancias(geoPino, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true }), sitios.length, (i, o) => { const [x, h, z, s, r] = sitios[i]; o.pos = [x, h - 0.05, z]; o.rot = [0, r * 6, 0]; o.esc = [s, s * (0.9 + r * 0.4), s]; o.color = r < 0.5 ? '#2c5a49' : '#24493f'; });
  const nieves = ctx.instancias(geoNieve, new THREE.MeshStandardMaterial({ color: '#f5f8ff', roughness: 0.8, flatShading: true }), sitios.length, (i, o) => { const [x, h, z, s, r] = sitios[i]; o.pos = [x, h - 0.05, z]; o.rot = [0, r * 6, 0]; o.esc = [s, s * (0.9 + r * 0.4), s]; });
  escena.add(pinos, nieves);

  // ---------- Nieve que cae (alrededor de la cámara, con profundidad: bokeh y estela) ----------
  const NC = 1100, rc = ctx.azar(5);
  const copos = Array.from({ length: NC }, () => ({ x: rc(), y: rc(), z: rc(), v: 0.6 + rc() * 0.5, a: rc() * 6.28, s: 0.012 + rc() * 0.02 }));
  const nevada = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#eef3ff').multiplyScalar(1.15) }), NC);
  nevada.frustumCulled = false; nevada.castShadow = false; escena.add(nevada);
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 30, centro: [2, 1.2, 4], zona: [10, 2, 6], colores: [AMBAR, CALIDO], intensidad: 3, tam: 0.035, semilla: 9 });
  escena.add(motas);

  // ---------- Textos ----------
  const r1 = ctx.rotulo({ texto: 'Túnel del Pico Norte', sub: 'salida de las 18:40', num: 1, en: placa, lado: V ? 'abajo' : 'derecha', dist: 150, tema: 'oscuro', acento: AMBAR });
  const r2 = ctx.rotulo({ texto: 'Puente del río helado', sub: 'kilómetro 12', num: 2, en: puntoPuente, lado: 'arriba', dist: 150, tema: 'oscuro', acento: AMBAR });
  const r3 = ctx.rotulo({ texto: 'Vagón restaurante', sub: 'calefacción y chocolate', num: 3, en: vagones[1], desplaza: [0, 0.85, 0], lado: 'arriba', dist: 120, tema: 'oscuro', acento: AMBAR });
  const titulo = ctx.titulo({ texto: 'El tren\nde la nieve', etiqueta: 'Línea 1 · Valle Blanco', sub: 'Salida cada tarde a las 18:40', ...(V ? { pos: 'arriba', y: 0.07, tam: 112 } : { pos: 'arriba-izquierda', x: 0.06, y: 0.09, tam: 118 }),
    color: '#ffffff', colorSub: 'rgba(255,255,255,0.82)', colorEtiqueta: AMBAR, sombra: true, fuente: '"Archivo Black"', peso: 400, espaciado: -0.02 });

  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  return {
    momentos: [
      { t: 0.5, nombre: 'sale del túnel con el faro y el vapor' },
      { t: 2.8, nombre: 'por el bosque: ventanas encendidas' },
      { t: 5.0, nombre: 'vista de maqueta: valle, río y pueblo' },
      { t: 7.2, nombre: 'baja al río helado' },
      { t: 9.4, nombre: 'cruza el puente' },
      { t: 11.2, nombre: 'plano final con título' },
    ],
    pintar(t) {
      const sL = sLoco(t);
      colocar(loco, sL);
      vagones.forEach((v, i) => colocar(v, sL - SEPARA[i + 1]));
      ruedasLoco.forEach(r => { r.rotation.z = -sL / 0.13; });
      vagones.forEach(v => v.userData.ruedas.forEach(r => { r.rotation.z = -sL / 0.1; }));
      biela.position.set(0.2 + Math.cos(sL / 0.13) * 0.05, 0.13 + Math.sin(sL / 0.13) * 0.05, 0.31);
      loco.position.y += Math.abs(Math.sin(t * 16)) * 0.007;
      // vapor
      const intervalo = VIDA / N_HUMO, fase = t % intervalo;
      for (let j = 0; j < N_HUMO; j++) {
        const edad = fase + j * intervalo, nacio = t - edad, { p, tg, z } = pose(sLoco(nacio));
        const sale = p.clone().addScaledVector(tg, 0.5).setY(VIA_Y + 1.05);
        sale.y += edad * 1.1 - edad * edad * 0.2; sale.addScaledVector(tg, -edad * 0.25).addScaledVector(z, Math.sin(edad * 3 + j) * 0.1 * edad);
        const e = (0.5 + edad * 2.2) * (0.85 + 0.3 * ((j * 0.618) % 1)) * (1 - ctx.entre(edad, VIDA * 0.6, VIDA)) * ctx.entre(edad, 0, 0.12, 'salida');
        qq.setFromEuler(new THREE.Euler(j, j * 2, 0));
        m4.compose(sale, qq, sv.set(Math.max(1e-4, e), Math.max(1e-4, e * 0.9), Math.max(1e-4, e))); humo.setMatrixAt(j, m4);
      }
      humo.instanceMatrix.needsUpdate = true;
      humos.forEach(h => h.pintar(t, 1));
      motas.pintar(t, 1);

      // cámara
      const R = rig(t);
      camara.position.copy(R.p); camara.up.set(0, 1, 0); camara.lookAt(R.m);
      camara.fov = ctx.fov(R.fov); camara.updateProjectionMatrix(); camara.updateMatrixWorld();
      ctx.post.foco(R.foco); ctx.post.apertura(R.ap);
      ctx.post.ajustar({ maqueta: { fuerza: 0.9 * R.w23 * (1 - R.w34), foco: 0.55, ancho: 0.14 } });
      // sol que acompaña al tren
      sol.target.position.set(loco.position.x, 0, loco.position.z);
      sol.position.copy(sol.target.position).addScaledVector(DIR_SOL, 30);

      // nieve en una caja que acompaña a la cámara
      const dirC = R.m.clone().sub(R.p).normalize(), cen = R.p.clone().addScaledVector(dirC, 4.5), A = 11, H = 7;
      copos.forEach((c, i) => {
        const x = cen.x + ((((c.x * A + Math.sin(t * 0.7 + c.a) * 0.3 + t * 0.25) - cen.x) % A) + A) % A - A / 2;
        const z = cen.z + ((((c.z * A + Math.cos(t * 0.5 + c.a) * 0.3) - cen.z) % A) + A) % A - A / 2;
        const y = cen.y + ((((c.y * H - t * c.v) - cen.y) % H) + H) % H - H / 2;
        pv.set(x, y, z); const k = ctx.entre(pv.distanceTo(R.p), 1.6, 2.6);
        m4.compose(pv, qq.identity(), sv.set(c.s * k + 1e-5, c.s * k + 1e-5, c.s * k + 1e-5)); nevada.setMatrixAt(i, m4);
      });
      nevada.instanceMatrix.needsUpdate = true;

      r1.mostrar(ctx.entre(t, 0.45, 1.1) - ctx.entre(t, 1.6, 1.9));
      r3.mostrar(ctx.entre(t, 2.4, 3.0) - ctx.entre(t, 3.6, 3.9));
      r2.mostrar(ctx.entre(t, 4.6, 5.3) - ctx.entre(t, 6.5, 6.9));
      titulo.mostrar(ctx.entre(t, 9.0, 10.3));
    },
  };
}
