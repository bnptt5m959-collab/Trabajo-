// 07 · Maqueta nocturna — «Cine de barrio en miniatura»
// Una esquina de ciudad de noche, recién llovida, vista como una maqueta: un cine de barrio con
// rótulo vertical «CINE» de neón (tubo de verdad), marquesina con bombillas que se persiguen,
// carteles iluminados y cola de gente diminuta con paraguas; bar y farmacia con neón, farolas,
// semáforo, coches con faros y charcos que reflejan todo. La cámara baja desde lo alto (efecto
// maqueta: profundidad de campo muy corta + franja nítida) hasta la acera, mirando a la marquesina.
export const ajustes = {
  duracion: 12, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.0,
    bloom: { fuerza: 0.5, radio: 0.5, umbral: 1.8 },
    ao: { fuerza: 1.1, radio: 0.22 },
    maqueta: { fuerza: 0.85, foco: 0.52, ancho: 0.12 },
    grano: 0.045, vineta: 0.45, aberracion: 1.3,
    grado: { contraste: 1.08, saturacion: 1.1, temperatura: -0.15, sombras: '#2a3c8c', luces: '#ffb46b', mezcla: 0.12 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  // ---------- Paleta: noche azul, ladrillo y granate, neón rosa, cian del bar, ámbar de bombilla ----------
  const NOCHE = '#0a1030', GRANATE = '#6e1f2c', CREMA = '#e9d8b4', ROSA = '#ff2f7a', CIAN = '#33e1ff', VERDE = '#27ff7a', AMBAR = '#ffb35a';
  const rnd = ctx.azar(2024);

  ctx.fondo(['#03061a', '#0c1440', '#1b1f4e']);
  ctx.niebla('#0b1236', 14, 38);
  ctx.entornoEstudio({
    fondo: '#0a0f2a', suelo: '#020308', intensidad: 0.55,
    paneles: [
      { pos: [2, 3, 6], tam: [2, 2], color: ROSA, fuerza: 4 }, { pos: [-6, 2, 3], tam: [2, 3], color: CIAN, fuerza: 3 },
      { pos: [5, 2, 4], tam: [3, 2], color: AMBAR, fuerza: 4 }, { pos: [0, 10, 0], tam: [8, 8], color: '#5a6cc0', fuerza: 0.6 },
    ],
  });
  ctx.luces.noche({ luna: 0.45, ambiente: 0.55, cielo: '#4152a8', tierra: '#140d1c', direccion: [-6, 12, -7], area: 13 });

  // ---------- Suelo: asfalto mojado con charcos que reflejan (espejo debajo + asfalto con huecos) ----------
  const asf = ctx.texturas.asfalto({ color: '#2a2d38', mojado: 0.7, repetir: [7, 7], tam: 1024, semilla: 9 });
  const asfaltoM = new THREE.MeshStandardMaterial({ map: asf.map, normalMap: asf.normalMap, roughnessMap: asf.roughnessMap, roughness: 1, transparent: true, alphaMap: asf.charcos });
  ctx.sueloEspejo({ material: asfaltoM, tam: 70, resolucion: 0.7 });

  // aceras con bordillo biselado y baldosas
  const baldosa = ctx.textura2d(512, 512, (g, w) => {
    g.fillStyle = '#6a6c78'; g.fillRect(0, 0, w, w);
    const r = ctx.azar(4);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const k = 96 + r() * 22; g.fillStyle = `rgb(${k},${k + 2},${k + 12})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
  });
  baldosa.wrapS = baldosa.wrapT = THREE.RepeatWrapping;
  const aceraM = (rx, rz) => { const t = baldosa.clone(); t.repeat.set(rx, rz); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, color: '#b9bccb' }); };
  const acera = (x0, x1, z0, z1) => {
    const a = ctx.caja(x1 - x0, 0.08, z1 - z0, aceraM((x1 - x0) / 0.9, (z1 - z0) / 0.9), 0.02);
    a.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2); escena.add(a);
  };
  acera(-1.0, 30, -30, 1.0); acera(-30, -3.4, -30, 1.0); acera(-30, -3.4, 3.4, 30); acera(-1.0, 30, 3.4, 30);
  // marcas viales y paso de cebra (pintura un poco brillante, mojada)
  const pintura = new THREE.MeshStandardMaterial({ color: '#d9dbe3', roughness: 0.35 });
  const m4 = new THREE.Matrix4();
  const rayas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.008, 0.06), pintura, 90);
  let k = 0;
  for (let x = -24; x <= 24; x += 1.1) { if (Math.abs(x + 2.2) < 1.8) continue; m4.makeTranslation(x, 0.004, 2.2); rayas.setMatrixAt(k++, m4); }
  for (let z = -24; z <= 24; z += 1.1) { if (Math.abs(z - 2.2) < 1.8) continue; m4.makeRotationY(Math.PI / 2).setPosition(-2.2, 0.004, z); rayas.setMatrixAt(k++, m4); }
  rayas.count = k; rayas.receiveShadow = true; escena.add(rayas);
  const cebra = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.01, 0.75), pintura, 24);
  k = 0;
  for (let i = 0; i < 7; i++) { m4.makeTranslation(-3.15 + i * 0.32 + 0.16, 0.005, 3.95); cebra.setMatrixAt(k++, m4); m4.makeRotationY(Math.PI / 2).setPosition(-0.55, 0.005, 1.25 + i * 0.32); cebra.setMatrixAt(k++, m4); }
  cebra.count = k; escena.add(cebra);

  // ---------- Fachadas con ventanas (color + emisivo); algunas con tele azul ----------
  function fachada(anchoU, altoU, colorPared, semilla, luces = 0.45, ladrillo = false) {
    const r = ctx.azar(semilla), px = 90;
    const w = Math.max(64, Math.round(anchoU * px)), h = Math.max(64, Math.round(altoU * px));
    const cols = Math.max(1, Math.round(anchoU / 0.55)), filas = Math.max(1, Math.round(altoU / 0.72));
    const vs = [];
    for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) { const u = r(); vs.push({ c, f, luz: u < luces, tono: r(), tele: u < luces * 0.18, cortina: r() < 0.5 }); }
    const dibujar = emis => g => {
      g.fillStyle = emis ? '#000' : colorPared; g.fillRect(0, 0, w, h);
      if (!emis && ladrillo) {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (let y = 0; y < h; y += 7) { g.fillRect(0, y, w, 1.2); for (let x = (y / 7) % 2 ? 0 : 7; x < w; x += 14) g.fillRect(x, y, 1.2, 7); }
      }
      if (!emis) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
      const cw = w / cols, fh = h / filas;
      vs.forEach(v => {
        const x = v.c * cw + cw * 0.22, y = v.f * fh + fh * 0.22, ww = cw * 0.56, hh = fh * 0.5;
        if (emis) {
          if (!v.luz) return;
          const gr = g.createLinearGradient(0, y, 0, y + hh);
          if (v.tele) { gr.addColorStop(0, '#6fa8ff'); gr.addColorStop(1, '#3d6cff'); }
          else { gr.addColorStop(0, v.tono < 0.5 ? '#ffd79a' : '#ffbe73'); gr.addColorStop(1, v.tono < 0.5 ? '#ffb664' : '#ff9a4a'); }
          g.fillStyle = gr; g.fillRect(x, y, ww, hh);
          if (v.cortina) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x, y, ww * 0.28, hh); g.fillRect(x + ww * 0.72, y, ww * 0.28, hh); }
          return;
        }
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - 3, y - 3, ww + 6, hh + 8);
        g.fillStyle = '#e9e2d2'; g.fillRect(x - 3, y + hh, ww + 6, 4);
        g.fillStyle = v.luz ? '#ffdcaa' : '#151c35'; g.fillRect(x, y, ww, hh);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + ww / 2 - 1.5, y, 3, hh);
      });
    };
    return { map: ctx.textura2d(w, h, dibujar(false)), em: ctx.textura2d(w, h, dibujar(true)), vs };
  }
  const techo = new THREE.MeshStandardMaterial({ color: '#23263a', roughness: 0.8 });
  const remate = new THREE.MeshStandardMaterial({ color: '#3a3f56', roughness: 0.7 });
  const extras = [];
  function edificio(x0, x1, z0, z1, alto, color, semilla, luces, ladrillo) {
    const w = x1 - x0, d = z1 - z0;
    const tz = fachada(w, alto, color, semilla, luces, ladrillo), tx = fachada(d, alto, color, semilla + 7, luces, ladrillo);
    const m = t => new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.em, emissive: '#ffffff', emissiveIntensity: 0.95, roughness: 0.85 });
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, alto, d), [m(tx), m(tx), techo, techo, m(tz), m(tz)]);
    e.castShadow = true; e.receiveShadow = true;
    e.position.set((x0 + x1) / 2, 0.08 + alto / 2, (z0 + z1) / 2);
    escena.add(e);
    const c = ctx.caja(w + 0.1, 0.1, d + 0.1, remate, 0.03); c.position.set(e.position.x, 0.08 + alto + 0.05, e.position.z); escena.add(c);
    // azotea con detalle: aparatos de aire, depósito, antena
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const a = ctx.caja(0.28, 0.18, 0.22, new THREE.MeshStandardMaterial({ color: '#8d93a6', roughness: 0.5, metalness: 0.4 }));
      a.position.set(x0 + 0.3 + rnd() * (w - 0.6), 0.08 + alto + 0.19, z0 + 0.3 + rnd() * (d - 0.6)); escena.add(a);
    }
    if (rnd() < 0.5) { const dep = ctx.cilindroBisel(0.16, 0.34, new THREE.MeshStandardMaterial({ color: '#5a4a3e', roughness: 0.7 })); dep.position.set(x0 + w * 0.7, 0.08 + alto + 0.27, z0 + d * 0.4); escena.add(dep); }
    if (rnd() < 0.6) { const an = ctx.cilindro(0.008, 0.008, 0.7, remate, 6); an.position.set(x0 + w * 0.25, 0.08 + alto + 0.45, z0 + d * 0.6); escena.add(an); }
    // balcones en la fachada principal
    if (alto > 2.5) for (let f = 1; f < Math.floor(alto / 0.72); f += 2) {
      const b = ctx.caja(w * 0.3, 0.035, 0.16, remate, 0.012); b.position.set(e.position.x + (f % 4 ? -1 : 1) * w * 0.22, 0.08 + f * 0.72 + 0.12, z1 + 0.08); escena.add(b);
    }
    extras.push({ e, tz });
    return e;
  }
  edificio(4.5, 7.6, -3.4, 0.0, 3.3, '#2f7a83', 11, 0.5, false);
  edificio(7.9, 11.1, -3.4, 0.0, 2.4, '#c9b48d', 12, 0.4, false);
  edificio(-0.6, 4.2, -7.4, -3.7, 3.9, '#4b5878', 13, 0.45, true);
  edificio(4.5, 8.2, -7.4, -3.7, 4.6, '#8f4436', 14, 0.35, true);
  edificio(-8.2, -3.8, -3.0, 0.6, 2.9, '#9a5038', 15, 0.5, true);
  edificio(-8.2, -3.8, -6.8, -3.3, 3.6, '#5f5c86', 16, 0.4, false);
  edificio(-9.0, -4.7, 4.7, 8.8, 1.9, '#d6c39b', 17, 0.55, false);
  edificio(-13, -9.4, 4.7, 8.8, 3.1, '#356580', 18, 0.45, true);
  // enfrente del cine: un parque (césped con bordillo), para que la cámara pueda bajar a la acera
  const cesped = ctx.caja(4.6, 0.06, 4.0, new THREE.MeshStandardMaterial({ color: '#1d3a2a', roughness: 0.9 }), 0.02);
  cesped.position.set(1.2, 0.1, 6.4); escena.add(cesped);

  // ---------- Bar (neón cian) y farmacia (cruz verde) en los bajos ----------
  const neonBar = ctx.neonTexto('BAR', { tam: 0.34, color: CIAN, grosor: 0.012, intensidad: 6 });
  neonBar.position.set(6.05, 1.25, 0.06); escena.add(neonBar);
  const toldo = ctx.caja(2.2, 0.06, 0.55, new THREE.MeshStandardMaterial({ color: '#1f6f78', roughness: 0.6 }), 0.02);
  toldo.position.set(6.05, 1.0, 0.28); toldo.rotation.x = 0.18; escena.add(toldo);
  const barCristal = ctx.plano(1.9, 0.62, ctx.mat.emisivo('#ffcf8a', 0.9)); barCristal.position.set(6.05, 0.45, 0.006); escena.add(barCristal);
  const cruz = new THREE.Group();
  [[0.1, 0.3], [0.3, 0.1]].forEach(([w, h]) => { const c = ctx.caja(w, h, 0.05, ctx.mat.luz(VERDE, 5), 0.015); cruz.add(c); });
  cruz.position.set(-3.75, 1.6, 0.7); cruz.rotation.y = Math.PI / 2; escena.add(cruz);
  const cruzB = ctx.caja(0.06, 0.36, 0.36, new THREE.MeshStandardMaterial({ color: '#16241d' }), 0.02); cruzB.position.set(-3.78, 1.6, 0.7); escena.add(cruzB);

  // ---------- El cine ----------
  const CX = 1.8, ANCHO = 4.8, FONDO = 3.4, ALTO = 2.4;
  const texFach = (anchoU) => ctx.textura2d(Math.round(anchoU * 110), Math.round(ALTO * 110), (g, w, h) => {
    g.fillStyle = GRANATE; g.fillRect(0, 0, w, h);
    const n = Math.max(3, Math.round(anchoU / 0.8));
    for (let i = 0; i <= n; i++) { const x = i * w / n; g.fillStyle = '#d8c398'; g.fillRect(x - 7, 0, 14, h * 0.42); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 7, 0, 5, h * 0.42); }
    g.fillStyle = CREMA; g.fillRect(0, 0, w, 16); g.fillRect(0, h * 0.42, w, 12);
    // friso de rombos art déco
    g.fillStyle = '#c9a86a';
    for (let x = 10; x < w; x += 28) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 8, 40); g.lineTo(x, 50); g.lineTo(x - 8, 40); g.fill(); }
    g.fillStyle = '#4e1520'; g.fillRect(0, h * 0.44, w, h * 0.56);
  });
  const mF = new THREE.MeshStandardMaterial({ map: texFach(ANCHO), roughness: 0.7 }), mL = new THREE.MeshStandardMaterial({ map: texFach(FONDO), roughness: 0.7 });
  const cine = new THREE.Mesh(new ctx.RoundedBoxGeometry(ANCHO, ALTO, FONDO, 2, 0.03), [mL, mL, techo, techo, mF, mF]);
  cine.castShadow = cine.receiveShadow = true;
  cine.position.set(CX, 0.08 + ALTO / 2, -FONDO / 2); escena.add(cine);
  [[ANCHO + 0.12, 0.12, FONDO + 0.12, ALTO + 0.06, '#3b2630'], [2.4, 0.42, 0.5, ALTO + 0.33, GRANATE], [2.5, 0.07, 0.56, ALTO + 0.57, CREMA], [1.3, 0.32, 0.4, ALTO + 0.76, GRANATE], [1.4, 0.06, 0.46, ALTO + 0.95, CREMA]]
    .forEach(([w, h, d, y, c]) => { const b = ctx.caja(w, h, d, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), 0.02); b.position.set(CX, 0.08 + y, d === FONDO + 0.12 ? -FONDO / 2 : -d / 2); escena.add(b); });
  // puertas de cristal encendidas
  const texPuertas = em => ctx.textura2d(512, 160, (g, w, h) => {
    g.fillStyle = em ? '#000' : '#2a1014'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x0 = 12 + i * (w - 24) / 4 + 6, x1 = 12 + (i + 1) * (w - 24) / 4 - 6;
      const gr = g.createLinearGradient(0, 10, 0, h); gr.addColorStop(0, em ? '#ffd690' : '#ffe1a8'); gr.addColorStop(1, em ? '#ff9a44' : '#ffb067');
      g.fillStyle = gr; g.fillRect(x0, 12, x1 - x0, h - 12);
      if (!em) { g.strokeStyle = '#c9a36b'; g.lineWidth = 5; g.strokeRect(x0, 12, x1 - x0, h - 12); g.fillStyle = '#e6c58a'; g.fillRect(x1 - 18, h * 0.55, 5, 26); }
    }
  });
  const puertas = ctx.plano(2.6, 0.95, new THREE.MeshStandardMaterial({ map: texPuertas(false), emissiveMap: texPuertas(true), emissive: '#ffffff', emissiveIntensity: 1.1, roughness: 0.2 }));
  puertas.position.set(CX, 0.08 + 0.48, 0.006); escena.add(puertas);
  const luzPuerta = ctx.practica([CX, 0.5, 0.45], { color: '#ffb46a', intensidad: 1.6, distancia: 2.6, bombilla: false });

  // carteles iluminados (títulos inventados) en vitrinas
  function cartel(titulo, a, b, dibujo) {
    return ctx.textura2d(240, 340, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      dibujo(g, w, h);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '800 30px Inter'; g.fillText(titulo[0], w / 2, h - 60); g.fillText(titulo[1], w / 2, h - 26);
    });
  }
  const tx1 = cartel(['LUNA DE', 'PAPEL'], '#1d3f8f', '#0b1636', (g, w) => { g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(w * 0.62, 95, 48, 0, 7); g.fill(); g.fillStyle = '#0b1636'; g.beginPath(); g.arc(w * 0.72, 85, 44, 0, 7); g.fill(); });
  const tx2 = cartel(['EL ÚLTIMO', 'TREN'], '#ff7a3d', '#7a1d2b', (g, w) => { g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(w / 2, 160, 72, Math.PI, 0); g.fill(); g.fillStyle = '#3a0f18'; g.fillRect(20, 160, w - 40, 14); });
  [[0.05, tx1], [3.55, tx2]].forEach(([x, tx]) => {
    const f = ctx.caja(0.64, 0.88, 0.06, new THREE.MeshStandardMaterial({ color: '#c9a86a', metalness: 0.8, roughness: 0.3 }), 0.02); f.position.set(x, 0.08 + 0.62, 0.03); escena.add(f);
    const p = ctx.plano(0.52, 0.76, new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.15 })); p.position.set(x, 0.08 + 0.62, 0.065); escena.add(p);
  });

  // marquesina con panel retroiluminado y bombillas
  const MQ = { w: 3.9, h: 0.52, d: 1.05, y: 1.5 };
  const marquesina = ctx.caja(MQ.w, MQ.h, MQ.d, new THREE.MeshStandardMaterial({ color: '#2a0f16', roughness: 0.5, metalness: 0.3 }), 0.05);
  marquesina.position.set(CX, 0.08 + MQ.y, MQ.d / 2); escena.add(marquesina);
  const texPanel = ctx.textura2d(1024, 112, (g, w, h) => {
    g.fillStyle = '#fff4dc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3122e'; g.font = '84px "Archivo Black"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '10px';
    g.fillText('ESTRENO HOY', w / 2, h / 2 + 4);
  });
  const panel = ctx.plano(MQ.w - 0.3, MQ.h - 0.16, new THREE.MeshStandardMaterial({ map: texPanel, emissiveMap: texPanel, emissive: '#ffffff', emissiveIntensity: 0.8 }));
  panel.position.set(CX, 0.08 + MQ.y, MQ.d + 0.004); escena.add(panel);
  const plafon = ctx.plano(MQ.w - 0.1, MQ.d - 0.1, ctx.mat.luz('#ffd9a0', 1.3)); plafon.rotation.x = Math.PI / 2; plafon.position.set(CX, 0.08 + MQ.y - MQ.h / 2 - 0.004, MQ.d / 2); escena.add(plafon);
  const luzMarq = ctx.practica([CX, 1.2, 0.8], { color: '#ffc27a', intensidad: 2.6, distancia: 3.6, bombilla: false });

  // rótulo vertical «CINE»: bandera granate + neón de tubo en las dos caras
  const RV = { x: CX, y0: 0.08 + MQ.y + MQ.h / 2 + 0.05, alto: 2.35, d: 0.78 };
  const bandera = ctx.caja(0.2, RV.alto, RV.d, new THREE.MeshStandardMaterial({ color: '#2a0f16', roughness: 0.45, metalness: 0.4 }), 0.04);
  bandera.position.set(RV.x, RV.y0 + RV.alto / 2, RV.d / 2); escena.add(bandera);
  const letrasCine = [];
  [...'CINE'].forEach((ch, i) => {
    [-1, 1].forEach(lado => {
      const l = ctx.neonTexto(ch, { tam: 0.36, color: ROSA, grosor: 0.013, intensidad: 7 });
      l.rotation.y = lado * Math.PI / 2;
      l.position.set(RV.x + lado * 0.115, RV.y0 + RV.alto - 0.38 - i * 0.52, RV.d * 0.45);
      escena.add(l); letrasCine.push(l);
    });
  });
  const luzNeon = ctx.practica([RV.x + 0.6, RV.y0 + 1.2, RV.d * 0.5], { color: ROSA, intensidad: 0, distancia: 4, bombilla: false });

  // bombillas: color HDR por bombilla para que «se persigan»
  const puntosB = [];
  const zF = MQ.d + 0.02, yA = 0.08 + MQ.y + MQ.h / 2 + 0.02, yB = 0.08 + MQ.y - MQ.h / 2 - 0.02;
  for (let x = CX - MQ.w / 2 + 0.06; x <= CX + MQ.w / 2 - 0.05; x += 0.11) { puntosB.push([x, yA, zF]); puntosB.push([x, yB, zF]); }
  for (let z = 0.1; z <= MQ.d; z += 0.11) [-1, 1].forEach(l => { puntosB.push([CX + l * (MQ.w / 2 + 0.02), yA, z]); puntosB.push([CX + l * (MQ.w / 2 + 0.02), yB, z]); });
  for (let y = RV.y0 + 0.08; y <= RV.y0 + RV.alto - 0.05; y += 0.11) puntosB.push([RV.x, y, RV.d + 0.03]);
  const bombillas = ctx.instancias(new THREE.SphereGeometry(0.026, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), puntosB.length, (i, o) => { o.pos = puntosB[i]; o.color = '#ffffff'; });
  bombillas.castShadow = false;
  escena.add(bombillas);
  const ENC = new THREE.Color('#ffd79a').multiplyScalar(5), APAG = new THREE.Color('#5a3a18').multiplyScalar(0.6);

  // ---------- Farolas con luz real, semáforo, guirnaldas y árboles ----------
  const mPoste = ctx.mat.metal('#23283a', { roughness: 0.45 });
  const farola = (x, z, giro) => {
    const g = new THREE.Group();
    const p = ctx.cilindro(0.022, 0.032, 1.45, mPoste, 12); p.position.y = 0.72;
    const brazo = ctx.tubo([[0, 1.4, 0], [0.12, 1.47, 0], [0.28, 1.44, 0]], 0.014, mPoste, 16);
    const pantalla = ctx.cono(0.07, 0.06, mPoste, 16); pantalla.position.set(0.28, 1.41, 0);
    g.add(p, brazo, pantalla);
    g.position.set(x, 0.08, z); g.rotation.y = giro; escena.add(g);
    const wp = new THREE.Vector3(0.28, 1.36, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), giro).add(new THREE.Vector3(x, 0.08, z));
    ctx.practica(wp.toArray(), { color: '#ffcf8f', intensidad: 2.2, distancia: 3.2, radio: 0.035, brillo: 7 });
  };
  farola(5.9, 0.88, Math.PI / 2); farola(-3.65, 0.75, Math.PI / 2); farola(9.5, 0.88, Math.PI / 2); farola(5.4, 3.72, -Math.PI / 2);
  // semáforo en la esquina
  const sem = new THREE.Group();
  const semPoste = ctx.cilindro(0.018, 0.018, 1.1, mPoste, 10); semPoste.position.y = 0.55;
  const semCaja = ctx.caja(0.1, 0.28, 0.08, new THREE.MeshStandardMaterial({ color: '#15171f', roughness: 0.5 }), 0.02); semCaja.position.y = 1.2;
  sem.add(semPoste, semCaja);
  const luzSem = ['#ff2a2a', '#ffb000', '#27ff7a'].map((c, i) => { const l = ctx.esfera(0.026, ctx.mat.luz(c, 0.2), 12); l.position.set(0, 1.29 - i * 0.085, 0.042); l.castShadow = false; sem.add(l); return { l, c }; });
  sem.position.set(-0.85, 0.08, 1.1); escena.add(sem);
  const copa = new THREE.MeshStandardMaterial({ color: '#1f5236', roughness: 0.8, flatShading: true });
  const tronco = new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.9 });
  const arboles = [[1.4, 6.0, 1], [3.0, 7.0, 0.8], [-6.6, 4.2, 0.8], [8.6, 4.6, 0.9], [12.4, 1.2, 1.0]];
  // (el parque está detrás de la cola, al otro lado de la calle)
  arboles.forEach(([x, z, s]) => {
    const tr = ctx.cilindro(0.04, 0.06, 0.5, tronco, 8); tr.position.set(x, 0.33, z);
    const cp = ctx.malla(new THREE.IcosahedronGeometry(0.42 * s, 1), copa); cp.position.set(x, 0.82 * s + 0.2, z);
    escena.add(tr, cp);
  });
  // guirnalda de bombillitas sobre la calle (entre el cine y el edificio de enfrente)
  const guir = [];
  [[-0.4, 2.3, 0.6, -0.4, 2.0, 4.4], [4.2, 2.3, 0.4, 3.4, 2.1, 4.4]].forEach(([x0, y0, z0, x1, y1, z1]) => {
    for (let i = 0; i <= 22; i++) { const u = i / 22; guir.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - Math.sin(Math.PI * u) * 0.35, z0 + (z1 - z0) * u]); }
  });
  const guirnalda = ctx.instancias(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), guir.length, (i, o) => { o.pos = guir[i]; o.color = new THREE.Color(i % 3 ? '#ffcf8a' : '#ff8fb8').multiplyScalar(4); });
  guirnalda.castShadow = false; escena.add(guirnalda);

  // ---------- Gente diminuta: cola con paraguas y dos que llegan corriendo ----------
  const pieles = ['#f1c9a5', '#d9a27c', '#8d5a3b', '#f3d2b8'];
  const ropa = ['#ff7a59', '#3ec1ff', '#ffd23f', '#b48cff', '#56c596', '#f4f1ea', '#ff5a8a', '#4a6cff', '#e8a33d', '#2b2f3a'];
  const pelos = ['#2a1d16', '#5a3a22', '#c9a46a', '#1a1a1f', '#8a8f99'];
  const mPierna = new THREE.MeshStandardMaterial({ color: '#1d1f2a', roughness: 0.8 });
  const mZapato = new THREE.MeshStandardMaterial({ color: '#111216', roughness: 0.5 });
  // silueta diminuta pero legible: piernas, abrigo que se abre hacia abajo, hombros, brazos, cabeza con pelo; paraguas con varillas
  const abrigoGeo = new THREE.LatheGeometry([[0.0, 0.205], [0.034, 0.205], [0.046, 0.19], [0.048, 0.15], [0.052, 0.1], [0.058, 0.075], [0.0, 0.075]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const persona = (cRopa, cPiel, paraguas, semilla) => {
    const r = ctx.azar(semilla || 1);
    const g = new THREE.Group();
    const mR = new THREE.MeshStandardMaterial({ color: cRopa, roughness: 0.75 });
    const abrigo = ctx.malla(abrigoGeo, mR); abrigo.scale.set(1, 1, 0.78);
    const hombros = ctx.esfera(0.036, mR, 12); hombros.scale.set(1.25, 0.55, 0.9); hombros.position.y = 0.205;
    const cuello = ctx.cilindro(0.012, 0.014, 0.02, new THREE.MeshStandardMaterial({ color: cPiel, roughness: 0.6 }), 8); cuello.position.y = 0.225;
    const cabeza = ctx.esfera(0.031, new THREE.MeshStandardMaterial({ color: cPiel, roughness: 0.6 }), 14); cabeza.position.y = 0.258; cabeza.scale.set(0.95, 1.08, 1);
    const pelo = ctx.malla(new THREE.SphereGeometry(0.033, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: pelos[Math.floor(r() * pelos.length)], roughness: 0.85 }));
    pelo.position.set(0, 0.262, -0.003); pelo.rotation.x = -0.25;
    const pi = new THREE.Group(), pd = new THREE.Group();
    [pi, pd].forEach((p, k) => {
      const pierna = ctx.malla(new THREE.CapsuleGeometry(0.013, 0.06, 3, 6), mPierna); pierna.position.y = -0.04;
      const zapato = ctx.caja(0.03, 0.014, 0.022, mZapato, 0.006); zapato.position.set(0.008, -0.078, 0);
      p.add(pierna, zapato); p.position.set(0, 0.085, k ? -0.017 : 0.017);
    });
    const brazo = k => { const b = ctx.malla(new THREE.CapsuleGeometry(0.011, 0.08, 3, 6), mR); b.position.set(0.004, 0.155, k * 0.05); b.rotation.x = k * 0.12; return b; };
    g.add(abrigo, hombros, cuello, cabeza, pelo, pi, pd, brazo(1), brazo(-1));
    if (r() < 0.35) { const bufanda = ctx.toro(0.022, 0.007, new THREE.MeshStandardMaterial({ color: ['#ffd23f', '#ff5a5a', '#f4f1ea'][Math.floor(r() * 3)], roughness: 0.8 })); bufanda.rotation.x = Math.PI / 2; bufanda.position.y = 0.218; g.add(bufanda); }
    if (paraguas) {
      const pu = new THREE.Group();
      const tela = ctx.malla(new THREE.ConeGeometry(0.12, 0.05, 8, 1, true), new THREE.MeshStandardMaterial({ color: paraguas, roughness: 0.35, side: THREE.DoubleSide }));
      const mV = ctx.mat.metal('#bfc3c9', { roughness: 0.4 });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const v = ctx.cilindro(0.0018, 0.0018, 0.13, mV, 4); v.position.set(Math.cos(a) * 0.06, -0.022, Math.sin(a) * 0.06); v.rotation.set(0, -a, Math.PI / 2 - 0.4); v.rotation.order = 'YZX'; pu.add(v); }
      const punta = ctx.cilindro(0.003, 0.003, 0.025, mV, 5); punta.position.y = 0.035;
      const palo = ctx.cilindro(0.0035, 0.0035, 0.2, mPierna, 5); palo.position.y = -0.1;
      const mango = ctx.toro(0.01, 0.003, mPierna, Math.PI); mango.position.set(0.01, -0.2, 0); mango.rotation.z = Math.PI;
      pu.add(tela, punta, palo, mango);
      pu.position.set(0.035, 0.42, 0.02); pu.rotation.z = -0.12;
      g.add(pu);
    }
    g.userData.piernas = [pi, pd];
    escena.add(g);
    return g;
  };
  const cola = [];
  for (let i = 0; i < 10; i++) {
    const p = persona(ropa[i % ropa.length], pieles[i % 4], i === 2 ? '#ff2f7a' : i === 6 ? '#33a1ff' : i === 8 ? '#ffd23f' : null, 100 + i);
    p.position.set(CX + 0.62 + i * 0.26, 0.08, 0.62 + (rnd() - 0.5) * 0.08);
    p.rotation.y = -Math.PI / 2 + (rnd() - 0.5) * 0.6;
    p.userData.x0 = p.position.x; p.userData.fase = rnd() * 6; p.userData.r0 = p.rotation.y;
    cola.push(p);
  }
  const llegan = [persona('#2ec4b6', pieles[1], '#ff9f1c', 201), persona('#ff9f1c', pieles[2], null, 202)];

  // ---------- Coches con faros (haz de luz + luz real) y pilotos ----------
  const mRueda = ctx.mat.goma('#111217'), mCristal = new THREE.MeshPhysicalMaterial({ color: '#0e1426', roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const texHaz = ctx.textura2d(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  function coche(colorCarro) {
    const g = new THREE.Group();
    const pint = ctx.mat.brillante(colorCarro, { roughness: 0.25, clearcoatRoughness: 0.05 });
    const cuerpo = ctx.caja(0.92, 0.2, 0.42, pint, 0.07); cuerpo.position.y = 0.17;
    const cabina = ctx.caja(0.5, 0.17, 0.38, mCristal, 0.07); cabina.position.set(-0.05, 0.33, 0);
    const techoC = ctx.caja(0.44, 0.04, 0.36, pint, 0.02); techoC.position.set(-0.05, 0.42, 0);
    g.add(cuerpo, cabina, techoC);
    [[0.28, 0.2], [0.28, -0.2], [-0.3, 0.2], [-0.3, -0.2]].forEach(([x, z]) => { const r = ctx.cilindroBisel(0.085, 0.06, mRueda, { bisel: 0.02 }); r.rotation.x = Math.PI / 2; r.position.set(x, 0.085, z); g.add(r); });
    const faro = ctx.mat.luz('#fff3d6', 10), piloto = ctx.mat.luz('#ff1a1a', 6);
    [0.13, -0.13].forEach(z => {
      const f = ctx.caja(0.02, 0.045, 0.08, faro, 0.008); f.position.set(0.465, 0.19, z); f.castShadow = false; g.add(f);
      const p = ctx.caja(0.02, 0.045, 0.08, piloto, 0.008); p.position.set(-0.465, 0.19, z); p.castShadow = false; g.add(p);
      const haz = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.3), new THREE.MeshBasicMaterial({ map: texHaz, color: new THREE.Color('#ffe6b0').multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      haz.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); haz.position.set(1.1, 0.012, z * 1.4); g.add(haz);
    });
    const luz = new THREE.PointLight('#ffe2b0', 2.2, 2.6, 2); luz.position.set(0.9, 0.25, 0); g.add(luz);
    escena.add(g);
    return g;
  }
  const coches = [
    { o: coche('#ffd23f'), eje: 'x', carril: 2.8, desde: -12, vel: 3.4 },
    { o: coche('#3ec1ff'), eje: 'x', carril: 1.6, desde: 14, vel: -3.0 },
    { o: coche('#e8e4da'), eje: 'z', carril: -1.6, desde: 16, vel: -2.8 },
    { o: coche('#ff5a4a'), eje: 'x', carril: 2.8, desde: -27, vel: 3.4 },
  ];

  // ---------- Lluvia fina (con el desenfoque de movimiento se ve como hilos) ----------
  const NL = 700;
  const lluvia = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.12, 0.004), new THREE.MeshBasicMaterial({ color: new THREE.Color('#b9c8ff').multiplyScalar(1.4), transparent: true, opacity: 0.38, depthWrite: false }), NL);
  lluvia.frustumCulled = false; lluvia.castShadow = false;
  const gotasL = Array.from({ length: NL }, () => ({ x: -6 + rnd() * 16, z: -4 + rnd() * 11, f: rnd(), v: 0.9 + rnd() * 0.3 }));
  escena.add(lluvia);
  // ondas en los charcos donde cae la lluvia
  const NO = 40;
  const ondaM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const ondas = new THREE.InstancedMesh(new THREE.RingGeometry(0.9, 1, 32), ondaM, NO);
  ondas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NO * 3), 3);
  ondas.frustumCulled = false; ondas.castShadow = false;
  const datosO = Array.from({ length: NO }, () => ({ x: -3 + rnd() * 10, z: 1.2 + rnd() * 2, f: rnd() }));
  escena.add(ondas);

  // ---------- Textos ----------
  const r1 = ctx.rotulo({ texto: 'Neón de tubo', sub: 'rótulo «CINE» de 1956', num: 1, en: letrasCine[5], desplaza: [0, 0, 0], lado: 'izquierda', dist: 230, tema: 'oscuro', acento: ROSA });
  const r2 = ctx.rotulo({ texto: 'Marquesina', sub: `${puntosB.length} bombillas que se persiguen`, num: 2, en: [CX - MQ.w / 2 + 0.1, 0.08 + MQ.y + 0.3, MQ.d], lado: 'izquierda', dist: 170, tema: 'oscuro', acento: AMBAR, ...(ctx.vertical ? { fijo: [0.55, 0.15] } : {}) });
  const r3 = ctx.rotulo({ texto: 'La cola', sub: 'sesión de las 22:00', num: 3, en: cola[2], desplaza: [0, 0.05, 0], lado: 'abajo', dist: 130, tema: 'oscuro', acento: CIAN });
  const titulo = ctx.titulo({ texto: 'Noche de\nestreno', etiqueta: 'Sesión de las 22:00', sub: 'Cine Capitol · desde 1956', pos: 'abajo-izquierda', color: '#fff4e6', colorSub: 'rgba(255,244,230,0.75)', sombra: true, tam: 104, colorEtiqueta: ROSA, fuente: '"Archivo Black"', peso: 400, espaciado: -0.02 });

  // ---------- Cámara: vista de maqueta desde lo alto → baja a la acera mirando la marquesina ----------
  const V = ctx.vertical;   // en vertical el cine va centrado y el titular abajo, sobre la calle oscura
  const cam = ctx.camaraPorClaves([
    { t: 0, pos: [-7.4, 9.2, 11.2], mira: [1.9, 0.8, -0.5], fov: 25, foco: [1.9, 1.2, 0.3], apertura: 1.15 },
    { t: 3.6, pos: [-5.6, 5.6, 9.4], mira: [2.0, 1.0, -0.3], fov: 27, foco: [1.9, 1.2, 0.3], apertura: 1.1 },
    { t: 7.0, pos: [-2.2, 2.4, 7.4], mira: [2.1, 1.3, 0.0], fov: 31, foco: [2.0, 1.4, 0.6], apertura: 0.9 },
    { t: 9.6, pos: [-2.3, 0.78, 6.5], mira: V ? [1.75, 2.0, 0.0] : [0.6, 2.0, 0.0], fov: 40, foco: [1.9, 1.8, 0.6], apertura: 0.7 },
    { t: 12, pos: [-2.0, 0.7, 6.1], mira: V ? [1.75, 2.05, 0.0] : [0.55, 2.05, 0.0], fov: 40, foco: [1.9, 1.9, 0.6], apertura: 0.7 },
  ], { continuo: true, ease: 'suave', deriva: 0.06 });

  const parpadeo = t => {   // encendido de neón: tartamudea y se queda fijo (determinista)
    if (t < 0.12) return 0;
    if (t > 0.75) return 1;
    const n = Math.floor(t * 28), h = Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
    return h > 0.45 ? 1 : 0.08;
  };

  return {
    momentos: [
      { t: 0.5, nombre: 'se enciende el neón (vista de maqueta)' },
      { t: 2.6, nombre: 'coches, lluvia y bombillas' },
      { t: 5.2, nombre: 'baja la cámara · rótulos' },
      { t: 7.6, nombre: 'marquesina y la cola' },
      { t: 9.8, nombre: 'a pie de calle' },
      { t: 11.6, nombre: 'plano final con título' },
    ],
    pintar(t) {
      cam(t);
      // la franja nítida del efecto maqueta acompaña a la bajada y se apaga a pie de calle
      ctx.post.ajustar({ maqueta: { fuerza: ctx.mezcla(0.85, 0.0, ctx.entre(t, 6.5, 9.5, 'suave')), foco: ctx.mezcla(0.5, 0.56, ctx.entre(t, 0, 7, 'suave')) } });

      const on = parpadeo(t);
      letrasCine.forEach((l, i) => {
        const tarde = parpadeo(t - Math.floor(i / 2) * 0.09);
        const k = on * tarde * (0.94 + 0.06 * Math.sin(t * 7 + i));
        l.userData.material.color.set(ROSA).lerp(new THREE.Color('#ffffff'), 0.25).multiplyScalar(5 * k + 0.05);
      });
      luzNeon.luz.intensity = 3.2 * on;
      // bombillas que se persiguen (1 de cada 3 apagada, 8 pasos por segundo)
      const paso = Math.floor(t * 8);
      for (let i = 0; i < puntosB.length; i++) bombillas.setColorAt(i, (i + paso) % 3 === 0 ? APAG : ENC);
      bombillas.instanceColor.needsUpdate = true;
      luzMarq.luz.intensity = 2.5 + 0.25 * Math.sin(t * 8);
      // semáforo: verde → ámbar → rojo
      const fase = t < 4.2 ? 2 : t < 5.4 ? 1 : 0;
      luzSem.forEach((s, i) => s.l.material.color.set(s.c).multiplyScalar(i === fase ? 9 : 0.15));

      coches.forEach(c => {
        const p = c.desde + c.vel * t;
        if (c.eje === 'x') { c.o.position.set(p, 0, c.carril); c.o.rotation.y = c.vel > 0 ? 0 : Math.PI; }
        else { c.o.position.set(c.carril, 0, p); c.o.rotation.y = c.vel > 0 ? -Math.PI / 2 : Math.PI / 2; }
        c.o.position.y = Math.abs(Math.sin(t * 18 + c.carril)) * 0.005;
      });
      // la cola: se balancean; dos entran al cine y los demás avanzan
      const ENTRAN = [3.2, 7.4];
      const avance = ENTRAN.reduce((s, te) => s + ctx.entre(t, te + 0.25, te + 0.85, 'suave'), 0);
      const FRENTE = CX + 0.62;
      cola.forEach((q, i) => {
        const d = q.userData;
        q.visible = true; q.scale.setScalar(1);
        if (i < ENTRAN.length && t > ENTRAN[i]) {
          const p = ctx.entre(t, ENTRAN[i], ENTRAN[i] + 0.8, 'suave');
          q.position.set(ctx.mezcla(FRENTE, CX + 0.25, p), 0.08, ctx.mezcla(0.62, 0.1, p));
          q.rotation.y = ctx.mezcla(-Math.PI / 2, Math.PI, p);
          q.scale.setScalar(Math.max(0.0001, 1 - ctx.entre(t, ENTRAN[i] + 0.6, ENTRAN[i] + 0.8)));
          q.visible = p < 0.999;
          return;
        }
        const anda = ctx.entre(t, ENTRAN[0] + 0.25, ENTRAN[0] + 0.85) * (1 - ctx.entre(t, ENTRAN[0] + 0.85, ENTRAN[0] + 0.9));
        q.position.x = d.x0 - 0.26 * avance;
        q.position.y = 0.08 + Math.max(0, Math.sin(t * 2 + d.fase)) * 0.01;
        q.rotation.y = d.r0 + Math.sin(t * 0.9 + d.fase) * 0.22;
        d.piernas[0].rotation.z = Math.sin(t * 14) * 0.45 * anda; d.piernas[1].rotation.z = -Math.sin(t * 14) * 0.45 * anda;
      });
      llegan.forEach((q, i) => {
        const x = 8.8 - (1.1 + i * 0.12) * Math.max(0, t - 0.4 - i * 0.5);
        const xf = Math.max(x, FRENTE + (10 + i) * 0.26 - 0.26 * avance);
        const corre = x > xf ? 0 : 1;
        q.position.set(xf, 0.08 + corre * Math.abs(Math.sin(t * 11 + i)) * 0.022, 0.64 + i * 0.05);
        q.rotation.y = -Math.PI / 2;
        q.userData.piernas[0].rotation.z = Math.sin(t * 16 + i) * 0.7 * corre; q.userData.piernas[1].rotation.z = -Math.sin(t * 16 + i) * 0.7 * corre;
      });
      // lluvia y ondas
      const m = new THREE.Matrix4();
      gotasL.forEach((d, i) => {
        const u = ((t * 1.35 * d.v + d.f) % 1 + 1) % 1;
        m.makeTranslation(d.x + u * 0.25, 5.5 - u * 5.5, d.z);
        lluvia.setMatrixAt(i, m);
      });
      lluvia.instanceMatrix.needsUpdate = true;
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), pv = new THREE.Vector3(), sv = new THREE.Vector3();
      datosO.forEach((d, i) => {
        const u = ((t * 1.1 + d.f) % 1 + 1) % 1, r = 0.015 + u * 0.08;
        pv.set(d.x, 0.006, d.z); sv.set(r, r, r);
        m.compose(pv, q0, sv); ondas.setMatrixAt(i, m);
        ondas.setColorAt(i, new THREE.Color('#9fb0ff').multiplyScalar(0.35 * (1 - u)));
      });
      ondas.instanceMatrix.needsUpdate = true; ondas.instanceColor.needsUpdate = true;

      r1.mostrar(ctx.entre(t, 4.4, 5.3) - ctx.entre(t, 7.1, 7.5));
      r2.mostrar(ctx.entre(t, 5.3, 6.2) - ctx.entre(t, 8.0, 8.4));
      r3.mostrar(ctx.entre(t, 6.4, 7.3) - ctx.entre(t, 8.8, 9.2));
      titulo.mostrar(ctx.entre(t, 9.7, 11.0));
    },
  };
}
