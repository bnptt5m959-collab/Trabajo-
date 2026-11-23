// 08 · Circuito nocturno — «Gran Premio de juguete»
// Un circuito de carreras de juguete de noche sobre una mesa negra brillante: pista de asfalto con
// peralte, pianos, quitamiedos con tubo de neón, gradas con público diminuto, pantalla gigante,
// vallas publicitarias y torres de focos con luz de verdad. El semáforo se pone rojo luz a luz, en
// verde los tres cochecitos salen echando chispas, la cámara los acompaña, sobrevuela la maqueta,
// los persigue por la curva peraltada y, en la meta, el ganador frena bajo los fuegos artificiales.
export const ajustes = {
  duracion: 11.5, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.05,
    bloom: { fuerza: 0.4, radio: 0.42, umbral: 2.0 },
    ao: { fuerza: 1, radio: 0.25 },
    grano: 0.04, vineta: 0.42, aberracion: 1.2,
    grado: { contraste: 1.07, saturacion: 1.1, sombras: '#26307a', luces: '#ffb070', mezcla: 0.12 },
  },
};

export function crear(THREE, ctx) {
  const { escena, camara } = ctx;
  const V = ctx.vertical;
  // ---------- Paleta: noche azul tinta · neón cian y magenta · coches rojo, azul y amarillo · ámbar de focos ----------
  const CIAN = '#2fe6ff', MAGENTA = '#ff3fb4', AMBAR = '#ffb45a';
  const COCHES = ['#ff3b3b', '#2f8bff', '#ffd23f'];
  const rnd = ctx.azar(808);

  ctx.fondo({ tipo: 'radial', centro: '#1a2260', medio: '#0b0f33', borde: '#03040f', y: 0.35, radio: 0.85 });
  ctx.niebla('#070a24', 16, 44);
  ctx.entornoEstudio({
    fondo: '#0a0d2a', suelo: '#020208', intensidad: 0.8,
    paneles: [
      { pos: [-7, 3, 4], tam: [1, 8], color: CIAN, fuerza: 3 }, { pos: [7, 3, 4], tam: [1, 8], color: MAGENTA, fuerza: 3 },
      { pos: [0, 9, 0], tam: [8, 4], color: '#dfe6ff', fuerza: 2 }, { pos: [0, 2, -8], tam: [10, 2], color: AMBAR, fuerza: 1.5 },
    ],
  });
  ctx.luces.noche({ luna: 0.7, ambiente: 0.5, cielo: '#4656b8', tierra: '#120e22', direccion: [6, 12, -5], area: 12 });

  // ---------- Mesa negra brillante (refleja neón y faros) con cuadrícula fina ----------
  const texMesa = ctx.textura2d(1024, 1024, (g, w) => {
    g.fillStyle = '#0c0f22'; g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(90,120,255,0.16)'; g.lineWidth = 2;
    for (let i = 0; i <= 16; i++) { const p = i * w / 16; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, w); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
  });
  texMesa.wrapS = texMesa.wrapT = THREE.RepeatWrapping; texMesa.repeat.set(6, 6);
  ctx.sueloEspejo({ material: new THREE.MeshStandardMaterial({ map: texMesa, roughness: 0.55, metalness: 0.1, transparent: true, opacity: 0.74 }), tam: 70 });

  // ---------- Trazado con peralte ----------
  const curva = new THREE.CatmullRomCurve3([
    [-7.0, 0.22, 0.4], [-6.0, 0.25, -3.2], [-2.0, 0.4, -4.7], [3.0, 0.65, -4.5], [6.9, 0.95, -2.4],
    [7.3, 1.1, 1.4], [4.8, 1.0, 3.7], [1.6, 0.7, 2.0], [-1.4, 0.45, 3.9], [-5.2, 0.28, 3.7],
  ].map(p => new THREE.Vector3(...p)), true, 'centripetal');
  const NS = 640, LARGO = curva.getLength();
  const P = [], T = [];
  for (let i = 0; i < NS; i++) { P.push(curva.getPointAt(i / NS)); T.push(curva.getTangentAt(i / NS)); }
  const ARRIBA = new THREE.Vector3(0, 1, 0);
  const L0 = T.map(t => new THREE.Vector3().crossVectors(ARRIBA, t).normalize());
  const ds = LARGO / NS;
  let peralte = T.map((t, i) => { const d = T[(i + 1) % NS].clone().sub(T[(i - 1 + NS) % NS]).divideScalar(2 * ds); return ctx.limitar(-d.dot(L0[i]) * 1.5, -0.42, 0.42); });
  for (let k = 0; k < 4; k++) peralte = peralte.map((_, i) => { let s = 0; for (let j = -10; j <= 10; j++) s += peralte[(i + j + NS) % NS]; return s / 21; });
  const L = [], N = [];
  for (let i = 0; i < NS; i++) {
    const n0 = new THREE.Vector3().crossVectors(T[i], L0[i]), a = peralte[i];
    L.push(L0[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(n0, Math.sin(a)).normalize());
    N.push(new THREE.Vector3().crossVectors(T[i], L[i]).normalize());
  }
  function marco(s) {
    const u = ((s / LARGO) % 1 + 1) % 1 * NS, i = Math.floor(u) % NS, j = (i + 1) % NS, f = u - Math.floor(u);
    return { p: P[i].clone().lerp(P[j], f), t: T[i].clone().lerp(T[j], f).normalize(), l: L[i].clone().lerp(L[j], f).normalize(), n: N[i].clone().lerp(N[j], f).normalize() };
  }
  function cinta(fn, mat, repetirV = 1) {
    const v = [], uv = [], ix = [];
    let largo = 0;
    for (let i = 0; i <= NS; i++) {
      const k = i % NS;
      if (i > 0) largo += P[k].distanceTo(P[(i - 1) % NS]);
      const [a, b] = fn(k);
      v.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, largo / repetirV, 1, largo / repetirV);
      if (i < NS) { const q = i * 2; ix.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ix); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; escena.add(m);
    return m;
  }
  const MEDIO = 0.72;
  // asfalto con grano, líneas blancas de borde y discontinua central
  const texPista = ctx.textura2d(256, 512, (g, w, h) => {
    g.fillStyle = '#2b2e3b'; g.fillRect(0, 0, w, h);
    const r = ctx.azar(3);
    for (let i = 0; i < 9000; i++) { const k = 30 + r() * 50; g.fillStyle = `rgba(${k},${k},${k + 8},0.5)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(w * 0.28, 0, w * 0.1, h); g.fillRect(w * 0.62, 0, w * 0.1, h);   // trazada de gomas
    g.fillStyle = '#eef0f6'; g.fillRect(8, 0, 9, h); g.fillRect(w - 17, 0, 9, h);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(w / 2 - 3, 0, 6, h * 0.45);
  });
  texPista.wrapT = THREE.RepeatWrapping;
  cinta(k => [P[k].clone().addScaledVector(L[k], MEDIO), P[k].clone().addScaledVector(L[k], -MEDIO)], new THREE.MeshStandardMaterial({ map: texPista, roughness: 0.42, side: THREE.DoubleSide }), 1.6);
  // pista sobre un zócalo con canto (para que no sea una lámina)
  cinta(k => [P[k].clone().addScaledVector(L[k], MEDIO + 0.24).addScaledVector(N[k], -0.002), P[k].clone().addScaledVector(L[k], MEDIO + 0.24).addScaledVector(N[k], -0.1)], ctx.mat.plastico('#1a1d33', { side: THREE.DoubleSide }));
  cinta(k => [P[k].clone().addScaledVector(L[k], -MEDIO - 0.24).addScaledVector(N[k], -0.002), P[k].clone().addScaledVector(L[k], -MEDIO - 0.24).addScaledVector(N[k], -0.1)], ctx.mat.plastico('#1a1d33', { side: THREE.DoubleSide }));
  const texPiano = ctx.textura2d(16, 64, (g, w, h) => { g.fillStyle = '#f6f6f6'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8262f'; g.fillRect(0, 0, w, h / 2); });
  texPiano.wrapT = THREE.RepeatWrapping;
  const mPiano = new THREE.MeshStandardMaterial({ map: texPiano, roughness: 0.35, side: THREE.DoubleSide });
  const mValla = ctx.mat.plastico('#ff8a1e', { side: THREE.DoubleSide, roughness: 0.3, clearcoat: 0.6 });
  [1, -1].forEach(lado => {
    cinta(k => [P[k].clone().addScaledVector(L[k], lado * MEDIO).addScaledVector(N[k], 0.012), P[k].clone().addScaledVector(L[k], lado * (MEDIO + 0.16)).addScaledVector(N[k], 0.035)], mPiano, 0.5);
    cinta(k => { const b = P[k].clone().addScaledVector(L[k], lado * (MEDIO + 0.18)); return [b.clone().addScaledVector(N[k], -0.08), b.clone().addScaledVector(N[k], 0.13)]; }, mValla);
    cinta(k => { const b = P[k].clone().addScaledVector(N[k], 0.13); return [b.clone().addScaledVector(L[k], lado * (MEDIO + 0.16)), b.clone().addScaledVector(L[k], lado * (MEDIO + 0.22))]; }, mValla);
    // tubo de neón sobre la valla (cian fuera, magenta dentro)
    const pts = [];
    for (let i = 0; i < NS; i += 4) pts.push(P[i].clone().addScaledVector(L[i], lado * (MEDIO + 0.19)).addScaledVector(N[i], 0.155).toArray());
    const tuboNeon = ctx.neon(pts, { color: lado > 0 ? CIAN : MAGENTA, grosor: 0.011, intensidad: 3.2, cerrado: true });
    escena.add(tuboNeon);
  });
  // pilares de los tramos elevados (con bisel)
  const mPilar = ctx.mat.plastico('#3b55ff', { roughness: 0.4 });
  for (let i = 0; i < NS; i += 20) {
    const p = P[i];
    if (p.y < 0.32) continue;
    [1, -1].forEach(lado => { const b = p.clone().addScaledVector(L[i], lado * (MEDIO - 0.1)); const alto = b.y - 0.1; const c = ctx.cilindroBisel(0.06, alto, mPilar, { bisel: 0.02, centrar: false }); c.position.set(b.x, 0, b.z); escena.add(c); });
  }

  // ---------- Salida: línea de cuadros, parrilla y pórtico con semáforo ----------
  const m0 = marco(0);
  const th = new THREE.Vector3(m0.t.x, 0, m0.t.z).normalize(), lat = th.clone().cross(ARRIBA).normalize();
  const texCuadros = ctx.textura2d(256, 32, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * w / 16, y * h / 2, w / 16, h / 2); } });
  const colocarPlano = (o, s, lado, alto) => { const f = marco(s); o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.l, f.t.clone().negate(), f.n)); o.position.copy(f.p).addScaledVector(f.l, lado).addScaledVector(f.n, alto); escena.add(o); };
  colocarPlano(ctx.plano(MEDIO * 2, 0.24, new THREE.MeshStandardMaterial({ map: texCuadros, roughness: 0.4 })), 0, 0, 0.02);
  const texCajon = ctx.textura2d(128, 64, (g, w, h) => { g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.moveTo(4, 4); g.lineTo(w - 4, 4); g.moveTo(4, 4); g.lineTo(4, h * 0.6); g.moveTo(w - 4, 4); g.lineTo(w - 4, h * 0.6); g.stroke(); });
  [[-0.7, 0.34], [-1.65, -0.34], [-2.6, 0.34]].forEach(([s, l]) => colocarPlano(ctx.plano(0.5, 0.25, new THREE.MeshBasicMaterial({ map: texCajon, transparent: true, color: '#c9cbd6' })), s, l, 0.021));
  const portico = new THREE.Group();
  const ALTO_P = m0.p.y + 1.5;
  const mPort = ctx.mat.metal('#8d93a8', { roughness: 0.35 });
  [1, -1].forEach(lado => { const p = ctx.caja(0.1, ALTO_P, 0.1, mPort, 0.025); p.position.set(0, ALTO_P / 2, lado * (MEDIO + 0.35)); portico.add(p); });
  const viga = ctx.caja(0.2, 0.3, MEDIO * 2 + 0.85, ctx.mat.plastico('#151826'), 0.05); viga.position.y = ALTO_P; portico.add(viga);
  const texViga = ctx.textura2d(512, 64, (g, w, h) => { g.fillStyle = '#151826'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '44px "Archivo Black"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GP JUGUETE', w / 2, h / 2 + 2); });
  [-1, 1].forEach(l => { const r = ctx.plano(MEDIO * 2, 0.2, new THREE.MeshStandardMaterial({ map: texViga, emissiveMap: texViga, emissive: '#ffffff', emissiveIntensity: 0.6 })); r.rotation.y = l * Math.PI / 2; r.position.set(l * 0.102, ALTO_P + 0.2, 0); portico.add(r); });
  const semaforo = [];
  for (let i = 0; i < 5; i++) {
    const mLuz = new THREE.MeshBasicMaterial({ color: '#200a0c' });
    [-0.11, 0.11].forEach(x => { const s = ctx.esfera(0.068, mLuz, 16); s.position.set(x, ALTO_P - 0.01, (2 - i) * 0.22); s.castShadow = false; portico.add(s); });
    semaforo.push(mLuz);
  }
  portico.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(th, ARRIBA, lat));
  portico.position.set(m0.p.x, 0, m0.p.z);
  escena.add(portico);
  const luzSem = ctx.practica(m0.p.clone().setY(ALTO_P - 0.3).toArray(), { color: '#ff2a2a', intensidad: 0, distancia: 4, bombilla: false });
  const anclaSemaforo = new THREE.Object3D(); anclaSemaforo.position.set(0, ALTO_P, 0.44); portico.add(anclaSemaforo);

  // ---------- Gradas con público, techo con luces y pantalla gigante ----------
  const gradas = new THREE.Group();
  const mGrada = ctx.mat.plastico('#22285c', { roughness: 0.5 });
  for (let f = 0; f < 4; f++) { const e = ctx.caja(0.42, 0.22 + f * 0.22, 6.4, mGrada, 0.03); e.position.set(-f * 0.42, (0.22 + f * 0.22) / 2, 0); gradas.add(e); }
  const NP = 4 * 34, coloresP = ['#ff5a5a', '#ffd23f', '#3ec1ff', '#ffffff', '#b48cff', '#56c596', '#ff8fb8'];
  const cuerpos = ctx.instancias(new THREE.CapsuleGeometry(0.045, 0.07, 3, 8), ctx.mat.plastico('#ffffff', { roughness: 0.6 }), NP, (i, o) => { o.pos = [-Math.floor(i / 34) * 0.42, 0.3 + Math.floor(i / 34) * 0.22, -3 + (i % 34) * 0.18 + 0.06]; o.color = coloresP[Math.floor(rnd() * coloresP.length)]; });
  const cabezas = ctx.instancias(new THREE.SphereGeometry(0.035, 10, 8), ctx.mat.plastico('#f0c8a0', { roughness: 0.6 }), NP, (i, o) => { o.pos = [-Math.floor(i / 34) * 0.42, 0.395 + Math.floor(i / 34) * 0.22, -3 + (i % 34) * 0.18 + 0.06]; o.color = ['#f1c9a5', '#d9a27c', '#8d5a3b'][i % 3]; });
  gradas.add(cuerpos, cabezas);
  const fasesP = Array.from({ length: NP }, () => rnd() * 6.28);
  [[-1.5, -3.1], [-1.5, 3.1]].forEach(([x, z]) => { const p = ctx.cilindro(0.04, 0.04, 1.7, mPort, 10); p.position.set(x, 0.85, z); gradas.add(p); });
  const techo = ctx.caja(2.2, 0.08, 6.8, ctx.mat.plastico('#151826'), 0.03); techo.position.set(-0.75, 1.72, 0); gradas.add(techo);
  const tira = ctx.caja(0.05, 0.03, 6.4, ctx.mat.luz('#fff1d6', 4), 0.01); tira.position.set(0.25, 1.66, 0); tira.castShadow = false; gradas.add(tira);
  const texPantalla = ctx.textura2d(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1b1f5e'); gr.addColorStop(1, '#5a1d6e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = '64px "Archivo Black"'; g.textAlign = 'center'; g.fillText('VUELTA 1/1', w / 2, 110);
    g.fillStyle = CIAN; g.font = '600 34px Inter'; g.fillText('GRAN PREMIO DE JUGUETE', w / 2, 175);
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1.5);
  });
  const pantalla = ctx.plano(2.4, 1.2, new THREE.MeshStandardMaterial({ map: texPantalla, emissiveMap: texPantalla, emissive: '#ffffff', emissiveIntensity: 1.3, roughness: 0.3 }));
  pantalla.rotation.y = Math.PI / 2; pantalla.position.set(-0.75, 2.5, 0); gradas.add(pantalla);
  const marcoP = ctx.caja(0.08, 1.34, 2.54, ctx.mat.plastico('#0d0f1a'), 0.03); marcoP.position.set(-0.8, 2.5, 0); gradas.add(marcoP);
  gradas.position.set(-9.0, 0, 0.2); gradas.rotation.y = 0.08;
  escena.add(gradas);
  // vallas publicitarias (marcas inventadas) a lo largo de la recta
  ['TURBO', 'CHISPA', 'PISTA 7', 'NITRO'].forEach((txt, i) => {
    const tx = ctx.textura2d(256, 64, (g, w, h) => { g.fillStyle = ['#ff3b3b', '#2f8bff', '#ffd23f', '#1d1f2e'][i]; g.fillRect(0, 0, w, h); g.fillStyle = i === 2 ? '#111' : '#fff'; g.font = '40px "Archivo Black"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 2); });
    const v = ctx.caja(0.04, 0.26, 1.05, new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.4 }), 0.01);
    v.position.set(-8.15, 0.15, -2.6 + i * 1.3); escena.add(v);
  });

  // ---------- Interior: logo pintado en la mesa, boxes, conos y pilas de neumáticos ----------
  const texLogo = ctx.textura2d(1024, 1024, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.strokeStyle = 'rgba(47,230,255,0.85)'; g.lineWidth = 16; g.beginPath(); g.arc(w / 2, w / 2, w * 0.42, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.arc(w / 2, w / 2, w * 0.38, 0, Math.PI * 2); g.stroke();
    for (let x = 0; x < 12; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0)'; g.fillRect(w * 0.2 + x * w * 0.05, w * 0.62 + y * w * 0.05, w * 0.05, w * 0.05); }
    g.fillStyle = '#ffffff'; g.font = '300px "Archivo Black"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GP', w / 2, w * 0.42);
    g.font = '600 52px Inter'; g.letterSpacing = '18px'; g.fillStyle = 'rgba(47,230,255,0.95)'; g.fillText('DE JUGUETE', w / 2, w * 0.8);
  });
  const logo = ctx.plano(5.2, 5.2, new THREE.MeshStandardMaterial({ map: texLogo, transparent: true, emissiveMap: texLogo, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.5, depthWrite: false }));
  logo.rotation.x = -Math.PI / 2; logo.rotation.z = 0.12; logo.position.set(0.6, 0.012, -1.1); logo.renderOrder = 3; escena.add(logo);
  const mBox = ctx.mat.plastico('#e9ecf5', { roughness: 0.45 });
  const boxes = new THREE.Group();
  const nave = ctx.caja(3.4, 0.5, 0.9, mBox, 0.05); nave.position.set(0, 0.25, 0); boxes.add(nave);
  const tejado = ctx.caja(3.6, 0.06, 1.1, ctx.mat.plastico('#ff3b3b', { roughness: 0.4 }), 0.02); tejado.position.set(0, 0.53, 0.05); boxes.add(tejado);
  for (let i = 0; i < 5; i++) { const puerta = ctx.plano(0.5, 0.34, ctx.mat.emisivo('#ffd9a0', 1.1)); puerta.position.set(-1.36 + i * 0.68, 0.2, 0.456); boxes.add(puerta); }
  boxes.position.set(-2.4, 0, 0.9); boxes.rotation.y = 0.05; escena.add(boxes);
  const conos = ctx.instancias(new THREE.ConeGeometry(0.05, 0.14, 12), ctx.mat.plastico('#ff7a1a', { roughness: 0.4 }), 14, (i, o) => { const a = i / 14 * Math.PI * 1.2 + 0.4; o.pos = [3.2 + Math.cos(a) * 1.3, 0.07, -0.6 + Math.sin(a) * 1.3]; });
  escena.add(conos);
  const pilas = [[5.1, 0.6], [4.4, -1.6], [-4.2, -2.4], [2.2, 2.9]];
  const neum = ctx.instancias(new THREE.TorusGeometry(0.11, 0.05, 10, 20), ctx.mat.goma('#16171d'), pilas.length * 4, (i, o) => { const [x, z] = pilas[Math.floor(i / 4)]; o.pos = [x, 0.05 + (i % 4) * 0.085, z]; o.rot = [Math.PI / 2, 0, 0]; });
  escena.add(neum);

  // ---------- Torres de focos con luz real ----------
  const mPoste = ctx.mat.metal('#3a3f52', { roughness: 0.45 });
  [[-9.6, -5.6], [0.5, -7.4], [9.8, -2.0], [7.6, 5.8], [-2.5, 6.6], [-10.2, 4.6]].forEach(([x, z]) => {
    const g = new THREE.Group();
    const poste = ctx.cilindroBisel(0.07, 3.4, mPoste, { bisel: 0.02, centrar: false });
    const cabeza = ctx.caja(0.95, 0.46, 0.16, ctx.mat.plastico('#20232f'), 0.04); cabeza.position.y = 3.45; cabeza.rotation.x = 0.35;
    const focos = ctx.instancias(new THREE.CircleGeometry(0.07, 16), ctx.mat.luz('#eef3ff', 6), 8, (i, o) => { o.pos = [-0.32 + (i % 4) * 0.21, 3.55 - Math.floor(i / 4) * 0.2, 0.09 - Math.floor(i / 4) * 0.07]; o.rot = [-0.35, 0, 0]; });
    focos.castShadow = false;
    g.add(poste, cabeza, focos);
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x, -z);
    escena.add(g);
    ctx.practica([x * 0.86, 3.2, z * 0.86], { color: '#dfe7ff', intensidad: 9, distancia: 10, caida: 1.6, bombilla: false });
  });

  // ---------- Cochecitos de carreras ----------
  const mRueda = ctx.mat.goma('#121216'), mLlanta = ctx.mat.metal('#c9ced8', { roughness: 0.25 });
  const mNegroBrillo = ctx.mat.brillante('#14161f');
  const texHaz = ctx.textura2d(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  function coche(color, numero) {
    const g = new THREE.Group();
    const mC = ctx.mat.brillante(color, { roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 });
    const cuerpo = ctx.caja(0.82, 0.11, 0.26, mC, 0.045); cuerpo.position.y = 0.13;
    const pontones = ctx.caja(0.34, 0.1, 0.42, mC, 0.04); pontones.position.set(-0.08, 0.12, 0);
    const morro = ctx.caja(0.34, 0.07, 0.15, mC, 0.03); morro.position.set(0.55, 0.1, 0);
    const punta = ctx.cono(0.06, 0.14, mC, 16); punta.rotation.z = -Math.PI / 2; punta.position.set(0.77, 0.1, 0); punta.scale.set(1, 1, 0.75);
    const cabina = ctx.esfera(0.085, mNegroBrillo, 18); cabina.scale.set(1.6, 0.7, 1); cabina.position.set(-0.04, 0.19, 0);
    const casco = ctx.esfera(0.052, ctx.mat.brillante('#f4f1ea'), 16); casco.position.set(-0.06, 0.245, 0);
    const visera = ctx.esfera(0.054, ctx.mat.brillante('#111522'), 16); visera.scale.set(0.6, 0.4, 0.95); visera.position.set(-0.03, 0.25, 0);
    const halo = ctx.toro(0.08, 0.008, ctx.mat.metal('#2a2d38', { roughness: 0.3 }), Math.PI); halo.rotation.set(Math.PI / 2, 0, -Math.PI / 2); halo.position.set(0.02, 0.27, 0); halo.scale.set(1.2, 1, 1);
    const alerD = ctx.caja(0.1, 0.02, 0.5, mNegroBrillo, 0.008); alerD.position.set(0.72, 0.06, 0);
    const alerA = ctx.caja(0.12, 0.022, 0.46, mC, 0.01); alerA.position.set(-0.44, 0.31, 0);
    const alerA2 = ctx.caja(0.08, 0.016, 0.46, mNegroBrillo, 0.008); alerA2.position.set(-0.47, 0.27, 0);
    g.add(cuerpo, pontones, morro, punta, cabina, casco, visera, halo, alerD, alerA, alerA2);
    [1, -1].forEach(l => {
      const s = ctx.caja(0.12, 0.13, 0.015, mNegroBrillo, 0.005); s.position.set(-0.44, 0.25, l * 0.23); g.add(s);
      const e = ctx.caja(0.12, 0.06, 0.012, mC, 0.004); e.position.set(0.72, 0.08, l * 0.25); g.add(e);
    });
    const dorsal = d => ctx.pegatina((q, w, h) => { q.fillStyle = '#ffffff'; q.beginPath(); q.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); q.fill(); q.fillStyle = '#111'; q.font = '800 150px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(numero), w / 2, h / 2 + 8); }, { ancho: 0.13, alto: 0.13, px: 256, borde: 0.02 });
    const d1 = dorsal(); d1.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); d1.position.set(0.3, 0.172, 0); g.add(d1);
    [1, -1].forEach(l => { const d = dorsal(); d.position.set(-0.08, 0.13, l * 0.212); d.rotation.y = l > 0 ? 0 : Math.PI; g.add(d); });
    const faro = ctx.mat.luz('#fff3d6', 6), piloto = ctx.mat.luz('#ff1a1a', 7);
    [0.09, -0.09].forEach(z => {
      const f = ctx.caja(0.02, 0.03, 0.05, faro, 0.006); f.position.set(0.66, 0.12, z); f.castShadow = false; g.add(f);
      const haz = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.5), new THREE.MeshBasicMaterial({ map: texHaz, color: new THREE.Color('#ffe6b0').multiplyScalar(0.22), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      haz.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); haz.position.set(1.4, 0.03, z * 1.6); g.add(haz);
    });
    const pil = ctx.caja(0.015, 0.035, 0.08, piloto, 0.005); pil.position.set(-0.5, 0.18, 0); pil.castShadow = false; g.add(pil);
    const luz = new THREE.PointLight('#ffe2b0', 0.9, 2.0, 2); luz.position.set(0.9, 0.2, 0); g.add(luz);
    const ruedas = [];
    [[0.36, 0.2, 0.085], [0.36, -0.2, 0.085], [-0.32, 0.21, 0.095], [-0.32, -0.21, 0.095]].forEach(([x, z, r]) => {
      const w = new THREE.Group();
      const neum = ctx.cilindroBisel(r, 0.09, mRueda, { bisel: 0.025 }); neum.rotation.x = Math.PI / 2;
      const llanta = ctx.cilindro(r * 0.58, r * 0.58, 0.094, mLlanta, 20); llanta.rotation.x = Math.PI / 2;
      const radio = ctx.caja(r * 1.05, 0.012, 0.096, mLlanta, 0.003); radio.rotation.x = Math.PI / 2;
      w.add(neum, llanta, radio); w.position.set(x, r, z); g.add(w); ruedas.push(w);
    });
    g.userData.ruedas = ruedas;
    escena.add(g);
    return g;
  }
  const VERDE = 1.45, TAU = 0.7, T_META_OBJ = 8.35;
  const Dm = T_META_OBJ - VERDE;
  const v0 = (LARGO + 0.7) / (Dm - TAU * (1 - Math.exp(-Dm / TAU)));
  const pilotos = [
    { o: coche(COCHES[0], 7), s0: -0.7, carril: 0.34, v: v0, gap: 0 },
    { o: coche(COCHES[1], 3), s0: -1.65, carril: -0.34, v: v0 * 0.985, gap: 0.85 },
    { o: coche(COCHES[2], 12), s0: -2.6, carril: 0.34, v: v0 * 0.972, gap: 1.9 },
  ];
  const sCarrera = (c, t) => { const d = Math.max(0, t - VERDE); return c.s0 + c.v * (d - TAU * (1 - Math.exp(-d / TAU))); };
  pilotos.forEach(c => { let tm = VERDE; while (sCarrera(c, tm) < LARGO && tm < 30) tm += 0.002; c.tMeta = tm; const d = tm - VERDE; c.vMeta = c.v * (1 - Math.exp(-d / TAU)); c.frena = Math.max(0.3, (3.4 - c.gap) / c.vMeta); });
  const sCoche = (c, t) => t < c.tMeta ? sCarrera(c, t) : LARGO + c.vMeta * c.frena * (1 - Math.exp(-(t - c.tMeta) / c.frena));
  const T_META = pilotos[0].tMeta;
  const mB = new THREE.Matrix4();
  function colocar(c, t) {
    const s = sCoche(c, t), f = marco(s), z = f.t.clone().cross(f.n).normalize();
    mB.makeBasis(f.t, f.n, z);
    c.o.quaternion.setFromRotationMatrix(mB);
    c.o.position.copy(f.p).addScaledVector(f.l, c.carril).addScaledVector(f.n, 0.02);
    const acel = t > VERDE && t < VERDE + 0.4 ? (1 - (t - VERDE) / 0.4) : 0;   // el morro se levanta al arrancar
    c.o.rotateZ(0.05 * acel);
    c.o.userData.ruedas.forEach(r => { r.rotation.z = -(s - c.s0) / 0.09; });
    return { s, f };
  }

  // ---------- Chispas bajo los coches (en el mundo: dejan estela) ----------
  const NCH = 150;
  const chispas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NCH);
  chispas.frustumCulled = false; chispas.castShadow = false;
  const datosCh = Array.from({ length: NCH }, (_, i) => ({ c: i % 3, f: rnd(), lat: (rnd() - 0.5) * 1.6, up: 0.6 + rnd() * 1.3, atr: 1.2 + rnd() * 2.2, vida: 0.25 + rnd() * 0.3 }));
  datosCh.forEach((d, i) => chispas.setColorAt(i, new THREE.Color(rnd() < 0.5 ? '#ffb347' : '#fff0b0').multiplyScalar(9)));
  escena.add(chispas);
  const ventanasChispa = [[VERDE, VERDE + 0.9], [5.4, 7.6]];   // al arrancar y en la curva peraltada
  const hayChispa = tb => ventanasChispa.some(([a, b]) => tb >= a && tb <= b);

  // ---------- Fuegos artificiales en la meta y confeti ----------
  const BURSTS = [[T_META + 0.15, [-10.8, 2.9, 1.6], '#ff3fb4'], [T_META + 0.6, [-11.6, 3.4, 3.8], '#2fe6ff'], [T_META + 1.05, [-10.3, 2.7, -0.2], '#ffd23f'], [T_META + 1.55, [-12.0, 3.7, 2.4], '#ff6a3a'], [T_META + 2.1, [-10.7, 3.1, 4.8], '#ff3fb4']];
  const NF = 64, fuegos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), BURSTS.length * NF);
  fuegos.frustumCulled = false; fuegos.castShadow = false;
  const dirF = [];
  BURSTS.forEach(([, , c], b) => { for (let i = 0; i < NF; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, r = Math.sqrt(1 - u * u); dirF.push(new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a)).multiplyScalar(1.6 + rnd() * 0.8)); fuegos.setColorAt(b * NF + i, new THREE.Color(c).lerp(new THREE.Color('#ffffff'), rnd() * 0.3).multiplyScalar(8)); } });
  escena.add(fuegos);
  const confeti = ctx.particulas({ tipo: 'confeti', cantidad: 90, centro: [-6.8, 2.2, 0.5], zona: [3.5, 4, 4], colores: ['#ff3b3b', '#2f8bff', '#ffd23f', '#ffffff', '#ff3fb4'], tam: 0.05, velocidad: 1.4, semilla: 5 });
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 50, centro: [0, 3, -9], zona: [26, 6, 3], colores: [CIAN, MAGENTA, AMBAR], intensidad: 3, tam: 0.06, semilla: 3 });
  escena.add(confeti, motas);

  // ---------- Textos ----------
  const r1 = ctx.rotulo({ texto: 'Semáforo de salida', sub: '5 luces, una cada 0,2 s', num: 1, en: anclaSemaforo, lado: V ? 'abajo' : 'derecha', dist: 150, tema: 'oscuro', acento: '#ff4a4a' });
  const anclaPeralte = new THREE.Object3D(); escena.add(anclaPeralte);
  { const f = marco(LARGO * 0.53); anclaPeralte.position.copy(f.p).addScaledVector(f.l, MEDIO + 0.2).addScaledVector(f.n, 0.2); }
  const r2 = ctx.rotulo({ texto: 'Curva peraltada', sub: 'la pista se inclina 24°', num: 2, en: pilotos[1].o, desplaza: [0, 0.32, 0], lado: 'arriba', dist: 140, tema: 'oscuro', acento: CIAN });
  const titulo = ctx.titulo({ texto: 'Carrera\nnocturna', etiqueta: 'Gran Premio de juguete', sub: 'Vuelta rápida para el 7', ...(V ? { pos: 'arriba', y: 0.08, tam: 120 } : { pos: 'arriba-izquierda', x: 0.06, y: 0.09, tam: 112 }),
    color: '#ffffff', colorSub: 'rgba(255,255,255,0.8)', colorEtiqueta: CIAN, sombra: true, fuente: '"Archivo Black"', peso: 400, espaciado: -0.02 });
  const crono = ctx.cifra({ x: V ? 0.5 : 0.84, y: V ? 0.9 : 0.15, tam: V ? 72 : 80, color: '#ffffff', decimales: 2, sufijo: ' s', pie: 'Vuelta 1', colorPie: '#ffd23f' });

  // ---------- Cámara: parrilla → acompaña la salida → sobrevuelo → persecución → meta y plano de anuncio ----------
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function rigCam(t, pos) {
    const fA = pos[1].f, fC = pos[2].f, f0 = pos[0].f;
    // 1 · detrás de la parrilla mirando al semáforo
    const k0 = ctx.entre(t, 0, 1.5, 'suave');
    const sP = -5.4 + 0.7 * k0, fp = marco(sP);
    const c1 = fp.p.clone().addScaledVector(fp.l, -0.1).addScaledVector(fp.n, 0.55 - 0.08 * k0), m1 = m0.p.clone().addScaledVector(m0.t, -0.4).setY(m0.p.y + 0.62);
    // 2 · al lado del coche azul, a ras de pista
    const c2 = fA.p.clone().addScaledVector(fA.l, -2.4).addScaledVector(fA.n, 0.42).addScaledVector(fA.t, 1.0), m2 = fA.p.clone().addScaledVector(fA.t, 0.6).addScaledVector(fA.l, 0.25).addScaledVector(fA.n, 0.12);
    // 3 · sobrevuelo alto (maqueta)
    const a = ctx.mezcla(1.95, 1.35, ctx.entre(t, 3, 6, 'suave'));
    const c3 = V3(Math.sin(a) * 11 - 1, 6.4, Math.cos(a) * 11), m3 = V3(-2.6, 0.5, -0.4);
    // 4 · persecución detrás del último por la curva
    const c4 = fC.p.clone().addScaledVector(fC.t, -2.3).addScaledVector(fC.n, 0.55).addScaledVector(fC.l, 0.1), m4 = fC.p.clone().addScaledVector(fC.t, 3.0).addScaledVector(fC.n, 0.1);
    // 5 · meta: baja a ras de pista junto al ganador, que frena, y lo rodea despacio
    // 5 · el ganador para tras la meta; la cámara, por dentro de la pista, lo mira con las gradas y los fuegos detrás
    // tres cuartos delantero del ganador (posición real del coche), ganador en el tercio derecho
    const kf = ctx.entre(t, T_META, 11.5, 'suave');
    const fm = marco(LARGO + 3.4), coche0 = fm.p.clone().addScaledVector(fm.l, pilotos[0].carril);
    const c5 = coche0.clone().addScaledVector(fm.t, (V ? 1.75 : 1.6) - 0.2 * kf).add(V3(V ? 1.0 : 1.0 + 0.15 * kf, 0.42 - 0.05 * kf, 0));
    const m5 = coche0.clone().addScaledVector(fm.t, 0.15).add(V3(0, 0.14, 0));
    if (!V) { const der = m5.clone().sub(c5).cross(ARRIBA).normalize(); m5.addScaledVector(der, -0.42); }
    const w12 = ctx.entre(t, 1.35, 2.0, 'suave'), w23 = ctx.entre(t, 2.9, 4.3, 'suave'), w34 = ctx.entre(t, 5.2, 6.1, 'suave'), w45 = ctx.entre(t, T_META - 1.3, T_META - 0.2, 'suave');
    const p = c1.lerp(c2, w12).lerp(c3, w23).lerp(c4, w34).lerp(c5, w45);
    const m = m1.lerp(m2, w12).lerp(m3, w23).lerp(m4, w34).lerp(m5, w45);
    const fov = ctx.mezcla(ctx.mezcla(ctx.mezcla(ctx.mezcla(34, 34, w12), 30, w23), 42, w34), 32, w45);
    const foco = [pos[0].f.p.clone().lerp(m0.p, 0.5), fA.p, V3(-2.6, 0.5, -0.4), fC.p.clone().addScaledVector(fC.t, 1.2), coche0.clone()];
    const ap = ctx.mezcla(ctx.mezcla(ctx.mezcla(ctx.mezcla(0.32, 0.4, w12), 1.0, w23), 0.38, w34), 0.3, w45);
    const fp2 = foco[0].clone().lerp(foco[1], w12).lerp(foco[2], w23).lerp(foco[3], w34).lerp(foco[4], w45);
    return { p, m, fov, ap, foco: fp2, w23, w34, w45 };
  }

  return {
    momentos: [
      { t: 0.5, nombre: 'parrilla: el semáforo se pone rojo' },
      { t: 1.8, nombre: '¡verde! salen echando chispas' },
      { t: 4.4, nombre: 'sobrevuelo de la maqueta' },
      { t: 6.4, nombre: 'persecución en la curva peraltada' },
      { t: 8.6, nombre: 'cruza la meta · fuegos' },
      { t: 11.2, nombre: 'plano final del ganador' },
    ],
    pintar(t) {
      // semáforo
      semaforo.forEach((m, i) => { const rojo = t > 0.25 + i * 0.2; m.color.set(t >= VERDE ? '#10ff40' : rojo ? '#ff0000' : '#200a0c').multiplyScalar(t >= VERDE ? 1.8 : rojo ? 1.35 : 1); });
      luzSem.luz.color.set(t >= VERDE ? '#3dff7a' : '#ff2a2a'); luzSem.luz.intensity = t > 0.25 ? 3 : 0;
      const pos = pilotos.map(c => colocar(c, t));

      // chispas: cada una nació bajo un coche en un instante pasado
      const m4x = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
      datosCh.forEach((d, i) => {
        const per = 0.55, edad = ((t / per + d.f) % 1) * d.vida * 1.0, tb = t - edad;
        const c = pilotos[d.c];
        if (!hayChispa(tb) || tb < VERDE) { m4x.makeScale(1e-5, 1e-5, 1e-5); chispas.setMatrixAt(i, m4x); return; }
        const f = marco(sCoche(c, tb));
        const vel = f.t.clone().multiplyScalar(-d.atr).addScaledVector(f.l, d.lat).addScaledVector(f.n, d.up);
        pv.copy(f.p).addScaledVector(f.l, c.carril).addScaledVector(f.t, -0.45).addScaledVector(f.n, 0.03).addScaledVector(vel, edad); pv.y -= 4.9 * edad * edad;
        const vv = vel.clone(); vv.y -= 9.8 * edad; q.setFromUnitVectors(Y, vv.normalize());
        const k = 1 - edad / d.vida;
        sv.set(0.008 * k, 0.09 * k + 0.01, 0.008 * k); m4x.compose(pv, q, sv); chispas.setMatrixAt(i, m4x);
      });
      chispas.instanceMatrix.needsUpdate = true;
      // fuegos artificiales
      BURSTS.forEach(([tb, o], b) => {
        const e = t - tb;
        for (let i = 0; i < NF; i++) {
          const j = b * NF + i;
          if (e < 0 || e > 1.6) { m4x.makeScale(1e-5, 1e-5, 1e-5); fuegos.setMatrixAt(j, m4x); continue; }
          const dv = dirF[j], fr = 1 - Math.exp(-e * 2.2);
          pv.set(o[0] + dv.x * fr, o[1] + dv.y * fr - 0.9 * e * e, o[2] + dv.z * fr);
          const vv = dv.clone().multiplyScalar(Math.exp(-e * 2.2) * 2.2); vv.y -= 1.8 * e; q.setFromUnitVectors(Y, vv.lengthSq() > 1e-6 ? vv.normalize() : Y);
          const k = Math.max(0, 1 - e / 1.6), largo = 0.02 + 0.25 * Math.exp(-e * 2.5);
          sv.set(0.018 * k, largo * k + 0.01, 0.018 * k); m4x.compose(pv, q, sv); fuegos.setMatrixAt(j, m4x);
        }
      });
      fuegos.instanceMatrix.needsUpdate = true;
      confeti.pintar(t, ctx.entre(t, T_META, T_META + 0.4));
      motas.pintar(t, 1);
      // público que salta al pasar los coches y en la meta
      const salto = 0.6 + 0.4 * ctx.entre(t, T_META - 0.5, T_META);
      for (let i = 0; i < NP; i++) {
        const y = Math.max(0, Math.sin(t * 9 + fasesP[i])) * 0.035 * salto, fila = Math.floor(i / 34), x = -fila * 0.42, z = -3 + (i % 34) * 0.18 + 0.06;
        cuerpos.colocar(i, [x, 0.3 + fila * 0.22 + y, z]); cabezas.colocar(i, [x, 0.395 + fila * 0.22 + y, z]);
      }
      cuerpos.listo(); cabezas.listo();

      // cámara
      const R = rigCam(t, pos);
      camara.position.copy(R.p);
      camara.up.set(0, 1, 0); camara.lookAt(R.m);
      camara.fov = ctx.fov(R.fov); camara.updateProjectionMatrix(); camara.updateMatrixWorld();
      ctx.post.foco(R.foco); ctx.post.apertura(R.ap);
      ctx.post.ajustar({ maqueta: { fuerza: 0.75 * R.w23 * (1 - R.w34), foco: 0.52, ancho: 0.16 } });

      // textos
      r1.mostrar(ctx.entre(t, 0.35, 1.0) - ctx.entre(t, 1.45, 1.75));
      r2.mostrar(ctx.entre(t, 6.0, 6.6) - ctx.entre(t, 7.4, 7.7));
      titulo.mostrar(ctx.entre(t, T_META + 0.6, T_META + 1.8));
      const enVuelta = t < T_META;
      crono.pie = enVuelta ? 'Vuelta 1' : '¡Vuelta rápida!';
      crono.mostrar(ctx.entre(t, VERDE, VERDE + 0.3), enVuelta ? Math.max(0, t - VERDE) : T_META - VERDE);
    },
  };
}
