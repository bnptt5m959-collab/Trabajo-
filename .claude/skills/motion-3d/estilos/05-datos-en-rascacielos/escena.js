// Estilo 05 · Datos en rascacielos — «De 1 a 10 millones»
// Cinco torres de cristal salen del suelo de una plaza, una por año (2021 → hoy), con su cifra
// contando sobre el tejado. Es la hora azul en una ciudad recién llovida: ventanas que se
// encienden, coronas de LED, estelas de coches que se reflejan en el asfalto mojado. La cámara va a
// ras de suelo mirando hacia arriba (las torres parecen enormes), sigue el foco de torre en torre y
// acaba en una grúa hacia atrás con el skyline entero: plano de anuncio con el titular.
export const ajustes = {
  duracion: 11, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.0,
    bloom: { fuerza: 0.55, radio: 0.55, umbral: 1.6 },
    ao: { fuerza: 1, radio: 0.3 },
    grano: 0.04, vineta: 0.42, aberracion: 1.0,
    grado: { contraste: 1.07, saturacion: 1.08, sombras: '#26318a', luces: '#ffb46b', mezcla: 0.12 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  // ---------- Paleta: noche índigo, cristal azul, ámbar de ventana, cian de LED, coral (el dato héroe) ----------
  const CORAL = '#ff6a4a', AMBAR = '#ffb35a', CIAN = '#4fd6ff', CREMA = '#fff1dc';
  const V = ctx.vertical;
  const rnd = ctx.azar(2021);

  ctx.fondo(['#04071a', '#0d1440', '#2a2458', '#6b3f55']);
  ctx.niebla('#231f4c', 16, 44);
  ctx.entornoEstudio({
    fondo: '#0b1030', suelo: '#05060f', intensidad: 0.7,
    paneles: [
      { pos: [-8, 2, -6], tam: [10, 3], color: '#ff9a5a', fuerza: 2.2 },     // resto del atardecer (reflejo cálido en el cristal)
      { pos: [7, 4, 4], tam: [1.2, 9], color: '#9fc4ff', fuerza: 3 },          // tira fría
      { pos: [-6, 4, 6], tam: [1.2, 9], color: '#ffffff', fuerza: 2 },
      { pos: [0, 10, 0], tam: [8, 8], color: '#4a5ab0', fuerza: 0.6 },
    ],
  });
  ctx.luces.noche({ luna: 0.5, ambiente: 0.55, cielo: '#5262b8', tierra: '#181326', direccion: [-7, 11, 7], area: 14 });
  const ocaso = new THREE.DirectionalLight('#ff9e62', 1.4);    // recorte cálido desde el horizonte (detrás)
  ocaso.position.set(-9, 3, -10); escena.add(ocaso);

  // ---------- Suelo: asfalto mojado con charcos que reflejan + plaza de baldosas ----------
  const asf = ctx.texturas.asfalto({ color: '#24262f', mojado: 0.65, repetir: [8, 8], tam: 1024, semilla: 3 });
  const asfaltoM = new THREE.MeshStandardMaterial({ map: asf.map, normalMap: asf.normalMap, roughnessMap: asf.roughnessMap, roughness: 1, transparent: true, alphaMap: asf.charcos });
  ctx.sueloEspejo({ material: asfaltoM, tam: 90 });
  const baldosa = ctx.textura2d(512, 512, (g, w) => {
    g.fillStyle = '#4a4c5a'; g.fillRect(0, 0, w, w);
    const r = ctx.azar(8);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const k = 88 + r() * 26; g.fillStyle = `rgb(${k},${k + 3},${k + 14})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
  });
  baldosa.wrapS = baldosa.wrapT = THREE.RepeatWrapping; baldosa.repeat.set(12, 4);
  const plaza = ctx.caja(10.4, 0.12, 3.6, new THREE.MeshStandardMaterial({ map: baldosa, roughness: 0.35, color: '#c9ccd8' }), 0.03);
  plaza.position.set(0, 0.06, 0); escena.add(plaza);
  // marcas viales de las dos calles (delante y detrás de la plaza)
  const pintura = new THREE.MeshStandardMaterial({ color: '#d9dbe3', roughness: 0.4 });
  const rayas = ctx.instancias(new THREE.BoxGeometry(0.6, 0.006, 0.07), pintura, 60, (i, o) => { const fila = i < 30 ? 2.9 : -2.9; o.pos = [-22 + (i % 30) * 1.5, 0.004, fila]; });
  rayas.castShadow = false; escena.add(rayas);

  // ---------- Fachadas: muro cortina (cristal + montantes) y su capa de ventanas encendidas ----------
  const texCristal = ctx.textura2d(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a3d6e'); gr.addColorStop(1, '#16224a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0b1230';
    for (let f = 0; f <= 8; f++) g.fillRect(0, f * 64 - 3, w, 7);            // forjados
    for (let c = 0; c <= 4; c++) g.fillRect(c * 64 - 2, 0, 4, h);            // montantes
  });
  const texLuz = (semilla, dens = 0.62) => ctx.textura2d(256, 512, (g, w, h) => {
    const r = ctx.azar(semilla);
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let f = 0; f < 8; f++) for (let c = 0; c < 4; c++) {
      const u = r();
      if (u < dens) {
        const gr = g.createLinearGradient(0, f * 64, 0, f * 64 + 58);
        if (u < 0.08) { gr.addColorStop(0, '#9cc0ff'); gr.addColorStop(1, '#5a86ff'); }
        else { gr.addColorStop(0, u < 0.35 ? '#ffd9a0' : '#ffc07a'); gr.addColorStop(1, u < 0.35 ? '#ffb86a' : '#ff9a4c'); }
        g.fillStyle = gr; g.fillRect(c * 64 + 4, f * 64 + 5, 56, 52);
        if (r() < 0.4) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(c * 64 + 4, f * 64 + 5, 16, 52); }
      }
    }
  });
  [texCristal].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });

  // ---------- Las cinco torres (una por dato) ----------
  const datos = [
    { anio: '2021', valor: 1.2, h: 0.85, x: -3.6, t0: 0.15, dec: 1 },
    { anio: '2022', valor: 2.8, h: 1.6, x: -1.8, t0: 0.95, dec: 1 },
    { anio: '2023', valor: 4.5, h: 2.45, x: 0, t0: 1.8, dec: 1 },
    { anio: '2024', valor: 7.1, h: 3.45, x: 1.8, t0: 2.7, dec: 1 },
    { anio: 'HOY', valor: 10, h: 4.7, x: 3.6, t0: 3.7, dec: 0, heroe: true },
  ];
  const TAM = 1.08;
  const montanteM = new THREE.MeshStandardMaterial({ color: '#c9ced8', metalness: 0.9, roughness: 0.3 });
  const montanteH = new THREE.MeshStandardMaterial({ color: '#ff7a55', metalness: 0.7, roughness: 0.32 });
  const azotea = new THREE.MeshStandardMaterial({ color: '#2a2e40', roughness: 0.7 });
  datos.forEach((d, i) => {
    const g = new THREE.Group();
    const mapa = texCristal.clone(); mapa.repeat.set(1, d.h / 0.9); mapa.needsUpdate = true;
    const luz = texLuz(40 + i, 0.42); luz.wrapS = luz.wrapT = THREE.RepeatWrapping; luz.repeat.set(1, d.h / 0.9); luz.offset.set(0, i * 0.31);
    const cristal = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: mapa, emissiveMap: luz, emissive: '#ffffff', emissiveIntensity: 0, metalness: 0.55, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
    const cuerpo = ctx.caja(TAM, d.h, TAM, cristal, 0.04);
    cuerpo.position.y = d.h / 2; g.add(cuerpo);
    // aletas verticales (montantes salientes) en las cuatro caras
    const aletas = ctx.instancias(new THREE.BoxGeometry(0.035, d.h, 0.07), d.heroe ? montanteH : montanteM, 20, (k, o) => {
      const cara = Math.floor(k / 5), j = (k % 5) / 4 - 0.5;
      const a = cara * Math.PI / 2, off = TAM / 2 + 0.02;
      const lx = j * (TAM - 0.12), x = Math.cos(a) * lx + Math.sin(a) * off, z = -Math.sin(a) * lx + Math.cos(a) * off;
      o.pos = [x, d.h / 2, z]; o.rot = [0, a, 0];
    });
    g.add(aletas);
    // corona: remate y anillo de LED (cian en los demás, coral en el héroe)
    const remate = ctx.caja(TAM + 0.08, 0.1, TAM + 0.08, azotea, 0.03); remate.position.y = d.h + 0.05; g.add(remate);
    const led = ctx.caja(TAM + 0.1, 0.035, TAM + 0.1, ctx.mat.luz(d.heroe ? CORAL : CIAN, 0.2), 0.012); led.position.y = d.h - 0.02; led.castShadow = false; g.add(led);
    // aparatos de la azotea
    for (let k = 0; k < 2 + (i % 2); k++) { const a = ctx.caja(0.24, 0.14, 0.2, new THREE.MeshStandardMaterial({ color: '#8d93a6', metalness: 0.5, roughness: 0.45 })); a.position.set(-0.25 + k * 0.28, d.h + 0.17, -0.2 + (k % 2) * 0.3); g.add(a); }
    if (d.heroe) {
      const antena = ctx.cilindro(0.02, 0.04, 1.0, ctx.mat.metal('#c9ccd1', { roughness: 0.3 }), 12); antena.position.set(-0.22, d.h + 0.6, 0.18); g.add(antena);
      d.baliza = ctx.esfera(0.05, ctx.mat.luz('#ff2a1f', 6), 16); d.baliza.position.set(-0.22, d.h + 1.12, 0.18); d.baliza.castShadow = false; g.add(d.baliza);
      const heli = ctx.cilindroBisel(0.32, 0.03, new THREE.MeshStandardMaterial({ color: '#2f3446', roughness: 0.6 }), { bisel: 0.01 }); heli.position.set(0.18, d.h + 0.115, -0.12); g.add(heli);
      d.luzCorona = new THREE.PointLight(CORAL, 0, 3.5, 2); d.luzCorona.position.set(0, d.h + 0.3, 0.9); g.add(d.luzCorona);
    }
    g.position.set(d.x, 0.12, 0);
    escena.add(g);
    Object.assign(d, { g, cristal, led });
    // anillo de obra que brilla en la base mientras la torre sube + polvo
    d.anillo = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(AMBAR).multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    d.anillo.rotation.x = -Math.PI / 2; d.anillo.position.set(d.x, 0.125, 0); escena.add(d.anillo);
    d.chispas = ctx.particulas({ tipo: 'chispas', cantidad: 16, centro: [d.x, 0.14, 0.58], tam: 0.01, velocidad: 0.7, semilla: 10 + i, color: '#ffbe6a', intensidad: 3.5 });
    escena.add(d.chispas);
    ctx.sombraContacto([d.x, 0, 0], { radio: 0.95, opacidad: 0.5, y: 0.125 });
  });

  // ---------- La ciudad alrededor y el skyline del fondo ----------
  const muros = ['#3a3f5a', '#4a3a48', '#2f4356', '#55463c'].map(c => c);
  const matsCiudad = muros.map((c, i) => {
    const tl = texLuz(90 + i, 0.38); tl.wrapS = tl.wrapT = THREE.RepeatWrapping;
    const tc = ctx.textura2d(256, 512, (g, w, h) => {
      g.fillStyle = c; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      for (let f = 0; f < 8; f++) for (let k = 0; k < 4; k++) g.fillRect(k * 64 + 4, f * 64 + 5, 56, 52);
    });
    tc.wrapS = tc.wrapT = THREE.RepeatWrapping;
    return { tc, tl };
  });
  const ciudad = [];
  const edificio = (x, z, w, d, h, k) => {
    const { tc, tl } = matsCiudad[k % 4];
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(w / 0.6)) * 0.5, uv.getY(i) * h / 0.9);
    const m = new THREE.MeshStandardMaterial({ map: tc, emissiveMap: tl, emissive: '#ffffff', emissiveIntensity: 0.06, roughness: 0.8 });
    const e = new THREE.Mesh(geo, [m, m, azotea, azotea, m, m]);
    e.position.set(x, h / 2, z); e.castShadow = true; e.receiveShadow = true;
    escena.add(e); ciudad.push({ m, x });
    if (h > 1.2 && rnd() < 0.6) { const a = ctx.caja(0.3, 0.16, 0.26, new THREE.MeshStandardMaterial({ color: '#7a8093', metalness: 0.4, roughness: 0.5 })); a.position.set(x + (rnd() - 0.5) * w * 0.5, h + 0.08, z); escena.add(a); }
  };
  // manzanas detrás de la plaza y a los lados
  for (let i = 0; i < 16; i++) edificio(-11 + i * 1.45 + rnd() * 0.3, -4.6 - rnd() * 1.6, 1.0 + rnd() * 0.4, 1.2, 0.6 + rnd() * 1.3, i);
  for (let i = 0; i < 14; i++) edificio(-12 + i * 1.8 + rnd() * 0.5, -8.4 - rnd() * 2, 1.3 + rnd() * 0.6, 1.5, 1.0 + rnd() * 2.2, i + 2);
  for (let i = 0; i < 6; i++) { edificio(-8.2 - (i % 2) * 1.6, -0.6 + Math.floor(i / 2) * 1.6 - 1.2, 1.2, 1.2, 0.7 + rnd() * 1.4, i + 1); edificio(8.2 + (i % 2) * 1.6, -0.6 + Math.floor(i / 2) * 1.6 - 1.2, 1.2, 1.2, 0.7 + rnd() * 1.4, i + 3); }
  // skyline lejano: siluetas con puntitos de luz
  const texLejos = ctx.textura2d(128, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const r = ctx.azar(5);
    for (let y = 6; y < h; y += 10) for (let x = 6; x < w; x += 12) if (r() < 0.35) { g.fillStyle = r() < 0.5 ? '#ffcf8a' : '#ffe6bf'; g.fillRect(x, y, 5, 5); }
  });
  texLejos.wrapS = texLejos.wrapT = THREE.RepeatWrapping;
  const lejos = new THREE.MeshStandardMaterial({ color: '#141832', emissiveMap: texLejos, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.9 });
  for (let i = 0; i < 22; i++) {
    const h = 2.5 + rnd() * 5, w = 1.4 + rnd() * 1.8;
    const geo = new THREE.BoxGeometry(w, h, 1.5);
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 1.2, uv.getY(k) * h / 2.4);
    const e = new THREE.Mesh(geo, lejos); e.position.set(-26 + i * 2.5 + rnd(), h / 2, -18 - rnd() * 8); escena.add(e);
  }

  // ---------- Farolas, árboles con guirnaldas y estelas de coches ----------
  const mPoste = ctx.mat.metal('#23283a', { roughness: 0.45 });
  [-6, -2, 2, 6].forEach(x => {
    const p = ctx.cilindro(0.02, 0.03, 1.2, mPoste, 10); p.position.set(x, 0.72, 1.9); escena.add(p);
    ctx.practica([x, 1.32, 1.9], { color: '#ffcf8f', intensidad: 1.2, distancia: 2.6, radio: 0.035, brillo: 4 });
  });
  const copa = new THREE.MeshStandardMaterial({ color: '#1f4a36', roughness: 0.8, flatShading: true });
  const bombis = [];
  [-4.6, -2.7, -0.9, 0.9, 2.7, 4.6].forEach((x, i) => {
    const tr = ctx.cilindro(0.03, 0.045, 0.4, new THREE.MeshStandardMaterial({ color: '#3a2a20' }), 8); tr.position.set(x, 0.3, 1.6);
    const cp = ctx.malla(new THREE.IcosahedronGeometry(0.2, 1), copa); cp.position.set(x, 0.62, 1.6);
    escena.add(tr, cp);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; bombis.push([x + Math.cos(a) * 0.22, 0.52 + (k % 3) * 0.08, 1.6 + Math.sin(a) * 0.22]); }
  });
  const guir = ctx.instancias(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), bombis.length, (i, o) => { o.pos = bombis[i]; o.color = new THREE.Color(i % 4 ? '#ffcf8a' : '#ff9fc0').multiplyScalar(4); });
  guir.castShadow = false; escena.add(guir);
  const NC = 22;
  const faros = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.035, 0.05), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NC);
  const pilotos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.035, 0.05), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NC);
  faros.frustumCulled = pilotos.frustumCulled = false; faros.castShadow = pilotos.castShadow = false;
  const coches = Array.from({ length: NC }, (_, i) => ({ carril: [2.65, 3.15, -2.65, -3.15][i % 4], f: rnd(), v: 2.6 + rnd() * 1.4 }));
  coches.forEach((c, i) => { faros.setColorAt(i, new THREE.Color('#fff1d6').multiplyScalar(3)); pilotos.setColorAt(i, new THREE.Color('#ff2a1a').multiplyScalar(3)); });
  escena.add(faros, pilotos);
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 50, centro: [0, 3, -7], zona: [24, 6, 6], tam: 0.05, colores: [AMBAR, CIAN, '#ffe6bf'], intensidad: 3, semilla: 3 });
  escena.add(motas);

  // ---------- Textos: cifra grande sobre cada tejado (con el año debajo), rótulo «×8» y titulares ----------
  const cifras = datos.map(d => ctx.cifra({ en: [d.x, 1, 0], sufijo: ' M', decimales: d.dec, tam: d.heroe ? 82 : 60, color: d.heroe ? '#ffffff' : CREMA, pie: d.anio, colorPie: d.heroe ? CORAL : CIAN }));
  const r1 = ctx.rotulo({ texto: '×8 en cinco años', sub: 'de 1,2 a 10 millones', num: 1, en: [3.6 - 0.5, 4.2, 0.55], lado: 'izquierda', dist: V ? 120 : 200, tema: 'oscuro', acento: CORAL });
  const t1 = ctx.titulo({ texto: 'Cinco años', etiqueta: 'Usuarios · 2021 → hoy', ...(V ? { pos: 'arriba', y: 0.07, tam: 92 } : { pos: 'arriba-izquierda', tam: 84 }), color: '#ffffff', colorEtiqueta: CIAN, sombra: true, fuente: '"Archivo Black"', peso: 400 });
  const t2 = ctx.titulo({ texto: 'De 1 a 10\nmillones', etiqueta: 'Usuarios', sub: 'Cinco años subiendo planta a planta', ...(V ? { pos: 'arriba', y: 0.07, tam: 104 } : { pos: 'arriba-izquierda', x: 0.06, y: 0.16, tam: 118 }), color: '#ffffff', colorSub: 'rgba(255,241,220,0.78)', colorEtiqueta: CORAL, sombra: true, fuente: '"Archivo Black"', peso: 400 });

  // ---------- Cámara: a ras de suelo, sigue el foco de torre en torre; grúa final hacia atrás ----------
  const cam = ctx.camaraPorClaves(V ? [
    { t: 0, pos: [-4.4, 0.5, 5.4], mira: [-3.4, 1.5, 0], fov: 34, foco: [-3.6, 0.9, 0], apertura: 0.45 },
    { t: 2.3, pos: [-1.5, 0.6, 6.8], mira: [-0.7, 2.1, 0], fov: 34, foco: [0, 1.6, 0], apertura: 0.42 },
    { t: 4.6, pos: [2.7, 0.8, 8.6], mira: [3.3, 3.4, 0], fov: 36, foco: [3.6, 2.8, 0], apertura: 0.4 },
    { t: 7.0, pos: [2.2, 1.2, 9.8], mira: [2.0, 3.5, 0], fov: 37, foco: [3.6, 3, 0], apertura: 0.35 },
    { t: 11, pos: [0.9, 2.4, 12.8], mira: [1.3, 3.3, 0], fov: 36, foco: [2, 2.4, 0], apertura: 0.3 },
  ] : [
    { t: 0, pos: [-6.2, 0.42, 6.2], mira: [-2.6, 1.3, 0], fov: 34, foco: [-3.6, 0.9, 0], apertura: 0.5 },
    { t: 2.3, pos: [-3.8, 0.55, 7.6], mira: [-0.5, 1.9, 0], fov: 34, foco: [0, 1.6, 0], apertura: 0.45 },
    { t: 4.1, pos: [-0.6, 0.9, 10.8], mira: [1.9, 4.2, 0], fov: 41, foco: [3.6, 2.8, 0], apertura: 0.42 },
    { t: 7.0, pos: [2.0, 1.1, 10.4], mira: [1.6, 3.2, 0], fov: 38, foco: [3.6, 3, 0], apertura: 0.38 },
    { t: 11, pos: [-3.4, 3.0, 13.8], mira: [0.9, 2.9, 0], fov: 34, foco: [2, 2.4, 0], apertura: 0.32 },
  ], { continuo: true, ease: 'suave', deriva: 0.05 });

  const m4 = new THREE.Matrix4();
  return {
    momentos: [
      { t: 0.6, nombre: '2021 sale del suelo' },
      { t: 2.3, nombre: '2022-2023' },
      { t: 4.4, nombre: 'hoy: el más alto' },
      { t: 6.2, nombre: '×8 · se enciende la ciudad' },
      { t: 8.6, nombre: 'grúa hacia atrás' },
      { t: 10.8, nombre: 'plano final con titular' },
    ],
    pintar(t) {
      cam(t);
      datos.forEach((d, i) => {
        const dur = d.heroe ? 1.45 : 1.1;
        // anticipación: baja un poco, sale como un ascensor y frena con un rebote elástico
        const p = ctx.entre(t, d.t0, d.t0 + dur, 'salidaFuerte');
        const anticipa = -0.06 * Math.sin(Math.PI * ctx.entre(t, d.t0 - 0.18, d.t0));
        const llega = t - (d.t0 + dur * 0.78);
        const muelle = llega > 0 ? Math.sin(llega * 15) * Math.exp(-llega * 6) * 0.05 : 0;
        d.g.position.y = 0.12 - (d.h + 0.3) * (1 - p) + anticipa;
        d.g.scale.set(1 - muelle * 0.4, 1 + muelle, 1 - muelle * 0.4);
        d.g.visible = t > d.t0 - 0.2;
        const obra = ctx.entre(t, d.t0, d.t0 + 0.15) * (1 - ctx.entre(t, d.t0 + dur * 0.7, d.t0 + dur + 0.2));
        d.anillo.material.opacity = 0.9 * obra; d.anillo.scale.setScalar(1 + 0.15 * Math.sin(t * 20));
        d.chispas.pintar(t, obra);
        // ventanas: se encienden con la subida y luego en ola por toda la ciudad
        d.cristal.emissiveIntensity = 0.12 * p + 0.75 * ctx.entre(t, 5.6 + i * 0.14, 6.3 + i * 0.14, 'suave');
        d.led.material.color.set(d.heroe ? CORAL : CIAN).multiplyScalar(0.2 + 4.8 * ctx.entre(t, d.t0 + dur * 0.8, d.t0 + dur + 0.3));
        if (d.baliza) d.baliza.visible = t > d.t0 + dur && Math.floor(t * 2.2) % 2 === 0;
        if (d.luzCorona) d.luzCorona.intensity = 1.4 * ctx.entre(t, d.t0 + dur, d.t0 + dur + 0.5);
        // cifra que cuenta y sube con el tejado
        const top = (d.g.position.y + d.h) * d.g.scale.y + (d.heroe ? 1.2 : 0.62);
        cifras[i].en = [d.x, Math.max(0.6, top), 0];
        cifras[i].mostrar(ctx.entre(t, d.t0 + 0.1, d.t0 + 0.45) * (1 - ctx.entre(t, 8.2, 8.6) * (d.heroe ? 0 : 1)), d.valor * ctx.entre(t, d.t0, d.t0 + dur, 'salida'));
      });
      ciudad.forEach(c => { c.m.emissiveIntensity = 0.06 + 0.32 * ctx.entre(t, 5.4 + (c.x + 12) * 0.05, 6.2 + (c.x + 12) * 0.05, 'suave'); });
      coches.forEach((c, i) => {
        const dir = c.carril > 0 ? 1 : -1;
        const x = ((c.f * 50 + t * c.v) % 50) - 25;
        m4.makeTranslation(dir * x, 0.06, c.carril); faros.setMatrixAt(i, m4);
        m4.makeTranslation(dir * x - dir * 0.42, 0.06, c.carril); pilotos.setMatrixAt(i, m4);
      });
      faros.instanceMatrix.needsUpdate = true; pilotos.instanceMatrix.needsUpdate = true;
      motas.pintar(t, 1);
      t1.mostrar(ctx.entre(t, 0.1, 1.0) - ctx.entre(t, 2.4, 2.9));
      r1.mostrar(ctx.entre(t, 5.3, 6.2) - ctx.entre(t, 7.8, 8.2));
      t2.mostrar(ctx.entre(t, 8.6, 9.8));
    },
  };
}
