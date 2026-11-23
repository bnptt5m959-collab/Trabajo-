// «Ya es tarde» · cuento de brujería en 12 s, todo a cámara lenta.
// Guion: dormitorio en penumbra, dos figuras de ojos enormes inclinadas sobre una muñeca rota (0-2 s) ·
// ella mete los dedos en el vientre de la muñeca y saca una carta doblada (2-5,5 s) · macro: la carta se
// abre, «Si encontráis esta carta, ya es tarde…» (5,5-8 s) · levantan la cabeza y se miran, las pupilas se
// encogen (8-10 s) · plano final con el título (10-12 s).
// Dirección de arte: casi monocromo; vela cálida (luz práctica que tiembla) contra luna fría por la ventana
// y recorte frío detrás de las cabezas; yeso manchado, colchón de cutí roto con el relleno fuera, hierro
// oxidado, polvo flotando, grano fuerte y viñeta cerrada.
export const ajustes = {
  duracion: 12, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.15,
    bloom: { fuerza: 0.35, radio: 0.6, umbral: 1.6 },
    ao: { fuerza: 1.3, radio: 0.35 },
    dof: { apertura: 0.3 },
    grano: 0.075, vineta: 0.62, aberracion: 0.6,
    grado: { contraste: 1.12, saturacion: 0.28, temperatura: 0, sombras: '#1a2130', luces: '#d8b48c', mezcla: 0.16 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // ---- Paleta cerrada ----
  const NOCHE = '#0b0c0f', YESO = '#5d5a54', PIEL = '#bdb9b0', TELA = '#3d3a36', PELO = '#121110';
  const VELA = '#ffb36b', LUNA = '#9fb4d6', TINTA = '#2a1812', SANGRE = '#6a231b';
  const rnd = ctx.azar(13);

  ctx.fondo({ tipo: 'radial', centro: '#1d1d1f', medio: '#0f0f11', borde: '#040405', y: 0.42, radio: 0.9 });
  ctx.niebla('#0b0b0d', 9, 22);
  ctx.entornoEstudio({
    fondo: '#0e0e10', suelo: '#070707', intensidad: 0.5,
    paneles: [
      { pos: [-5, 3, -2], tam: [1.5, 3], color: '#c4d2ea', fuerza: 1.6 },    // la ventana
      { pos: [-3, 1.5, 1], tam: [0.6, 0.6], color: VELA, fuerza: 3 },         // la vela
      { pos: [2, 4, 5], tam: [4, 2], color: '#ffffff', fuerza: 0.35 },
    ],
  });

  // ---- Luz: luna fría de recorte, vela cálida, relleno muy bajo ----
  escena.add(new THREE.HemisphereLight('#3c4458', '#120f0d', 0.45));
  const luna = new THREE.DirectionalLight(LUNA, 1.5);
  luna.position.set(-4.5, 5.5, -3.5); luna.target.position.set(0, 1, 0.3);
  luna.castShadow = true; luna.shadow.mapSize.set(2048, 2048); luna.shadow.radius = 5; luna.shadow.bias = -0.0005; luna.shadow.normalBias = 0.02;
  Object.assign(luna.shadow.camera, { left: -5, right: 5, top: 5, bottom: -2 });
  escena.add(luna, luna.target);
  const recorte = new THREE.SpotLight('#b9c8e4', 14, 9, 0.6, 0.7, 1.5);
  recorte.position.set(0.4, 3.8, -2.6); recorte.target.position.set(0, 2, 0.4);
  escena.add(recorte, recorte.target);
  ctx.luzArea('#cdd3dc', 1.3, 3, 2, [1.6, 3.4, 4.2], [0, 1.6, 0]);
  const clave = new THREE.SpotLight('#dfe4ec', 22, 12, 0.5, 0.9, 1.4);
  clave.position.set(1.2, 4.2, 4.5); clave.target.position.set(0, 1.5, 0.6);
  clave.castShadow = true; clave.shadow.mapSize.set(1024, 1024); clave.shadow.radius = 6; clave.shadow.bias = -0.0005;
  escena.add(clave, clave.target);
  [[-1, -1.6], [1, 1.6]].forEach(([s, x]) => {
    const r = new THREE.SpotLight('#b4c6e6', 26, 8, 0.45, 0.8, 1.5);
    r.position.set(x + s * 1.2, 3.2, -1.6); r.target.position.set(x * 0.8, 1.7, 0.7);
    escena.add(r, r.target);
  });     // relleno frontal suave (que se lean las caras)
  const vela1 = ctx.practica([-2.42, 1.06, -0.55], { color: VELA, intensidad: 4.5, distancia: 7, sombra: true, bombilla: false });
  const vela2 = ctx.practica([2.55, 0.3, 0.95], { color: VELA, intensidad: 1.6, distancia: 4, bombilla: false });

  // ---- Habitación ----
  const ruidoPared = ctx.texturas.ruido({ repetir: [4, 2], semilla: 3 });
  const papelPintado = ctx.textura2d(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6a665e'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(30,28,26,0.18)'; g.fillRect(x, 0, 20, h); g.fillStyle = 'rgba(255,250,240,0.05)'; g.fillRect(x + 34, 0, 4, h); }
    const r2 = ctx.azar(8);
    for (let i = 0; i < 26; i++) {      // manchas de humedad
      const x = r2() * w, y = r2() * h, r = 40 + r2() * 160;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(25,22,18,${0.15 + r2() * 0.25})`); gr.addColorStop(1, 'rgba(25,22,18,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 9; i++) {       // chorretones
      const x = r2() * w; g.fillStyle = 'rgba(20,18,15,0.18)'; g.fillRect(x, r2() * h * 0.5, 3 + r2() * 6, 120 + r2() * 400);
    }
  });
  papelPintado.wrapS = papelPintado.wrapT = THREE.RepeatWrapping; papelPintado.repeat.set(3, 1.5);
  const matPared = new THREE.MeshStandardMaterial({ map: papelPintado, normalMap: ruidoPared.normalMap, roughness: 0.95 });
  const pared = ctx.plano(12, 6, matPared); pared.position.set(0, 3, -2.5); escena.add(pared);
  const paredIz = ctx.plano(8, 6, matPared); paredIz.rotation.y = Math.PI / 2; paredIz.position.set(-4.2, 3, 1); escena.add(paredIz);
  ctx.suelo({ material: ctx.superficie('madera', { color: '#4a4540', oscuro: '#1b1917', vetas: 16, repetir: [4, 8], semilla: 4, material: { roughness: 0.7 } }) });
  // rodapié
  const rodapie = ctx.caja(12, 0.18, 0.05, ctx.mat.mate('#211f1c')); rodapie.position.set(0, 0.09, -2.47); escena.add(rodapie);

  // ventana (izquierda, al fondo): cristal frío que brilla y marco en cruz
  const cristal = ctx.plano(1.1, 1.5, ctx.mat.luz('#8fa6c8', 1.25)); cristal.position.set(-3.1, 2.1, -2.48); escena.add(cristal);
  const matMarco = ctx.superficie('madera', { color: '#2c2925', oscuro: '#151311', vetas: 6, semilla: 9 });
  [[0, 0.78, 1.25, 0.07], [0, -0.78, 1.25, 0.07], [-0.6, 0, 0.07, 1.62], [0.6, 0, 0.07, 1.62], [0, 0, 1.1, 0.04], [0, 0, 0.04, 1.5]].forEach(([x, y, w, h]) => {
    const m = ctx.caja(w, h, 0.06, matMarco); m.position.set(-3.1 + x, 2.1 + y, -2.44); escena.add(m);
  });
  // cuadro con un árbol seco
  const lamina = ctx.textura2d(400, 520, (g, w, h) => {
    g.fillStyle = '#8b857a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a2622'; g.lineCap = 'round';
    const rama = (x, y, a, l, gr) => {
      if (l < 8) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
      g.lineWidth = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      rama(x2, y2, a - 0.45, l * 0.7, gr * 0.68); rama(x2, y2, a + 0.4, l * 0.66, gr * 0.68);
    };
    rama(w / 2, h - 60, -Math.PI / 2, 120, 14);
    g.fillStyle = 'rgba(30,25,20,0.25)'; g.fillRect(0, h - 70, w, 70);
  });
  const cuadro = ctx.caja(0.62, 0.8, 0.05, ctx.mat.mate('#1c1a17')); cuadro.position.set(-1.55, 2.75, -2.45); cuadro.rotation.z = 0.04; escena.add(cuadro);
  const lam = ctx.plano(0.5, 0.66, new THREE.MeshStandardMaterial({ map: lamina, roughness: 0.8 })); lam.position.set(-1.55, 2.75, -2.42); lam.rotation.z = 0.04; escena.add(lam);
  // puerta (derecha)
  const matPuerta = ctx.superficie('madera', { color: '#3a3632', oscuro: '#191715', vetas: 10, repetir: [1, 2], semilla: 2 });
  const puerta = ctx.caja(1.1, 2.4, 0.06, matPuerta); puerta.position.set(3.1, 1.2, -2.45); escena.add(puerta);
  [[0, 0.55], [0, -0.55]].forEach(([x, y]) => { const p = ctx.caja(0.78, 0.85, 0.04, matPuerta); p.position.set(3.1 + x, 1.2 + y, -2.41); escena.add(p); });
  const pomo = ctx.esfera(0.04, ctx.mat.metal('#6b5a44', { roughness: 0.4 })); pomo.position.set(2.7, 1.1, -2.38); escena.add(pomo);

  // ---- Cama de hierro con colchón de cutí roto ----
  const cuti = ctx.textura2d(1024, 512, (g, w, h) => {
    g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 40) { g.fillStyle = 'rgba(40,38,35,0.55)'; g.fillRect(x, 0, 8, h); g.fillStyle = 'rgba(40,38,35,0.25)'; g.fillRect(x + 18, 0, 3, h); }
    const r2 = ctx.azar(21);
    for (let i = 0; i < 18; i++) {
      const x = r2() * w, y = r2() * h, r = 30 + r2() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(45,35,25,${0.25 + r2() * 0.35})`); gr.addColorStop(1, 'rgba(45,35,25,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  const telaT = ctx.texturas.tela({ repetir: [6, 3], semilla: 6 });
  const matColchon = new THREE.MeshStandardMaterial({ map: cuti, normalMap: telaT.normalMap, roughness: 0.92 });
  const colchon = ctx.caja(2.8, 0.34, 1.7, matColchon, 0.12, 5); colchon.position.set(0, 0.45, 0); escena.add(colchon);
  const somier = ctx.caja(2.9, 0.08, 1.8, ctx.mat.metal('#2a2826', { roughness: 0.6 })); somier.position.set(0, 0.25, 0); escena.add(somier);
  const matHierro = ctx.mat.metal('#2b2927', { roughness: 0.55 });
  [[-1.42, -0.88], [1.42, -0.88], [-1.42, 0.88], [1.42, 0.88]].forEach(([x, z]) => {
    const alto = z < 0 ? 1.55 : 0.7;
    const p = ctx.cilindro(0.035, 0.035, alto, matHierro, 16); p.position.set(x, alto / 2, z); escena.add(p);
    const b = ctx.esfera(0.06, matHierro, 20); b.position.set(x, alto + 0.03, z); escena.add(b);
  });
  for (let i = 0; i < 9; i++) {         // barrotes del cabecero
    const x = -1.2 + i * 0.3;
    const b = ctx.cilindro(0.016, 0.016, 0.95, matHierro, 10); b.position.set(x, 0.95, -0.88); escena.add(b);
  }
  escena.add(ctx.tubo([[-1.42, 1.45, -0.88], [-0.7, 1.52, -0.88], [0, 1.56, -0.88], [0.7, 1.52, -0.88], [1.42, 1.45, -0.88]], 0.028, matHierro, 40));
  escena.add(ctx.tubo([[-1.42, 0.62, 0.88], [0, 0.66, 0.88], [1.42, 0.62, 0.88]], 0.025, matHierro, 30));
  // almohadas
  const matAlmohada = ctx.superficie('tela', { color: '#7d786f', repetir: [3, 2], semilla: 12, material: { roughness: 0.95 } });
  [[-0.65, 0.05], [0.65, -0.06]].forEach(([x, r]) => {
    const a = ctx.caja(1.0, 0.2, 0.5, matAlmohada, 0.09, 4); a.position.set(x, 0.72, -0.5); a.rotation.set(0.15, r, 0.03); escena.add(a);
  });
  // el roto del colchón con el relleno fuera
  const roto = ctx.esfera(0.25, ctx.mat.mate('#0f0d0b'), 24); roto.scale.set(1.3, 0.12, 0.7); roto.position.set(0.55, 0.62, 0.45); escena.add(roto);
  const matRelleno = ctx.superficie('ruido', { color: '#d9d4c9', repetir: [2, 2], semilla: 17, material: { roughness: 1 } });
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, d = 0.2 + rnd() * 0.25;
    const p = ctx.esfera(0.035 + rnd() * 0.05, matRelleno, 14);
    p.position.set(0.55 + Math.cos(a) * d * 1.2, 0.64 + rnd() * 0.03, 0.45 + Math.sin(a) * d * 0.6); p.scale.set(1, 0.6 + rnd() * 0.4, 1);
    escena.add(p);
  }
  // tijeras oxidadas junto al roto
  const tijeras = ctx.grupo();
  const matTij = ctx.mat.metal('#6e6860', { roughness: 0.45 });
  [-1, 1].forEach(s => {
    const anillo = ctx.toro(0.045, 0.008, matTij); anillo.rotation.x = Math.PI / 2; anillo.position.set(s * 0.045, 0, 0.11); tijeras.add(anillo);
    const hoja = ctx.caja(0.016, 0.006, 0.24, matTij, 0.002); hoja.position.set(s * 0.012, 0.004, -0.04); hoja.rotation.y = s * 0.12; tijeras.add(hoja);
  });
  tijeras.position.set(-0.35, 0.625, 0.55); tijeras.rotation.y = 0.9; escena.add(tijeras);

  // ---- Mesilla con velas, libros y un manojo de hierbas ----
  const matMesa = ctx.superficie('madera', { color: '#3b3631', oscuro: '#171513', vetas: 8, semilla: 7 });
  const mesilla = ctx.caja(0.65, 0.78, 0.5, matMesa); mesilla.position.set(-2.45, 0.39, -0.6); escena.add(mesilla);
  const matCera = ctx.mat.ceramica('#d8d0bf', { roughness: 0.6 });
  const llamas = [];
  [[-2.42, 0.28, -0.55], [-2.6, 0.18, -0.68], [-2.28, 0.12, -0.72]].forEach(([x, h, z], i) => {
    const c = ctx.cilindroBisel(0.035, h, matCera, { centrar: false }); c.position.set(x, 0.78, z); escena.add(c);
    const ll = ctx.cono(0.014, 0.06, ctx.mat.luz('#ffc98a', 7), 12); ll.position.set(x, 0.78 + h + 0.035, z); escena.add(ll);
    llamas.push({ m: ll, base: ll.position.clone(), fase: i * 1.7 });
  });
  [[0.22, 0.05, 0.3, '#2a2420'], [0.2, 0.04, 0.28, '#3a2e28'], [0.18, 0.035, 0.25, '#1f1c1a']].forEach(([w, h, d, c], i) => {
    const l = ctx.caja(w, h, d, ctx.mat.mate(c)); l.position.set(-2.62 + i * 0.01, 0.78 + 0.025 + i * 0.045, -0.48); l.rotation.y = 0.2 - i * 0.15; escena.add(l);
  });
  const hierbas = ctx.grupo();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14 - 0.5) * 0.6;
    hierbas.add(ctx.tubo([[0, 0, 0], [Math.sin(a) * 0.1, -0.2, 0.02], [Math.sin(a) * 0.18, -0.42, 0.03 * (i % 3)]], 0.006, ctx.mat.mate('#3d3a2e'), 8));
  }
  hierbas.add(ctx.tubo([[0, 0.3, -0.02], [0, 0.02, 0]], 0.004, ctx.mat.mate('#555049'), 6));
  hierbas.position.set(-2.1, 2.2, -2.42); escena.add(hierbas);
  const humo = ctx.vapor({ origen: [-2.42, 1.15, -0.55], cantidad: 14, altura: 1.4, ancho: 0.2, tam: 0.25, color: '#9a968e', opacidad: 0.18, velocidad: 0.25 });
  escena.add(humo);
  // vela en el suelo (derecha)
  const cv = ctx.cilindroBisel(0.04, 0.22, matCera, { centrar: false }); cv.position.set(2.55, 0, 0.95); escena.add(cv);
  const llamaSuelo = ctx.cono(0.015, 0.06, ctx.mat.luz('#ffc98a', 7), 12); llamaSuelo.position.set(2.55, 0.255, 0.95); escena.add(llamaSuelo);
  llamas.push({ m: llamaSuelo, base: llamaSuelo.position.clone(), fase: 4.2 });
  ctx.sombraContacto(mesilla, { radio: 0.5, opacidad: 0.6 });

  // polvo en el aire
  const polvo = ctx.particulas({ tipo: 'motas', cantidad: 140, centro: [0, 1.6, 0.4], zona: [6, 3, 3], colores: ['#d9d0c2', '#a9b8d0'], tam: 0.012, velocidad: 0.06, intensidad: 1.4, semilla: 4 });
  escena.add(polvo);

  // ---- Utilidades para los personajes ----
  const ARRIBA = V3(0, 1, 0);
  function hueso(m, a, b) {           // coloca un cilindro (alto 1, centrado) entre dos puntos
    const d = b.clone().sub(a), L = d.length();
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(ARRIBA, d.normalize());
    m.scale.set(1, L, 1);
  }
  const matPiel = ctx.superficie('ruido', { color: PIEL, repetir: [2, 2], semilla: 31, material: { roughness: 0.75 } });
  const matPielSucia = ctx.superficie('ruido', { color: '#9a958b', repetir: [3, 3], semilla: 32, material: { roughness: 0.8 } });
  const matOjo = ctx.mat.brillante('#e2ded4', { roughness: 0.18, clearcoat: 1 });
  const matCuenca = ctx.mat.mate('#1d1a18');
  const matNegro = ctx.mat.brillante('#050505', { roughness: 0.1 });
  const matPelo = new THREE.MeshStandardMaterial({ color: PELO, roughness: 0.55, metalness: 0.05 });

  function cabeza(op) {
    const g = new THREE.Group();
    const craneo = ctx.torno([[0, 0], [0.06, 0.01], [0.13, 0.06], [0.19, 0.15], [0.24, 0.28], [0.27, 0.42], [0.27, 0.52], [0.24, 0.62], [0.16, 0.69], [0, 0.72]], matPiel, 48);
    g.add(craneo);
    const pupilas = [], ojos = [];
    [-1, 1].forEach(s => {
      const cu = ctx.esfera(0.125, matCuenca, 28); cu.scale.set(1, 1.15, 0.42); cu.position.set(s * 0.105, 0.41, 0.225); g.add(cu);
      const o = ctx.esfera(0.097, matOjo, 32); o.position.set(s * 0.105, 0.41, 0.2); g.add(o); ojos.push(o);
      const p = ctx.esfera(0.019, matNegro, 16); p.scale.set(1, 1, 0.4); g.add(p); pupilas.push({ m: p, c: o.position.clone() });
      // ceja preocupada (el extremo de dentro, más alto)
      g.add(ctx.tubo([[s * 0.2, 0.53, 0.2], [s * 0.12, 0.56, 0.245], [s * 0.04, 0.585, 0.255]], 0.007, ctx.mat.mate('#2a2725'), 10));
    });
    const nariz = ctx.cono(0.022, 0.07, matPiel, 16); nariz.rotation.x = Math.PI / 2 + 0.5; nariz.position.set(0, 0.29, 0.245); g.add(nariz);
    g.add(ctx.tubo([[-0.045, 0.165, 0.2], [0, 0.175, 0.212], [0.045, 0.165, 0.2]], 0.006, ctx.mat.mate('#2a2321'), 10));
    // pelo: decenas de mechones que salen del cráneo y caen
    const pelo = new THREE.Group();
    const r2 = ctx.azar(op.semilla);
    for (let i = 0; i < op.mechones; i++) {
      const th = r2() * Math.PI * 2, ph = Math.pow(r2(), 0.8) * (op.largo > 0.6 ? 1.75 : 1.5);
      const dir = V3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
      if (dir.z > 0.35 && dir.y < 0.65) continue;                 // deja la cara libre
      if (op.largo > 0.6 && dir.z > -0.15 && dir.y < 0.92) continue;
      const p = V3(dir.x * 0.255, 0.4 + dir.y * 0.32, dir.z * 0.255);
      const pts = [p.clone()];
      const L = op.largo * (0.55 + r2() * 0.6), pasos = 5;
      let v = dir.clone().multiplyScalar(op.sale);
      for (let k = 1; k <= pasos; k++) {
        v.add(V3((r2() - 0.5) * op.desorden, -op.caida * k / pasos, (r2() - 0.5) * op.desorden));
        p.addScaledVector(v.clone().normalize(), L / pasos);
        if (op.largo > 0.6) { const rr = Math.hypot(p.x, p.z); if (p.y > 0 && rr < 0.29) { p.x *= 0.3 / Math.max(rr, 0.01); p.z *= 0.3 / Math.max(rr, 0.01); } }
        pts.push(p.clone());
      }
      pelo.add(ctx.tubo(pts, op.grosor * (0.6 + r2() * 0.7), matPelo, 10));
    }
    g.add(pelo);
    return { g, pupilas, ojos, pelo };
  }

  function personaje(op) {
    const raiz = new THREE.Group(); raiz.position.set(op.x, 0, op.z); escena.add(raiz);
    raiz.add(op.cuerpo);
    const cab = cabeza(op.pelo);
    escena.add(cab.g);
    const cuello = ctx.cilindro(0.042, 0.05, 1, matPiel, 16); escena.add(cuello);
    const brazos = op.brazos.map(b => {
      const sup = ctx.cilindro(b.grosor, b.grosor * 0.9, 1, b.mat, 14), ant = ctx.cilindro(b.grosor * 0.9, b.grosor * 0.7, 1, b.mat, 14);
      const codoM = ctx.esfera(b.grosor * 0.95, b.mat, 14), mano = new THREE.Group();
      const palma = ctx.esfera(0.035, matPiel, 14); palma.scale.set(1, 0.5, 1.3); mano.add(palma);
      [-0.03, -0.01, 0.01, 0.03].forEach((x, i) => mano.add(ctx.tubo([[x, 0, 0.03], [x * 1.3, -0.01, 0.1 + (i % 2) * 0.01], [x * 1.5, -0.035, 0.16 + (i % 2) * 0.015]], 0.0075, matPiel, 8)));
      mano.add(ctx.tubo([[0.035 * b.lado, 0, 0], [0.06 * b.lado, -0.01, 0.06], [0.06 * b.lado, -0.02, 0.1]], 0.008, matPiel, 8));
      escena.add(sup, ant, codoM, mano);
      return { ...b, sup, ant, codoM, mano };
    });
    return { raiz, cab, cuello, brazos, hombro: V3(op.x, op.hombroY, op.z) };
  }
  function colocarBrazo(b, hombro, mano, mira) {
    const dist = hombro.distanceTo(mano);
    const medio = hombro.clone().lerp(mano, 0.5);
    const fuera = V3(b.codo[0], b.codo[1], b.codo[2]).multiplyScalar(Math.max(0.15, 1.15 - dist * 0.55));
    const codo = medio.add(fuera);
    hueso(b.sup, hombro, codo); hueso(b.ant, codo, mano); b.codoM.position.copy(codo);
    b.mano.position.copy(mano); b.mano.lookAt(mira);
    return codo;
  }

  // chico: jersey de rayas, pantalón oscuro, pelo corto y revuelto
  const rayas = ctx.textura2d(256, 512, (g, w, h) => {
    for (let y = 0; y < h; y += 32) { g.fillStyle = (y / 32) % 2 ? '#56524c' : '#1e1d1b'; g.fillRect(0, y, w, 32); }
    const r2 = ctx.azar(40); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${r2() * 0.3})`; g.fillRect(r2() * w, r2() * h, 2, 2); }
  });
  rayas.wrapS = rayas.wrapT = THREE.RepeatWrapping; rayas.repeat.set(4, 3);
  const matJersey = new THREE.MeshStandardMaterial({ map: rayas, normalMap: telaT.normalMap, roughness: 0.95 });
  const cuerpoChico = new THREE.Group();
  const torsoC = ctx.torno([[0, 0.78], [0.17, 0.8], [0.19, 0.95], [0.17, 1.2], [0.19, 1.42], [0.15, 1.52], [0.06, 1.56], [0, 1.56]], matJersey, 32);
  cuerpoChico.add(torsoC);
  [-0.08, 0.08].forEach(x => cuerpoChico.add(ctx.tubo([[x, 0.8, 0], [x * 1.2, 0.4, 0.02], [x * 1.3, 0.03, 0]], 0.045, ctx.mat.mate('#141312'), 16)));
  [-0.08, 0.08].forEach(x => { const z = ctx.caja(0.1, 0.06, 0.2, ctx.mat.brillante('#0c0c0c', { roughness: 0.5 })); z.position.set(x * 1.3, 0.03, 0.05); cuerpoChico.add(z); });
  // bufanda raída alrededor del cuello
  cuerpoChico.add(ctx.toro(0.11, 0.045, ctx.superficie('tela', { color: '#2b2926', semilla: 3 }))).rotation.set(0, 0, 0);
  cuerpoChico.children[cuerpoChico.children.length - 1].rotation.x = Math.PI / 2;
  cuerpoChico.children[cuerpoChico.children.length - 1].position.set(0.02, 1.52, 0.02);
  cuerpoChico.rotation.z = -0.06;
  const chico = personaje({
    x: -1.55, z: 0.15, hombroY: 1.5, cuerpo: cuerpoChico,
    pelo: { semilla: 5, mechones: 95, largo: 0.42, sale: 1.6, caida: 1.2, desorden: 0.9, grosor: 0.016 },
    brazos: [
      { lado: 1, grosor: 0.045, mat: matJersey, codo: [-0.18, -0.35, 0.0], dx: 0.12 },
      { lado: -1, grosor: 0.045, mat: matJersey, codo: [-0.12, -0.05, 0.15], dx: -0.16 },
    ],
  });
  // chica: vestido largo raído, pelo largo y lacio, brazos desnudos
  const cuerpoChica = new THREE.Group();
  const matVestido = ctx.superficie('tela', { color: TELA, repetir: [4, 4], semilla: 14, material: { roughness: 0.92 } });
  cuerpoChica.add(ctx.torno([[0, 0], [0.48, 0], [0.5, 0.04], [0.4, 0.4], [0.27, 0.85], [0.15, 1.08], [0.16, 1.2], [0.18, 1.42], [0.14, 1.52], [0.05, 1.56], [0, 1.56]], matVestido, 40));
  // jirones del bajo
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rnd() * 0.2;
    const j = ctx.caja(0.12, 0.08 + rnd() * 0.12, 0.012, matVestido, 0.004); j.position.set(Math.sin(a) * 0.49, 0.03, Math.cos(a) * 0.49); j.rotation.y = a; j.rotation.x = 0.2; cuerpoChica.add(j);
  }
  cuerpoChica.rotation.z = 0.05;
  const chica = personaje({
    x: 1.55, z: 0.1, hombroY: 1.5, cuerpo: cuerpoChica,
    pelo: { semilla: 9, mechones: 150, largo: 1.15, sale: 0.5, caida: 3.2, desorden: 0.35, grosor: 0.014 },
    brazos: [
      { lado: -1, grosor: 0.022, mat: matPiel, codo: [0.18, -0.3, 0.0] },
      { lado: 1, grosor: 0.022, mat: matPiel, codo: [0.16, -0.25, 0.02] },
    ],
  });

  // ---- La muñeca ----
  const D = V3(0, 1.0, 0.5);
  const muneca = new THREE.Group(); muneca.position.copy(D); muneca.scale.setScalar(1.35); escena.add(muneca);
  const matVestM = ctx.superficie('tela', { color: '#9a948a', repetir: [3, 3], semilla: 18, material: { roughness: 0.95 } });
  muneca.add(ctx.torno([[0, -0.2], [0.13, -0.2], [0.12, -0.12], [0.08, 0.02], [0.065, 0.1], [0.04, 0.14], [0, 0.145]], matVestM, 32));
  const cabM = ctx.esfera(0.085, matPielSucia, 28); cabM.scale.set(1, 1.08, 0.95); cabM.position.set(0, 0.23, 0); muneca.add(cabM);
  [-1, 1].forEach(s => {
    const o = ctx.esfera(0.026, matNegro, 16); o.scale.set(1, 1.1, 0.5); o.position.set(s * 0.032, 0.235, 0.073); muneca.add(o);
    const brillo = ctx.esfera(0.004, ctx.mat.luz('#ffffff', 2), 8); brillo.position.set(s * 0.032 + 0.007, 0.245, 0.086); muneca.add(brillo);
    muneca.add(ctx.tubo([[s * 0.04, 0.12, 0], [s * 0.08, 0.02, 0.03], [s * 0.09, -0.08, 0.04]], 0.012, matPielSucia, 8));
    muneca.add(ctx.tubo([[s * 0.04, -0.19, 0], [s * 0.05, -0.3, 0.02], [s * 0.05, -0.4, 0.0]], 0.012, matPielSucia, 8));
  });
  // grieta en la frente
  muneca.add(ctx.tubo([[0.01, 0.31, 0.06], [0.025, 0.285, 0.078], [0.012, 0.265, 0.083]], 0.0025, matNegro, 8));
  const peloM = ctx.azar(77);
  for (let i = 0; i < 40; i++) {
    const th = peloM() * Math.PI * 2, ph = peloM() * 1.4;
    const dir = V3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
    if (dir.z > 0.3 && dir.y < 0.7) continue;
    const p = V3(dir.x * 0.085, 0.23 + dir.y * 0.09, dir.z * 0.085), q = p.clone(); const pts = [p.clone()];
    for (let k = 1; k <= 4; k++) { q.add(V3(dir.x * 0.03 + (peloM() - 0.5) * 0.04, -0.05 - peloM() * 0.02, dir.z * 0.02 + (peloM() - 0.5) * 0.03)); pts.push(q.clone()); }
    muneca.add(ctx.tubo(pts, 0.004, new THREE.MeshStandardMaterial({ color: '#3b3732', roughness: 0.9 }), 8));
  }
  // el vientre descosido
  const agujero = ctx.esfera(0.045, ctx.mat.mate('#070605'), 16); agujero.scale.set(1, 1.2, 0.35); agujero.position.set(0, -0.04, 0.105); muneca.add(agujero);
  const borras = [];
  for (let i = 0; i < 7; i++) {
    const b = ctx.esfera(0.012 + rnd() * 0.014, matRelleno, 10);
    const a = rnd() * Math.PI * 2; const p0 = V3(Math.cos(a) * 0.04, -0.04 + Math.sin(a) * 0.045, 0.11);
    b.position.copy(p0); muneca.add(b);
    if (i < 4) borras.push({ m: b, p0, cae: 2.9 + i * 0.6, dx: (rnd() - 0.5) * 0.2 });
  }

  // ---- La carta (se dobla en dos mitades) ----
  const CW = 1200, CH = 820;
  const papelCanvas = document.createElement('canvas'); papelCanvas.width = CW; papelCanvas.height = CH;
  {
    const g = papelCanvas.getContext('2d');
    const gr = g.createRadialGradient(CW / 2, CH / 2, 100, CW / 2, CH / 2, 760);
    gr.addColorStop(0, '#d9cfb6'); gr.addColorStop(1, '#8a7c62'); g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
    const r2 = ctx.azar(51);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(70,55,35,${r2() * 0.08})`; g.fillRect(r2() * CW, r2() * CH, 2, 2); }
    for (let i = 0; i < 7; i++) { const x = r2() * CW, y = r2() * CH, r = 30 + r2() * 90; const m = g.createRadialGradient(x, y, 0, x, y, r); m.addColorStop(0, 'rgba(90,60,30,0.25)'); m.addColorStop(1, 'rgba(90,60,30,0)'); g.fillStyle = m; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.fillStyle = 'rgba(60,45,30,0.25)'; g.fillRect(CW / 2 - 2, 0, 4, CH);          // el doblez
    g.fillStyle = TINTA; g.textBaseline = 'alphabetic';
    g.font = 'italic 500 70px Georgia, "DejaVu Serif", serif';
    const lineas = ['Si encontráis', 'esta carta,', 'ya es tarde.', 'Ella ha vuelto', 'a casa.'];
    lineas.forEach((l, i) => { g.save(); g.translate(80 + (i % 2) * 14, 150 + i * 118); g.rotate(-0.025 + (i % 3) * 0.01); g.fillText(l, 0, 0); g.restore(); });
    // sello de brujería en tinta rojiza
    g.save(); g.translate(CW - 260, CH - 250); g.strokeStyle = SANGRE; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 122, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 6; g.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 4 / 5); const x = Math.cos(a) * 118, y = Math.sin(a) * 118; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.lineWidth = 4;
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.save(); g.rotate(a); g.beginPath(); g.moveTo(-8, -136); g.lineTo(0, -128); g.lineTo(8, -138); g.stroke(); g.restore(); }
    g.fillStyle = SANGRE; g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(20 + i * 9, 160 + i * 22, 5, 12, 0, 0, Math.PI * 2); g.fill(); }  // gotas
    g.restore();
  }
  const mitadTx = lado => ctx.textura2d(CW / 2, CH, g => g.drawImage(papelCanvas, lado < 0 ? 0 : CW / 2, 0, CW / 2, CH, 0, 0, CW / 2, CH));
  const LW = 0.3, LH = LW * CH / CW;
  const carta = new THREE.Group(); escena.add(carta);
  const dorso = new THREE.MeshStandardMaterial({ color: '#a89b80', roughness: 0.9 });
  const mitades = [-1, 1].map(s => {
    const piv = new THREE.Group();
    const cara = ctx.plano(LW / 2, LH, new THREE.MeshStandardMaterial({ map: mitadTx(s), roughness: 0.85 }));
    cara.position.x = s * LW / 4; cara.castShadow = true; piv.add(cara);
    const atras = ctx.plano(LW / 2, LH, dorso); atras.rotation.y = Math.PI; atras.position.set(s * LW / 4, 0, -0.001); piv.add(atras);
    carta.add(piv); return piv;
  });

  // ---- Cámara (todo despacio) ----
  const LFIN = V3(0.12, 1.15, 0.86);
  const cam = ctx.camaraPorClaves([
    { t: 0, pos: [0.25, 1.9, 5.9], mira: [0, 1.55, 0.45], fov: 33, foco: [0, 1.6, 0.6], apertura: 0.3 },
    { t: 3.4, pos: [0.45, 1.5, 3.1], mira: [0.02, 1.15, 0.5], fov: 31, foco: [0, 1.05, 0.6], apertura: 0.5, ease: 'suave' },
    { t: 6.6, pos: [0.2, 1.24, 1.68], mira: [0.12, 1.14, 0.84], fov: 26, foco: [0.12, 1.15, 0.86], apertura: 0.95, ease: 'suave' },
    { t: 9.4, pos: [0.05, 2.0, 3.6], mira: [0, 2.0, 0.3], fov: 34, foco: [0, 2.1, 0.25], apertura: 0.45, ease: 'suave' },
    { t: 12, pos: [-0.05, 1.95, 4.9], mira: [0, 1.8, 0.35], fov: 32, foco: [0, 1.9, 0.3], apertura: 0.35, ease: 'suave' },
  ], { deriva: 0.035 });

  const T = ctx.titulo({ etiqueta: 'Capítulo I', texto: 'Ya es tarde', sub: 'una historia de brujería', pos: 'abajo-izquierda', tam: 104, peso: 300,
    color: '#ece6da', colorSub: '#b8b0a2', colorEtiqueta: '#c79a72', efecto: 'letras', espaciado: 0.01 });

  const e = (t, a, b) => ctx.entre(t, a, b, ctx.ease.suaveFuerte);
  const parpadeo = (t, f) => 1 + 0.16 * Math.sin(13.1 * t + f) + 0.1 * Math.sin(23.7 * t + 1 + f) + 0.06 * Math.sin(41.3 * t + 2 * f);
  const tmp = V3(0, 0, 0);

  function pintarPersonaje(P, s, t, mira, cabPos, inclina) {
    const c = P.cab;
    c.g.position.copy(cabPos);
    c.g.lookAt(mira);
    c.g.rotateZ(inclina);
    c.g.rotateX(-0.25);                          // la cara mira un poco más abajo que el cuello
    c.pelo.rotation.z = 0.03 * Math.sin(t * 0.7 + s);
    const cuelloBase = P.hombro.clone().add(V3(-s * 0.03, 0.06, 0));
    hueso(P.cuello, cuelloBase, cabPos.clone().add(V3(0, 0.03, -0.02)));
  }

  return {
    momentos: [
      { t: 0.7, nombre: 'la habitación' },
      { t: 3.0, nombre: 'los dedos en la muñeca' },
      { t: 5.7, nombre: 'sale la carta' },
      { t: 7.0, nombre: 'la carta (macro)' },
      { t: 9.4, nombre: 'se miran' },
      { t: 11.7, nombre: 'plano final' },
    ],
    pintar(t) {
      cam(t);
      // vela que tiembla
      const f1 = parpadeo(t, 0), f2 = parpadeo(t, 2.3);
      vela1.luz.intensity = 4.5 * f1; vela2.luz.intensity = 1.6 * f2;
      llamas.forEach(l => { const k = parpadeo(t, l.fase); l.m.scale.set(1, k, 1); l.m.position.x = l.base.x + 0.004 * Math.sin(9 * t + l.fase); });
      humo.pintar(t); polvo.pintar(t);

      // la muñeca se mece muy despacio
      muneca.rotation.z = 0.06 * Math.sin(t * 0.6) - 0.08 * e(t, 3.2, 5.6);
      muneca.rotation.y = -0.12 + 0.05 * Math.sin(t * 0.45);
      muneca.position.y = D.y + 0.015 * Math.sin(t * 0.8) - 0.04 * e(t, 8, 10);
      muneca.updateMatrixWorld();

      // la carta: sale del vientre, sube y se abre
      const pSal = e(t, 3.0, 5.8), pAbre = e(t, 4.9, 6.4);
      const hueco = muneca.localToWorld(V3(0, -0.04, 0.09));
      const L = hueco.clone().lerp(LFIN, pSal);
      L.y -= 0.05 * e(t, 8.2, 10.5); L.y += 0.004 * Math.sin(t * 7.3);  // tiembla en la mano
      carta.position.copy(L);
      carta.lookAt(V3(0.2, 1.3, 2.4));
      carta.rotateX(-(1 - pSal) * 1.3); carta.rotateZ(-0.12 + 0.03 * Math.sin(t * 0.9));
      const tam = 0.22 + 0.78 * ctx.entre(t, 3.0, 4.6, ctx.ease.salida);
      carta.scale.setScalar(tam);
      const pliegue = (1 - pAbre) * Math.PI * 0.94;
      mitades[0].rotation.y = -pliegue * 0.5 - 0.08 * pAbre; mitades[1].rotation.y = pliegue * 0.5 + 0.08 * pAbre;
      carta.visible = t > 2.95;
      carta.updateMatrixWorld();

      // el relleno cae despacio
      borras.forEach(b => {
        const p = ctx.entre(t, b.cae, b.cae + 1.6, ctx.ease.entrada);
        b.m.position.set(b.p0.x + b.dx * p, b.p0.y - 0.42 * p, b.p0.z + 0.06 * p);
      });

      // miradas: primero a la muñeca/carta, luego el uno al otro (muy despacio)
      const pMira = e(t, 7.4, 10.0);
      const cabChico = V3(-0.66, 1.98, 0.22).lerp(V3(-0.92, 2.1, 0.22), pMira);
      const cabChica = V3(0.68, 1.95, 0.18).lerp(V3(0.92, 2.08, 0.18), pMira);
      cabChico.y += 0.01 * Math.sin(t * 0.9); cabChica.y += 0.01 * Math.sin(t * 0.8 + 1);
      const objetivo = t < 3 ? D.clone().add(V3(0, 0.05, 0.05)) : D.clone().lerp(LFIN, e(t, 3, 5.6));
      const miraChico = objetivo.clone().lerp(cabChica.clone().add(V3(0, 0.3, 2.4)), pMira);
      const miraChica = objetivo.clone().lerp(cabChico.clone().add(V3(0, 0.3, 2.4)), pMira);
      pintarPersonaje(chico, -1, t, miraChico, cabChico, 0.18 - 0.1 * pMira + 0.02 * Math.sin(t * 0.5));
      pintarPersonaje(chica, 1, t, miraChica, cabChica, -0.2 + 0.1 * pMira + 0.02 * Math.sin(t * 0.55));

      // pupilas: miran al objetivo y se encogen de miedo
      const miedo = 1 - 0.5 * e(t, 7.8, 9.6);
      const temblor = 0.003 * e(t, 8, 9) * Math.sin(t * 31);
      [[chico, miraChico], [chica, miraChica]].forEach(([P, m]) => {
        P.cab.g.updateMatrixWorld();
        const local = P.cab.g.worldToLocal(m.clone());
        P.cab.pupilas.forEach(pp => {
          const d = local.clone().sub(pp.c).normalize();
          d.z = Math.max(d.z, 0.75); d.normalize();
          pp.m.position.copy(pp.c).addScaledVector(d, 0.091); pp.m.position.x += temblor;
          pp.m.lookAt(P.cab.g.localToWorld(pp.c.clone().addScaledVector(d, 1)));
          pp.m.scale.set(miedo, miedo, 0.4);
        });
        P.cab.ojos.forEach(o => o.scale.setScalar(1 + 0.05 * e(t, 7.8, 9.6)));
      });

      // brazos: el chico sostiene la muñeca por la cabeza; ella la sujeta y saca la carta
      const manoChico = muneca.localToWorld(V3(-0.1, 0.2, 0.02));
      colocarBrazo(chico.brazos[0], chico.hombro.clone().add(V3(0.14, 0, 0.02)), manoChico, muneca.localToWorld(V3(0.1, 0.22, 0)));
      colocarBrazo(chico.brazos[1], chico.hombro.clone().add(V3(-0.14, 0, 0)), V3(-1.8 + 0.01 * Math.sin(t), 0.86, 0.35), V3(-1.8, 0.2, 0.6));
      const manoChicaA = muneca.localToWorld(V3(0.11, -0.12, 0.02));
      colocarBrazo(chica.brazos[0], chica.hombro.clone().add(V3(-0.13, 0, 0.02)), manoChicaA, muneca.localToWorld(V3(-0.1, -0.1, 0.05)));
      const reposo = V3(0.65, 0.98, 0.6);
      const enHueco = hueco.clone().add(V3(0.03, -0.01, 0.07));
      const agarre = carta.localToWorld(V3(LW * 0.5 * (pAbre > 0.5 ? 1 : 0.2), -LH * 0.35, 0.02));
      let manoB;
      if (t < 3.0) manoB = reposo.clone().lerp(enHueco, e(t, 1.4, 3.0));
      else manoB = enHueco.clone().lerp(agarre, ctx.entre(t, 3.0, 3.4));
      colocarBrazo(chica.brazos[1], chica.hombro.clone().add(V3(-0.13, 0, 0.05)), manoB, manoB.clone().add(V3(-0.6, 0.0, 0.25)));

      T.mostrar(ctx.entre(t, 9.9, 11.0));
    },
    dibujar2d(g, t) {
      // fundido desde negro al empezar
      const a = 1 - ctx.entre(t, 0, 0.7, ctx.ease.salida);
      if (a > 0) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, ctx.ancho, ctx.alto); }
    },
  };
}
