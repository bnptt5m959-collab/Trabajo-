// Estilo 04 · Vista explotada — tema de muestra: una cámara de fotos por dentro
// Guion: la cámara montada se revela con un destello en el objetivo (0-0,8 s) · se abre por
// grupos a lo largo de sus ejes, con líneas guía discontinuas (0,9-3 s) · la cámara recorre la
// fila de piezas: objetivo, diafragma que se cierra, sensor (macro con cambio de foco), batería y
// pantalla (3-8,4 s) · se vuelve a montar con clics y dispara (8,4-9,6 s) · plano de anuncio (9,6-12 s).
// Dirección de arte: plató cálido de estudio (arena) con caja de luz grande, recorte frío detrás,
// sombras de contacto, materiales muy distintos (cuero, aluminio cepillado, goma moleteada, vidrio
// con tratamiento iridiscente, placa verde con oro) y un acento naranja.

export const ajustes = {
  duracion: 12, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.08,
    bloom: { fuerza: 0.35, radio: 0.5, umbral: 2.0 },
    ao: { fuerza: 1.15, radio: 0.3 },
    grano: 0.035, vineta: 0.34, aberracion: 0.8,
    grado: { contraste: 1.06, saturacion: 1.04, sombras: '#3a4a6a', luces: '#ffd9a8', mezcla: 0.1 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  const V = ctx.vertical;
  // ---- Paleta: arena (plató), grafito (cuerpo), aluminio, naranja (acento), tinta ----
  const ARENA = '#d9bf9c', GRAFITO = '#2a2826', NARANJA = '#ff6a2b', TINTA = '#1b1a1f', FRIO = '#9cc3ff';

  // ---- Plató cálido con foco de luz detrás ----
  ctx.fondo({ tipo: 'radial', centro: '#f1dfc6', medio: '#d4b896', borde: '#8c6f53', y: 0.42, radio: 0.85 });
  ctx.niebla('#c7a986', 11, 30);
  ctx.entornoEstudio({
    fondo: '#d9c2a3', suelo: '#6b5642', intensidad: 1.0,
    paneles: [
      { pos: [-6, 4, 5], tam: [4, 6], color: '#fff3e2', fuerza: 3.2 },     // caja de luz grande
      { pos: [7, 3, 1], tam: [1, 8], color: '#ffffff', fuerza: 4 },        // tira: línea de brillo en el metal
      { pos: [0, 2.5, -8], tam: [8, 2], color: FRIO, fuerza: 3.4 },        // recorte frío
      { pos: [0, 9, 0], tam: [6, 6], color: '#fff6ea', fuerza: 1.4 },
    ],
  });
  ctx.luces.producto({ centro: [0, 1.25, 0.3], direccion: [-3.4, 6, 4.4], fuerzaClave: 5, fuerzaSombra: 1.5, area: 4.2,
    recortes: ['#ffcf9a', FRIO], fuerzaRecorte: 16, fuerzaTope: 1.6, ambiente: 0.55, cielo: '#fff4e6', tierra: '#7a5f46' });
  const sueloM = ctx.superficie('papel', { color: '#cdb08e', repetir: [6, 6], semilla: 3, material: { roughness: 0.9 } });
  ctx.suelo({ material: sueloM });

  // ---- Texturas propias ----
  const cuero = ctx.texturas.ruido({ escala: 64, fuerza: 0.1, relieve: 5, color: '#3a3532', semilla: 8, rugosidad: 0.72, repetir: [3, 2] });
  const moleteado = (n, rep = 1) => {       // normal map de estrías verticales (diales y anillos)
    const t = ctx.textura2d(512, 16, (g, w, h) => {
      const d = g.createImageData(w, h);
      for (let x = 0; x < w; x++) { const a = Math.sin(x / w * Math.PI * 2 * n); for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; d.data[i] = 128 + 110 * a; d.data[i + 1] = 128; d.data[i + 2] = 220; d.data[i + 3] = 255; } }
      g.putImageData(d, 0, 0);
    });
    t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, 1);
    return t;
  };
  const cepT = ctx.texturas.cepillado({ color: '#c9ccd1', rugosidad: 0.28, semilla: 4, repetir: [1, 1] });

  // ---- Materiales ----
  const mCuero = new THREE.MeshStandardMaterial({ map: cuero.map, normalMap: cuero.normalMap, roughness: 0.78, normalScale: new THREE.Vector2(0.9, 0.9) });
  const mPlaca = new THREE.MeshPhysicalMaterial({ map: cepT.map, roughnessMap: cepT.roughnessMap, normalMap: cepT.normalMap, metalness: 1, roughness: 1, anisotropy: 0.7, color: '#e6e8ec' });
  const mGrafito = ctx.mat.plastico(GRAFITO, { roughness: 0.45, clearcoat: 0.3 });
  const mAnod = new THREE.MeshPhysicalMaterial({ color: '#17171a', metalness: 0.6, roughness: 0.35, clearcoat: 0.4 });
  const mGomaM = new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.85, normalMap: moleteado(120, 1), normalScale: new THREE.Vector2(1.4, 1.4) });
  const mDial = new THREE.MeshPhysicalMaterial({ color: '#d6d9de', metalness: 1, roughness: 0.25, normalMap: moleteado(90, 1), normalScale: new THREE.Vector2(1.2, 1.2) });
  const mCromo = ctx.mat.metal('#e2e4e8', { roughness: 0.12 });
  const mNaranja = ctx.mat.brillante(NARANJA, { roughness: 0.25 });
  const mOro = ctx.mat.metal('#e0b356', { roughness: 0.25 });
  const vidrioLente = () => {
    const m = ctx.mat.vidrio('#f2f6ff', { thickness: 0.25, ior: 1.55, roughness: 0.02, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [260, 480], envMapIntensity: 1.8 });
    ctx.brilloBorde(m, { color: '#cfe2ff', fuerza: 0.6, potencia: 3 });
    return m;
  };

  // ---- Producto ----
  const producto = new THREE.Group();
  producto.position.y = 1.25;
  escena.add(producto);
  const piezas = [];   // {obj, salto, orden, giro}
  const pieza = (obj, salto, orden, giro = 0) => { producto.add(obj); ctx.base(obj); piezas.push({ obj, salto: new THREE.Vector3(...salto), orden, giro }); return obj; };

  // cuerpo: cuero + placa superior cepillada + empuñadura + ojales + tornillos
  const cuerpo = new THREE.Group();
  const caja = ctx.caja(2.4, 1.05, 0.8, mCuero, 0.1); caja.position.y = -0.12; cuerpo.add(caja);
  const placa = ctx.caja(2.44, 0.3, 0.84, mPlaca, 0.07); placa.position.y = 0.53; cuerpo.add(placa);
  const base = ctx.caja(2.44, 0.1, 0.84, mPlaca, 0.04); base.position.y = -0.66; cuerpo.add(base);
  const grip = ctx.caja(0.5, 1.12, 0.32, mGomaM, 0.14); grip.position.set(0.96, -0.08, 0.48); cuerpo.add(grip);
  [-1, 1].forEach(l => { const o = ctx.toro(0.06, 0.018, mCromo); o.position.set(l * 1.24, 0.42, 0); o.rotation.y = Math.PI / 2; cuerpo.add(o); });
  const montura = ctx.torno([[0.6, 0], [0.64, 0.02], [0.64, 0.07], [0.58, 0.09], [0.5, 0.09], [0.5, 0]], mCromo, 96);
  montura.rotation.x = Math.PI / 2; montura.position.set(-0.15, -0.08, 0.4); cuerpo.add(montura);
  const tornillos = ctx.instancias(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), mCromo, 10, (i, o) => {
    const a = i / 6 * Math.PI * 2; o.pos = i < 6 ? [-0.15 + Math.cos(a) * 0.57, -0.08 + Math.sin(a) * 0.57, 0.5] : [-0.9 + (i - 6) * 0.55, -0.715, 0.25]; o.rot = i < 6 ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  });
  cuerpo.add(tornillos);
  pieza(cuerpo, [0, 0, 0], 0);

  // arriba: visor, diales moleteados, disparador naranja, zapata
  const visor = new THREE.Group();
  const joroba = ctx.caja(0.86, 0.42, 0.72, mCuero, 0.08); visor.add(joroba);
  const tapaV = ctx.caja(0.9, 0.08, 0.76, mPlaca, 0.03); tapaV.position.y = 0.23; visor.add(tapaV);
  const zapata = ctx.caja(0.34, 0.05, 0.3, mCromo, 0.01); zapata.position.y = 0.29; visor.add(zapata);
  const ocular = ctx.cilindroBisel(0.16, 0.12, mGomaM, { bisel: 0.03 }); ocular.rotation.x = Math.PI / 2; ocular.position.set(0, 0.0, -0.42); visor.add(ocular);
  visor.position.set(-0.15, 0.85, 0);
  pieza(visor, [0, 0.95, 0], 2);
  const dial = (r, h, x, z) => { const d = ctx.cilindro(r, r, h, mDial, 64); d.position.set(x, 0.77, z); const tp = ctx.cilindro(r * 0.86, r * 0.86, 0.012, mPlaca, 48); tp.position.y = h / 2 + 0.006; d.add(tp); return d; };
  const dial1 = pieza(dial(0.27, 0.15, 0.68, 0.05), [0.12, 1.25, 0], 2, 1);
  const dial2 = pieza(dial(0.21, 0.13, -0.86, 0.05), [-0.12, 1.25, 0], 2, -1);
  const disparador = ctx.cilindroBisel(0.1, 0.09, mNaranja, { bisel: 0.03 }); disparador.position.set(0.96, 0.73, 0.4);
  pieza(disparador, [0.06, 1.05, 0.12], 2);

  // objetivo: montura trasera, lente trasera, diafragma, 3 lentes, anillo de enfoque, barril, lente frontal
  const OX = -0.15, OY = -0.08, z0 = 0.49;
  const ponerEje = o => { o.rotation.x = Math.PI / 2; o.position.x = OX; o.position.y = OY; return o; };
  const lentes = [];
  const lente = (r, grosor, z, salto) => {
    const l = ponerEje(ctx.torno([[0, -grosor], [r * 0.6, -grosor * 0.8], [r, -0.012], [r, 0.012], [r * 0.6, grosor * 0.8], [0, grosor]], vidrioLente(), 64));
    l.position.z = z; l.castShadow = false;
    const aro = ponerEje(ctx.torno([[r - 0.005, -0.03], [r + 0.03, -0.03], [r + 0.03, 0.03], [r - 0.005, 0.03]], mAnod, 64)); aro.position.z = z;
    const g = new THREE.Group(); g.add(l, aro);
    lentes.push(pieza(g, [0, 0, salto], 1));
    return g;
  };
  const bayoneta = ponerEje(ctx.torno([[0.5, 0], [0.56, 0], [0.56, 0.06], [0.5, 0.08]], mCromo, 96)); bayoneta.position.z = z0;
  pieza(bayoneta, [0, 0, 0.75], 1);
  lente(0.36, 0.05, z0 + 0.12, 1.15);
  // diafragma: 9 láminas que se cierran
  const iris = new THREE.Group();
  const laminaF = new THREE.Shape(); laminaF.absarc(0, 0, 0.44, -0.35, 0.55, false); laminaF.absarc(0, 0, 0.16, 0.55, -0.35, true);
  const mLam = new THREE.MeshPhysicalMaterial({ color: '#141416', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide });
  const laminas = Array.from({ length: 9 }, (_, i) => { const l = new THREE.Mesh(new THREE.ExtrudeGeometry(laminaF, { depth: 0.004, bevelEnabled: false, curveSegments: 16 }), mLam); l.rotation.z = i / 9 * Math.PI * 2; l.castShadow = true; iris.add(l); return l; });
  const irisAro = ctx.torno([[0.42, -0.04], [0.47, -0.04], [0.47, 0.04], [0.42, 0.04]], mAnod, 64); irisAro.rotation.x = -Math.PI / 2; iris.add(irisAro);
  iris.position.set(OX, OY, z0 + 0.2);
  pieza(iris, [0, 0, 1.55], 1);
  lente(0.4, 0.06, z0 + 0.3, 1.95);
  lente(0.44, 0.07, z0 + 0.42, 2.35);
  const enfoque = ponerEje(ctx.torno([[0.6, 0], [0.63, 0.03], [0.63, 0.32], [0.6, 0.35], [0.55, 0.35], [0.55, 0]], mGomaM, 96)); enfoque.position.z = z0 + 0.2;
  pieza(enfoque, [0, 0, 2.7], 1, 0);
  const texEscala = ctx.textura2d(1024, 64, (g, w, h) => {
    g.fillStyle = '#121214'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9e6df'; g.font = '600 26px Inter'; g.textAlign = 'center';
    ['∞', '10', '5', '3', '2', '1,5', '1', '0,7', '0,5'].forEach((s, i) => g.fillText(s, 80 + i * 52, 40));
    g.fillStyle = NARANJA; g.fillRect(0, 54, w, 4);
    g.fillStyle = '#e9e6df'; g.font = '700 24px Inter'; g.fillText('35 mm  1:1.4', 760, 40);
  });
  const barrilM = new THREE.MeshPhysicalMaterial({ map: texEscala, metalness: 0.5, roughness: 0.32, clearcoat: 0.6 });
  const barril = ponerEje(new THREE.Mesh(new THREE.CylinderGeometry(0.585, 0.6, 0.38, 96, 1, true), barrilM)); barril.rotation.x = Math.PI / 2; barril.position.z = z0 + 0.72; barril.castShadow = true;
  const barrilIn = ponerEje(ctx.torno([[0.6, 0], [0.6, 0.38], [0.54, 0.38], [0.54, 0]], mAnod, 96)); barrilIn.position.z = z0 + 0.53;
  const gBarril = new THREE.Group(); gBarril.add(barril, barrilIn);
  pieza(gBarril, [0, 0, 3.15], 1);
  const frontal = lente(0.5, 0.09, z0 + 0.94, 3.6);
  const aroNaranja = ponerEje(ctx.torno([[0.6, 0], [0.62, 0.03], [0.6, 0.06], [0.52, 0.06], [0.52, 0]], mNaranja, 96)); aroNaranja.position.z = z0 + 0.96;
  frontal.add(aroNaranja);

  // sensor: placa verde con pistas de oro y chip iridiscente
  const texPCB = ctx.textura2d(512, 400, (g, w, h) => {
    g.fillStyle = '#0f4a33'; g.fillRect(0, 0, w, h);
    const r = ctx.azar(17);
    g.strokeStyle = '#d6a64a'; g.lineWidth = 3;
    for (let i = 0; i < 46; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (r() < 0.5) x += (r() - 0.5) * 160; else y += (r() - 0.5) * 160; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 90; i++) { g.fillStyle = '#e2b55a'; g.beginPath(); g.arc(r() * w, r() * h, 4, 0, 7); g.fill(); }
    g.fillStyle = '#1b1b1e'; [[30, 30, 90, 60], [400, 300, 80, 70], [30, 300, 60, 60], [410, 30, 70, 50]].forEach(([x, y, a, b]) => g.fillRect(x, y, a, b));
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '600 14px Inter'; g.fillText('CMOS 24MP · R2', 40, 385);
  });
  const sensor = new THREE.Group();
  const pcb = ctx.caja(1.12, 0.88, 0.05, ctx.mat.plastico('#ffffff', { map: texPCB, roughness: 0.4, clearcoat: 0.6 }), 0.02);
  const chip = ctx.caja(0.62, 0.46, 0.05, mGrafito, 0.02); chip.position.z = 0.05;
  const cristalSensor = ctx.caja(0.5, 0.36, 0.012, new THREE.MeshPhysicalMaterial({ color: '#1d1440', metalness: 0.3, roughness: 0.08, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [300, 700], clearcoat: 1 }), 0.004);
  cristalSensor.position.z = 0.083;
  const pines = ctx.instancias(new THREE.BoxGeometry(0.02, 0.05, 0.01), mOro, 24, (i, o) => { o.pos = [-0.28 + (i % 12) * 0.05, i < 12 ? 0.255 : -0.255, 0.05]; });
  sensor.add(pcb, chip, cristalSensor, pines);
  sensor.position.set(OX, OY, 0.15);
  pieza(sensor, [0, 0.12, 0.42], 3);

  // batería y tarjeta: salen por abajo
  const texBat = ctx.textura2d(256, 512, (g, w, h) => {
    g.fillStyle = '#18181b'; g.fillRect(0, 0, w, h);
    g.fillStyle = NARANJA; g.fillRect(0, 90, w, 46);
    g.fillStyle = '#f1ece3'; g.font = '800 40px Inter'; g.textAlign = 'center'; g.fillText('Li-ion', w / 2, 230);
    g.font = '500 24px Inter'; g.fillText('7,2 V · 2280 mAh', w / 2, 280); g.fillText('400 fotos', w / 2, 320);
  });
  const bateria = new THREE.Group();
  const bat = ctx.caja(0.44, 0.88, 0.27, ctx.mat.plastico('#ffffff', { map: texBat, roughness: 0.4 }), 0.05); bateria.add(bat);
  const contactos = ctx.instancias(new THREE.BoxGeometry(0.05, 0.012, 0.06), mOro, 3, (i, o) => { o.pos = [-0.08 + i * 0.08, 0.445, 0]; }); bateria.add(contactos);
  bateria.position.set(0.88, -0.1, 0.05);
  pieza(bateria, [0.3, -1.3, 0.25], 4);
  const texSD = ctx.textura2d(256, 320, (g, w, h) => {
    g.fillStyle = '#1f4fd6'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1ece3'; g.font = '800 64px Inter'; g.textAlign = 'center'; g.fillText('SD', w / 2, 140);
    g.font = '600 30px Inter'; g.fillText('128 GB', w / 2, 200);
  });
  const sd = ctx.caja(0.24, 0.32, 0.025, ctx.mat.plastico('#ffffff', { map: texSD, roughness: 0.35 }), 0.01);
  sd.position.set(0.5, -0.2, 0.05);
  pieza(sd, [0.2, -1.2, 0.75], 4);

  // pantalla trasera con imagen en vivo
  const lienzoP = document.createElement('canvas'); lienzoP.width = 640; lienzoP.height = 400;
  const gP = lienzoP.getContext('2d');
  const texPant = new THREE.CanvasTexture(lienzoP); texPant.colorSpace = THREE.SRGBColorSpace;
  const dibujarPantalla = (t, foto) => {
    const w = 640, h = 400, dx = Math.sin(t * 0.4) * 30;
    const gr = gP.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffb36b'); gr.addColorStop(0.55, '#ff7a45'); gr.addColorStop(1, '#5a2a52');
    gP.fillStyle = gr; gP.fillRect(0, 0, w, h);
    gP.fillStyle = '#ffe7b8'; gP.beginPath(); gP.arc(w * 0.62 + dx, h * 0.5, 44, 0, 7); gP.fill();
    gP.fillStyle = '#2a1a33'; gP.beginPath(); gP.moveTo(0, h); gP.lineTo(w * 0.3 + dx, h * 0.52); gP.lineTo(w * 0.55 + dx, h * 0.8); gP.lineTo(w * 0.8 + dx, h * 0.48); gP.lineTo(w, h * 0.7); gP.lineTo(w, h); gP.fill();
    gP.strokeStyle = foto ? '#7dff9a' : 'rgba(255,255,255,0.9)'; gP.lineWidth = 3; gP.strokeRect(w * 0.42, h * 0.32, w * 0.16, h * 0.26);
    gP.fillStyle = 'rgba(0,0,0,0.35)'; gP.fillRect(0, h - 44, w, 44);
    gP.fillStyle = '#fff'; gP.font = '600 22px Inter'; gP.fillText('1/250   f/1.4   ISO 100', 20, h - 15);
    gP.fillStyle = '#ff3b30'; gP.beginPath(); gP.arc(w - 30, 28, 9, 0, 7); gP.fill();
    texPant.needsUpdate = true;
  };
  dibujarPantalla(0, false);
  const pantalla = new THREE.Group();
  const marco = ctx.caja(1.56, 1.0, 0.08, mGrafito, 0.04); pantalla.add(marco);
  const vidrioP = ctx.plano(1.4, 0.86, new THREE.MeshPhysicalMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: texPant, emissiveIntensity: 1.25, roughness: 0.06, clearcoat: 1 }));
  vidrioP.rotation.y = Math.PI; vidrioP.position.z = -0.042; pantalla.add(vidrioP);
  pantalla.position.set(-0.25, -0.1, -0.45);
  pieza(pantalla, [0, 0.05, -1.25], 5);
  // piloto rojo (animación secundaria)
  const led = ctx.esfera(0.025, ctx.mat.luz('#ff2a1a', 6), 12); led.position.set(0.72, 0.4, -0.42); led.castShadow = false; cuerpo.add(led);

  ctx.sombraContacto(producto, { radio: 1.7, opacidad: 0.5, alto: 3, base: 0.9, alargar: 0.8 });
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 50, centro: [0, 2.2, -4.5], zona: [12, 4, 3], tam: 0.045, colores: ['#fff1d6', '#ffd2a0'], intensidad: 2.2, semilla: 3 });
  escena.add(motas);

  // ---- Textos (tinta oscura sobre el plató claro) ----
  const R = (o) => ctx.rotulo({ tema: 'claro', color: TINTA, acento: NARANJA, ...o });
  const rot = [
    R({ texto: 'Objetivo', sub: '6 lentes con tratamiento', num: 1, en: lentes[3], desplaza: [0, -0.6, 0], lado: 'abajo', dist: 130 }),
    R({ texto: 'Diafragma', sub: '9 láminas: dosifican la luz', num: 2, en: iris, desplaza: [0, 0.3, 0], ...(V ? { lado: 'abajo', dist: 120 } : { fijo: [0.3, 0.17] }) }),
    R({ texto: 'Sensor', sub: '24 MP · luz en datos', num: 3, en: sensor, desplaza: [0.2, 0.3, 0], ...(V ? { lado: 'abajo', dist: 140 } : { fijo: [0.66, 0.15] }) }),
    R({ texto: 'Batería', sub: '7,2 V · 400 fotos', num: 4, en: bateria, desplaza: [0, 0.2, 0], ...(V ? { lado: 'derecha', dist: 110 } : { fijo: [0.4, 0.86] }) }),
    R({ texto: 'Pantalla', sub: 'lo que vas a disparar', num: 5, en: pantalla, desplaza: [0, 0.5, 0], lado: 'izquierda', dist: 150 }),
  ];
  const T = ctx.titulo({ texto: 'Una cámara\npor dentro', etiqueta: 'Vista explotada', ...(V ? { pos: 'arriba', y: 0.07, tam: 96 } : { pos: 'arriba-izquierda', tam: 92 }), color: TINTA, colorEtiqueta: NARANJA });
  const T2 = ctx.titulo({ texto: 'Cinco piezas,\nun disparo.', etiqueta: 'Cómo funciona', sub: 'Del rayo de luz a la foto', ...(V ? { pos: 'arriba', y: 0.08, tam: 100 } : { pos: 'arriba-izquierda', x: 0.065, y: 0.31, tam: 98 }),
    color: TINTA, colorSub: 'rgba(27,26,31,0.7)', colorEtiqueta: NARANJA, fuente: '"Archivo Black"', peso: 400, espaciado: -0.02 });

  // ---- Cámara ----
  const cam = ctx.camaraPorClaves([
    { t: 0, pos: [4.0, 2.2, 6.2], mira: [0, 1.2, 0.3], fov: 29, apertura: 0.32 },
    { t: 1.0, pos: [4.3, 2.3, 5.8], mira: [0, 1.25, 0.5], fov: 30, apertura: 0.3 },
    { t: 3.0, pos: [7.6, 2.3, 3.4], mira: [-0.1, 1.2, 1.6], fov: 32, apertura: 0.28 },
    { t: 4.5, pos: [1.6, 1.7, 6.3], mira: [-0.25, 1.2, 3.3], fov: 27, foco: [-0.2, 1.17, 5.0], apertura: 0.8 },
    { t: 5.4, pos: [1.45, 1.7, 5.1], mira: [-0.2, 1.2, 2.2], fov: 26, foco: [-0.2, 1.17, 2.3], apertura: 0.85 },
    { t: 6.5, pos: [1.3, 1.75, 3.7], mira: [-0.15, 1.25, 0.9], fov: 25, foco: [-0.15, 1.3, 0.6], apertura: 0.85 },
    { t: 7.7, pos: [5.0, 2.0, -3.6], mira: [0.1, 0.9, -0.4], fov: 30, apertura: 0.35 },
    { t: 9.0, pos: [5.8, 2.5, 4.4], mira: [0, 1.25, 0.4], fov: 31, apertura: 0.3 },
    { t: 10.0, pos: V ? [2.8, 1.7, 6.6] : [4.6, 1.8, 7.2], mira: V ? [0, 1.45, 0.3] : [-1.85, 1.12, 0.2], fov: 28, foco: [0, 1.2, 0.5], apertura: 0.36 },
    { t: 12, pos: V ? [2.6, 1.6, 6.1] : [4.3, 1.7, 6.7], mira: V ? [0, 1.5, 0.3] : [-1.9, 1.12, 0.2], fov: 27.5, foco: [0, 1.2, 0.5], apertura: 0.36 },
  ], { deriva: 0.035 });

  const ABRE = 0.9, CIERRA = 8.45, CLIC = 9.45;
  const ejes = [];   // líneas guía (2D): pares de puntos del producto
  const anclaA = new THREE.Object3D(), anclaB = new THREE.Object3D(); producto.add(anclaA, anclaB);
  let pGuia = 0, flash = 0;
  const pA = new THREE.Vector3(), pB = new THREE.Vector3();

  return {
    momentos: [
      { t: 0.4, nombre: 'la cámara montada' },
      { t: 2.6, nombre: 'se abre por ejes' },
      { t: 4.4, nombre: 'objetivo y lentes' },
      { t: 6.0, nombre: 'macro: diafragma → sensor' },
      { t: 7.6, nombre: 'batería y pantalla' },
      { t: 11.4, nombre: 'plano de anuncio' },
    ],
    pintar(t) {
      cam(t);
      // entrada: sube desde abajo con muelle
      const ent = ctx.muelle(t, 0.0, { frecuencia: 1.4, amortigua: 6 });
      producto.position.y = 1.25 - (1 - ent) * 0.6;
      producto.rotation.y = -0.3 + 0.25 * ctx.entre(t, 0, 12, 'suave') + 0.04 * Math.sin(t * 0.7);
      // despiece escalonado con anticipación; se cierra en orden inverso con clic (rebote)
      piezas.forEach(({ obj, salto, orden, giro }) => {
        const b = ctx.base(obj);
        const abre = ctx.entre(t, ABRE + orden * 0.16, ABRE + 1.5 + orden * 0.16, 'anticipaRebote');
        const cierra = ctx.entre(t, CIERRA - orden * 0.09, CIERRA + 0.7 - orden * 0.09, 'salidaFuerte');
        const e = abre * (1 - cierra);
        obj.position.copy(b.pos).addScaledVector(salto, e);
        obj.rotation.copy(b.rot);
        if (giro) obj.rotation.y += giro * e * 1.4;
      });
      // diafragma: se cierra y se abre (y gira) mientras se ve de cerca
      const cierreIris = 0.5 + 0.5 * Math.sin((t - 4.6) * 2.2);
      laminas.forEach((l, i) => { l.rotation.z = i / 9 * Math.PI * 2 + 0.25 + cierreIris * 0.55; });
      iris.rotation.z = t * 0.2;
      enfoque.rotation.y = 0;
      // pantalla viva, piloto que parpadea y destello del disparo
      flash = ctx.entre(t, CLIC, CLIC + 0.05) * (1 - ctx.entre(t, CLIC + 0.05, CLIC + 0.5, 'salida'));
      dibujarPantalla(t, t > CLIC);
      led.material.color.set('#ff2a1a').multiplyScalar(Math.floor(t * 2) % 2 ? 7 : 0.4);
      motas.pintar(t);
      pGuia = ctx.entre(t, ABRE + 0.9, ABRE + 1.6) * (1 - ctx.entre(t, CIERRA - 0.3, CIERRA));

      rot.forEach((r, i) => {
        const ini = [3.1, 4.7, 5.9, 7.2, 7.5][i], fin = [4.5, 5.8, 7.0, 8.2, 8.2][i];
        r.mostrar(ctx.entre(t, ini, ini + 0.8) - ctx.entre(t, fin, fin + 0.3));
      });
      T.mostrar(ctx.entre(t, 0.2, 1.1) - ctx.entre(t, 2.3, 2.7));
      T2.mostrar(ctx.entre(t, 9.9, 11.0));
    },
    debajo2d(g) {
      // líneas guía discontinuas del despiece (eje del objetivo, arriba, abajo, atrás)
      if (pGuia > 0.01) {
        const tramos = [
          [[OX, OY, 0.45], [OX, OY, z0 + 0.96 + 3.6]],
          [[0.68, 0.8, 0.05], [0.68 + 0.12, 0.8 + 1.25, 0.05]],
          [[0.88, -0.6, 0.05], [0.88 + 0.3, -0.6 - 1.3, 0.3]],
          [[-0.25, -0.1, -0.45], [-0.25, -0.05, -0.45 - 1.25]],
        ];
        g.save();
        g.strokeStyle = 'rgba(27,26,31,0.55)'; g.lineWidth = 1.4 * ctx.u; g.setLineDash([7 * ctx.u, 7 * ctx.u]);
        tramos.forEach(([a, b]) => {
          anclaA.position.set(...a); anclaB.position.set(...b);
          const A = ctx.puntoPantalla(anclaA), B = ctx.puntoPantalla(anclaB);
          if (A.detras || B.detras) return;
          g.globalAlpha = pGuia;
          g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(A.x + (B.x - A.x) * pGuia, A.y + (B.y - A.y) * pGuia); g.stroke();
        });
        g.restore();
      }
      if (flash > 0) { g.fillStyle = `rgba(255,250,240,${0.55 * flash})`; g.fillRect(0, 0, ctx.ancho, ctx.alto); }
    },
  };
}
