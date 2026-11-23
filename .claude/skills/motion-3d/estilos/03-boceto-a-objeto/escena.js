// Estilo 03 · «Cómo nace una guitarra eléctrica» (del boceto al objeto)
// Guion: de noche, bajo un flexo, el lápiz dibuja el boceto con guías azules (0-1,6 s) · encima
// aparece la guitarra en 3D por capas con su rótulo: cuerpo, mástil, pastillas y puente, cuerdas,
// mandos (1,7-4,4 s) · se levanta del papel y se pone de pie (4,4-6 s) · macro a lo largo de las
// cuerdas con cambio de foco: pastillas → trastes (6-8,8 s) · plano de anuncio (8,8-12 s).
// Dirección de arte: estudio de diseño a oscuras, flexo cálido (luz práctica con sombra) contra luz
// fría de ventana, mesa de nogal con regla, lápices, taza y virutas; guitarra en laca sunburst
// con barniz, arce, palosanto, nácar y cromo; recortes ámbar y cian en el plano final.
export const ajustes = {
  duracion: 12, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.05,
    bloom: { fuerza: 0.38, radio: 0.5, umbral: 2.6 },
    ao: { fuerza: 1.1, radio: 0.3 },
    grano: 0.045, vineta: 0.48, aberracion: 1.0,
    grado: { contraste: 1.07, saturacion: 1.06, sombras: '#1d3550', luces: '#ffc98a', mezcla: 0.12 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  const V = ctx.vertical;
  // ---- Paleta: noche (fondo), nogal (mesa), papel, sunburst (ámbar → rojo → tabaco), cian (recorte) ----
  const P = { papel: '#f6f1e6', grafito: '52,52,60', guia: '70,120,210', arce: '#e8bf80', cromo: '#dfe2e6', negro: '#141417', crema: '#f2e8d4' };
  const AMBAR = '#ffb45c', CIAN = '#57d6ff', TINTA = '#1c1b20';

  ctx.fondo({ tipo: 'radial', centro: '#2b211b', medio: '#120f12', borde: '#050507', y: 0.4, radio: 0.85 });
  ctx.niebla('#0a0809', 12, 30);
  ctx.entornoEstudio({
    fondo: '#141015', suelo: '#060506', intensidad: 0.9,
    paneles: [
      { pos: [-3, 6, 2], tam: [2.5, 2.5], color: '#ffd9a8', fuerza: 2.2 },     // el flexo
      { pos: [7, 3, -2], tam: [1.2, 8], color: '#bfe0ff', fuerza: 3.5 },     // ventana fría: línea de brillo en la laca
      { pos: [-6, 2.5, -4], tam: [1, 7], color: AMBAR, fuerza: 3 },
      { pos: [5, 2.5, -6], tam: [1, 7], color: CIAN, fuerza: 3 },
      { pos: [0, 2, 8], tam: [6, 3], color: '#ffffff', fuerza: 0.8 },
    ],
  });
  const hemi = new THREE.HemisphereLight('#4a5f8c', '#1a1210', 0.55); escena.add(hemi);
  const ventana = new THREE.DirectionalLight('#9cc4ff', 0.9); ventana.position.set(6, 5, -4); escena.add(ventana);
  // flexo: luz práctica con sombra (charco cálido sobre el papel)
  const foco = new THREE.SpotLight('#ffd2a0', 26, 14, 0.56, 0.8, 1.6);
  foco.position.set(-2.6, 5.2, -1.6); foco.target.position.set(0.2, 0, 0.3);
  foco.castShadow = true; foco.shadow.mapSize.set(2048, 2048); foco.shadow.radius = 4; foco.shadow.bias = -0.0004; foco.shadow.normalBias = 0.02;
  escena.add(foco, foco.target);
  // luces del plano final (cuando la guitarra se pone de pie)
  const claveG = ctx.luzArea('#fff0dc', 0, 2.4, 2.4, [-2.6, 4.2, 4.4], [0, 2.35, 0.3]);
  const recA = ctx.luzArea(AMBAR, 0, 0.6, 4, [-3.4, 2.6, -2.4], [0, 2.35, 0]);
  const recC = ctx.luzArea(CIAN, 0, 0.6, 4, [3.4, 2.6, -2.4], [0, 2.35, 0]);

  // ---- Mesa de nogal y objetos ----
  ctx.suelo({ material: ctx.superficie('madera', { color: '#7a4f30', oscuro: '#3a2416', vetas: 14, repetir: [3, 6], semilla: 5, material: { roughness: 0.55 } }) });

  // ---------------- medidas de la guitarra (vista frontal en el plano XY; z = grosor) ----------------
  const contorno = [[-1.95, 0.0], [-1.88, 0.42], [-1.62, 0.66], [-1.25, 0.62], [-0.95, 0.46], [-0.62, 0.52], [-0.32, 0.63],
    [-0.12, 0.56], [-0.2, 0.4], [-0.42, 0.22], [-0.44, -0.18], [-0.26, -0.42], [-0.24, -0.53], [-0.42, -0.6], [-0.72, -0.53],
    [-0.98, -0.45], [-1.3, -0.6], [-1.7, -0.62], [-1.9, -0.4]];
  const golpeador = [[-1.55, 0.36], [-1.1, 0.42], [-0.75, 0.37], [-0.45, 0.3], [-0.36, 0.12], [-0.36, -0.2], [-0.55, -0.33],
    [-1.0, -0.36], [-1.42, -0.42], [-1.66, -0.22]];
  const pala = [[1.6, 0.1], [1.78, 0.17], [2.1, 0.21], [2.22, 0.13], [2.16, -0.02], [1.78, -0.12], [1.6, -0.1]];
  const suave = (pts, n = 90) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal').getSpacedPoints(n).map(v => [v.x, v.y]);
  const cuerpoPts = suave(contorno, 120), golpePts = suave(golpeador, 80);
  const CEJUELA = 1.6, PUENTE = -1.25, ESCALA = CEJUELA - PUENTE;
  const trastes = Array.from({ length: 21 }, (_, i) => CEJUELA - ESCALA * (1 - Math.pow(2, -(i + 1) / 12)));
  const pastillas = [[-0.56, 0.0], [-0.8, 0.0], [-1.03, 0.03]];
  const mandos = [[-1.2, -0.36], [-1.42, -0.41], [-1.62, -0.28]];
  const clavijas = Array.from({ length: 6 }, (_, i) => [1.73 + i * 0.075, 0.12 + i * 0.012]);
  const cuerdaY = (i, enPuente) => (i - 2.5) * (enPuente ? 0.04 : 0.028);

  // ---------------- el boceto a lápiz (mismas medidas) ----------------
  const PW = 8, PH = 5.4, CW = 2048, CH = 1382;
  const aC = (bx, by) => [(bx + PW / 2) / PW * CW, (-by + PH / 2) / PH * CH];
  const aMundo = ([cx, cy]) => [cx / CW * PW - PW / 2, cy / CH * PH - PH / 2];
  const rnd = ctx.azar(23);
  const trazos = [];
  const poli = (pts, guia = false, cerrar = false) => trazos.push({ pts: (cerrar ? [...pts, pts[0]] : pts).map(p => aC(...p)), guia });
  const circulo = (c, r, n = 20) => { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } poli(pts); };
  const rect = (cx, cy, w, h) => poli([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]], false, true);
  poli([[-2.3, 0], [2.5, 0]], true);
  poli([[-1.95, -0.85], [-1.95, 0.85]], true); poli([[CEJUELA, -0.5], [CEJUELA, 0.5]], true); poli([[PUENTE, -0.8], [PUENTE, 0.8]], true);
  poli(cuerpoPts);
  poli([[-0.44, 0.1], [CEJUELA, 0.1]]); poli([[-0.44, -0.1], [CEJUELA, -0.1]]);
  poli(pala, false, true);
  poli(golpePts);
  trastes.filter((_, i) => i % 2 === 0).forEach(x => poli([[x, -0.1], [x, 0.1]]));
  pastillas.forEach(([x, y]) => rect(x, y, 0.08, 0.26));
  rect(PUENTE, 0, 0.16, 0.32);
  mandos.forEach(c => circulo(c, 0.055));
  clavijas.forEach(c => circulo(c, 0.025, 10));
  for (let i = 0; i < 6; i++) poli([[PUENTE, cuerdaY(i, true)], [CEJUELA, cuerdaY(i, false)]], true);
  const largo = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
  trazos.forEach(tr => { tr.L = largo(tr.pts); tr.temblor = [0, 1].map(() => tr.pts.map(() => [(rnd() - 0.5) * 3, (rnd() - 0.5) * 3])); });
  const total = trazos.reduce((s, tr) => s + tr.L, 0);

  const base = document.createElement('canvas'); base.width = CW; base.height = CH;
  {
    const g = base.getContext('2d');
    g.fillStyle = P.papel; g.fillRect(0, 0, CW, CH);
    const r2 = ctx.azar(5);
    for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(120,110,90,${0.02 + r2() * 0.05})`; g.fillRect(r2() * CW, r2() * CH, 2, 2); }
    // cuadrícula azul muy suave de papel técnico
    g.strokeStyle = 'rgba(80,130,210,0.08)'; g.lineWidth = 2;
    for (let x = 0; x < CW; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); }
    for (let y = 0; y < CH; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
    g.fillStyle = `rgba(${P.grafito},0.8)`;
    g.font = '600 46px Inter';
    g.save(); g.translate(170, 190); g.rotate(-0.04); g.fillText('guitarra eléctrica · boceto 3', 0, 0); g.restore();
    g.font = '500 34px Inter';
    g.save(); g.translate(CW - 620, CH - 170); g.rotate(-0.03); g.fillText('escala 648 mm · 21 trastes', 0, 0); g.restore();
    g.save(); g.translate(230, CH - 210); g.rotate(0.03); g.fillText('cuerpo de aliso, sunburst →', 0, 0); g.restore();
    g.fillStyle = 'rgba(214,72,40,0.85)'; g.font = '700 34px Inter';
    g.save(); g.translate(CW - 520, 230); g.rotate(0.05); g.fillText('¡más fina la pala!', 0, 0); g.restore();
  }
  const tx = ctx.textura2d(CW, CH, g => g.drawImage(base, 0, 0));
  const gp = tx.userData.lienzo.getContext('2d');
  let ultimo = -1, punta = aC(-2.3, 0);
  function boceto(p) {
    const k = Math.round(p * 600);
    if (k === ultimo) return;
    ultimo = k;
    gp.drawImage(base, 0, 0);
    gp.lineCap = 'round'; gp.lineJoin = 'round';
    let resto = p * total;
    for (const tr of trazos) {
      if (resto <= 0) break;
      const hasta = Math.min(tr.L, resto); resto -= tr.L;
      tr.temblor.forEach((tem, pasada) => {
        gp.strokeStyle = tr.guia ? `rgba(${P.guia},${pasada ? 0.0 : 0.45})` : `rgba(${P.grafito},${pasada ? 0.4 : 0.88})`;
        gp.lineWidth = tr.guia ? 2.5 : (pasada ? 3 : 5);
        gp.beginPath(); gp.moveTo(tr.pts[0][0] + tem[0][0], tr.pts[0][1] + tem[0][1]);
        let d = hasta;
        for (let i = 1; i < tr.pts.length && d > 0; i++) {
          const [x0, y0] = tr.pts[i - 1], [x1, y1] = tr.pts[i];
          const s = Math.hypot(x1 - x0, y1 - y0) || 1e-6, f = Math.min(1, d / s);
          const x = x0 + (x1 - x0) * f + tem[i][0], y = y0 + (y1 - y0) * f + tem[i][1];
          gp.lineTo(x, y);
          if (pasada === 0) punta = [x, y];
          d -= s;
        }
        gp.stroke();
      });
    }
    tx.needsUpdate = true;
  }
  const papelM = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.92 });
  const papel = ctx.plano(PW, PH, papelM);
  papel.rotation.x = -Math.PI / 2; papel.position.set(0, 0.022, 0); papel.rotation.z = 0.03;
  escena.add(papel);
  const hoja = ctx.caja(PW, 0.02, PH, ctx.mat.papel(P.papel), 0.004); hoja.position.set(0, 0.01, 0); hoja.rotation.y = 0.03; escena.add(hoja);

  // lápiz que dibuja + otros objetos de la mesa (densidad)
  const mMadL = ctx.mat.mate('#e9c9a0'), mMina = ctx.mat.mate('#2a2a2a');
  const hacerLapiz = (colorBarra) => {
    const c = new THREE.Group();
    const barra = ctx.cilindro(0.06, 0.06, 1.5, ctx.mat.plastico(colorBarra, { roughness: 0.35, clearcoat: 0.8 }), 6); barra.position.y = 0.95;
    const madera = ctx.cono(0.06, 0.2, mMadL, 6); madera.rotation.x = Math.PI; madera.position.y = 0.1;
    const mina = ctx.cono(0.022, 0.06, mMina, 6); mina.rotation.x = Math.PI; mina.position.y = 0.03;
    const anillo = ctx.cilindro(0.062, 0.062, 0.1, ctx.mat.metal('#d6b45a', { roughness: 0.3 }), 12); anillo.position.y = 1.75;
    const gomaL = ctx.cilindroBisel(0.06, 0.12, ctx.mat.mate('#f08da0'), { bisel: 0.02 }); gomaL.position.y = 1.86;
    c.add(barra, madera, mina, anillo, gomaL);
    return c;
  };
  const lapiz = new THREE.Group();
  const lapizC = hacerLapiz('#2b3a55'); lapizC.rotation.set(0.35, 0, -0.55); lapiz.add(lapizC);
  escena.add(lapiz);
  const l2 = hacerLapiz('#c8452c'); l2.rotation.set(0, 0.4, Math.PI / 2); l2.position.set(3.2, 0.07, 2.35); escena.add(l2);
  const l3 = hacerLapiz('#2b3a55'); l3.rotation.set(0, -0.25, Math.PI / 2); l3.position.set(3.4, 0.07, 2.6); escena.add(l3);
  const texRegla = ctx.textura2d(1024, 64, (g, w, h) => {
    g.fillStyle = '#d9dcd2'; g.fillRect(0, 0, w, h); g.fillStyle = '#26262b';
    for (let i = 0; i <= 100; i++) { const x = 12 + i * 10; g.fillRect(x, 0, 1.6, i % 10 === 0 ? 28 : i % 5 === 0 ? 20 : 12); if (i % 10 === 0) { g.font = '600 16px Inter'; g.fillText(String(i / 10), x + 3, 48); } }
  });
  const regla = ctx.caja(4.2, 0.02, 0.38, new THREE.MeshPhysicalMaterial({ map: texRegla, metalness: 0.7, roughness: 0.3, clearcoat: 0.6 }), 0.008);
  regla.position.set(-1.4, 0.032, 2.45); regla.rotation.y = 0.06; escena.add(regla);
  const taza = ctx.torno([[0, 0], [0.44, 0], [0.5, 0.06], [0.52, 0.72], [0.48, 0.74], [0.46, 0.08], [0, 0.08]], ctx.mat.ceramica('#e8e2d6'), 64);
  taza.position.set(-4.7, 0, -1.9); escena.add(taza);
  const asa = ctx.toro(0.18, 0.045, ctx.mat.ceramica('#e8e2d6'), Math.PI * 1.2); asa.position.set(-4.2, 0.4, -1.9); asa.rotation.z = -Math.PI / 2 + 0.6; escena.add(asa);
  const cafe = ctx.cilindro(0.46, 0.46, 0.01, ctx.mat.liquido('#2a160c'), 48); cafe.position.set(-4.7, 0.62, -1.9); escena.add(cafe);
  const vaporT = ctx.vapor({ origen: [-4.7, 0.7, -1.9], cantidad: 30, altura: 1.3, ancho: 0.2, tam: 0.35, color: '#ffe8cf', opacidad: 0.25, velocidad: 0.35 }); escena.add(vaporT);
  const goma = ctx.caja(0.55, 0.16, 0.3, ctx.mat.mate('#f2f0ea', { roughness: 0.8 }), 0.05); goma.position.set(2.6, 0.08, -2.4); goma.rotation.y = 0.5; escena.add(goma);
  const rv = ctx.azar(8);
  const virutas = ctx.instancias(new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI * 1.3), ctx.mat.mate('#cfa77a'), 16, (i, o) => {
    o.pos = [2.2 + rv() * 1.2, 0.03, -2.0 + rv() * 0.9]; o.rot = [Math.PI / 2 + (rv() - 0.5) * 0.6, 0, rv() * 6]; o.esc = 0.7 + rv() * 0.8;
  });
  escena.add(virutas);
  // el flexo (cuerpo + cabeza con bombilla que brilla)
  const flexo = new THREE.Group();
  const mFlexo = ctx.mat.plastico('#1f2a33', { roughness: 0.35, clearcoat: 0.6 });
  const pie = ctx.cilindroBisel(0.5, 0.12, mFlexo, { bisel: 0.04 }); pie.position.y = 0.06; flexo.add(pie);
  const brazo1 = ctx.tubo([[0, 0.1, 0], [0.3, 2.6, 0.2]], 0.045, ctx.mat.metal('#c9ccd2', { roughness: 0.3 }), 8); flexo.add(brazo1);
  const brazo2 = ctx.tubo([[0.3, 2.6, 0.2], [1.6, 3.9, 0.9]], 0.045, ctx.mat.metal('#c9ccd2', { roughness: 0.3 }), 8); flexo.add(brazo2);
  const cabeza = ctx.torno([[0.0, 0.42], [0.18, 0.42], [0.22, 0.3], [0.55, 0.0], [0.5, -0.02], [0.18, 0.26], [0, 0.3]], mFlexo, 48);
  cabeza.position.set(1.6, 3.9, 0.9); cabeza.lookAt(2.6, 0, 1.2); cabeza.rotateX(Math.PI / 2); flexo.add(cabeza);
  const bombilla = ctx.esfera(0.16, ctx.mat.luz('#ffe2b8', 7), 20); bombilla.position.set(1.66, 3.78, 0.93); bombilla.castShadow = false; flexo.add(bombilla);
  flexo.position.set(-4.4, 0, -2.6); flexo.rotation.y = 0.25;
  escena.add(flexo);
  flexo.updateMatrixWorld(true);
  bombilla.getWorldPosition(foco.position);

  // ---------------- la guitarra en 3D ----------------
  const guitarra = new THREE.Group();
  escena.add(guitarra);
  const forma = pts => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  // laca sunburst: centro ámbar → rojo → borde tabaco (mapeada a la caja del cuerpo)
  const sunburst = ctx.textura2d(1024, 640, (g, w, h) => {
    const r = g.createRadialGradient(w * 0.55, h * 0.5, 0, w * 0.55, h * 0.5, w * 0.52);
    r.addColorStop(0, '#f6b545'); r.addColorStop(0.42, '#e88a2a'); r.addColorStop(0.68, '#a8321c'); r.addColorStop(0.86, '#4a1a10'); r.addColorStop(1, '#1d0b07');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
    const r2 = ctx.azar(3);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(80,30,10,${r2() * 0.05})`; g.fillRect(r2() * w, r2() * h, 30 + r2() * 90, 2); }   // veta bajo la laca
  });
  sunburst.repeat.set(1 / 2.0, 1 / 1.3); sunburst.offset.set(1.97 / 2.0, 0.65 / 1.3);
  const mCuerpo = new THREE.MeshPhysicalMaterial({ map: sunburst, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 1.2, specularIntensity: 0.5 });
  const mCanto = ctx.mat.plastico('#1d0b07', { roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const mGolpe = ctx.mat.plastico('#0f0f12', { roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const arceT = ctx.texturas.madera({ color: '#efc98c', oscuro: '#c99652', vetas: 22, semilla: 4, tam: 512 });
  const mArce = new THREE.MeshPhysicalMaterial({ map: arceT.map, normalMap: arceT.normalMap, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  const rosaT = ctx.texturas.madera({ color: '#5a3322', oscuro: '#26140c', vetas: 30, semilla: 9, tam: 512 });
  const mRosa = new THREE.MeshStandardMaterial({ map: rosaT.map, normalMap: rosaT.normalMap, roughness: 0.6 });
  const mCromo = ctx.mat.metal(P.cromo, { roughness: 0.12 });
  const mNegro = ctx.mat.plastico(P.negro, { roughness: 0.32, clearcoat: 0.6 });
  const mNacar = new THREE.MeshPhysicalMaterial({ color: '#f4efe6', roughness: 0.2, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 600], clearcoat: 1 });

  // 1 · cuerpo + golpeador
  const capaCuerpo = new THREE.Group();
  const geoC = new THREE.ExtrudeGeometry(forma(cuerpoPts), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 5, curveSegments: 24 });
  geoC.translate(0, 0, -0.08);
  const cuerpo = new THREE.Mesh(geoC, [mCuerpo, mCanto]); cuerpo.castShadow = cuerpo.receiveShadow = true;
  const golpe = ctx.extruir(forma(golpePts), 0.012, mGolpe, 0.004);
  golpe.position.z = 0.12;
  capaCuerpo.add(cuerpo);
  // 2 · mástil, diapasón, trastes, puntos, pala, clavijas
  const capaMastil = new THREE.Group();
  const mastil = ctx.caja(CEJUELA + 0.45, 0.19, 0.08, mArce, 0.03); mastil.position.set((CEJUELA - 0.45) / 2, 0, 0.09);
  const diapason = ctx.caja(CEJUELA + 0.43, 0.2, 0.028, mRosa, 0.006); diapason.position.set((CEJUELA - 0.43) / 2, 0, 0.145);
  const geoTrastes = trastes.map(x => { const gq = new THREE.CapsuleGeometry(0.007, 0.19, 3, 8); gq.rotateX(0); gq.translate(x, 0, 0.162); return gq; });
  const mTrastes = ctx.malla(ctx.BufferGeometryUtils.mergeGeometries(geoTrastes), mCromo);
  const geoPuntos = [3, 5, 7, 9, 12, 12, 15, 17].map((n, i, arr) => {
    const x = (trastes[n - 2] + trastes[n - 1]) / 2;
    const y = n === 12 ? (arr[i - 1] === 12 ? -0.05 : 0.05) : 0;
    const gq = new THREE.CylinderGeometry(0.018, 0.018, 0.004, 16); gq.rotateX(Math.PI / 2); gq.translate(x, y, 0.16);
    return gq;
  });
  const puntos = ctx.malla(ctx.BufferGeometryUtils.mergeGeometries(geoPuntos), mNacar);
  const cejuela = ctx.caja(0.025, 0.2, 0.04, ctx.mat.ceramica('#f4efe4'), 0.006); cejuela.position.set(CEJUELA, 0, 0.16);
  const palaM = ctx.extruir(forma(pala), 0.05, mArce, 0.012); palaM.position.z = 0.09;
  const logo = ctx.plano(0.34, 0.08, new THREE.MeshPhysicalMaterial({ map: ctx.textura2d(512, 120, g => { g.clearRect(0, 0, 512, 120); g.fillStyle = '#1b1410'; g.font = 'italic 800 80px Inter'; g.fillText('Fénix', 70, 92); }), transparent: true, roughness: 0.3, clearcoat: 1 }));
  logo.position.set(1.95, 0.05, 0.142); logo.rotation.z = 0.12;
  capaMastil.add(mastil, diapason, mTrastes, puntos, cejuela, palaM, logo);
  clavijas.forEach(([x, y]) => {
    const poste = ctx.cilindro(0.016, 0.016, 0.06, mCromo, 12); poste.rotation.x = Math.PI / 2; poste.position.set(x, y, 0.14);
    const llave = ctx.caja(0.035, 0.09, 0.02, mCromo, 0.008); llave.position.set(x, y + 0.14, 0.09);
    capaMastil.add(poste, llave);
  });
  // 3 · pastillas (con sus 6 polos), puente con selletas
  const capaPastillas = new THREE.Group();
  const polos = ctx.instancias(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 12), mCromo, 18, (i, o) => {
    const [x, y] = pastillas[Math.floor(i / 6)]; o.pos = [x, y + (i % 6 - 2.5) * 0.037, 0.148]; o.rot = [Math.PI / 2, 0, 0];
  });
  pastillas.forEach(([x, y], i) => {
    const p = ctx.caja(0.07, 0.25, 0.03, ctx.mat.plastico(P.crema, { roughness: 0.35, clearcoat: 0.4 }), 0.02);
    p.position.set(x, y, 0.13); if (i === 2) p.rotation.z = -0.15;
    capaPastillas.add(p);
  });
  capaPastillas.add(polos);
  const placa = ctx.caja(0.17, 0.34, 0.016, mCromo, 0.006); placa.position.set(PUENTE - 0.02, 0, 0.12);
  capaPastillas.add(golpe, placa);
  for (let i = 0; i < 6; i++) { const s = ctx.caja(0.04, 0.035, 0.03, mCromo, 0.008); s.position.set(PUENTE + 0.01 + (i % 2) * 0.012, cuerdaY(i, true), 0.14); capaPastillas.add(s); }
  // 4 · cuerdas (crecen desde el puente)
  const capaCuerdas = new THREE.Group(); capaCuerdas.position.x = PUENTE;
  const mCuerda = ctx.mat.metal('#efe6cf', { roughness: 0.18 });
  for (let i = 0; i < 6; i++) {
    const c = ctx.tubo([[0, cuerdaY(i, true), 0.157], [ESCALA, cuerdaY(i, false), 0.178]], 0.0048 + i * 0.0006, mCuerda, 2);
    c.castShadow = false; capaCuerdas.add(c);
    const [cx, cy] = clavijas[i];
    const r = ctx.tubo([[ESCALA, cuerdaY(i, false), 0.178], [cx - PUENTE, cy, 0.165]], 0.0045, mCuerda, 2);
    r.castShadow = false; capaCuerdas.add(r);
  }
  // 5 · mandos (moleteados), selector y jack
  const capaMandos = new THREE.Group();
  mandos.forEach(([x, y]) => {
    const m = ctx.torno([[0, 0.055], [0.04, 0.055], [0.052, 0.045], [0.056, 0.0], [0, 0]], ctx.mat.plastico(P.crema, { roughness: 0.3, clearcoat: 0.7 }), 32);
    m.rotation.x = Math.PI / 2; m.position.set(x, y, 0.115);
    const tapa = ctx.cilindro(0.032, 0.032, 0.006, mCromo, 20); tapa.rotation.x = Math.PI / 2; tapa.position.set(x, y, 0.172);
    capaMandos.add(m, tapa);
  });
  const selector = ctx.caja(0.02, 0.06, 0.05, mNegro, 0.008); selector.position.set(-0.98, -0.38, 0.14); selector.rotation.z = 0.5;
  const pomoSel = ctx.esfera(0.018, ctx.mat.plastico(P.crema), 12); pomoSel.position.set(-0.99, -0.36, 0.17);
  const jack = ctx.cilindro(0.035, 0.035, 0.03, mCromo, 16); jack.rotation.z = Math.PI / 2; jack.position.set(-1.92, -0.25, 0);
  capaMandos.add(selector, pomoSel, jack);
  guitarra.add(capaCuerpo, capaMastil, capaPastillas, capaCuerdas, capaMandos);
  guitarra.children.forEach(c => { c.position.x += -0.1; });

  const ancla = (x, y, z = 0.15) => { const o = new THREE.Object3D(); o.position.set(x - 0.1, y, z); guitarra.add(o); return o; };
  const R = o => ctx.rotulo({ tema: 'claro', color: TINTA, acento: '#d6482a', ...o });
  const capas = [
    { obj: capaCuerpo, t: 1.75, r: R({ num: 1, texto: 'Cuerpo', sub: 'aliso con laca sunburst', en: ancla(-1.85, 0.25, 0.1), lado: 'izquierda', dist: 110 }) },
    { obj: capaMastil, t: 2.3, r: R({ num: 2, texto: 'Mástil', sub: 'arce · 21 trastes', en: ancla(1.75, -0.08, 0.12), ...(V ? { lado: 'abajo', dist: 110 } : { fijo: [0.7, 0.86] }) }) },
    { obj: capaPastillas, t: 2.85, r: R({ num: 3, texto: 'Pastillas', sub: 'la vibración, en señal', en: ancla(-0.8, 0.13), lado: 'arriba', dist: 170 }) },
    { obj: capaCuerdas, t: 3.4, cuerdas: true, r: R({ num: 4, texto: 'Cuerdas', sub: 'seis, de acero', en: ancla(0.75, -0.03, 0.18), lado: 'abajo', dist: 130 }) },
    { obj: capaMandos, t: 3.95, r: R({ num: 5, texto: 'Mandos', sub: 'volumen y tono', en: ancla(-1.42, -0.41), lado: 'abajo', dist: 110 }) },
  ];
  const titulo = ctx.titulo({ texto: 'Cómo nace una\nguitarra eléctrica', etiqueta: 'Del boceto al objeto', sub: 'Modelo «Fénix» · aliso, arce y palosanto',
    ...(V ? { pos: 'arriba', y: 0.07, tam: 80 } : { pos: 'arriba-izquierda', x: 0.06, y: 0.12, tam: 92 }),
    color: '#fbf1e2', colorSub: 'rgba(251,241,226,0.72)', colorEtiqueta: AMBAR, sombra: true, fuente: '"Archivo Black"', peso: 400, espaciado: -0.02 });
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 60, centro: [0, 3.0, -6.5], zona: [16, 5, 4], tam: 0.06, colores: [AMBAR, CIAN, '#fff0d8'], intensidad: 3.2, semilla: 6 });
  escena.add(motas);

  // pose final (de pie, en diagonal) y puntos de la guitarra en el mundo para la cámara
  const qTumbada = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const qPose = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0.28, 0.95));
  const posPose = new THREE.Vector3(0.05, 2.35, 0.3);
  const enPose = (x, y, z) => new THREE.Vector3(x - 0.1, y, z).applyQuaternion(qPose).add(posPose).toArray();
  const nPose = new THREE.Vector3(0, 0, 1).applyQuaternion(qPose), xPose = new THREE.Vector3(1, 0, 0).applyQuaternion(qPose);
  const desde = (p, kN, kX, kY) => [p[0] + nPose.x * kN + xPose.x * kX, p[1] + nPose.y * kN + xPose.y * kX + kY, p[2] + nPose.z * kN + xPose.z * kX];
  const pPast = enPose(-0.8, 0, 0.15), pTrastes = enPose(0.7, 0, 0.17);

  // ---------------- cámara ----------------
  const cam = ctx.camaraPorClaves([
    { t: 0.0, pos: [0.1, 6.9, 1.0], mira: [0.1, 0, 0.05], fov: 35, giro: -6, apertura: 0.22 },
    { t: 1.6, pos: [0.3, 6.3, 1.5], mira: [0.1, 0, 0], fov: 35, apertura: 0.22 },
    { t: 3.2, pos: [1.9, 4.9, 3.2], mira: [0.1, 0.3, 0], fov: 33, apertura: 0.3 },
    { t: 4.4, pos: [2.6, 3.9, 3.9], mira: [0.0, 0.5, 0], fov: 33, apertura: 0.3 },
    { t: 6.0, pos: [1.2, 2.7, 7.6], mira: [0.0, 2.3, 0.2], fov: 32, apertura: 0.32 },
    { t: 7.0, pos: desde(pPast, 1.05, -0.5, 0.15), mira: pPast, fov: 26, foco: pPast, apertura: 0.9 },
    { t: 8.6, pos: desde(pTrastes, 1.0, -0.6, 0.15), mira: pTrastes, fov: 26, foco: pTrastes, apertura: 0.9 },
    { t: 9.6, pos: V ? [0.6, 2.7, 9.4] : [-0.9, 2.8, 8.7], mira: V ? [0.0, 2.6, 0.2] : [-1.65, 2.6, 0.2], fov: 31, foco: [0, 2.35, 0.3], apertura: 0.35 },
    { t: 12, pos: V ? [0.5, 2.65, 8.8] : [-0.75, 2.75, 8.1], mira: V ? [0.0, 2.65, 0.2] : [-1.7, 2.6, 0.2], fov: 30.5, foco: [0, 2.35, 0.3], apertura: 0.35 },
  ], { deriva: 0.04 });

  const qGiro = new THREE.Quaternion(), ejeX = new THREE.Vector3(1, 0, 0);
  const destello = [];
  capas.forEach(c => c.obj.traverse(o => { if (o.isMesh && o.material && o.material.emissive) destello.push({ m: o.material, t: c.t }); }));

  return {
    momentos: [
      { t: 0.8, nombre: 'el lápiz dibuja (flexo)' },
      { t: 2.0, nombre: '1 · cuerpo sunburst' },
      { t: 3.7, nombre: '2-5 · mástil, pastillas, cuerdas, mandos' },
      { t: 5.2, nombre: 'se levanta del papel' },
      { t: 7.4, nombre: 'macro: pastillas → trastes' },
      { t: 11.4, nombre: 'plano de anuncio' },
    ],
    pintar(t) {
      cam(t);
      boceto(ctx.entre(t, 0.05, 1.55, 'suave'));
      const [px, pz] = aMundo(punta);
      const fuera = ctx.entre(t, 1.55, 2.1, 'suave');
      lapiz.position.set(px + fuera * 1.8, 0.03 + fuera * 0.6, pz + fuera * 1.6);
      lapiz.visible = t < 2.15;
      capas.forEach(({ obj, t: t0, r, cuerdas }) => {
        if (cuerdas) { const p = ctx.entre(t, t0, t0 + 0.5, 'salida'); obj.visible = p > 0.001; obj.scale.set(Math.max(0.001, p), 1, 1); }
        else ctx.entrada(obj, t, t0, { dur: 0.6, desde: 'muelle', frecuencia: 1.8, amortigua: 7 });
        r.mostrar(Math.min(ctx.entre(t, t0 + 0.15, t0 + 0.75), 1 - ctx.entre(t, 4.35, 4.65)));
      });
      // al llegar cada capa, un destello cálido en sus piezas
      destello.forEach(d => { const k = Math.max(0, 1 - Math.abs(t - d.t - 0.25) / 0.3); d.m.emissive.setRGB(1, 0.7, 0.35); d.m.emissiveIntensity = 0.2 * k; });
      // se levanta y posa; luego gira despacio sobre su eje largo
      const pie = ctx.entre(t, 4.4, 6.0, 'suave');
      guitarra.quaternion.slerpQuaternions(qTumbada, qPose, pie);
      qGiro.setFromAxisAngle(ejeX, 0.22 * Math.sin(ctx.entre(t, 9.2, 12) * Math.PI * 0.9) + 0.02 * Math.sin(t * 1.3) * ctx.entre(t, 6, 7));
      guitarra.quaternion.multiply(qGiro);
      guitarra.position.set(ctx.mezcla(0.1, posPose.x, pie), ctx.mezcla(0.4, posPose.y, pie) + 0.04 * Math.sin(t * 2.0) * ctx.entre(t, 9, 10), ctx.mezcla(0, posPose.z, pie));
      // luces del plano final: entran cuando la guitarra se levanta
      const luzFin = ctx.entre(t, 4.6, 6.2, 'suave');
      claveG.intensity = 5.5 * luzFin; recA.intensity = 14 * luzFin; recC.intensity = 14 * luzFin;
      foco.intensity = ctx.mezcla(26, 15, luzFin);
      mCuerpo.clearcoatRoughness = ctx.mezcla(0.42, 0.12, luzFin); mGolpe.clearcoatRoughness = ctx.mezcla(0.5, 0.25, luzFin);
      bombilla.material.color.set('#ffe2b8').multiplyScalar(7 + 0.3 * Math.sin(t * 7));
      vaporT.pintar(t);
      motas.pintar(t, ctx.entre(t, 3.5, 5.5));
      titulo.mostrar(ctx.entre(t, 9.7, 10.9));
    },
  };
}
