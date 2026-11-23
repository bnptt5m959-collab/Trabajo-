// Estilo 02 · «Plano que se vuelve food truck»
// Sobre una mesa de dibujo, un plano técnico (planta + alzado) se traza solo con una punta de luz;
// de él se levanta un food truck: chasis y ruedas que caen botando, carrocería que crece, persiana
// que sube con el interior encendido, toldo de rayas con bombillas, letrero de neón y pizarra.
// Al completarse, la luz de la mesa baja a «atardecer» y se encienden todas las luces del camión.
// Dirección de arte: madera oscura, papel con relieve, útiles de dibujo (regla, escuadra de acrílico,
// lápiz, goma, cinta), pintura turquesa con barniz y cromados; prácticas cálidas con bloom; DOF.

export const ajustes = {
  duracion: 12, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.05,
    bloom: { fuerza: 0.45, radio: 0.55, umbral: 1.8 },
    ao: { fuerza: 1.1, radio: 0.3 },
    grano: 0.04, vineta: 0.42, aberracion: 0.9,
    grado: { contraste: 1.06, saturacion: 1.06, sombras: '#1f3f66', luces: '#ffcf96', mezcla: 0.1 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  const V = ctx.vertical;
  // ---------- Paleta cerrada ----------
  const PAPEL = '#f3efe5', TINTA = '#2457b3', TURQUESA = '#1f9e93', CREMA = '#f4ead5', CORAL = '#ef6a4c',
    AMBAR = '#ffb347', OSCURO = '#24262c', NOGAL = '#5a3a24';
  const rnd = ctx.azar(202);

  ctx.fondo({ tipo: 'radial', centro: '#3a2a20', medio: '#1a1310', borde: '#070505', y: 0.4, radio: 0.85 });
  ctx.niebla('#0d0a08', 12, 30);
  ctx.entornoEstudio({
    fondo: '#1c1612', suelo: '#060504', intensidad: 0.8,
    paneles: [
      { pos: [6, 6, 4], tam: [3, 3], color: '#fff0d8', fuerza: 3 }, { pos: [-7, 3, 2], tam: [1, 7], color: '#cfe0ff', fuerza: 2.4 },
      { pos: [2, 3, -8], tam: [6, 2], color: AMBAR, fuerza: 1.5 }, { pos: [0, 9, 0], tam: [6, 6], color: '#ffffff', fuerza: 0.8 },
    ],
  });
  const L = ctx.luces.estudio({ direccion: [6, 9, 4], area: 6.5, intensidad: 1, ambiente: 0.45, relleno: 0.35, contra: 0.9, color: '#ffe6c4', colorRelleno: '#9fb8ff', cielo: '#c8d4ff', tierra: '#3a2a20' });
  L.clave.target.position.set(0, 0.8, 0);

  // ---------- la mesa (nogal) y el papel con el plano ----------
  const mesa = ctx.superficie('madera', { color: '#7a5034', oscuro: NOGAL, vetas: 14, repetir: [3, 3], tam: 1024 });
  mesa.roughness = 0.55;
  const tablero = ctx.caja(26, 0.4, 18, mesa, 0.05); tablero.position.y = -0.2; escena.add(tablero);

  const PW = 9, PH = 6, CW = 2048, CH = 1366;
  const aC = (x, z) => [(x + PW / 2) / PW * CW, (z + PH / 2) / PH * CH];
  const esc = CW / PW;
  const trazos = [];
  const poli = (pts, cerrar = false) => trazos.push((cerrar ? [...pts, pts[0]] : pts).map(p => aC(...p)));
  const rect = (x0, z0, x1, z1) => poli([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], true);
  const discontinua = (x0, z0, x1, z1) => {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.12);
    for (let i = 0; i < n; i += 2) trazos.push([aC(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n), aC(x0 + (x1 - x0) * (i + 1) / n, z0 + (z1 - z0) * (i + 1) / n)]);
  };
  const cota = (a, b, txt, off) => trazos.push({ cota: true, a: aC(...a), b: aC(...b), txt, off });
  rect(-2.2, -1.0, 1.2, 1.0); rect(1.2, -0.95, 2.2, 0.95);
  [[-1.4, 1], [-1.4, -1], [1.5, 1], [1.5, -1]].forEach(([x, s]) => rect(x - 0.38, s * 0.84, x + 0.38, s * 1.1));
  poli([[-1.6, 0.95], [0.6, 0.95]]); poli([[-1.6, 1.05], [0.6, 1.05]]);
  discontinua(-1.75, 1.05, -1.75, 1.9); discontinua(-1.75, 1.9, 0.75, 1.9); discontinua(0.75, 1.9, 0.75, 1.05);
  rect(-1.45, 0.3, -0.65, 0.85); rect(-0.5, 0.3, 0.05, 0.85); rect(-2.05, -0.9, -1.25, -0.3); rect(0.15, -0.9, 0.85, -0.4);
  rect(-2.35, 1.75, -1.65, 2.05);
  cota([-2.2, -1.15], [2.2, -1.15], '4,40 m', -60);
  cota([-2.35, -1.0], [-2.35, 1.0], '2,00 m', -60);
  const eX = x => -4.05 + (x + 2.2) * 0.4, eZ = y => -1.5 - y * 0.4;
  poli([[eX(-2.2), eZ(0.6)], [eX(2.25), eZ(0.6)]]);
  poli([[eX(-2.2), eZ(0.65)], [eX(1.2), eZ(0.65)], [eX(1.2), eZ(2.6)], [eX(-2.2), eZ(2.6)]], true);
  poli([[eX(1.2), eZ(0.65)], [eX(2.2), eZ(0.65)], [eX(2.2), eZ(1.5)], [eX(1.9), eZ(2.1)], [eX(1.2), eZ(2.1)]]);
  poli([[eX(-1.6), eZ(1.35)], [eX(0.6), eZ(1.35)], [eX(0.6), eZ(2.2)], [eX(-1.6), eZ(2.2)]], true);
  [-1.4, 1.5].forEach(x => { const c = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; c.push([eX(x) + Math.cos(a) * 0.15, eZ(0.38) + Math.sin(a) * 0.15]); } poli(c); });
  const largo = tr => tr.cota ? Math.hypot(tr.b[0] - tr.a[0], tr.b[1] - tr.a[1]) : tr.reduce((s, p, i) => i ? s + Math.hypot(p[0] - tr[i - 1][0], p[1] - tr[i - 1][1]) : 0, 0);
  const total = trazos.reduce((s, tr) => s + largo(tr), 0);

  const fondoPapel = document.createElement('canvas'); fondoPapel.width = CW; fondoPapel.height = CH;
  {
    const g = fondoPapel.getContext('2d');
    g.fillStyle = PAPEL; g.fillRect(0, 0, CW, CH);
    const r = ctx.azar(9);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,100,70,${0.02 + r() * 0.04})`; g.fillRect(r() * CW, r() * CH, 1 + r() * 2, 1 + r() * 6); }   // fibras
    const mancha = g.createRadialGradient(CW * 0.83, CH * 0.22, 60, CW * 0.83, CH * 0.22, 120);       // cerco de café
    mancha.addColorStop(0, 'rgba(150,100,50,0)'); mancha.addColorStop(0.85, 'rgba(150,100,50,0.12)'); mancha.addColorStop(1, 'rgba(150,100,50,0)');
    g.fillStyle = mancha; g.fillRect(CW * 0.83 - 130, CH * 0.22 - 130, 260, 260);
    for (let x = 0; x <= PW * 4; x++) { g.strokeStyle = x % 4 ? 'rgba(120,160,220,0.2)' : 'rgba(80,130,210,0.36)'; g.lineWidth = x % 4 ? 1 : 2; g.beginPath(); g.moveTo(x * esc / 4, 0); g.lineTo(x * esc / 4, CH); g.stroke(); }
    for (let z = 0; z <= PH * 4; z++) { g.strokeStyle = z % 4 ? 'rgba(120,160,220,0.2)' : 'rgba(80,130,210,0.36)'; g.lineWidth = z % 4 ? 1 : 2; g.beginPath(); g.moveTo(0, z * esc / 4); g.lineTo(CW, z * esc / 4); g.stroke(); }
    g.strokeStyle = TINTA; g.lineWidth = 4; g.strokeRect(40, 40, CW - 80, CH - 80);
    g.lineWidth = 3; g.strokeRect(CW - 600, CH - 210, 560, 170);
    g.beginPath(); g.moveTo(CW - 600, CH - 140); g.lineTo(CW - 40, CH - 140); g.stroke();
    g.fillStyle = TINTA; g.font = '800 44px Inter'; g.fillText('FOOD TRUCK 01', CW - 575, CH - 160);
    g.font = '600 30px Inter'; g.fillText('Planta y alzado · E 1:25', CW - 575, CH - 100); g.fillText('Hoja 1 de 2', CW - 575, CH - 60);
  }
  const tx = ctx.textura2d(CW, CH, g => g.drawImage(fondoPapel, 0, 0));
  const gp = tx.userData.lienzo.getContext('2d');
  let ultimo = -1, puntaPx = [0, 0];
  function dibujarPlano(p, relleno) {
    const k = Math.round(p * 600) + Math.round(relleno * 40) * 1000;
    if (k === ultimo) return;
    ultimo = k;
    gp.drawImage(fondoPapel, 0, 0);
    if (relleno > 0) {
      gp.fillStyle = `rgba(36,87,179,${0.14 * relleno})`;
      trazos.forEach(tr => { if (!tr.cota && tr.length === 5) { gp.beginPath(); tr.forEach(([x, y], i) => (i ? gp.lineTo(x, y) : gp.moveTo(x, y))); gp.fill(); } });
      gp.globalAlpha = relleno; gp.fillStyle = TINTA; gp.textAlign = 'center'; gp.font = '700 26px Inter';
      [['PLANCHA', -1.05, 0.62], ['FREIDORA', -0.22, 0.62], ['NEVERA', -1.65, -0.55], ['FREGADERO', 0.5, -0.6], ['CABINA', 1.7, 0.05]].forEach(([t, x, z]) => { const [cx, cy] = aC(x, z); gp.fillText(t, cx, cy); });
      gp.font = '700 30px Inter';
      let [cx, cy] = aC(-0.5, 1.55); gp.fillText('TOLDO', cx, cy);
      [cx, cy] = aC(-3.2, -1.25); gp.fillText('ALZADO LATERAL', cx, cy);
      gp.globalAlpha = 1; gp.textAlign = 'left';
    }
    let resto = p * total;
    gp.strokeStyle = TINTA; gp.lineCap = 'round'; gp.lineJoin = 'round';
    for (const tr of trazos) {
      if (resto <= 0) break;
      const Lt = largo(tr), q = Math.min(1, resto / Lt);
      resto -= Lt;
      if (tr.cota) {
        const { a, b, txt, off } = tr, vert = Math.abs(b[0] - a[0]) < 1, o = vert ? [off, 0] : [0, off];
        gp.lineWidth = 3;
        gp.beginPath(); gp.moveTo(a[0] + o[0], a[1] + o[1]); gp.lineTo(a[0] + o[0] + (b[0] - a[0]) * q, a[1] + o[1] + (b[1] - a[1]) * q); gp.stroke();
        [a, b].forEach(e => { gp.beginPath(); gp.moveTo(e[0] + o[0] * 0.6, e[1] + o[1] * 0.6); gp.lineTo(e[0] + o[0] * 1.3, e[1] + o[1] * 1.3); gp.stroke(); });
        puntaPx = [a[0] + o[0] + (b[0] - a[0]) * q, a[1] + o[1] + (b[1] - a[1]) * q];
        if (q >= 1) { gp.save(); gp.fillStyle = TINTA; gp.font = '600 30px Inter'; gp.textAlign = 'center'; gp.translate((a[0] + b[0]) / 2 + o[0] * 1.45, (a[1] + b[1]) / 2 + o[1] * 1.45); if (vert) gp.rotate(-Math.PI / 2); gp.fillText(txt, 0, 10); gp.restore(); }
        continue;
      }
      gp.lineWidth = 5;
      gp.beginPath(); gp.moveTo(...tr[0]);
      let d = q * Lt, ux = tr[0][0], uy = tr[0][1];
      for (let i = 1; i < tr.length && d > 0; i++) {
        const [x0, y0] = tr[i - 1], [x1, y1] = tr[i], s = Math.hypot(x1 - x0, y1 - y0) || 1e-6, f = Math.min(1, d / s);
        ux = x0 + (x1 - x0) * f; uy = y0 + (y1 - y0) * f; gp.lineTo(ux, uy); d -= s;
      }
      gp.stroke();
      puntaPx = [ux, uy];
    }
    tx.needsUpdate = true;
  }
  const relPapel = ctx.texturas.papel({ repetir: [3, 2], tam: 512 });
  const papel = ctx.plano(PW, PH, new THREE.MeshStandardMaterial({ map: tx, normalMap: relPapel.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.88 }));
  papel.rotation.x = -Math.PI / 2; papel.position.y = 0.012; escena.add(papel);
  // cinta de carrocero en las esquinas
  const mCinta = new THREE.MeshStandardMaterial({ color: '#e9dcb6', roughness: 0.8, transparent: true, opacity: 0.92 });
  [[-PW / 2, -PH / 2, 0.6], [PW / 2, -PH / 2, -0.6], [-PW / 2, PH / 2, -0.6], [PW / 2, PH / 2, 0.6]].forEach(([x, z, a]) => { const c = ctx.caja(0.9, 0.006, 0.28, mCinta, 0.002); c.position.set(x, 0.016, z); c.rotation.y = a; escena.add(c); });
  // punta de luz que traza el plano
  const punta = ctx.esfera(0.022, ctx.mat.luz('#9fd0ff', 3), 16); punta.castShadow = false; escena.add(punta);
  const luzPunta = ctx.practica([0, 0.3, 0], { color: '#8fc4ff', intensidad: 0, distancia: 2.2, bombilla: false });
  const chispas = ctx.particulas({ tipo: 'chispas', cantidad: 26, centro: [0, 0.04, 0], tam: 0.004, color: '#9fd0ff', intensidad: 3, velocidad: 0.7, semilla: 5 });
  escena.add(chispas);

  // ---------- útiles de dibujo alrededor ----------
  const regla = ctx.caja(5.2, 0.03, 0.42, ctx.superficie('cepillado', { color: '#c9ccd2', rugosidad: 0.28, repetir: [4, 1] }), 0.01);
  regla.position.set(-0.4, 0.03, 3.45); regla.rotation.y = 0.04; escena.add(regla);
  const marcas = ctx.instancias(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#1b1c20', roughness: 0.6 }), 52, (i, o) => { o.pos = [-2.9 + i * 0.1, 0.046, 3.27 + (i % 5 ? 0.03 : 0.07) / 2]; o.esc = [0.008, 0.002, i % 5 ? 0.05 : 0.11]; });
  regla.parent.add(marcas); marcas.rotation.y = 0.04;
  const escuadraF = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(2.2, 0), new THREE.Vector2(0, 1.6)]);
  escuadraF.holes.push(new THREE.Path([new THREE.Vector2(0.3, 0.25), new THREE.Vector2(1.3, 0.25), new THREE.Vector2(0.3, 0.98)]));
  const escuadra = ctx.extruir(escuadraF, 0.03, ctx.mat.vidrio('#ffb38a', { thickness: 0.05, roughness: 0.05 }), 0.008);
  escuadra.rotation.x = -Math.PI / 2; escuadra.rotation.z = -0.35; escuadra.position.set(3.3, 0.03, 1.7); escuadra.castShadow = true; escena.add(escuadra);
  const lapiz = new THREE.Group();
  lapiz.add(ctx.cilindro(0.05, 0.05, 1.5, ctx.mat.plastico('#f2c14e', { roughness: 0.4 }), 6));
  const punta2 = ctx.cono(0.05, 0.22, ctx.mat.mate('#e9c9a0'), 6); punta2.position.y = 0.86; lapiz.add(punta2);
  const mina = ctx.cono(0.018, 0.08, ctx.mat.mate('#2b2b2b'), 12); mina.position.y = 0.96; lapiz.add(mina);
  const virola = ctx.cilindro(0.053, 0.053, 0.12, ctx.mat.metal('#c8c2b0', { roughness: 0.3 }), 16); virola.position.y = -0.81; lapiz.add(virola);
  const goma = ctx.cilindroBisel(0.05, 0.14, ctx.mat.goma('#f08a8a'), { bisel: 0.02 }); goma.position.y = -0.94; lapiz.add(goma);
  lapiz.rotation.set(0, 0, Math.PI / 2); lapiz.rotation.y = 0.6; lapiz.position.set(4.6, 0.06, -1.4); escena.add(lapiz);
  const gomaB = ctx.caja(0.55, 0.16, 0.28, ctx.mat.goma('#f2f0ea'), 0.04); gomaB.position.set(-4.9, 0.08, -2.4); gomaB.rotation.y = 0.4; escena.add(gomaB);
  const taza = ctx.torno([[0, 0], [0.32, 0], [0.36, 0.55], [0.33, 0.56], [0.3, 0.06], [0, 0.06]], ctx.mat.ceramica('#f2ede4'));
  taza.position.set(4.9, 0, -3.3); escena.add(taza);
  const cafe = ctx.cilindro(0.31, 0.31, 0.01, ctx.mat.liquido('#3a1f12'), 32); cafe.position.set(4.9, 0.47, -3.3); escena.add(cafe);
  const vaporTaza = ctx.vapor({ origen: [4.9, 0.5, -3.3], cantidad: 24, altura: 1.2, ancho: 0.18, tam: 0.4, opacidad: 0.18, velocidad: 0.3 }); escena.add(vaporTaza);

  // ---------- el food truck ----------
  const camion = new THREE.Group(); camion.position.y = 0.014; escena.add(camion);
  const mCuerpo = ctx.mat.brillante(TURQUESA, { roughness: 0.22, clearcoatRoughness: 0.06 });
  const mCrema = ctx.mat.brillante(CREMA, { roughness: 0.3 }), mOscuro = ctx.mat.plastico(OSCURO, { roughness: 0.45 });
  const mGoma = ctx.mat.goma('#18181c'), mCromo = ctx.mat.metal('#e0e3e8', { roughness: 0.12 }), mVidrio = ctx.mat.vidrio('#cfe6ff', { thickness: 0.1, roughness: 0.02 });
  const pon = (o, x, y, z, padre) => { o.position.set(x, y, z); padre.add(o); return o; };
  // 1 · chasis y ruedas con radios
  const chasis = pon(ctx.caja(4.2, 0.2, 1.7, mOscuro, 0.04), 0, 0.55, 0, camion);
  const tex = ctx.textura2d(256, 64, (g, w, h) => { g.fillStyle = '#1c1c20'; g.fillRect(0, 0, w, h); g.fillStyle = '#0c0c0e'; for (let i = 0; i < 32; i++) g.fillRect(i * 8, 0, 4, h); });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(4, 1);
  const ruedas = [[-1.4, 0.92], [-1.4, -0.92], [1.5, 0.92], [1.5, -0.92]].map(([x, z]) => {
    const r = new THREE.Group();
    const neum = ctx.cilindroBisel(0.38, 0.28, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), { bisel: 0.07 }); neum.rotation.x = Math.PI / 2; r.add(neum);
    const llanta = ctx.cilindroBisel(0.21, 0.3, mCromo, { bisel: 0.03 }); llanta.rotation.x = Math.PI / 2; r.add(llanta);
    const tapacubos = ctx.esfera(0.08, mCromo, 20); tapacubos.scale.set(1, 1, 0.5); tapacubos.position.z = Math.sign(z) * 0.15; r.add(tapacubos);
    for (let k = 0; k < 6; k++) { const ra = ctx.caja(0.03, 0.17, 0.02, mOscuro, 0.008); const a = k / 6 * Math.PI * 2; ra.position.set(Math.sin(a) * 0.12, Math.cos(a) * 0.12, Math.sign(z) * 0.155); ra.rotation.z = -a; r.add(ra); }
    const arco = ctx.toro(0.47, 0.05, mOscuro, Math.PI); arco.position.set(0, 0, 0); arco.scale.set(1, 1, 3); r.add(arco);
    return pon(r, x, 0.38, z, camion);
  });
  // 2 · carrocería
  const carro = new THREE.Group(); carro.position.y = 0.65; camion.add(carro);
  pon(ctx.caja(3.4, 1.95, 2.0, mCuerpo, 0.12), -0.5, 0.975, 0, carro);
  pon(ctx.caja(3.46, 0.22, 2.06, mCrema, 0.06), -0.5, 1.84, 0, carro);
  pon(ctx.caja(3.46, 0.14, 2.06, mCrema, 0.05), -0.5, 0.12, 0, carro);
  [0.36, 1.68].forEach(y => pon(ctx.caja(3.48, 0.03, 2.08, mCromo, 0.012), -0.5, y, 0, carro));       // molduras cromadas
  carro.add(ctx.instancias(new THREE.SphereGeometry(1, 10, 8), mCromo, 44, (i, o) => { const lado = i < 22 ? 1 : -1, k = i % 22; o.pos = [-2.1 + k * 0.15, 0.27, lado * 1.012]; o.esc = 0.018; }));
  carro.add(ctx.instancias(new ctx.RoundedBoxGeometry(1, 1, 1, 2, 0.3), mOscuro, 7, (i, o) => { o.pos = [-2.05 + i * 0.09, 1.1, -1.005]; o.esc = [0.045, 0.5, 0.02]; }));   // rejilla lateral
  pon(ctx.caja(1.0, 1.45, 1.9, mCuerpo, 0.14), 1.7, 0.725, 0, carro);
  pon(ctx.caja(0.05, 0.62, 1.55, mVidrio, 0.025), 2.2, 1.08, 0, carro).castShadow = false;
  [-0.955, 0.955].forEach(z => { pon(ctx.caja(0.6, 0.5, 0.03, mVidrio, 0.015), 1.72, 1.07, z, carro).castShadow = false; });
  [-1, 1].forEach(s => { pon(ctx.tubo([[2.1, 1.0, s * 0.96], [2.18, 1.05, s * 1.18]], 0.012, mOscuro, 4), 0, 0, 0, carro); pon(ctx.caja(0.04, 0.18, 0.12, mCromo, 0.02), 2.18, 1.1, s * 1.2, carro); });
  const faro = ctx.mat.luz('#fff3d0', 0.2);
  [-0.65, 0.65].forEach(z => { const f = pon(ctx.cilindroBisel(0.1, 0.06, faro, { bisel: 0.02 }), 2.22, 0.38, z, carro); f.rotation.z = Math.PI / 2; const aro = pon(ctx.toro(0.105, 0.016, mCromo), 2.23, 0.38, z, carro); aro.rotation.y = Math.PI / 2; });
  carro.add(ctx.instancias(new ctx.RoundedBoxGeometry(1, 1, 1, 2, 0.3), mCromo, 6, (i, o) => { o.pos = [2.21, 0.33, -0.38 + i * 0.15]; o.esc = [0.03, 0.22, 0.05]; }));   // rejilla frontal
  pon(ctx.caja(0.14, 0.16, 2.0, mCromo, 0.05), 2.25, 0.03, 0, carro);
  const matricula = ctx.textura2d(256, 64, (g, w, h) => { g.fillStyle = '#f5f5f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a4ea8'; g.fillRect(0, 0, 30, h); g.fillStyle = '#111'; g.font = '800 38px Inter'; g.textAlign = 'center'; g.fillText('1325 TCO', w / 2 + 14, 46); });
  pon(ctx.plano(0.42, 0.1, new THREE.MeshStandardMaterial({ map: matricula, roughness: 0.4 })), 2.33, 0.08, 0, carro).rotation.y = Math.PI / 2;
  // tejado: aparato de aire y chimenea con humo
  pon(ctx.caja(0.7, 0.18, 0.6, ctx.mat.metal('#c9ccd2', { roughness: 0.35 }), 0.04), -1.6, 2.05, -0.3, carro);
  const chimenea = pon(ctx.cilindroBisel(0.07, 0.5, mCromo, { bisel: 0.02, centrar: false }), -1.9, 1.95, 0.45, carro);
  const humo = ctx.vapor({ origen: [-2.4, 3.2, 0.45], cantidad: 30, altura: 1.6, ancho: 0.22, tam: 0.45, opacidad: 0.22, color: '#d9d2c8', velocidad: 0.35 }); escena.add(humo);
  void chimenea;
  // ventana de servicio: interior iluminado con estantes, persiana y mostrador con detalles
  const interior = ctx.textura2d(640, 250, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd79a'); gr.addColorStop(1, '#c46e3c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,35,20,0.6)'; g.fillRect(0, 70, w, 8); g.fillRect(0, 160, w, 10);
    const r = ctx.azar(4);
    for (let i = 0; i < 9; i++) { g.fillStyle = ['#c0392b', '#f2c14e', '#2f9c95', '#e9e4da'][i % 4]; g.fillRect(30 + i * 66, 30 + (i % 2) * 6, 26, 40 - (i % 2) * 6); }
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(60,30,20,0.55)'; g.fillRect(40 + i * 86, 78, 6, 30 + (i % 3) * 10); g.beginPath(); g.arc(43 + i * 86, 115 + (i % 3) * 10, 13, 0, 7); g.fill(); }
    g.fillStyle = '#2b2d33'; g.fillRect(400, 180, 200, 50); g.fillStyle = '#fff'; g.font = '700 32px Inter'; g.fillText('¡ABIERTO!', 418, 216);
    void r;
  });
  const mInterior = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: interior, emissiveIntensity: 0.12 });
  pon(ctx.plano(2.2, 0.85, mInterior), -0.5, 1.125, 0.98, carro);
  const luzInterior = ctx.practica([0, 0, 0], { color: '#ffb46a', intensidad: 0, distancia: 3, bombilla: false });
  [[2.34, 0.08, -0.5, 1.59], [2.34, 0.08, -0.5, 0.66], [0.08, 0.93, -1.63, 1.125], [0.08, 0.93, 0.63, 1.125]].forEach(([w, h, x, y]) => pon(ctx.caja(w, h, 0.07, mCromo, 0.02), x, y, 1.02, carro));
  const geoPersiana = new THREE.BoxGeometry(2.2, 0.85, 0.03); geoPersiana.translate(0, -0.425, 0);
  const lamas = ctx.textura2d(64, 256, (g, w, h) => { g.fillStyle = '#dfe3e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa1a8'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 4); });
  const persiana = pon(ctx.malla(geoPersiana, ctx.mat.metal('#ffffff', { map: lamas, roughness: 0.4, metalness: 0.6 })), -0.5, 1.55, 1.02, carro);
  const mostrador = new THREE.Group(); pon(mostrador, -0.5, 0.7, 1.17, carro);
  const tablaM = ctx.superficie('madera', { color: '#c98f5a', oscuro: '#8a5a34', vetas: 6, repetir: [2, 1] });
  pon(ctx.caja(2.35, 0.06, 0.34, tablaM, 0.02), 0, 0, 0, mostrador);
  [[-0.8, '#c0392b'], [-0.66, '#f2c14e']].forEach(([x, c]) => pon(ctx.torno([[0, 0], [0.04, 0], [0.04, 0.14], [0.02, 0.18], [0.008, 0.22], [0, 0.22]], ctx.mat.brillante(c)), x, 0.03, 0.05, mostrador));
  pon(ctx.caja(0.16, 0.12, 0.1, mCromo, 0.02), 0.65, 0.09, 0.04, mostrador);
  pon(ctx.cilindroBisel(0.05, 0.04, ctx.mat.metal('#d4b26a', { roughness: 0.2 }), { centrar: false }), 0.9, 0.03, 0.06, mostrador);
  // 3 · toldo de tela de rayas con fleco y guirnalda de bombillas
  const rayas = ctx.textura2d(512, 64, (g, w, h) => { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#fbf6ec' : CORAL; g.fillRect(i * w / 12, 0, w / 12 + 1, h); } });
  const relTela = ctx.texturas.tela({ hilos: 80, repetir: [4, 1] });
  const toldo = new THREE.Group(); toldo.position.set(-0.5, 2.42, 1.02); camion.add(toldo);
  const lona = new THREE.Group(); lona.rotation.x = 0.32; toldo.add(lona);
  const geoLona = new THREE.BoxGeometry(2.6, 0.03, 0.95, 24, 1, 8); geoLona.translate(0, 0, 0.475);
  { const p = geoLona.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - Math.sin(p.getZ(i) / 0.95 * Math.PI) * 0.04); geoLona.computeVertexNormals(); }
  lona.add(ctx.malla(geoLona, new THREE.MeshStandardMaterial({ map: rayas, normalMap: relTela.normalMap, roughness: 0.85 })));
  const volante = ctx.textura2d(512, 64, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#fbf6ec' : CORAL; g.beginPath(); g.moveTo(i * w / 12, 0); g.lineTo((i + 1) * w / 12, 0); g.lineTo((i + 1) * w / 12, h * 0.45); g.arc((i + 0.5) * w / 12, h * 0.45, w / 24, 0, Math.PI); g.fill(); }
  });
  const fleco = ctx.plano(2.6, 0.24, new THREE.MeshStandardMaterial({ map: volante, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 }));
  fleco.position.set(0, -0.12, 0.95); fleco.castShadow = true; fleco.rotation.x = -0.32; lona.add(fleco);
  [-1.25, 1.25].forEach(x => { const b = ctx.tubo([[x, -0.02, 0.0], [x, -0.1, 0.9]], 0.012, mCromo, 4); lona.add(b); });
  const puntosB = []; for (let i = 0; i < 11; i++) { const u = i / 10; puntosB.push([-1.2 + u * 2.4, -0.28 - Math.sin(Math.PI * u) * 0.08, 0.97]); }
  const cable = ctx.tubo(puntosB.map(([x, y, z]) => [x, y + 0.035, z]), 0.006, mOscuro, 40); lona.add(cable);
  const bombillas = ctx.instancias(new THREE.SphereGeometry(0.038, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), puntosB.length, (i, o) => { o.pos = puntosB[i]; o.color = '#2a2018'; });
  bombillas.castShadow = false; lona.add(bombillas);
  const ENC = new THREE.Color('#ffcf86').multiplyScalar(6), APAG = new THREE.Color('#2a2018');
  const luzToldo = ctx.practica([-0.5, 1.9, 1.9], { color: '#ffc27a', intensidad: 0, distancia: 3.2, bombilla: false });
  // 4 · letrero de neón en el tejado
  const letrero = new THREE.Group(); letrero.position.set(-0.5, 2.68, 0.1); camion.add(letrero);
  [-1.1, 1.1].forEach(x => pon(ctx.caja(0.06, 0.25, 0.06, mOscuro, 0.015), x, 0.12, 0, letrero));
  pon(ctx.caja(3.1, 0.55, 0.1, ctx.mat.brillante('#1a1b20', { roughness: 0.3 }), 0.05), 0, 0.5, 0, letrero);
  const neonL = ctx.neonTexto('LA PLANCHA', { tam: 0.26, color: AMBAR, grosor: 0.009, intensidad: 0 });
  pon(neonL, 0, 0.5, 0.07, letrero);
  // 5 · pizarra del menú y taburetes
  const pizarraTx = ctx.textura2d(320, 460, (g, w, h) => {
    g.fillStyle = '#23302c'; g.fillRect(0, 0, w, h);
    const r = ctx.azar(8); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 3, 1); }
    g.strokeStyle = '#c98f5a'; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
    g.fillStyle = '#f6c445'; g.font = '800 56px Inter'; g.textAlign = 'center'; g.fillText('MENÚ', w / 2, 92);
    g.fillStyle = '#f2efe6'; g.font = '600 28px Inter'; g.textAlign = 'left';
    [['Tacos', '3 €'], ['Burrito', '6 €'], ['Nachos', '4 €'], ['Agua', '1 €']].forEach(([a, b], i) => {
      g.fillText(a, 34, 170 + i * 66); g.textAlign = 'right'; g.fillText(b, w - 34, 170 + i * 66); g.textAlign = 'left';
      g.fillStyle = 'rgba(242,239,230,0.35)'; g.fillRect(34, 182 + i * 66, w - 68, 2); g.fillStyle = '#f2efe6';
    });
  });
  const pizarra = new THREE.Group(); pizarra.position.set(-2.15, 0.014, 2.05); pizarra.rotation.y = 0.45; escena.add(pizarra);
  const cara = new THREE.Group(); cara.position.set(0, 0, 0.12); cara.rotation.x = -0.2; pizarra.add(cara);
  const marcoM = ctx.superficie('madera', { color: '#b07a4a', oscuro: '#6b4226', vetas: 5 });
  pon(ctx.caja(0.64, 0.94, 0.035, marcoM, 0.012), 0, 0.47, -0.02, cara);
  pon(ctx.plano(0.56, 0.82, new THREE.MeshStandardMaterial({ map: pizarraTx, roughness: 0.9 })), 0, 0.47, 0.0, cara);
  const trasera = pon(ctx.caja(0.64, 0.94, 0.035, marcoM, 0.012), 0, 0.46, -0.12, pizarra); trasera.rotation.x = 0.2;
  const taburetes = [[0.2, 2.0], [0.75, 2.05]].map(([x, z]) => {
    const t = new THREE.Group();
    pon(ctx.cilindroBisel(0.17, 0.06, ctx.mat.brillante(CORAL), { bisel: 0.025 }), 0, 0.68, 0, t);
    pon(ctx.cilindro(0.025, 0.025, 0.66, mCromo, 12), 0, 0.33, 0, t);
    pon(ctx.cilindroBisel(0.15, 0.03, mCromo, { centrar: false }), 0, 0, 0, t);
    pon(ctx.toro(0.11, 0.012, mCromo), 0, 0.3, 0, t).rotation.x = Math.PI / 2;
    pon(t, x, 0.014, z, escena);
    return t;
  });

  // ---------- rótulos y título ----------
  const tema = 'oscuro';
  // dos tandas: 5,8-7,5 s (la cámara mira la ventana) y 7,7-9,3 s (la cámara pasa al lado izquierdo)
  // en vertical cabe menos de ancho: rótulos más pequeños, siempre por encima de la pieza
  const RV = V ? { lado: 'arriba', dist: 90, tam: 21 } : {};
  const rot = [
    { r: ctx.rotulo({ num: 2, texto: 'Ventana de servicio', sub: 'la persiana sube', en: [-1.5, 1.25, 1.05], lado: 'izquierda', dist: 160, tema, acento: AMBAR, ...RV }), a: 5.8, b: 7.4 },
    { r: ctx.rotulo({ num: 3, texto: 'Toldo', sub: 'con 11 bombillas', en: [0.75, 2.3, 1.85], lado: V ? 'arriba' : 'derecha', dist: 140, tema, acento: AMBAR, ...RV , ...(V ? { lado: 'izquierda' } : {}) }), a: 6.1, b: 7.5 },
    { r: ctx.rotulo({ num: 1, texto: 'Chasis y ruedas', sub: 'base de furgoneta', en: [1.5, 0.5, 1.2], lado: 'izquierda', dist: 120, tema, acento: AMBAR, ...RV , ...(V ? { lado: 'izquierda' } : {}) }), a: 6.3, b: 7.6 },
    { r: ctx.rotulo({ num: 4, texto: 'Letrero de neón', sub: 'se ve desde lejos', en: [-1.55, 3.18, 0.2], lado: 'izquierda', dist: 150, tema, acento: AMBAR, ...RV }), a: 7.9, b: 9.3 },
    { r: ctx.rotulo({ num: 5, texto: 'Menú', sub: 'precios a la vista', en: [-2.15, 1.0, 2.15], lado: 'izquierda', dist: 130, tema, acento: AMBAR, ...RV }), a: 8.1, b: 9.3 },
  ];
  const titulo = ctx.titulo({ texto: 'Del plano\nal food truck', etiqueta: 'Diseño y montaje', sub: 'La Plancha · cocina sobre ruedas',
    ...(V ? { pos: 'arriba', y: 0.07, tam: 96 } : { pos: 'arriba-izquierda', x: 0.06, y: 0.12, tam: 104 }),
    color: '#fff4e6', colorSub: 'rgba(255,244,230,0.75)', colorEtiqueta: AMBAR, sombra: true, fuente: '"Archivo Black"', peso: 400, espaciado: -0.02 });

  // ---------- cámara ----------
  const cam = ctx.camaraPorClaves([
    { t: 0.0, pos: [0.6, 9.6, 3.4], mira: [-0.3, 0, 0.1], fov: 36, giro: -6, apertura: 0.35 },
    { t: 1.5, pos: [1.6, 8.2, 4.6], mira: [-0.2, 0.3, 0.1], fov: 34, giro: 0, apertura: 0.35 },
    { t: 3.3, pos: [6.6, 3.6, 7.2], mira: [0, 1.1, 0.2], fov: 32, apertura: 0.35 },
    { t: 5.6, pos: [2.4, 1.85, 5.2], mira: [-0.5, 1.4, 0.9], fov: 30, foco: [-0.5, 1.3, 1.1], apertura: 0.6 },
    { t: 8.2, pos: [-3.8, 2.4, 7.0], mira: [-0.4, 1.75, 0.6], fov: 32, apertura: 0.45 },
    { t: 12, pos: V ? [5.0, 2.6, 9.6] : [5.4, 2.4, 9.0], mira: V ? [-0.1, 1.5, 0.3] : [-2.75, 1.2, 0.0], fov: 31, foco: [0, 1.2, 0.8], apertura: 0.35 },
  ], { continuo: true, ease: 'suave', deriva: 0.05 });

  const pv = new THREE.Vector3();
  return {
    momentos: [
      { t: 0.7, nombre: 'el plano se traza con luz' },
      { t: 2.3, nombre: 'chasis y ruedas caen' },
      { t: 3.9, nombre: 'carrocería, persiana y toldo' },
      { t: 5.6, nombre: 'atardecer: se encienden las luces' },
      { t: 6.9, nombre: 'rótulos 2 y 3' },
      { t: 8.8, nombre: 'rótulos 1, 4 y 5' },
      { t: 11.6, nombre: 'plano final con título' },
    ],
    pintar(t) {
      cam(t);
      const pp = ctx.entre(t, 0.1, 1.55, 'suave');
      dibujarPlano(pp, ctx.entre(t, 1.4, 1.8));
      // la punta de luz sigue al trazo
      const traza = pp > 0 && pp < 1;
      const px = puntaPx[0] / CW * PW - PW / 2, pz = puntaPx[1] / CH * PH - PH / 2;
      punta.visible = traza; punta.position.set(px, 0.05, pz);
      luzPunta.luz.intensity = traza ? 0.9 : 0; luzPunta.luz.position.set(px, 0.3, pz);
      chispas.position.set(px, 0, pz); chispas.pintar(t, traza ? 1 : 0);
      vaporTaza.pintar(t, 1);
      ctx.entrada(chasis, t, 1.6, { dur: 0.45, desde: 'escala' });
      ruedas.forEach((r, i) => ctx.entrada(r, t, 1.7 + i * 0.08, { dur: 0.55, desde: 'arriba', dist: 1.4 }));
      const sube = ctx.entre(t, 2.05, 2.85);
      carro.visible = sube > 0.001;
      carro.scale.set(1, Math.max(0.001, ctx.ease.rebote(sube)), 1);
      const abre = ctx.entre(t, 3.1, 3.7, 'suave');
      persiana.scale.y = Math.max(0.04, 1 - abre);
      mInterior.emissiveIntensity = 0.12 + 1.2 * abre;
      carro.updateMatrixWorld(); pv.set(-0.5, 1.15, 1.6); carro.localToWorld(pv); luzInterior.luz.position.copy(pv);
      luzInterior.luz.intensity = 3 * abre;
      ctx.entrada(mostrador, t, 3.55, { dur: 0.4, desde: 'escala' });
      const despliega = ctx.entre(t, 3.5, 4.1);
      toldo.visible = despliega > 0.001;
      toldo.scale.set(1, 1, Math.max(0.001, ctx.ease.rebote(despliega)));
      ctx.entrada(letrero, t, 4.0, { dur: 0.7, desde: 'arriba', dist: 2.2 });
      ctx.entrada(pizarra, t, 4.35, { dur: 0.5, desde: 'escala' });
      taburetes.forEach((tb, i) => ctx.entrada(tb, t, 4.5 + i * 0.12, { dur: 0.5, desde: 'arriba', dist: 1 }));
      // atardecer: baja la luz de la mesa y se enciende el camión
      const noche = ctx.entre(t, 4.4, 6.0, 'suave');
      L.clave.intensity = 2.6 * ctx.mezcla(1, 0.32, noche); L.hemi.intensity = 0.45 * ctx.mezcla(1, 0.45, noche); L.contra.intensity = 0.9 * ctx.mezcla(1, 1.6, noche);
      const nE = ctx.entre(t, 4.7, 5.2);
      const tart = nE > 0 && nE < 1 ? (Math.floor(t * 24) % 3 ? 1 : 0.1) : nE;
      neonL.userData.material.color.set(AMBAR).lerp(new THREE.Color('#ffffff'), 0.25).multiplyScalar(0.05 + 5 * tart * (0.95 + 0.05 * Math.sin(t * 8)));
      const bOn = ctx.entre(t, 5.0, 5.8);
      for (let i = 0; i < puntosB.length; i++) bombillas.setColorAt(i, ctx.entre(bOn, i / puntosB.length * 0.8, i / puntosB.length * 0.8 + 0.2) > 0.5 ? ENC : APAG);
      bombillas.instanceColor.needsUpdate = true;
      toldo.updateMatrixWorld(); pv.set(0, -0.3, 1.0); lona.localToWorld(pv); luzToldo.luz.position.copy(pv);
      luzToldo.luz.intensity = 2.5 * bOn;
      faro.color.set('#fff3d0').multiplyScalar(0.2 + 6 * noche);
      humo.pintar(t, ctx.entre(t, 4.0, 5.0));
      rot.forEach(o => o.r.mostrar(ctx.entre(t, o.a, o.a + 0.7) - ctx.entre(t, o.b - 0.35, o.b)));
      titulo.mostrar(ctx.entre(t, 9.6, 10.8));
    },
  };
}
