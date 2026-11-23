// Estilo 06 · Producto que explota en su mundo — zapatilla de correr «Ritmo»
// La zapatilla cae girando al plató cobalto y se posa con un rebote. Coge impulso, se abre por
// capas hacia arriba (suela, entresuela con gel, plantilla, empeine de malla, cordones) con un
// rótulo fino por capa, y de dentro sale su «mundo» en órbita: pista, gota de agua, rayo, hoja,
// cronómetro y medalla. Todo se recoge de golpe y cierra en un plano de anuncio.
export const ajustes = {
  duracion: 11, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.05,
    bloom: { fuerza: 0.45, radio: 0.55, umbral: 1.8 },
    ao: { fuerza: 1.1, radio: 0.25 },
    grano: 0.038, vineta: 0.4, aberracion: 0.9,
    grado: { contraste: 1.06, saturacion: 1.06, sombras: '#1b2a9a', luces: '#ffc48a', mezcla: 0.1 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  // ---- Paleta: cobalto (plató), naranja (malla), hueso (espuma), amarillo (acentos), marino (goma), cian (recorte) ----
  const NARANJA = '#ff6a2b', HUESO = '#f3efe6', AMARILLO = '#ffd23f', MARINO = '#1b2340', CIAN = '#5fd8ff', VERDE = '#3ccf7a', CIELO = '#8fd3ff';
  const V = ctx.vertical;

  ctx.fondo({ tipo: 'radial', centro: '#3d5cf0', medio: '#2236b8', borde: '#0a113f', y: 0.4, radio: 0.85 });
  ctx.niebla('#121c5c', 10, 26);
  ctx.entornoEstudio({
    fondo: '#1a2a8a', suelo: '#060a26', intensidad: 1.0,
    paneles: [
      { pos: [-6, 4, 5], tam: [3.5, 6], color: '#fff3e6', fuerza: 2.6 },
      { pos: [6, 3, 3], tam: [1, 8], color: '#ffffff', fuerza: 3 },
      { pos: [-5, 2, -6], tam: [1.2, 7], color: NARANJA, fuerza: 3 },
      { pos: [5, 2, -6], tam: [1.2, 7], color: CIAN, fuerza: 3 },
      { pos: [0, 9, 0], tam: [6, 6], color: '#ffffff', fuerza: 1.2 },
    ],
  });
  ctx.luces.producto({ centro: [0, 1.4, 0], direccion: [-3, 6, 4.5], fuerzaClave: 3.4, fuerzaSombra: 1.5, area: 4.5, recortes: ['#ff8a4a', CIAN], fuerzaRecorte: 12, fuerzaTope: 1.4, ambiente: 0.35, cielo: '#dfe6ff', tierra: '#18227a' });
  ctx.sueloEspejo({ color: '#16246e', reflejo: 0.26, rugosidad: 0.55, tam: 50 });

  const ALTO = 1.15;
  const zapa = new THREE.Group();
  zapa.position.set(0, ALTO, 0);
  escena.add(zapa);

  // =====================================================================
  //  LA ZAPATILLA (forma de running de verdad). Cada pieza es un «loft»:
  //  a lo largo del pie (x: talón -1,5 → puntera +1,5) se calcula una sección
  //  redondeada (superelipse) con su suelo, su altura y su anchura; así sale
  //  curva, se estrecha en puntera, talón y arriba, y no hay aristas vivas.
  // =====================================================================
  // perfiles: interpolación lineal suavizada (media móvil) → curvas sin escalones ni ondas
  const K = (x, pares) => { let s = 0; for (let k = -3; k <= 3; k++) s += ctx.claves(x + k * 0.035, pares, 'lineal'); return s / 7; };
  const X0 = -1.53, X1 = 1.52;
  // suela que se balancea: talón redondeado y puntera levantada (toe spring)
  const suelo0 = x => (x > 0.8 ? 0.19 * Math.pow((x - 0.8) / 0.72, 2) : 0) + (x < -1.2 ? 0.06 * Math.pow((-1.2 - x) / 0.33, 2) : 0);
  const yo = x => suelo0(x) + 0.05;                                                        // arriba de la suela
  const grosorEnt = x => K(x, [[-1.53, 0.3], [-0.8, 0.29], [0, 0.23], [0.7, 0.17], [1.2, 0.12], [1.52, 0.09]]);
  const ym = x => yo(x) + grosorEnt(x);                                                    // arriba de la entresuela
  const anchoBase = x => K(x, [[-1.53, 0.3], [-1.3, 0.335], [-0.8, 0.35], [-0.2, 0.37], [0.4, 0.445], [0.9, 0.44], [1.25, 0.37], [1.52, 0.27]]);
  const redondeo = (x, q) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x / 1.525), q)), 1 / q);   // planta y perfil redondeados en los extremos
  // empeine: altura del borde (silueta lateral) y anchura
  const altoEmp = x => K(x, [[-1.53, 0.0], [-1.5, 0.55], [-1.42, 0.74], [-1.28, 0.77], [-1.0, 0.68], [-0.72, 0.69], [-0.55, 0.73], [-0.3, 0.66], [0.1, 0.53], [0.6, 0.39], [1.0, 0.29], [1.3, 0.23], [1.45, 0.15], [1.52, 0.0]]);
  const anchoEmp = x => K(x, [[-1.53, 0.0], [-1.49, 0.27], [-1.3, 0.32], [-0.8, 0.34], [-0.2, 0.36], [0.4, 0.42], [0.9, 0.41], [1.25, 0.34], [1.44, 0.24], [1.52, 0.0]]);
  const P_EMP = 2.6;
  const superficie = (x, z) => {                     // altura del empeine en (x, z)
    const w = Math.max(1e-4, anchoEmp(x)), Z = Math.min(1, Math.abs(z) / w);
    return ym(x) - 0.04 + altoEmp(x) * Math.pow(Math.max(0, 1 - Math.pow(Z, P_EMP)), 1 / P_EMP);
  };
  // boca del tobillo (elipse en planta): ahí el empeine baja y deja ver el forro
  const BOCA = { x: -1.0, a: 0.39, b: 0.21, fondo: 0.1 };
  const hundir = (x, z) => BOCA.fondo * Math.max(0, 1 - ((x - BOCA.x) / BOCA.a) ** 2 - (z / BOCA.b) ** 2);

  // loft genérico: N anillos a lo largo de x, M puntos por anillo; seccion(t) → [zF, yF]
  function loft(op) {
    const N = op.N ?? 90, M = op.M ?? 44, cerrado = op.cerrado ?? true;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = 0.5 - 0.5 * Math.cos(Math.PI * i / N);                 // más anillos en talón y puntera
      const x = (op.x0 ?? X0) + ((op.x1 ?? X1) - (op.x0 ?? X0)) * u;
      const f = op.perfil(x);                                           // {yb, h, w}
      for (let j = 0; j <= M; j++) {
        const t = j / M;
        const [zF, yF] = op.seccion(t);
        let X = x, Y = f.yb + f.h * yF, Z = f.w * zF;
        if (op.deformar) [X, Y, Z] = op.deformar(X, Y, Z, t);
        pos.push(X, Y, Z); uv.push(u, t);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + M + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);          // normales hacia fuera
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (!cerrado) return geo;
    return geo;
  }
  // secciones: superelipse entera (suelas) y media cúpula (empeine: lo de abajo queda dentro de la entresuela)
  const superelipse = p => t => { const a = Math.PI * 2 * t - Math.PI / 2; const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 2 / p), 0.5 + 0.5 * Math.sign(s) * Math.pow(Math.abs(s), 2 / p)]; };
  const cupula = p => t => { const a = Math.PI * t; const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 2 / p), Math.pow(Math.abs(s), 2 / p)]; };

  const capas = [];
  const capa = (obj, sube, giro = 0) => { zapa.add(obj); capas.push({ obj, y0: obj.position.y, sube, giro }); ctx.sombras(obj); return obj; };
  const rnd = ctx.azar(6);

  // ---------- 1 · Suela de goma con tacos ----------
  const goma = ctx.superficie('ruido', { color: '#1d2646', escala: 24, fuerza: 0.12, rugosidad: 0.82, relieve: 2, repetir: [4, 1] });
  const suela = new THREE.Group();
  suela.add(ctx.malla(loft({ perfil: x => ({ yb: suelo0(x), h: 0.06 * redondeo(x, 8) + 0.002, w: (anchoBase(x) + 0.035) * redondeo(x, 4) }), seccion: superelipse(5), M: 48 }), goma));
  const tacos = ctx.instancias(new THREE.BoxGeometry(1, 1, 1), ctx.mat.goma('#2a3557', { roughness: 0.72 }), 36, (i, o) => {
    const col = i % 12, fila = Math.floor(i / 12) - 1;
    const x = -1.32 + col * 0.235, w = anchoBase(x) * redondeo(x, 4);
    o.pos = [x, suelo0(x) - 0.012, fila * w * 0.55]; o.esc = [0.12, 0.03, w * 0.42]; o.rot = [0, 0, Math.atan2(suelo0(x + 0.01) - suelo0(x - 0.01), 0.02)];
  });
  suela.add(tacos);
  capa(suela, -0.78, -0.05);

  // ---------- 2 · Entresuela de espuma (con franja y ventanas de gel) ----------
  const texEnt = ctx.textura2d(1024, 512, (g, w, h) => {
    const r = ctx.azar(3);
    g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(120,110,95,${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    // franja amarilla a media altura en los dos costados (v ≈ 0,02 y 0,52) y línea de moldeado
    [0.22, 0.78].forEach(v => {
      const y = (1 - v) * h;
      g.fillStyle = AMARILLO; g.fillRect(0, y - 14, w, 22);
      g.fillStyle = 'rgba(60,50,40,0.18)'; g.fillRect(0, y - 40, w, 3);
    });
  });
  const espuma = new THREE.MeshPhysicalMaterial({ map: texEnt, roughness: 0.6, clearcoat: 0.15 });
  const entresuela = new THREE.Group();
  entresuela.add(ctx.malla(loft({ perfil: x => ({ yb: yo(x) - 0.01, h: grosorEnt(x) * redondeo(x, 7) + 0.012, w: (anchoBase(x) + 0.03) * redondeo(x, 4) }), seccion: superelipse(4.5), M: 56 }), espuma));
  const gelM = ctx.mat.agua('#a8f0ff', { thickness: 0.3, roughness: 0.08, attenuationColor: new THREE.Color('#5fd8ff'), attenuationDistance: 0.6 });
  ctx.brilloBorde(gelM, { color: '#bff4ff', fuerza: 1.2, potencia: 2.4 });
  [1, -1].forEach(lado => { const gel = ctx.esfera(1, gelM, 32); gel.scale.set(0.3, 0.075, 0.07); gel.position.set(-0.98, yo(-0.98) + 0.14, lado * ((anchoBase(-0.98) + 0.03) * redondeo(-0.98, 4) - 0.01)); gel.castShadow = false; entresuela.add(gel); });
  capa(entresuela, -0.32, 0.03);

  // ---------- 3 · Plantilla (dentro; se ve al abrirse) ----------
  const texPlantilla = ctx.textura2d(1024, 256, (g, w, h) => {
    g.fillStyle = AMARILLO; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.1)'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(80 + (i % 20) * 44, 40 + Math.floor(i / 20) * 80, 6, 0, 7); g.fill(); }
    g.save(); g.translate(w * 0.25, h * 0.75); g.fillStyle = MARINO; g.font = '84px "Archivo Black"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RITMO', 0, 0); g.restore();
  });
  const plantilla = new THREE.Group();
  plantilla.add(ctx.malla(loft({ x0: -1.42, x1: 1.4, perfil: x => ({ yb: ym(x) - 0.012, h: 0.035, w: anchoEmp(x) * 0.88 * redondeo(x * 1.06, 4) }), seccion: superelipse(4), M: 40 }), ctx.mat.mate('#ffffff', { map: texPlantilla, roughness: 0.85 })));
  capa(plantilla, 0.3, -0.03);

  // ---------- 4 · Empeine: malla de punto con panel-rayo, pespuntes, contrafuerte, cuello y forro ----------
  const malla = ctx.texturas.tela({ color: NARANJA, hilos: 160, tam: 1024 });
  malla.normalMap.repeat.set(3, 2);
  const texEmp = ctx.textura2d(2048, 1024, (g, w, h) => {
    g.drawImage(malla.lienzo, 0, 0, w / 2, h / 2); g.drawImage(malla.lienzo, w / 2, 0, w / 2, h / 2);
    g.drawImage(malla.lienzo, 0, h / 2, w / 2, h / 2); g.drawImage(malla.lienzo, w / 2, h / 2, w / 2, h / 2);
    // puntera reforzada y talón algo más oscuros (capas de TPU)
    g.fillStyle = 'rgba(120,30,0,0.18)'; g.fillRect(w * 0.84, 0, w * 0.16, h); g.fillRect(0, 0, w * 0.13, h);
    const pespunte = (pts, color = 'rgba(255,240,225,0.75)') => { g.save(); g.strokeStyle = color; g.lineWidth = 3; g.setLineDash([11, 8]); g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(u * w, (1 - v) * h) : g.moveTo(u * w, (1 - v) * h))); g.stroke(); g.restore(); };
    // pespuntes de puntera y talón (cruzan por encima del empeine)
    pespunte([[0.835, 0.0], [0.82, 0.5], [0.835, 1.0]]); pespunte([[0.845, 0.0], [0.83, 0.5], [0.845, 1.0]]);
    pespunte([[0.135, 0.0], [0.15, 0.5], [0.135, 1.0]]);
    // panel lateral con el rayo (los dos costados: v ≈ 0,2 en uno y 0,8 en el otro, girado 180°)
    const rayo = (cx, cy, s, giro) => {
      g.save(); g.translate(cx * w, (1 - cy) * h); g.rotate(giro); g.scale(s, s);
      g.fillStyle = HUESO;
      g.beginPath(); g.moveTo(-250, 40); g.lineTo(40, -70); g.lineTo(-10, -12); g.lineTo(260, -95); g.lineTo(-40, 60); g.lineTo(10, 4); g.closePath(); g.fill();
      g.strokeStyle = MARINO; g.lineWidth = 6; g.stroke();
      g.restore();
      // pespunte alrededor del rayo
      g.save(); g.translate(cx * w, (1 - cy) * h); g.rotate(giro); g.scale(s * 1.08, s * 1.08);
      g.strokeStyle = 'rgba(27,35,64,0.7)'; g.lineWidth = 3; g.setLineDash([10, 8]);
      g.beginPath(); g.moveTo(-250, 40); g.lineTo(40, -70); g.lineTo(-10, -12); g.lineTo(260, -95); g.lineTo(-40, 60); g.lineTo(10, 4); g.closePath(); g.stroke();
      g.restore();
    };
    rayo(0.5, 0.17, 1.0, 0); rayo(0.5, 0.83, 1.0, Math.PI);
    // nombre pequeño junto al talón
    g.fillStyle = 'rgba(255,240,225,0.9)'; g.font = '600 34px Inter'; g.letterSpacing = '10px';
    g.fillText('RITMO', w * 0.17, (1 - 0.12) * h);
    g.save(); g.translate(w * 0.17 + 160, (1 - 0.88) * h); g.rotate(Math.PI); g.fillText('RITMO', 0, 0); g.restore();
  });
  const empeineM = new THREE.MeshPhysicalMaterial({ map: texEmp, normalMap: malla.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.8, sheen: 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffc09a') });
  const empeine = new THREE.Group();
  empeine.add(ctx.malla(loft({ perfil: x => ({ yb: ym(x) - 0.04, h: altoEmp(x), w: anchoEmp(x) }), seccion: cupula(P_EMP), N: 110, M: 56,
    deformar: (X, Y, Z) => [X, Y - hundir(X, Z), Z] }), empeineM));
  // contrafuerte del talón: concha brillante algo mayor que el empeine, más alta detrás
  const contraM = ctx.mat.brillante(MARINO, { roughness: 0.22, clearcoatRoughness: 0.08 });
  empeine.add(ctx.malla(loft({ x0: X0 - 0.005, x1: -0.92, perfil: x => ({ yb: ym(x) - 0.045, h: altoEmp(x) * K(x, [[-1.53, 0.72], [-1.32, 0.66], [-1.12, 0.42], [-0.92, 0.04]]), w: anchoEmp(x) * 1.02 + 0.012 }), seccion: cupula(P_EMP), N: 48, M: 48 }), contraM));
  // forro de la boca (oscuro, ligeramente hundido) y cuello acolchado alrededor
  const ptsBoca = [];
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; const x = BOCA.x + Math.cos(a) * BOCA.a, z = Math.sin(a) * BOCA.b; ptsBoca.push([x, superficie(x, z), z]); }
  {
    const centro = [BOCA.x, superficie(BOCA.x, 0) - BOCA.fondo + 0.012, 0];
    const pos = [...centro];
    ptsBoca.forEach(p => pos.push(p[0], p[1] - 0.012, p[2]));
    const idx = []; for (let i = 0; i < 48; i++) idx.push(0, 1 + ((i + 1) % 48), 1 + i);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const forro = new THREE.Mesh(g, ctx.mat.mate('#0e1226', { roughness: 0.95, side: THREE.DoubleSide })); forro.receiveShadow = true;
    empeine.add(forro);
  }
  empeine.add(ctx.tubo(ptsBoca.map(p => [p[0], p[1] + 0.012, p[2]]), 0.042, ctx.mat.terciopelo(MARINO), 96, true));
  // tirador del talón con el nombre
  const texTirador = ctx.textura2d(128, 256, (g, w, h) => { g.fillStyle = AMARILLO; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.fillStyle = MARINO; g.font = '40px "Archivo Black"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RITMO', 0, 0); g.restore(); });
  const tirador = ctx.caja(0.035, 0.2, 0.13, ctx.mat.plastico('#ffffff', { map: texTirador }), 0.015);
  tirador.position.set(-1.51, ym(-1.5) + altoEmp(-1.47) - 0.02, 0); tirador.rotation.z = -0.25;
  empeine.add(tirador);
  // ojales en dos filas sobre el empeine
  const OJ = [-0.5, -0.31, -0.12, 0.07, 0.26];
  const ojal = (x, s) => { const z = s * anchoEmp(x) * 0.4; return [x, superficie(x, z) + 0.004, z]; };
  const ollaoM = ctx.mat.metal('#e2e6ea', { roughness: 0.2 });
  OJ.forEach(x => [1, -1].forEach(s => { const p = ojal(x, s); const o = ctx.toro(0.028, 0.008, ollaoM); o.position.set(...p); o.rotation.set(Math.PI / 2 - s * 0.55, 0, 0); empeine.add(o); }));
  capa(empeine, 0.74, 0.04);

  // ---------- 5 · Lengüeta y cordones cruzados de verdad ----------
  const cordonera = new THREE.Group();
  const texLengueta = ctx.textura2d(512, 256, (g, w, h) => { g.drawImage(malla.lienzo, 0, 0, w, h); g.fillStyle = MARINO; g.beginPath(); g.roundRect(40, 70, 120, 120, 22); g.fill(); g.fillStyle = AMARILLO; g.font = '92px "Archivo Black"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R', 100, 134); });
  const geoL = new THREE.PlaneGeometry(1, 1, 24, 8);
  {
    const pl = geoL.attributes.position;
    for (let i = 0; i < pl.count; i++) {
      const u = pl.getX(i) + 0.5, wv = pl.getY(i);              // u: 0 = arriba (sale por la boca) → 1 = hacia la puntera
      const x = ctx.mezcla(-0.72, 0.36, u), z = wv * 0.3 * (1 - 0.25 * u);
      const y = (x < -0.6 ? superficie(-0.6, z) + (-0.6 - x) * 0.9 : superficie(x, z)) + 0.012;
      pl.setXYZ(i, x, y, z);
    }
    geoL.computeVertexNormals();
  }
  const lengueta = new THREE.Mesh(geoL, new THREE.MeshPhysicalMaterial({ map: texLengueta, roughness: 0.8, sheen: 0.5, sheenColor: new THREE.Color('#ffb98a'), side: THREE.DoubleSide }));
  lengueta.castShadow = true; lengueta.receiveShadow = true;
  cordonera.add(lengueta);
  const cordonM = ctx.mat.plastico(HUESO, { roughness: 0.55 });
  for (let k = 0; k < OJ.length; k++) {
    const [aI, aD] = [ojal(OJ[k], 1), ojal(OJ[k], -1)];
    if (k === OJ.length - 1) { cordonera.add(ctx.tubo([aI, [OJ[k], superficie(OJ[k], 0) + 0.04, 0], aD], 0.016, cordonM, 20)); break; }
    const [bI, bD] = [ojal(OJ[k + 1], 1), ojal(OJ[k + 1], -1)];
    const xm = (OJ[k] + OJ[k + 1]) / 2, ym_ = superficie(xm, 0) + 0.04;
    cordonera.add(ctx.tubo([aI, [xm, ym_ + 0.006, 0], bD], 0.016, cordonM, 24));
    cordonera.add(ctx.tubo([aD, [xm, ym_, 0], bI], 0.016, cordonM, 24));
  }
  // lazada y cabos
  const top = ojal(OJ[0], 1), topD = ojal(OJ[0], -1), yl = superficie(-0.55, 0) + 0.05;
  cordonera.add(ctx.tubo([[-0.55, yl, 0.02], [-0.66, yl + 0.1, 0.2], [-0.78, yl + 0.03, 0.17], [-0.6, yl, 0.03]], 0.016, cordonM, 32, true));
  cordonera.add(ctx.tubo([[-0.55, yl, -0.02], [-0.64, yl + 0.09, -0.22], [-0.76, yl + 0.02, -0.18], [-0.6, yl, -0.03]], 0.016, cordonM, 32, true));
  cordonera.add(ctx.tubo([top, [-0.56, yl, 0.02], [-0.45, yl - 0.08, 0.26], [-0.38, yl - 0.2, 0.33]], 0.016, cordonM, 24));
  cordonera.add(ctx.tubo([topD, [-0.56, yl, -0.02], [-0.5, yl - 0.1, -0.27], [-0.46, yl - 0.22, -0.34]], 0.016, cordonM, 24));
  capa(cordonera, 1.12, -0.06);
  ctx.base(zapa);
  ctx.sombraContacto(zapa, { radio: 1.5, opacidad: 0.55, alto: 3.5, alargar: 0.5 });

  // ---- Su mundo: seis iconos con material propio ----
  const plas = c => ctx.mat.plastico(c, { roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  const iconos = [];
  const icono = obj => { const p = new THREE.Group(); p.add(obj); ctx.sombras(p); escena.add(p); iconos.push(p); return p; };
  const estadio = (L, R) => { const s = new THREE.Shape(); s.moveTo(-L, -R); s.lineTo(L, -R); s.absarc(L, 0, R, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-L, R); s.absarc(-L, 0, R, Math.PI / 2, Math.PI * 1.5, false); return s; };
  { // pista de atletismo con calles
    const g = new THREE.Group();
    const anillo = estadio(0.32, 0.34); anillo.holes.push(new THREE.Path(estadio(0.32, 0.2).getPoints(40).reverse()));
    g.add(ctx.extruir(anillo, 0.1, plas('#e8613a'), 0.02));
    g.add(ctx.extruir(estadio(0.32, 0.19), 0.07, ctx.mat.terciopelo(VERDE), 0.01));
    [0.245, 0.29].forEach(r => { const l = ctx.tubo(estadio(0.32, r).getPoints(60).map(p => [p.x, p.y, 0.072]), 0.004, plas('#ffffff'), 120, true); g.add(l); });
    icono(g);
  }
  { // gota de agua de verdad
    const s = new THREE.Shape(); s.moveTo(0, 0.5); s.bezierCurveTo(0.12, 0.3, 0.36, 0.05, 0.36, -0.15); s.bezierCurveTo(0.36, -0.38, 0.18, -0.5, 0, -0.5); s.bezierCurveTo(-0.18, -0.5, -0.36, -0.38, -0.36, -0.15); s.bezierCurveTo(-0.36, 0.05, -0.12, 0.3, 0, 0.5);
    const aguaM = ctx.mat.agua('#bfe9ff', { thickness: 0.5, roughness: 0.02 });
    ctx.brilloBorde(aguaM, { color: '#d8f6ff', fuerza: 1.4, potencia: 2.2 });
    icono(ctx.extruir(s, 0.22, aguaM, 0.08));
  }
  { // rayo que brilla
    const r = ctx.extruir([[0.08, 0.5], [-0.3, -0.05], [-0.02, -0.05], [-0.12, -0.5], [0.3, 0.08], [0.02, 0.08]], 0.16, ctx.mat.emisivo(AMARILLO, 2.6, { color: '#ffd23f', roughness: 0.3 }), 0.03);
    icono(r);
  }
  { // hoja con nervio
    const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(0.46, -0.25, 0.42, 0.3, 0, 0.55); s.bezierCurveTo(-0.42, 0.3, -0.46, -0.25, 0, -0.5);
    const g = new THREE.Group(); g.add(ctx.extruir(s, 0.1, ctx.mat.terciopelo('#2fae64'), 0.03));
    g.add(ctx.tubo([[0, -0.5, 0.06], [0.02, 0, 0.07], [0, 0.5, 0.06]], 0.015, plas('#a6f0c4'), 16));
    g.rotation.z = -0.4; icono(g);
  }
  { // cronómetro: caja de metal, esfera dibujada y cristal
    const g = new THREE.Group();
    const texEsfera = ctx.textura2d(256, 256, (gg, w) => {
      gg.fillStyle = '#fbfaf6'; gg.fillRect(0, 0, w, w); gg.strokeStyle = MARINO; gg.lineCap = 'round';
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, l = i % 5 ? 10 : 22; gg.lineWidth = i % 5 ? 2 : 5; gg.beginPath(); gg.moveTo(w / 2 + Math.cos(a) * (118 - l), w / 2 + Math.sin(a) * (118 - l)); gg.lineTo(w / 2 + Math.cos(a) * 118, w / 2 + Math.sin(a) * 118); gg.stroke(); }
    });
    const caja_ = ctx.mat.brillante('#f3efe6', { roughness: 0.25 });
    const cara = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 48), [caja_, ctx.mat.mate('#ffffff', { map: texEsfera }), caja_]);
    cara.rotation.x = Math.PI / 2; g.add(cara);
    g.add(ctx.toro(0.36, 0.045, ctx.mat.metal('#d9dde2', { roughness: 0.2 })));
    const cristal = ctx.esfera(1, ctx.mat.vidrio('#ffffff', { thickness: 0.05 }), 32); cristal.scale.set(0.33, 0.33, 0.06); cristal.position.z = 0.06; cristal.castShadow = false; g.add(cristal);
    const boton = ctx.cilindroBisel(0.06, 0.12, ctx.mat.metal('#d9dde2'), { bisel: 0.02 }); boton.position.y = 0.46; g.add(boton);
    const aguja = ctx.caja(0.025, 0.26, 0.02, plas(NARANJA), 0.008); aguja.geometry.translate(0, 0.11, 0); aguja.position.z = 0.075; g.add(aguja);
    g.userData.aguja = aguja;
    icono(g);
  }
  { // medalla de oro con estrella y cinta de tela
    const g = new THREE.Group();
    const disco = ctx.cilindroBisel(0.3, 0.07, ctx.mat.metal('#f6c84a', { roughness: 0.38, envMapIntensity: 2.2 }), { bisel: 0.02 }); disco.rotation.x = Math.PI / 2; disco.position.y = -0.15; g.add(disco);
    const est = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.07 : 0.16; i ? est.lineTo(Math.cos(a) * r, Math.sin(a) * r) : est.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const estrella = ctx.extruir(est, 0.03, ctx.mat.metal('#ffd86a', { roughness: 0.15 }), 0.008); estrella.position.set(0, -0.15, 0.05); g.add(estrella);
    const cinta = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.75, sheen: 1, sheenColor: new THREE.Color('#ffffff') });
    const c1 = ctx.caja(0.16, 0.45, 0.03, cinta(NARANJA), 0.008); c1.position.set(-0.11, 0.24, -0.02); c1.rotation.z = -0.35; g.add(c1);
    const c2 = ctx.caja(0.16, 0.45, 0.03, cinta(CIELO), 0.008); c2.position.set(0.11, 0.24, -0.03); c2.rotation.z = 0.35; g.add(c2);
    icono(g);
  }
  const cronometro = iconos[4];
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 36, centro: [0, 2.6, -6.5], zona: [18, 5, 3], tam: 0.05, colores: ['#ff9a5a', CIAN, '#ffffff'], intensidad: 2.5, semilla: 5 });
  escena.add(motas);
  // estela de polvo al posarse
  const polvo = ctx.vapor({ origen: [0, 0.05, 0], cantidad: 30, altura: 0.6, ancho: 1.4, tam: 0.6, color: '#c9d4ff', opacidad: 0.3, velocidad: 0.9 });
  escena.add(polvo);

  // ---- Textos ----
  const rot = [
    ctx.rotulo({ texto: 'Suela de goma', sub: 'agarre en mojado', num: 1, en: suela, desplaza: [-0.6, 0.02, 0.38], lado: 'izquierda', dist: 160, tema: 'oscuro', acento: AMARILLO , ...(V ? { fijo: [0.6, 0.670] } : {}) }),
    ctx.rotulo({ texto: 'Espuma + gel', sub: 'devuelve la energía', num: 2, en: entresuela, desplaza: [0.9, 0.16, 0.42], lado: 'derecha', dist: 170, tema: 'oscuro', acento: AMARILLO , ...(V ? { fijo: [0.6, 0.710] } : {}) }),
    ctx.rotulo({ texto: 'Plantilla', sub: 'memoria de la pisada', num: 3, en: plantilla, desplaza: [-0.8, 0.36, 0.25], lado: 'izquierda', dist: 170, tema: 'oscuro', acento: AMARILLO , ...(V ? { fijo: [0.6, 0.750] } : {}) }),
    ctx.rotulo({ texto: 'Malla de punto', sub: 'transpirable', num: 4, en: empeine, desplaza: [0.6, 0.36, 0.36], lado: 'derecha', dist: 160, tema: 'oscuro', acento: AMARILLO , ...(V ? { fijo: [0.6, 0.790] } : {}) }),
    ctx.rotulo({ texto: 'Cordones', sub: 'ajuste en un tirón', num: 5, en: cordonera, desplaza: [0.07, 0.68, 0.08], lado: 'izquierda', dist: 170, tema: 'oscuro', acento: AMARILLO , ...(V ? { fijo: [0.6, 0.830] } : {}) }),
  ];
  const t1 = ctx.titulo({ texto: 'Todo lo que\nte hace correr', etiqueta: 'Zapatilla Ritmo', ...(V ? { pos: 'arriba', y: 0.07, tam: 86 } : { pos: 'arriba-izquierda', tam: 84 }), color: '#ffffff', colorEtiqueta: AMARILLO, sombra: true, fuente: '"Archivo Black"', peso: 400 });
  const t2 = ctx.titulo({ texto: 'Hecha para\nla pista', etiqueta: 'Modelo Ritmo', sub: 'Agua · energía · ligereza · tiempo', ...(V ? { pos: 'arriba', y: 0.07, tam: 98 } : { pos: 'arriba-izquierda', x: 0.06, y: 0.26, tam: 118 }), color: '#ffffff', colorSub: 'rgba(255,255,255,0.8)', colorEtiqueta: AMARILLO, sombra: true, fuente: '"Archivo Black"', peso: 400 });

  // ---- Cámara: héroe → se aleja y sube para ver la torre de capas → órbita → plano de anuncio ----
  const lejos = V ? 1.12 : 1;
  const P = (x, y, z) => [x * lejos, ALTO + (y - ALTO) * (V ? 1.15 : 1), z * lejos];
  const cam = ctx.camaraPorClaves([
    { t: 0, pos: P(2.6, ALTO + 1.6, 6.0), mira: [-0.3, ALTO + 0.4, 0], fov: 32, apertura: 0.35 },
    { t: 1.2, pos: P(2.9, ALTO + 1.7, 5.8), mira: [-0.4, ALTO + 0.45, 0], fov: 31, apertura: 0.35 },
    { t: 2.8, pos: P(4.2, ALTO + 2.0, 7.4), mira: [0, ALTO + 0.9, 0], fov: 38, apertura: 0.28 },
    { t: 4.6, pos: P(-2.8, ALTO + 2.6, 7.6), mira: [0, ALTO + 0.9, 0], fov: 39, apertura: 0.28 },
    { t: 6.4, pos: P(-1.2, ALTO + 2.0, 7.2), mira: [-0.4, ALTO + 0.6, 0], fov: 35, apertura: 0.3 },
    { t: 8.2, pos: V ? P(1.4, ALTO + 1.2, 6.0) : [1.5, ALTO + 1.35, 8.2], mira: V ? [0, ALTO + 0.9, 0] : [-1.15, ALTO + 0.45, 0], fov: 30, apertura: 0.34 },
    { t: 11, pos: V ? P(1.2, ALTO + 1.1, 5.4) : [1.3, ALTO + 1.25, 7.5], mira: V ? [0, ALTO + 0.95, 0] : [-1.2, ALTO + 0.45, 0], fov: 29.5, apertura: 0.34 },
  ], { continuo: true, deriva: 0.04 });

  return {
    momentos: [
      { t: 0.5, nombre: 'cae girando y se posa' },
      { t: 2.3, nombre: 'se abre por capas' },
      { t: 3.6, nombre: 'rótulos de cada capa' },
      { t: 5.0, nombre: 'su mundo en órbita' },
      { t: 6.9, nombre: 'se recoge y cierra' },
      { t: 10.6, nombre: 'plano de anuncio' },
    ],
    pintar(t) {
      cam(t);
      // entrada: cae girando (desenfoque de movimiento) y se posa con un rebote
      const k = ctx.caida(t, -0.05, { altura: 2.4, rebote: 0.22, g: 30 });
      zapa.position.copy(ctx.base(zapa).pos); zapa.position.y = ALTO + k.y;
      const giroEntrada = (1 - ctx.entre(t, 0, 0.55, 'salida')) * Math.PI * 2.2;
      zapa.rotation.set(0.03 * Math.sin(t * 0.9), 0.12 + 0.22 * Math.sin(t * 0.55) + giroEntrada, 0.02 * Math.sin(t * 1.1));
      zapa.position.y += 0.05 * Math.sin(t * 1.3) * ctx.entre(t, 0.8, 1.4);
      // anticipación antes de abrirse y golpe al cerrarse
      const coge = Math.sin(Math.PI * ctx.entre(t, 1.15, 1.45)) * 0.06;
      const golpe = Math.exp(-Math.max(0, t - 7.25) * 10) * (t > 7.25 ? 1 : 0);
      zapa.scale.set(1 + coge * 0.5 + golpe * 0.06, 1 - coge - golpe * 0.08, 1 + coge * 0.5 + golpe * 0.06);
      polvo.pintar(t, Math.max(ctx.entre(t, 0.45, 0.6) * (1 - ctx.entre(t, 0.9, 1.6)), ctx.entre(t, 7.2, 7.35) * (1 - ctx.entre(t, 7.6, 8.3))) * 0.8);

      const n = capas.length;
      capas.forEach((c, i) => {
        const orden = i / (n - 1);
        const abre = ctx.entre(t, 1.45 + (1 - orden) * 0.35, 2.45 + (1 - orden) * 0.35, 'rebote');
        const cierra = ctx.entre(t, 6.55 + orden * 0.14, 7.25 + orden * 0.06, 'entrada');
        const a = abre * (1 - cierra);
        c.obj.position.y = c.y0 + c.sube * a;
        c.obj.rotation.z = c.giro * a;
      });

      const sale = ctx.entre(t, 2.7, 3.8, 'salida'), recoge = ctx.entre(t, 6.1, 6.7, 'entrada');
      iconos.forEach((p, i) => {
        const a = i / iconos.length * Math.PI * 2 + t * 0.6 + 0.4;
        const aparece = ctx.entre(t, 2.8 + i * 0.12, 3.3 + i * 0.12, 'rebote') * (1 - recoge);
        const r = (1.7 + 2.0 * sale) * (1 - recoge * 0.9);
        p.position.set(Math.cos(a) * r * 1.1, ALTO + 0.9 + Math.sin(a) * r * 0.22 + 0.22 * Math.sin(t * 1.7 + i), Math.sin(a) * r * 0.85);
        p.rotation.set(0.2 * Math.sin(t + i), t * 1.2 + i, 0.15 * Math.cos(t * 0.8 + i));
        p.scale.setScalar(Math.max(0.0001, aparece * 1.05));
        p.visible = aparece > 0.001;
      });
      cronometro.children[0].userData.aguja.rotation.z = -t * 2.4;
      motas.pintar(t, 1);

      rot.forEach((r, i) => r.mostrar(ctx.entre(t, 2.35 + i * 0.5, 2.95 + i * 0.5) - ctx.entre(t, 4.4 + i * 0.25, 4.8 + i * 0.25)));
      t1.mostrar(ctx.entre(t, 0.35, 1.1) - ctx.entre(t, 1.5, 1.9));
      t2.mostrar(ctx.entre(t, 8.0, 9.2));
    },
  };
}
