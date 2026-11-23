// Estilo 01 · «Estudio de un creador en corte»
// El estudio de un creador de vídeo abierto como una casa de muñecas (suelo y dos paredes con el
// corte de los muros a la vista). Empieza de noche, solo con la lámpara, la ventana y el monitor en
// reposo; las luces del set se encienden por pasos (principal → relleno → contraluz de color → neón
// → ¡grabando!) mientras la cámara entra, pasa por encima del hombro de la cámara del trípode y sale
// para enseñar el set entero.
// Dirección de arte: paredes azul noche con textura, suelo de tarima, madera cálida; luces prácticas
// (lámpara, cajas de luz, tira LED violeta, tubo cian, neón rojo de tubo) con bloom; motas en el haz
// de la luz principal; profundidad de campo en todo momento.

export const ajustes = {
  duracion: 12, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.05,
    bloom: { fuerza: 0.45, radio: 0.55, umbral: 1.7 },
    ao: { fuerza: 1.1, radio: 0.28 },
    grano: 0.04, vineta: 0.4, aberracion: 1.0,
    grado: { contraste: 1.06, saturacion: 1.06, sombras: '#273a7a', luces: '#ffc98a', mezcla: 0.1 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  const V = ctx.vertical;
  // ---------- Paleta cerrada ----------
  const NOCHE = '#1c2540', CORTE = '#d8cfbf', MADERA = '#b9814f', CORAL = '#e0644f', TEAL = '#2f9c95',
    VIOLETA = '#9b6bff', CIAN = '#2ee6f0', NEON = '#ff3348', MOSTAZA = '#f2b53e', NEGRO = '#17181d', CALIDO = '#ffc27a';
  const rnd = ctx.azar(101);

  ctx.fondo({ tipo: 'radial', centro: '#1c2038', medio: '#0e1020', borde: '#040509', y: 0.45, radio: 0.85 });
  ctx.entornoEstudio({
    fondo: '#141828', suelo: '#05060a', intensidad: 0.45,
    paneles: [
      { pos: [-5, 3, 4], tam: [2.5, 4], color: '#fff1dc', fuerza: 2.2 }, { pos: [6, 2, 2], tam: [1, 6], color: '#ffffff', fuerza: 2 },
      { pos: [-3, 2, -6], tam: [2, 4], color: VIOLETA, fuerza: 2.5 }, { pos: [4, 2, -6], tam: [2, 4], color: CIAN, fuerza: 2 },
    ],
  });
  const hemi = new THREE.HemisphereLight('#6f7fb8', '#2a1f1a', 0.45);
  escena.add(hemi);
  const luna = new THREE.DirectionalLight('#7f9cff', 1.1);   // luz fría de la ventana
  luna.position.set(-8, 4, 1); escena.add(luna);

  const sala = new THREE.Group(); escena.add(sala);
  const pon = (o, x, y, z, padre = sala) => { o.position.set(x, y, z); padre.add(o); return o; };
  const bloque = (w, h, d, m, x, y, z, radio, padre = sala) => pon(ctx.caja(w, h, d, m, radio), x, y + h / 2, z, padre);

  // ---------- la habitación en corte ----------
  const X0 = -3, X1 = 3, Z0 = -2.2, Z1 = 2.2, ALTO = 3.0, G = 0.22;
  const mCorte = ctx.superficie('ruido', { color: CORTE, escala: 10, fuerza: 0.08, rugosidad: 0.9, repetir: [3, 2] });
  const mPared = ctx.superficie('ruido', { color: NOCHE, escala: 6, fuerza: 0.07, rugosidad: 0.88, repetir: [3, 1.5], relieve: 1.2 });
  const tarima = ctx.textura2d(1024, 1024, (g, w, h) => {
    const r = ctx.azar(7), filas = 8, fh = h / filas;
    for (let f = 0; f < filas; f++) {
      let x = -r() * 300;
      while (x < w) {
        const lw = 280 + r() * 260, k = 0.82 + r() * 0.3;
        const c = new THREE.Color(MADERA).multiplyScalar(k);
        g.fillStyle = '#' + c.getHexString(); g.fillRect(x, f * fh, lw, fh);
        g.strokeStyle = 'rgba(60,30,10,0.18)'; g.lineWidth = 1.5;
        for (let v = 0; v < 7; v++) { const y = f * fh + 8 + v * (fh - 16) / 6 + r() * 4; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + lw * 0.3, y + 4 * r() - 2, x + lw * 0.6, y + 4 * r() - 2, x + lw, y); g.stroke(); }
        g.fillStyle = 'rgba(25,12,5,0.55)'; g.fillRect(x, f * fh, 3, fh);
        x += lw;
      }
      g.fillStyle = 'rgba(25,12,5,0.6)'; g.fillRect(0, f * fh, w, 3);
    }
  });
  tarima.wrapS = tarima.wrapT = THREE.RepeatWrapping; tarima.repeat.set(3, 2.2);
  const rel = ctx.texturas.madera({ repetir: [3, 2.2], semilla: 5 });
  const mSuelo = new THREE.MeshStandardMaterial({ map: tarima, normalMap: rel.normalMap, roughness: 0.42, normalScale: new THREE.Vector2(0.4, 0.4) });
  bloque(X1 - X0 + G, 0.34, Z1 - Z0 + G, mCorte, (X0 + X1 - G) / 2, -0.34, (Z0 + Z1 - G) / 2, 0.03);
  bloque(X1 - X0, 0.02, Z1 - Z0, mSuelo, (X0 + X1) / 2, 0, (Z0 + Z1) / 2, 0.005);
  bloque(X1 - X0 + G, ALTO, G, mCorte, (X0 + X1 - G) / 2, 0, Z0 - G / 2, 0.03);
  bloque(G, ALTO, Z1 - Z0, mCorte, X0 - G / 2, 0, (Z0 + Z1) / 2, 0.03);
  bloque(X1 - X0, ALTO, 0.02, mPared, (X0 + X1) / 2, 0, Z0 + 0.01, 0.005);
  bloque(0.02, ALTO, Z1 - Z0, mPared, X0 + 0.01, 0, (Z0 + Z1) / 2, 0.005);
  const mRodapie = new THREE.MeshStandardMaterial({ color: '#141a2c', roughness: 0.6 });
  bloque(X1 - X0, 0.12, 0.04, mRodapie, (X0 + X1) / 2, 0, Z0 + 0.03, 0.01);
  bloque(0.04, 0.12, Z1 - Z0, mRodapie, X0 + 0.03, 0, (Z0 + Z1) / 2, 0.01);
  // alfombra redonda de tela
  pon(ctx.cilindroBisel(1.4, 0.025, ctx.superficie('tela', { color: '#a8573f', hilos: 70, repetir: [3, 3] }), { bisel: 0.012, centrar: false }), 0.6, 0.02, -0.25);

  // ventana con la ciudad de noche (pared izquierda)
  const ciudad = ctx.textura2d(512, 640, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1438'); gr.addColorStop(1, '#2a2f6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = ctx.azar(3);
    for (let i = 0; i < 9; i++) {
      const bw = 40 + r() * 70, bx = r() * w, bh = 200 + r() * 330;
      g.fillStyle = '#0a0e22'; g.fillRect(bx, h - bh, bw, bh);
      for (let y = h - bh + 10; y < h - 8; y += 16) for (let x = bx + 6; x < bx + bw - 6; x += 12) if (r() < 0.35) { g.fillStyle = r() < 0.7 ? '#ffcf86' : '#8fb4ff'; g.fillRect(x, y, 6, 8); }
    }
    g.fillStyle = '#e8eeff'; g.beginPath(); g.arc(w * 0.75, 90, 26, 0, 7); g.fill();
  });
  const ventana = new THREE.Group();
  pon(ctx.plano(0.9, 1.15, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: ciudad, emissiveIntensity: 1.1 })), 0, 0, 0, ventana);
  const mMarco = new THREE.MeshStandardMaterial({ color: '#e9e2d4', roughness: 0.6 });
  [[1.0, 0.06, 0, 0.6], [1.0, 0.06, 0, -0.6], [0.06, 1.26, -0.47, 0], [0.06, 1.26, 0.47, 0], [0.04, 1.15, 0, 0], [0.9, 0.04, 0, 0.05]].forEach(([w, h, x, y]) => pon(ctx.caja(w, h, 0.06, mMarco), x, y, 0.02, ventana));
  ventana.rotation.y = Math.PI / 2; pon(ventana, X0 + 0.03, 1.75, 1.05);

  // paneles acústicos (tela, biselados) en la pared del fondo
  const mPan = [ctx.superficie('tela', { color: CORAL, hilos: 40 }), ctx.superficie('tela', { color: TEAL, hilos: 40 }), ctx.superficie('tela', { color: '#2b3352', hilos: 40 })];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) bloque(0.44, 0.44, 0.09, mPan[(i + j) % 3], -2.4 + i * 0.5, 0.95 + j * 0.5, Z0 + 0.065, 0.04);
  // cuadro con póster a la derecha
  const poster = ctx.textura2d(300, 400, (g, w, h) => {
    g.fillStyle = '#f1e7d4'; g.fillRect(0, 0, w, h);
    g.fillStyle = CORAL; g.beginPath(); g.arc(w / 2, 150, 90, 0, 7); g.fill();
    g.fillStyle = TEAL; g.fillRect(0, 230, w, 40);
    g.fillStyle = '#1c2540'; g.font = '800 44px Inter'; g.textAlign = 'center'; g.fillText('CREA', w / 2, 330); g.font = '600 20px Inter'; g.fillText('CADA DÍA', w / 2, 362);
  });
  bloque(0.62, 0.82, 0.04, new THREE.MeshStandardMaterial({ color: '#2a2520', roughness: 0.5 }), 2.35, 1.6, Z0 + 0.04, 0.01);
  pon(ctx.plano(0.54, 0.74, new THREE.MeshStandardMaterial({ map: poster, roughness: 0.4 })), 2.35, 2.01, Z0 + 0.065);

  // estanterías con libros, vinilos y figuras (pared izquierda)
  const mBalda = new THREE.MeshStandardMaterial({ map: tarima, roughness: 0.5 });
  const colLibros = [CORAL, MOSTAZA, TEAL, '#e9e4da', VIOLETA, '#4a7bd6', '#c0392b', '#2d3e50'];
  const nLibros = 34;
  const libros = ctx.instancias(new ctx.RoundedBoxGeometry(1, 1, 1, 2, 0.08), new THREE.MeshStandardMaterial({ roughness: 0.7 }), nLibros, (i, o) => {
    const balda = i < 17 ? 0 : 1, k = i % 17, h = 0.2 + rnd() * 0.1;
    o.pos = [X0 + 0.2, (balda ? 1.78 : 1.18) + h / 2 + 0.025, -1.65 + k * 0.075 + (k > 11 ? 0.18 : 0)];
    o.rot = [k === 12 ? 0.25 : 0, 0, 0];
    o.esc = [0.24, h, 0.06];
    o.color = colLibros[Math.floor(rnd() * colLibros.length)];
  });
  sala.add(libros);
  [1.15, 1.75].forEach(y => bloque(0.36, 0.04, 2.0, mBalda, X0 + 0.2, y, -0.75, 0.01));
  pon(ctx.cilindroBisel(0.11, 0.17, ctx.mat.ceramica('#e9e4da'), { centrar: false }), X0 + 0.2, 1.17, 0.05);
  [[0, 0.18], [0.06, 0.24], [-0.05, 0.22]].forEach(([dz, h]) => { const hoja = ctx.esfera(0.09, new THREE.MeshStandardMaterial({ color: '#3f8f55', roughness: 0.7 }), 14); hoja.scale.set(0.6, 1.4, 0.6); pon(hoja, X0 + 0.2, 1.35 + h * 0.3, 0.05 + dz); });
  bloque(0.18, 0.14, 0.24, ctx.mat.plastico(NEGRO, { roughness: 0.35 }), X0 + 0.2, 1.77, 0.15, 0.03);
  pon(ctx.cilindroBisel(0.06, 0.1, ctx.mat.vidrio('#9ab7ff'), { bisel: 0.02 }), X0 + 0.33, 1.84, 0.15).rotation.z = Math.PI / 2;
  // planta grande en la esquina (hojas alargadas)
  pon(ctx.torno([[0, 0], [0.2, 0], [0.24, 0.42], [0.25, 0.44], [0, 0.44]], ctx.mat.ceramica('#e8ddd0')), 2.5, 0.02, -1.75);
  const hojas = ctx.instancias(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#3d8a50', roughness: 0.55 }), 26, (i, o) => {
    const a = i / 26 * Math.PI * 2 * 2.3, alto = 0.6 + rnd() * 0.7;
    o.pos = [2.5 + Math.cos(a) * 0.18 * (0.5 + rnd()), 0.46 + alto, -1.75 + Math.sin(a) * 0.18 * (0.5 + rnd())];
    o.rot = [Math.cos(a) * 0.7, a, Math.sin(a) * 0.7]; o.esc = [0.07, 0.3, 0.02];
    o.color = rnd() < 0.5 ? '#3d8a50' : '#2f7343';
  });
  sala.add(hojas);

  // ---------- mesa, ordenador, micro, taza y el creador ----------
  const mNegro = ctx.mat.plastico(NEGRO, { roughness: 0.35 });
  const mMadera = new THREE.MeshStandardMaterial({ map: tarima, roughness: 0.38, color: '#e8c9a8' });
  bloque(2.3, 0.06, 0.85, mMadera, 0.6, 0.74, -0.95, 0.02);
  [[-0.45, -0.6], [1.65, -0.6], [-0.45, -1.3], [1.65, -1.3]].forEach(([x, z]) => bloque(0.045, 0.74, 0.045, ctx.mat.metal('#2b2d33', { roughness: 0.4 }), x, 0, z, 0.01));
  // pantalla: «en reposo» y, al grabar, la interfaz de grabación
  const pantalla = ctx.textura2d(768, 432, (g, w, h) => {
    g.fillStyle = '#0d1020'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, MOSTAZA); gr.addColorStop(1, CORAL);
    g.fillStyle = gr; g.fillRect(24, 24, 470, 265);
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.moveTo(235, 120); g.lineTo(235, 200); g.lineTo(300, 160); g.fill();
    g.fillStyle = '#1b2036'; g.fillRect(512, 24, 232, 265);
    for (let i = 0; i < 6; i++) { g.fillStyle = [CIAN, VIOLETA, MOSTAZA, CORAL, TEAL, '#ffffff'][i]; g.fillRect(530, 44 + i * 40, 120 + (i * 37) % 80, 14); }
    for (let k = 0; k < 4; k++) { g.fillStyle = ['#2b3050', '#3b2f5a', '#22424a', '#4a2f2f'][k]; g.fillRect(24, 310 + k * 26, w - 48, 20); for (let x = 0; x < 9; x++) { g.fillStyle = [CIAN, VIOLETA, MOSTAZA, CORAL][k]; g.fillRect(30 + x * 80 + (k * 23) % 40, 313 + k * 26, 50 + (x * k * 7) % 40, 14); } }
    g.fillStyle = '#ff3348'; g.beginPath(); g.arc(46, 46, 12, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = '700 22px Inter'; g.fillText('REC  00:12:47', 66, 54);
  });
  const mPantalla = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: pantalla, emissiveIntensity: 0.15, roughness: 0.15 });
  const monitor = new THREE.Group();
  bloque(0.98, 0.58, 0.035, mNegro, 0, 0.2, 0, 0.015, monitor);
  pon(ctx.plano(0.94, 0.53, mPantalla), 0, 0.49, 0.019, monitor);
  bloque(0.05, 0.22, 0.05, ctx.mat.metal('#3a3c44', { roughness: 0.3 }), 0, 0, -0.05, 0.01, monitor);
  bloque(0.3, 0.018, 0.2, ctx.mat.metal('#3a3c44', { roughness: 0.3 }), 0, 0, -0.05, 0.008, monitor);
  pon(monitor, 0.25, 0.77, -1.05).rotation.y = 0.0;
  const luzPantalla = ctx.practica([0.25, 1.25, -0.6], { color: '#b8c6ff', intensidad: 0.2, distancia: 2.2, bombilla: false });
  // teclado con teclas, ratón y alfombrilla
  const teclado = new THREE.Group();
  bloque(0.56, 0.022, 0.18, ctx.mat.plastico('#2b2d33', { roughness: 0.4 }), 0, 0, 0, 0.008, teclado);
  teclado.add(ctx.instancias(new ctx.RoundedBoxGeometry(1, 1, 1, 2, 0.15), ctx.mat.plastico('#e6e3dc', { roughness: 0.5 }), 60, (i, o) => { const f = Math.floor(i / 15), c = i % 15; o.pos = [-0.25 + c * 0.0357, 0.03, -0.065 + f * 0.043]; o.esc = [0.031, 0.016, 0.036]; }));
  pon(teclado, 0.25, 0.77, -0.68);
  bloque(0.36, 0.006, 0.28, ctx.superficie('tela', { color: '#23283a', hilos: 60 }), 0.82, 0.77, -0.72, 0.003);
  pon(ctx.esfera(0.04, ctx.mat.plastico('#e6e3dc', { roughness: 0.3 }), 16), 0.82, 0.785, -0.7).scale.set(0.8, 0.45, 1.2);
  // taza con vapor
  pon(ctx.torno([[0, 0], [0.055, 0], [0.06, 0.12], [0.052, 0.12], [0.048, 0.01], [0, 0.01]], ctx.mat.ceramica(CORAL)), -0.25, 0.77, -0.75);
  const vapor = ctx.vapor({ origen: [-0.25, 0.9, -0.75], cantidad: 26, altura: 0.5, ancho: 0.05, tam: 0.12, opacidad: 0.25, velocidad: 0.35 });
  sala.add(vapor);
  // lámpara de mesa (encendida desde el principio)
  const mLamp = ctx.mat.metal('#2f3138', { roughness: 0.35 });
  pon(ctx.cilindroBisel(0.08, 0.025, mLamp, { centrar: false }), 1.55, 0.77, -1.2);
  sala.add(ctx.tubo([[1.55, 0.79, -1.2], [1.52, 1.2, -1.22], [1.38, 1.36, -1.1]], 0.012, mLamp, 20));
  const pantallaLamp = pon(ctx.cono(0.1, 0.13, mLamp, 24), 1.36, 1.32, -1.08); pantallaLamp.rotation.set(0.5, 0, 0.6);
  const lampara = ctx.practica([1.33, 1.25, -1.05], { color: CALIDO, intensidad: 2.5, distancia: 3, radio: 0.028, brillo: 6 });
  // micro con brazo articulado y filtro
  const mMetal = ctx.mat.metal('#2c2d33', { roughness: 0.3 });
  sala.add(ctx.tubo([[-0.55, 0.78, -1.3], [-0.55, 1.5, -1.25], [-0.2, 1.62, -1.15], [0.05, 1.45, -1.25]], 0.016, mMetal, 32));
  const micro = pon(ctx.cilindroBisel(0.055, 0.22, ctx.mat.cepillado('#8b8f98')), 0.07, 1.32, -1.28); micro.rotation.x = 0.35;
  const filtro = pon(ctx.toro(0.08, 0.008, mNegro), 0.12, 1.33, -1.12); filtro.rotation.y = 0.3;
  pon(ctx.cilindro(0.075, 0.075, 0.002, new THREE.MeshStandardMaterial({ color: '#222', transparent: true, opacity: 0.5, side: THREE.DoubleSide })), 0.12, 1.33, -1.12).rotation.set(Math.PI / 2, 0.3, 0);
  // silla gaming
  const mSilla = ctx.mat.plastico('#2a2c36', { roughness: 0.5 });
  bloque(0.52, 0.09, 0.5, mSilla, 0.6, 0.46, -1.72, 0.04);
  bloque(0.5, 0.72, 0.09, mSilla, 0.6, 0.55, -2.0, 0.06);
  bloque(0.36, 0.5, 0.095, ctx.mat.plastico(CORAL, { roughness: 0.5 }), 0.6, 0.68, -1.995, 0.05);
  bloque(0.05, 0.42, 0.05, ctx.mat.metal('#888', { roughness: 0.3 }), 0.6, 0.03, -1.72, 0.01);
  [0, 1.26, 2.51, 3.77, 5.03].forEach(a => { const p = pon(ctx.caja(0.3, 0.03, 0.05, mNegro, 0.01), 0.6 + Math.sin(a) * 0.15, 0.05, -1.72 + Math.cos(a) * 0.15); p.rotation.y = a + Math.PI / 2; });
  // el creador (figura de plastilina con sudadera, pelo y cascos)
  const mRopa = ctx.mat.arcilla(MOSTAZA, { roughness: 0.75 }), mPiel = ctx.mat.arcilla('#f0b48e', { roughness: 0.7 });
  const creador = new THREE.Group();
  pon(ctx.torno([[0, 0], [0.2, 0], [0.22, 0.2], [0.2, 0.42], [0.13, 0.52], [0, 0.54]], mRopa, 32), 0, 0, 0, creador);
  pon(ctx.cilindro(0.06, 0.07, 0.08, mPiel, 16), 0, 0.55, 0, creador);
  const cabeza = pon(ctx.esfera(0.16, mPiel, 24), 0, 0.72, 0, creador);
  const pelo = pon(ctx.esfera(0.168, ctx.mat.arcilla('#2a1d17', { roughness: 0.8 }), 24), 0, 0.77, -0.03, creador); pelo.scale.set(1, 0.72, 1);
  [-0.055, 0.055].forEach(x => pon(ctx.esfera(0.02, ctx.mat.brillante('#16171c'), 10), x, 0.74, 0.145, creador));
  const sonrisa = pon(ctx.toro(0.04, 0.008, ctx.mat.arcilla('#7a3326'), Math.PI), 0, 0.68, 0.145, creador); sonrisa.rotation.z = Math.PI;
  const cascos = pon(ctx.toro(0.175, 0.016, ctx.mat.plastico(NEGRO, { roughness: 0.3 }), Math.PI), 0, 0.73, 0, creador); cascos.rotation.y = Math.PI / 2;
  [-1, 1].forEach(s => { const c = pon(ctx.cilindroBisel(0.06, 0.05, ctx.mat.plastico(CORAL, { roughness: 0.35 }), { bisel: 0.015 }), s * 0.17, 0.71, 0, creador); c.rotation.z = Math.PI / 2; });
  const brazoI = new THREE.Group(); pon(brazoI, -0.2, 0.42, 0.02, creador);
  pon(ctx.cilindroBisel(0.05, 0.3, mRopa, { bisel: 0.04 }), 0, -0.13, 0.06, brazoI).rotation.x = -1.1;
  const brazo = new THREE.Group(); pon(brazo, 0.21, 0.44, 0, creador);
  pon(ctx.cilindroBisel(0.05, 0.34, mRopa, { bisel: 0.04 }), 0, 0.15, 0, brazo);
  pon(ctx.esfera(0.055, mPiel, 14), 0, 0.34, 0, brazo);
  pon(creador, 0.6, 0.52, -1.7);
  // cables por el suelo (detalle)
  const mCable = ctx.mat.goma('#111214');
  sala.add(ctx.tubo([[-0.45, 0.74, -1.35], [-0.6, 0.3, -1.5], [-0.9, 0.03, -1.2], [-1.4, 0.03, 0.1], [-1.5, 0.03, 0.6]], 0.012, mCable, 40));
  sala.add(ctx.tubo([[1.6, 0.74, -1.3], [1.9, 0.2, -1.1], [2.1, 0.03, -0.3], [2.35, 0.03, 0.0]], 0.012, mCable, 40));

  // ---------- cámara en trípode (primer término) ----------
  const tripode = new THREE.Group();
  const mTri = ctx.mat.metal('#1f2025', { roughness: 0.4 });
  [0, 2.1, 4.2].forEach(a => tripode.add(ctx.tubo([[0, 1.15, 0], [Math.sin(a) * 0.5, 0.0, Math.cos(a) * 0.5]], 0.016, mTri, 2)));
  bloque(0.1, 0.1, 0.1, mTri, 0, 1.12, 0, 0.02, tripode);
  bloque(0.36, 0.25, 0.2, ctx.mat.plastico(NEGRO, { roughness: 0.45 }), 0, 1.22, 0, 0.05, tripode);
  bloque(0.14, 0.09, 0.03, ctx.mat.plastico('#30323a', { roughness: 0.3 }), -0.08, 1.36, 0.11, 0.02, tripode);
  const objetivo = pon(ctx.cilindroBisel(0.1, 0.26, ctx.mat.plastico('#24252b', { roughness: 0.3 }), { bisel: 0.02 }), 0, 1.345, -0.22, tripode); objetivo.rotation.x = Math.PI / 2;
  pon(ctx.toro(0.098, 0.006, ctx.mat.metal('#a7aab2', { roughness: 0.2 })), 0, 1.345, -0.29, tripode);
  pon(ctx.cilindro(0.085, 0.085, 0.01, ctx.mat.vidrio('#7b8cff', { transmision: false, opacity: 0.85 }), 24), 0, 1.345, -0.352, tripode).rotation.x = Math.PI / 2;
  const tally = ctx.mat.luz(NEON, 0);
  pon(ctx.esfera(0.022, tally, 12), 0.12, 1.49, -0.06, tripode);
  pon(tripode, 0.6, 0, 1.25);

  // ---------- cajas de luz (principal y relleno) ----------
  const creadorPos = new THREE.Vector3(0.6, 1.25, -1.7);
  const softbox = (x, z, alto) => {
    const s = new THREE.Group();
    sala.add(ctx.tubo([[x, 0, z], [x, alto, z]], 0.018, mTri, 2));
    [0, 2.1, 4.2].forEach(a => sala.add(ctx.tubo([[x, 0.35, z], [x + Math.sin(a) * 0.35, 0, z + Math.cos(a) * 0.35]], 0.014, mTri, 2)));
    const caja = ctx.cilindro(0.16, 0.5, 0.42, ctx.mat.plastico('#202128', { roughness: 0.6, side: THREE.DoubleSide }), 4, true);
    caja.rotation.set(Math.PI / 2, 0, 0); caja.rotation.y = Math.PI / 4; s.add(caja);
    const difusor = ctx.mat.luz('#fff4e2', 0);
    const cara = ctx.plano(0.7, 0.7, difusor); cara.position.z = 0.212; cara.castShadow = false; s.add(cara);
    s.position.set(x, alto + 0.05, z);
    sala.add(s); s.lookAt(creadorPos);
    return { difusor, grupo: s };
  };
  const sbClave = softbox(-1.55, 0.55, 1.75);
  const sbRelleno = softbox(2.4, -0.05, 1.6);
  const clave = new THREE.SpotLight('#fff1dc', 0, 10, 0.7, 0.65, 1.5);
  clave.position.set(-1.5, 1.85, 0.45); clave.target.position.copy(creadorPos);
  clave.castShadow = true; clave.shadow.mapSize.set(2048, 2048); clave.shadow.bias = -0.0004; clave.shadow.normalBias = 0.02; clave.shadow.radius = 4;
  sala.add(clave, clave.target);
  const relleno = new THREE.SpotLight('#dfe9ff', 0, 10, 0.9, 0.8, 1.5);
  relleno.position.set(2.3, 1.7, -0.1); relleno.target.position.copy(creadorPos);
  sala.add(relleno, relleno.target);
  const billboards = [];
  // haces de luz visibles: niebla suave hecha con sprites aditivos a lo largo del haz (sin bordes duros)
  const texNiebla = ctx.textura2d(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.5, 'rgba(255,255,255,0.3)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const haz = (desde, color, n = 22) => {
    const b = creadorPos.clone().add(new THREE.Vector3(0, -0.2, 0.15));
    // (planos transparentes que miran a cámara en pintar: los Sprite entrarían en el pase de AO)
    const m = new THREE.MeshBasicMaterial({ map: texNiebla, color: new THREE.Color(color), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, sp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
      sp.position.copy(desde).lerp(b, u); const k = 0.35 + 1.1 * u; sp.scale.set(k, k, 1);
      sp.castShadow = false; sp.receiveShadow = false;
      sala.add(sp); billboards.push(sp);
    }
    return m;
  };
  const hazClave = haz(new THREE.Vector3(-1.5, 1.82, 0.5), '#ffe2b8'), hazRelleno = haz(new THREE.Vector3(2.35, 1.67, -0.07), '#cfe0ff', 16);
  // motas de polvo en el haz de la principal
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 34, centro: [-0.4, 1.5, -0.6], zona: [1.6, 1.0, 1.4], tam: 0.006, color: '#fff0d8', intensidad: 1.4, velocidad: 0.6, semilla: 12 });
  sala.add(motas);

  // ---------- contraluz de color: tira LED violeta (neón) y tubo cian ----------
  const tira = ctx.neon([[X0 + 0.15, ALTO - 0.12, Z0 + 0.07], [X1 - 0.1, ALTO - 0.12, Z0 + 0.07]], { color: VIOLETA, grosor: 0.018, intensidad: 0 });
  sala.add(tira);
  const tiraL = ctx.neon([[X0 + 0.07, ALTO - 0.12, Z0 + 0.1], [X0 + 0.07, ALTO - 0.12, Z1 - 0.1]], { color: VIOLETA, grosor: 0.018, intensidad: 0 });
  sala.add(tiraL);
  const tubo = ctx.neon([[2.65, 0.18, -0.95], [2.65, 1.85, -0.95]], { color: CIAN, grosor: 0.03, intensidad: 0 });
  sala.add(tubo);
  bloque(0.18, 0.04, 0.18, mTri, 2.65, 0, -0.95, 0.02);
  bloque(0.06, 0.06, 0.06, mTri, 2.65, 1.85, -0.95, 0.015);
  const luzVioleta = ctx.practica([-0.5, 2.6, -1.7], { color: VIOLETA, intensidad: 0, distancia: 6, bombilla: false });
  const luzVioleta2 = ctx.practica([-2.6, 2.6, 0.2], { color: VIOLETA, intensidad: 0, distancia: 5, bombilla: false });
  const luzCian = ctx.practica([2.4, 1.0, -0.8], { color: CIAN, intensidad: 0, distancia: 4.5, bombilla: false });

  // ---------- neón «REC» de tubo (pared del fondo) ----------
  const placa = bloque(1.5, 0.62, 0.025, new THREE.MeshPhysicalMaterial({ color: '#0d0f18', roughness: 0.25, clearcoat: 1 }), 1.25, 1.95, Z0 + 0.04, 0.02);
  const rec = ctx.neonTexto('REC', { tam: 0.34, color: NEON, grosor: 0.012, intensidad: 0 });
  pon(rec, 1.42, 2.26, Z0 + 0.09);
  const punto = ctx.neon(Array.from({ length: 24 }, (_, i) => [0.75 + Math.cos(i / 24 * Math.PI * 2) * 0.09, 2.26 + Math.sin(i / 24 * Math.PI * 2) * 0.09, Z0 + 0.09]), { color: NEON, grosor: 0.012, intensidad: 0, cerrado: true });
  sala.add(punto);
  const luzNeon = ctx.practica([1.25, 2.2, Z0 + 0.6], { color: NEON, intensidad: 0, distancia: 3.5, bombilla: false });
  void placa;

  // ---------- textos ----------
  const tema = 'oscuro';
  const pasos = [
    { ini: 1.0, fin: 2.55, r: ctx.rotulo({ num: 1, texto: 'Luz principal', sub: 'caja de luz a 45°', en: sbClave.grupo, desplaza: [0, 0.3, 0], lado: V ? 'derecha' : 'izquierda', dist: 150, tema, acento: CALIDO }) },
    { ini: 2.6, fin: 4.15, r: ctx.rotulo({ num: 2, texto: 'Relleno', sub: 'suaviza las sombras', en: sbRelleno.grupo, desplaza: [0, 0.3, 0], lado: 'izquierda', dist: 150, tema, acento: '#cfe0ff' }) },
    { ini: 4.2, fin: 5.75, r: ctx.rotulo({ num: 3, texto: 'Contraluz de color', sub: 'separa del fondo', en: [2.65, 1.5, -0.95], lado: 'izquierda', dist: 170, tema, acento: CIAN, ...(V ? { fijo: [0.66, 0.2] } : {}) }) },
    { ini: 5.8, fin: 7.35, r: ctx.rotulo({ num: 4, texto: 'Neón de marca', sub: 'el toque final', en: [0.62, 1.75, Z0 + 0.1], lado: V ? 'abajo' : 'izquierda', dist: V ? 150 : 210, tema, acento: NEON }) },
    { ini: 7.4, fin: 9.3, r: ctx.rotulo({ num: 5, texto: '¡Grabando!', sub: 'piloto rojo encendido', en: tripode, desplaza: [0.12, 1.5, -0.06], lado: 'izquierda', dist: 170, tema, acento: NEON, ...(V ? { fijo: [0.62, 0.28] } : {}) }) },
  ];
  const titulo = ctx.titulo({ texto: 'Tu set,\npaso a paso', etiqueta: 'Estudio de grabación', sub: '5 luces · 1 creador · 0 excusas',
    ...(V ? { pos: 'arriba', y: 0.08, tam: 104 } : { pos: 'arriba-izquierda', x: 0.06, y: 0.14, tam: 100 }),
    color: '#fff4e6', colorSub: 'rgba(255,244,230,0.75)', colorEtiqueta: CALIDO, sombra: true, fuente: '"Archivo Black"', peso: 400, espaciado: -0.02 });

  // ---------- cámara ----------
  const cam = ctx.camaraPorClaves([
    { t: 0.0, pos: V ? [3.9, 2.8, 5.4] : [5.4, 3.6, 6.6], mira: [0.3, 1.1, -0.6], fov: 30, apertura: 0.28 },
    { t: 2.6, pos: V ? [3.0, 2.2, 4.2] : [4.0, 2.7, 5.4], mira: [0.3, 1.25, -0.9], fov: 30, apertura: 0.3 },
    { t: 5.0, pos: [1.45, 1.55, 2.75], mira: [0.62, 1.3, -1.5], fov: 30, foco: [0.6, 1.3, -1.6], apertura: 0.7 },
    { t: 6.6, pos: [0.15, 2.0, 3.0], mira: [1.0, 2.05, -1.9], fov: 30, foco: [1.3, 2.2, -2.1], apertura: 0.6 },
    { t: 8.6, pos: [2.3, 1.62, 3.3], mira: [0.55, 1.3, -1.5], fov: 28, foco: [0.6, 1.3, -1.6], apertura: 0.55 },
    { t: 12, pos: V ? [4.9, 3.2, 8.4] : [8.4, 5.2, 11.6], mira: V ? [0.4, 1.0, -0.6] : [-4.5, 0.45, -1.0], fov: 29.5, apertura: 0.25 },
  ], { continuo: true, ease: 'suave', deriva: 0.05 });

  const encender = (t, t0, parpadeo = false) => {
    const p = ctx.entre(t, t0, t0 + 0.3, 'salida');
    if (!parpadeo || p >= 1 || p <= 0) return p;
    const s = Math.floor((t - t0) * 30);
    return [0.9, 0.05, 0.8, 0.0, 1, 0.2, 1, 1, 1, 1][s] ?? 1;
  };
  const neonCol = (o, c, k) => o.userData.material ? o.userData.material.color.set(c).lerp(new THREE.Color('#ffffff'), 0.25).multiplyScalar(k) : o.material.color.set(c).lerp(new THREE.Color('#ffffff'), 0.3).multiplyScalar(k);

  return {
    momentos: [
      { t: 0.4, nombre: 'set de noche (lámpara y ventana)' },
      { t: 1.9, nombre: 'paso 1 · luz principal' },
      { t: 3.5, nombre: 'paso 2 · relleno' },
      { t: 5.1, nombre: 'paso 3 · contraluz de color' },
      { t: 6.7, nombre: 'paso 4 · neón' },
      { t: 8.4, nombre: 'paso 5 · ¡grabando!' },
      { t: 11.6, nombre: 'plano final con título' },
    ],
    pintar(t) {
      cam(t);
      const k1 = encender(t, 1.0), k2 = encender(t, 2.6), k3 = encender(t, 4.2), k4 = encender(t, 5.8, true), k5 = encender(t, 7.4);
      clave.intensity = 55 * k1; sbClave.difusor.color.set('#fff4e2').multiplyScalar(0.05 + 3.2 * k1);
      billboards.forEach(b => b.quaternion.copy(ctx.camara.quaternion));
      hazClave.opacity = 0.045 * k1; hazRelleno.opacity = 0.025 * k2;
      relleno.intensity = 16 * k2; sbRelleno.difusor.color.set('#eef3ff').multiplyScalar(0.05 + 2.2 * k2);
      hemi.intensity = 0.45 + 0.25 * k2;
      neonCol(tira, VIOLETA, 0.05 + 4.5 * k3); neonCol(tiraL, VIOLETA, 0.05 + 4.5 * k3); neonCol(tubo, CIAN, 0.05 + 5 * k3);
      luzVioleta.luz.intensity = 4 * k3; luzVioleta2.luz.intensity = 2.5 * k3; luzCian.luz.intensity = 3 * k3;
      const zumbido = 0.94 + 0.06 * Math.sin(t * 9);
      neonCol(rec, NEON, 0.05 + 5.5 * k4 * zumbido); neonCol(punto, NEON, 0.05 + 5.5 * k4 * (k5 > 0.5 ? (Math.floor(t * 2.2) % 2 ? 0.25 : 1) : zumbido));
      luzNeon.luz.intensity = 2.2 * k4;
      mPantalla.emissiveIntensity = 0.15 + 0.95 * k5; luzPantalla.luz.intensity = 0.2 + 0.8 * k5;
      tally.color.set(NEON).multiplyScalar(k5 * (Math.floor(t * 2.2) % 2 ? 0.4 : 7));
      lampara.luz.intensity = 2.5 * (1 - 0.4 * k2);
      vapor.pintar(t, 1); motas.pintar(t, k1);
      // el creador: respira, mira a cámara y saluda al empezar a grabar
      const saludo = ctx.entre(t, 7.55, 7.95, 'salida') * (1 - ctx.entre(t, 9.6, 10.1));
      brazo.rotation.z = ctx.mezcla(-2.6, -0.45 + Math.sin(t * 9) * 0.35, saludo);
      creador.rotation.y = ctx.mezcla(0.12 * Math.sin(t * 1.3), 0.25, ctx.entre(t, 7.3, 7.8)) ;
      cabeza.rotation.x = 0.05 * Math.sin(t * 1.7);
      creador.scale.y = 1 + 0.012 * Math.sin(t * 2.2);
      pasos.forEach(o => o.r.mostrar(Math.min(ctx.entre(t, o.ini + 0.1, o.ini + 0.85), 1 - ctx.entre(t, o.fin - 0.3, o.fin))));
      titulo.mostrar(ctx.entre(t, 9.6, 10.8));
    },
  };
}
