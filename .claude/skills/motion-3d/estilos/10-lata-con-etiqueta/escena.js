// Estilo 10 · Lata de refresco con etiqueta — anuncio de producto premium
// Tema de muestra: «Burbuja», refresco inventado de limón y jengibre.
// Guion: la lata de aluminio desnudo cae en el plató oscuro y rebota (0-1 s) · caen los
// hielos · un cabezal de luz IMPRIME la etiqueta mientras la lata gira (1,3-4 s) · macro de la
// condensación: se empaña y aparecen gotas que resbalan (4,4-6,4 s) · suben burbujas y caen
// rodajas de limón (6,4-8,8 s) · plano final de anuncio con la marca (9-12 s).
// Dirección de arte: plató negro verdoso, caja de luz cálida a la izquierda, recortes ámbar y
// cian detrás, suelo espejo, profundidad de campo en todo momento, grano y viñeta.

export const ajustes = {
  duracion: 12, formato: '16:9',
  post: {
    tonemap: 'aces', exposicion: 1.05,
    bloom: { fuerza: 0.4, radio: 0.55, umbral: 2.2 },
    ao: { fuerza: 1, radio: 0.3 },
    grano: 0.04, vineta: 0.42, aberracion: 1.0,
    grado: { contraste: 1.06, saturacion: 1.08, sombras: '#0f6a72', luces: '#ffcf8a', mezcla: 0.1 },
  },
};

export function crear(THREE, ctx) {
  const { escena } = ctx;
  // ---- Paleta cerrada: verde noche (plató), amarillo limón (marca), verde petróleo (tinta), ámbar y cian (recortes) ----
  const LIMON = '#ffd31f', LIMON2 = '#ffbf12', TINTA = '#0a3d3b', CREMA = '#fff6df', AMBAR = '#ffae4f', CIAN = '#4fe0ff';

  // ---- Plató ----
  ctx.fondo({ tipo: 'radial', centro: '#1b4a45', medio: '#0b2523', borde: '#020707', y: 0.42, radio: 0.8 });
  ctx.niebla('#041110', 9, 22);
  ctx.entornoEstudio({
    fondo: '#0c1f1d', suelo: '#020605', intensidad: 1.0,
    paneles: [
      { pos: [-6, 3, 5], tam: [3.5, 7], color: '#fff1dc', fuerza: 2.4 },   // caja de luz principal (izquierda)
      { pos: [7, 3, 2], tam: [0.9, 9], color: '#ffffff', fuerza: 3.2 },    // tira derecha: línea de brillo en la lata
      { pos: [-5, 2.5, -6], tam: [1.2, 8], color: AMBAR, fuerza: 3 },      // recorte cálido
      { pos: [5, 2.5, -6], tam: [1.2, 8], color: CIAN, fuerza: 3 },        // recorte frío
      { pos: [0, 9, 0], tam: [6, 6], color: '#ffffff', fuerza: 0.8 },      // cenital
    ],
  });
  const L = ctx.luces.producto({ centro: [0, 1.1, 0], direccion: [-3.2, 6, 4.2], fuerzaClave: 3.2, fuerzaSombra: 1.3, area: 3.2, recortes: [AMBAR, CIAN], fuerzaRecorte: 12, fuerzaTope: 1.0, ambiente: 0.18, tierra: '#0a1a18' });
  ctx.sueloEspejo({ color: '#081a18', reflejo: 0.32, rugosidad: 0.62, tam: 40 });

  // ---- La lata (perfil real: fondo abombado, cuello, borde enrollado y tapa rebajada) ----
  const R = 0.66;
  const lata = new THREE.Group();
  escena.add(lata);
  const cond = ctx.texturas.condensacion({ tam: 1024, repetir: [4, 2], cantidad: 6000, grande: 10, relieve: 3.2 });
  const aluminio = new THREE.MeshPhysicalMaterial({ color: '#e3e7ec', metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, clearcoatRoughnessMap: cond.roughnessMap, clearcoatNormalMap: cond.normalMap, clearcoatNormalScale: new THREE.Vector2(0, 0) });
  const cuerpo = ctx.torno([
    [0.0, 0.075], [0.38, 0.03], [0.465, 0.004], [0.5, 0.0], [0.535, 0.012], [0.6, 0.06], [0.643, 0.14], [R, 0.24],
    [R, 1.98], [0.656, 2.04], [0.632, 2.1], [0.592, 2.168], [0.566, 2.208], [0.566, 2.236], [0.573, 2.256], [0.567, 2.275],
    [0.551, 2.279], [0.541, 2.262], [0.537, 2.226], [0.522, 2.208], [0.505, 2.218], [0.0, 2.222],
  ], aluminio, 128);
  lata.add(cuerpo);
  // tapa cepillada en círculos (la anisotropía sigue el giro del torno)
  const tapaM = new THREE.MeshPhysicalMaterial({ color: '#cfd4da', metalness: 1, roughness: 0.3, anisotropy: 0.9 });
  const tapa = ctx.torno([[0.0, 2.2235], [0.3, 2.2235], [0.42, 2.226], [0.5, 2.2195], [0.508, 2.2185]], tapaM, 96);
  lata.add(tapa);
  // anilla: forma con agujero, con bisel
  const anillaF = new THREE.Shape();
  anillaF.absarc(0, 0.06, 0.075, Math.PI, 0, true); anillaF.lineTo(0.075, -0.13); anillaF.absarc(0, -0.13, 0.075, 0, Math.PI, true); anillaF.lineTo(-0.075, 0.06);
  const agujero = new THREE.Path(); agujero.absellipse(0, -0.12, 0.045, 0.038, 0, Math.PI * 2, false);
  anillaF.holes.push(agujero);
  const anilla = ctx.extruir(anillaF, 0.012, ctx.mat.metal('#d5dade', { roughness: 0.22 }), 0.006);
  anilla.rotation.x = -Math.PI / 2; anilla.position.set(0, 2.236, 0.1);
  const remache = ctx.cilindroBisel(0.035, 0.022, aluminio, { bisel: 0.01 }); remache.position.set(0, 2.236, 0.0);
  const ranura = ctx.tubo([[-0.1, 2.226, 0.12], [-0.13, 2.226, 0.26], [0, 2.226, 0.36], [0.13, 2.226, 0.26], [0.1, 2.226, 0.12]], 0.006, ctx.mat.metal('#8d949c', { roughness: 0.4 }), 48);
  lata.add(anilla, remache, ranura);
  ctx.sombras(lata);

  // ---- La etiqueta (impresa en la lata: tinta con barniz + franjas de aluminio desnudo) ----
  const EW = 2480, EH = 1024;
  const dibujoEtiqueta = (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#ffe253'); gr.addColorStop(0.55, LIMON); gr.addColorStop(1, LIMON2);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // corriente de burbujas que sube en diagonal por toda la etiqueta
    const rb = ctx.azar(77);
    for (let i = 0; i < 260; i++) {
      const x = rb() * w, y = rb() * h, r = 4 + Math.pow(rb(), 2.4) * 46;
      g.globalAlpha = 0.18 + rb() * 0.3;
      g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = Math.max(2, r * 0.18);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
      if (rb() < 0.55) g.stroke(); else g.fill();
    }
    g.globalAlpha = 1;
    // banda inferior en tinta
    g.fillStyle = TINTA; g.fillRect(0, 846, w, h - 846);
    g.fillStyle = LIMON; g.font = '600 46px Inter'; g.letterSpacing = '14px'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LIMÓN  ·  JENGIBRE  ·  SIN AZÚCAR', w / 2, 930);
    g.font = '500 34px Inter'; g.letterSpacing = '6px';
    g.fillText('330 ml', w * 0.2, 930); g.fillText('330 ml', w * 0.8, 930);
    // banda superior fina
    g.fillStyle = TINTA; g.fillRect(0, 88, w, 54);
    g.fillStyle = LIMON; g.font = '600 28px Inter'; g.letterSpacing = '12px';
    for (let i = 0; i < 2; i++) g.fillText('REFRESCO CON GAS  ·  LIMÓN DE VERDAD', w * (0.25 + i * 0.5), 116);
    // emblema: rodaja de limón
    const cx = w / 2, cy = 300;
    g.fillStyle = TINTA; g.beginPath(); g.arc(cx, cy, 112, 0, Math.PI * 2); g.fill();
    g.fillStyle = CREMA; g.beginPath(); g.arc(cx, cy, 98, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe680'; g.beginPath(); g.arc(cx, cy, 86, 0, Math.PI * 2); g.fill();
    g.strokeStyle = CREMA; g.lineWidth = 9;
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 86, cy + Math.sin(a) * 86); g.stroke(); }
    g.fillStyle = CREMA; g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill();
    // hoja
    g.fillStyle = '#2f8f5b'; g.beginPath(); g.ellipse(cx + 118, cy - 96, 58, 22, -0.6, 0, Math.PI * 2); g.fill();
    // marca
    g.save(); g.translate(cx, 610); g.rotate(-0.05);
    g.font = '196px "Archivo Black"'; g.letterSpacing = '-4px'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText('Burbuja', 7, 7);
    g.fillStyle = TINTA; g.fillText('Burbuja', 0, 0);
    g.restore();
    g.font = '600 40px Inter'; g.letterSpacing = '18px'; g.fillStyle = TINTA; g.textAlign = 'center';
    g.fillText('CHISPA NATURAL', cx, 724);
    // laterales: sello «0 kcal» y texto vertical
    [w * 0.21, w * 0.79].forEach(x => {
      g.fillStyle = TINTA; g.beginPath(); g.roundRect(x - 120, 380, 240, 240, 40); g.fill();
      g.fillStyle = LIMON; g.font = '120px "Archivo Black"'; g.letterSpacing = '0px'; g.fillText('0', x, 520);
      g.font = '600 34px Inter'; g.letterSpacing = '8px'; g.fillText('KCAL', x, 590);
    });
    // trasera: código de barras e ingredientes
    g.fillStyle = '#ffffff'; g.fillRect(40, 380, 250, 170);
    g.fillStyle = '#111';
    const rc = ctx.azar(5);
    for (let x = 60; x < 270; x += 4) { if (rc() < 0.55) g.fillRect(x, 400, 2 + Math.floor(rc() * 3), 110); }
    g.font = '500 22px Inter'; g.letterSpacing = '2px'; g.textAlign = 'left'; g.fillStyle = TINTA;
    ['Agua carbonatada, zumo de', 'limón (12 %), jengibre,', 'aroma natural.'].forEach((l, i) => g.fillText(l, 2160, 420 + i * 34));
    // franjas de aluminio desnudo (se pintan gris claro: el mapa de metal las hace metal)
    g.fillStyle = '#dfe3e8'; g.fillRect(0, 60, w, 14); g.fillRect(0, 156, w, 8); g.fillRect(0, 832, w, 8);
    g.letterSpacing = '0px';
  };
  const texEtiqueta = ctx.textura2d(EW, EH, dibujoEtiqueta);
  // metal/rugosidad: G = rugosidad, B = metal (franjas de aluminio = metal 1)
  const texMR = ctx.textura2d(EW, EH, (g, w, h) => {
    g.fillStyle = 'rgb(0,70,70)'; g.fillRect(0, 0, w, h);        // tinta con barniz: rugosidad 0,27 · algo metálica
    g.fillStyle = 'rgb(0,40,255)'; g.fillRect(0, 60, w, 14); g.fillRect(0, 156, w, 8); g.fillRect(0, 832, w, 8);
  });
  texMR.colorSpace = THREE.NoColorSpace;
  const etiquetaM = new THREE.MeshPhysicalMaterial({
    map: texEtiqueta, roughnessMap: texMR, metalnessMap: texMR, roughness: 1, metalness: 1,
    clearcoat: 1, clearcoatRoughness: 0.05, clearcoatRoughnessMap: cond.roughnessMap, clearcoatNormalMap: cond.normalMap,
    clearcoatNormalScale: new THREE.Vector2(0, 0), envMapIntensity: 1.1,
  });
  const impresion = ctx.revelar(etiquetaM, { eje: 'u', color: '#ffe2b0', fuerza: 5, ancho: 0.012 });
  const etiqueta = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 1.72, 160, 1, true, -Math.PI, Math.PI * 2), etiquetaM);
  etiqueta.position.y = 0.26 + 0.86;
  etiqueta.castShadow = true; etiqueta.receiveShadow = true;
  lata.add(etiqueta);
  const aluminioF = aluminio;   // el aluminio del cuerpo también se empaña

  // cabezal de impresión: barra de luz fija junto a la lata (la lata gira y sale impresa)
  const ANG_CAB = 0.62;
  const cabezal = new THREE.Group();
  const barra = ctx.cilindro(0.01, 0.01, 1.86, ctx.mat.luz('#ffe9c8', 4), 12); barra.castShadow = false;
  const carril = ctx.caja(0.05, 1.96, 0.05, ctx.mat.metal('#2b3133', { roughness: 0.35 }), 0.02);
  carril.position.set(0.05, 0, 0);
  cabezal.add(barra, carril);
  cabezal.position.set(Math.sin(ANG_CAB) * (R + 0.06), 1.12, Math.cos(ANG_CAB) * (R + 0.06));
  cabezal.rotation.y = ANG_CAB;
  escena.add(cabezal);
  const luzCab = ctx.practica([Math.sin(ANG_CAB) * (R + 0.3), 1.12, Math.cos(ANG_CAB) * (R + 0.3)], { color: '#ffd9a0', intensidad: 0, distancia: 2.5, bombilla: false });

  // ---- Gotas grandes de condensación (pegadas a la lata, algunas resbalan) ----
  const rnd = ctx.azar(330);
  const NG = 110;
  const gotaM = ctx.mat.agua('#ffffff', { thickness: 0.06, roughness: 0.02 });
  ctx.brilloBorde(gotaM, { color: '#e8fbff', fuerza: 1.1, potencia: 2.4 });
  const gotas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), gotaM, NG);
  gotas.frustumCulled = false;
  const datosG = Array.from({ length: NG }, () => ({
    th: rnd() * Math.PI * 2, y: 0.4 + rnd() * 1.65, s: 0.012 + Math.pow(rnd(), 2.2) * 0.045,
    ap: 4.5 + rnd() * 1.6, resbala: rnd() < 0.22 ? 0.25 + rnd() * 0.35 : 0,
  }));
  lata.add(gotas);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();

  // ---- Hielos de verdad: esmerilados, redondeados, con núcleo lechoso, burbujas y grietas dentro ----
  const hieloBase = new ctx.RoundedBoxGeometry(0.44, 0.4, 0.42, 6, 0.1);
  const ruidoH = ctx.azar(12);
  const pos = hieloBase.attributes.position;
  for (let i = 0; i < pos.count; i++) { const k = 1 + (ruidoH() - 0.5) * 0.05; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * (1 + (ruidoH() - 0.5) * 0.04), pos.getZ(i) * k); }
  hieloBase.computeVertexNormals();
  const relieveHielo = ctx.texturas.ruido({ escala: 5, semilla: 5, relieve: 5, color: '#ffffff' });
  const hieloM = ctx.mat.hielo('#ffffff', { thickness: 0.6, roughness: 0.32, ior: 1.31, normalMap: relieveHielo.normalMap, normalScale: new THREE.Vector2(0.55, 0.55),
    emissive: '#3c3f41', emissiveIntensity: 1, envMapIntensity: 1.8, attenuationColor: new THREE.Color('#ffffff'), attenuationDistance: Infinity, clearcoat: 1, clearcoatRoughness: 0.08 });
  ctx.brilloBorde(hieloM, { color: '#ffffff', fuerza: 0.5, potencia: 2.5 });
  // núcleo blanco y lechoso (el aire atrapado del centro), visible a través del hielo
  const nucleoGeo = new ctx.RoundedBoxGeometry(0.22, 0.17, 0.2, 3, 0.07);
  const nucleoM = new THREE.MeshStandardMaterial({ color: '#e9eef0', roughness: 1, emissive: '#2b2e30' });
  // grietas: planos con líneas blancas irregulares dibujadas
  const texGrieta = ctx.textura2d(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    const r = ctx.azar(17);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      let x = w * (0.2 + r() * 0.6), y = w * (0.15 + r() * 0.2);
      g.lineWidth = 1.5 + r() * 2.5; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 9; s++) { x += (r() - 0.5) * 50; y += 18 + r() * 14; g.lineTo(x, y); if (r() < 0.3) { g.moveTo(x, y); } }
      g.stroke();
    }
  });
  const grietaM = new THREE.MeshStandardMaterial({ map: texGrieta, alphaTest: 0.4, color: '#ffffff', emissive: '#3a3d40', side: THREE.DoubleSide, roughness: 0.6 });
  const burbujaHieloM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2, emissive: '#55595c' });
  const burbujaGeo = new THREE.SphereGeometry(1, 8, 6);
  const hielos = [
    { p: [-1.18, 0.2, 0.62], r: [0.1, 0.5, 0.05], t: 0.72 },
    { p: [1.12, 0.2, 0.48], r: [0.04, -0.4, 0.08], t: 0.86 },
    { p: [0.78, 0.2, -0.95], r: [0.0, 0.9, 0.0], t: 1.0 },
    { p: [-0.92, 0.2, -0.78], r: [0.06, 0.2, 0.0], t: 1.1 },
    { p: [-1.02, 0.6, 0.5], r: [0.5, 1.1, 0.3], t: 1.25, apoyo: 0.4 },
  ].map((d, j) => {
    const o = new THREE.Group();
    const cubo = new THREE.Mesh(hieloBase, hieloM); cubo.castShadow = true; cubo.receiveShadow = true;
    const nucleo = new THREE.Mesh(nucleoGeo, nucleoM); nucleo.rotation.set(0.3 * j, 0.7 * j, 0.2);
    const rg = ctx.azar(40 + j);
    const grieta = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), grietaM); grieta.rotation.set(rg() * 3, rg() * 3, rg() * 3); grieta.position.set((rg() - 0.5) * 0.08, (rg() - 0.5) * 0.06, (rg() - 0.5) * 0.08);
    const burb = new THREE.InstancedMesh(burbujaGeo, burbujaHieloM, 14);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 14; i++) { const s = 0.004 + rg() * 0.01; m.compose(new THREE.Vector3((rg() - 0.5) * 0.3, (rg() - 0.5) * 0.26, (rg() - 0.5) * 0.28), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); burb.setMatrixAt(i, m); }
    o.add(cubo, nucleo, grieta, burb);
    o.userData = d; escena.add(o);
    ctx.sombraContacto(o, { radio: 0.36, opacidad: 0.45, alto: 1.2, base: d.apoyo ? d.apoyo : 0 });
    return o;
  });

  // ---- Rodajas de limón de verdad: piel, albedo blanco y 10 gajos de pulpa translúcida que asoman por las dos caras ----
  const texPulpa = ctx.textura2d(256, 256, (g, w) => {
    const gr = g.createLinearGradient(0, 0, 0, w); gr.addColorStop(0, '#fff0a0'); gr.addColorStop(1, '#ffd84a');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    const r = ctx.azar(3);
    for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.35})`; g.beginPath(); g.ellipse(r() * w, r() * w, 3 + r() * 6, 1.5 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill(); }
  });
  texPulpa.wrapS = texPulpa.wrapT = THREE.RepeatWrapping; texPulpa.repeat.set(3, 3);
  const pulpaM = new THREE.MeshPhysicalMaterial({ map: texPulpa, color: '#ffe26a', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06,
    transmission: ctx.gpu ? 0.55 : 0, thickness: 0.08, ior: 1.36, attenuationColor: new THREE.Color('#ffcf2e'), attenuationDistance: 0.25, emissive: '#3a2a00' });
  ctx.brilloBorde(pulpaM, { color: '#fff3b0', fuerza: 0.35, potencia: 3 });
  const albedoM = new THREE.MeshStandardMaterial({ color: '#f6efd6', roughness: 0.7 });
  const pielM = new THREE.MeshPhysicalMaterial({ color: '#e0a800', roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const relPiel = ctx.texturas.ruido({ escala: 40, relieve: 6, semilla: 31, color: '#ffffff' });
  pielM.normalMap = relPiel.normalMap; pielM.normalScale = new THREE.Vector2(0.6, 0.6);
  const RL = 0.36, GR = 0.07;
  const gajoGeo = (() => {
    const a0 = 0.045, a1 = Math.PI * 2 / 10 - 0.045, rin = 0.035, rout = RL - 0.045;
    const f = new THREE.Shape();
    f.moveTo(Math.cos((a0 + a1) / 2) * rin, Math.sin((a0 + a1) / 2) * rin);
    f.lineTo(Math.cos(a0) * (rin + 0.03), Math.sin(a0) * (rin + 0.03));
    f.absarc(0, 0, rout, a0 + 0.01, a1 - 0.01, false);
    f.lineTo(Math.cos((a0 + a1) / 2) * rin, Math.sin((a0 + a1) / 2) * rin);
    const g = new THREE.ExtrudeGeometry(f, { depth: GR - 0.012, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.008, bevelSegments: 3, curveSegments: 16 });
    g.translate(0, 0, -(GR - 0.012) / 2);
    g.rotateX(-Math.PI / 2);
    return g;
  })();
  const rodaja = () => {
    const o = new THREE.Group();
    const piel = new THREE.Mesh(new THREE.CylinderGeometry(RL, RL, GR, 72, 1, true), pielM);
    const albedo = new THREE.Mesh(new THREE.CylinderGeometry(RL - 0.012, RL - 0.012, GR - 0.016, 72), albedoM);
    o.add(piel, albedo);
    for (let i = 0; i < 10; i++) { const gj = new THREE.Mesh(gajoGeo, pulpaM); gj.rotation.y = i * Math.PI * 2 / 10; o.add(gj); }
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return o;
  };
  const rodajas = [
    { p: [1.75, 0.04, 1.05], r: [0, 0.4, 0], t: 7.05 },
    { p: [-1.75, 0.04, 1.2], r: [0, -0.8, 0], t: 7.25 },
    { p: [-0.95, 0.3, 0.95], r: [0.0, 0.5, -0.62], t: 7.45, apoyo: true },
  ].map(d => { const o = rodaja(); o.userData = d; escena.add(o); return o; });
  const hojaF = new THREE.Shape();
  hojaF.moveTo(0, -0.2); hojaF.quadraticCurveTo(0.13, -0.02, 0, 0.2); hojaF.quadraticCurveTo(-0.13, -0.02, 0, -0.2);
  const hojaM = new THREE.MeshPhysicalMaterial({ color: '#2f9a5c', roughness: 0.45, clearcoat: 0.5, side: THREE.DoubleSide, sheen: 0.6, sheenColor: new THREE.Color('#8ff0b0') });
  const hojas = [[1.85, 0.03, 0.75, 0.5, 7.6], [-1.35, 0.03, 1.75, -1.2, 7.8], [1.2, 0.03, 1.6, 2.2, 8.0]].map(([x, y, z, giro, t0]) => {
    const o = ctx.extruir(hojaF, 0.008, hojaM, 0.004); o.userData = { x, y, z, giro, t0 }; escena.add(o); return o;
  });

  // ---- Burbujas, salpicadura y motas de luz del fondo ----
  const burbujas = ctx.particulas({ tipo: 'burbujas', cantidad: 64, centro: [0, 1.7, -0.5], zona: [3.8, 3.6, 1.6], tam: 0.05, semilla: 4 });
  const burbujasCerca = ctx.particulas({ tipo: 'burbujas', cantidad: 16, centro: [1.6, 1.6, 2.6], zona: [2.4, 3.4, 1.2], tam: 0.07, velocidad: 0.8, semilla: 8 });
  const motas = ctx.particulas({ tipo: 'motas', cantidad: 60, centro: [0, 2.4, -6.5], zona: [16, 6, 4], tam: 0.06, colores: [AMBAR, CIAN, '#fff1d0'], intensidad: 3.5, semilla: 2 });
  escena.add(burbujas, burbujasCerca, motas);
  const NS = 34;
  const aguaS = ctx.mat.agua('#ffffff', { thickness: 0.05 });
  ctx.brilloBorde(aguaS, { color: '#e8fbff', fuerza: 2.2, potencia: 2.0 });
  const salpica = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), aguaS, NS);
  salpica.frustumCulled = false;
  const datosS = Array.from({ length: NS }, () => ({ a: rnd() * Math.PI * 2, v: 1.4 + rnd() * 2.2, up: 2.2 + rnd() * 2.6, s: 0.012 + rnd() * 0.03 }));
  escena.add(salpica);

  ctx.sombraContacto(lata, { radio: 0.78, opacidad: 0.85, alto: 2.5 });

  // ---- Textos ----
  const V = ctx.vertical;   // en vertical (reels): titular arriba y centrado, lata centrada abajo
  const r1 = ctx.rotulo({ texto: 'Etiqueta impresa', sub: 'en una sola vuelta', num: 1, en: cabezal, desplaza: [0.06, 0.55, 0], lado: 'derecha', dist: 170, tema: 'oscuro', acento: LIMON, ...(V ? { fijo: [0.56, 0.12] } : {}) });
  const r2 = ctx.rotulo({ texto: 'Condensación', sub: 'servida a 4 °C', num: 2, en: null, desplaza: null, tema: 'claro', color: TINTA, acento: TINTA, fijo: [0.56, 0.16], sombra: false });
  const anclaGota = new THREE.Object3D(); lata.add(anclaGota);
  const r3 = ctx.rotulo({ texto: 'Burbuja fina', sub: 'gas natural, sin azúcar', num: 3, en: [-0.9, 2.15, 0.2], lado: 'izquierda', dist: 190, tema: 'oscuro', acento: LIMON, ...(V ? { fijo: [0.5, 0.15] } : {}) });
  const titular = ctx.titulo({ texto: 'Burbuja', etiqueta: 'Nuevo sabor', sub: 'Limón y jengibre · sin azúcar', ...(V ? { pos: 'arriba', y: 0.1, tam: 150 } : { pos: 'arriba-izquierda', x: 0.075, y: 0.3, tam: 168 }),
    color: CREMA, colorSub: 'rgba(255,246,223,0.78)', colorEtiqueta: LIMON, sombra: true, fuente: '"Archivo Black"', peso: 400, espaciado: -0.03 });

  // ---- Tiempo ----
  const T_GOLPE = 0.42, T_IMP0 = 1.35, T_IMP1 = 4.05;
  const impresoP = t => ctx.entre(t, T_IMP0, T_IMP1, 'suave');
  // giro: durante la impresión, la lata pasa por delante del cabezal (una vuelta exacta)
  const giro = t => {
    const fin = -Math.PI + ANG_CAB;
    if (t < T_IMP0) return ANG_CAB + Math.PI + 0.5 * (T_IMP0 - t) * 0.6;            // antes: gira despacio
    if (t < T_IMP1) return -(impresoP(t) - 0.5) * Math.PI * 2 + ANG_CAB;
    const marca = -Math.PI * 2 + 0.05;                                  // la marca mira a la cámara de la macro
    if (t < 5.0) return ctx.mezcla(fin, marca, ctx.entre(t, T_IMP1, 5.0, 'suaveFuerte'));
    return ctx.mezcla(marca, -Math.PI * 2 + 0.12, ctx.entre(t, 5.0, 9.6, 'suave')) - 0.1 * ctx.entre(t, 9.6, 12, 'suave');
  };

  // ---- Cámara: cae con la lata, orbita durante la impresión, macro de las gotas, grúa y plano de anuncio ----
  const cam = ctx.camaraPorClaves([
    { t: 0.0, pos: [2.4, 1.05, 5.6], mira: [0, 1.15, 0], fov: 30, apertura: 0.3 },
    { t: 1.3, pos: [2.6, 1.5, 4.6], mira: [0, 1.15, 0], fov: 29, apertura: 0.3 },
    { t: 3.9, pos: [-2.3, 1.7, 4.2], mira: [0.05, 1.15, 0], fov: 28, apertura: 0.3 },
    { t: 4.8, pos: [0.85, 1.55, 2.15], mira: [0.12, 1.28, 0.55], fov: 26, foco: [0.2, 1.3, 0.64], apertura: 0.85 },
    { t: 6.3, pos: [0.3, 1.25, 2.05], mira: [-0.02, 1.22, 0.55], fov: 25, foco: [0.05, 1.22, 0.66], apertura: 0.85 },
    { t: 7.5, pos: [2.0, 2.5, 5.0], mira: [0.0, 1.2, 0.2], fov: 30, apertura: 0.35 },
    { t: 9.4, pos: V ? [0.3, 1.7, 7.6] : [0.45, 1.55, 7.4], mira: V ? [0, 1.75, 0] : [-0.85, 1.02, 0], fov: 28, foco: [0, 1.2, 0.3], apertura: 0.36 },
    { t: 12, pos: V ? [0.28, 1.62, 7.1] : [0.4, 1.48, 6.85], mira: V ? [0, 1.8, 0] : [-0.88, 1.02, 0], fov: 27.5, foco: [0, 1.2, 0.3], apertura: 0.36 },
  ], { deriva: 0.035 });

  return {
    momentos: [
      { t: 0.45, nombre: 'cae la lata y rebota' },
      { t: 1.2, nombre: 'caen los hielos' },
      { t: 2.6, nombre: 'se imprime la etiqueta' },
      { t: 5.4, nombre: 'macro: condensación' },
      { t: 7.9, nombre: 'burbujas y limón' },
      { t: 11.4, nombre: 'plano final de anuncio' },
    ],
    pintar(t) {
      cam(t);
      // temblor del golpe
      const golpe = Math.exp(-Math.max(0, t - T_GOLPE) * 9) * (t > T_GOLPE ? 1 : 0);
      ctx.camara.position.y += 0.025 * golpe * Math.sin(t * 70);
      ctx.camara.updateMatrixWorld();

      // caída de la lata con aplastamiento y rebote
      const k = ctx.caida(t, T_GOLPE - Math.sqrt(2 * 3.4 / 26), { altura: 3.4, rebote: 0.16, g: 26 });
      lata.position.set(0, k.y, 0);
      const apl = k.aplastar;
      lata.scale.set(1 + apl * 0.07, 1 - apl * 0.1, 1 + apl * 0.07);
      lata.rotation.set(0, giro(t), 0.035 * Math.sin(t * 1.1) * (1 - ctx.entre(t, 8, 9.4)));

      // impresión de la etiqueta
      const pI = impresoP(t);
      impresion.p(t < T_IMP0 ? 0 : (t >= T_IMP1 ? 1.001 : pI));
      etiqueta.visible = t >= T_IMP0;
      const cabP = ctx.entre(t, T_IMP0 - 0.35, T_IMP0, 'salida') * (1 - ctx.entre(t, T_IMP1, T_IMP1 + 0.4, 'entrada'));
      cabezal.visible = cabP > 0.01;
      cabezal.scale.set(1, Math.max(0.001, cabP), 1);
      barra.material.color.setRGB(1, 0.9, 0.78).multiplyScalar(4.5 * (0.85 + 0.15 * Math.sin(t * 40)));
      luzCab.luz.intensity = 4 * cabP;

      // condensación: se empaña y aparecen gotas
      const empana = ctx.entre(t, 4.25, 5.6, 'suave');
      etiquetaM.clearcoatNormalScale.set(empana, empana);
      etiquetaM.clearcoatRoughness = ctx.mezcla(0.06, 1, empana);
      aluminioF.clearcoatNormalScale.set(empana, empana);
      aluminioF.clearcoatRoughness = ctx.mezcla(0.06, 1, empana);
      datosG.forEach((d, i) => {
        const p = ctx.entre(t, d.ap, d.ap + 0.4, 'salida');
        if (p <= 0) { m4.makeScale(1e-5, 1e-5, 1e-5); gotas.setMatrixAt(i, m4); return; }
        const baja = d.resbala * Math.pow(Math.max(0, t - d.ap - 0.5), 1.6);
        const y = Math.max(0.32, d.y - baja);
        const r = R + 0.004 + d.s * 0.3;
        pv.set(Math.sin(d.th) * r, y, Math.cos(d.th) * r);
        e.set(0, d.th, 0); q.setFromEuler(e);
        const s = d.s * p;
        sv.set(s, s * (1.25 + (baja > 0 ? 0.6 : 0)), s * 0.42);
        m4.compose(pv, q, sv); gotas.setMatrixAt(i, m4);
      });
      gotas.instanceMatrix.needsUpdate = true;
      { const d = datosG[7]; anclaGota.position.set(Math.sin(d.th) * (R + 0.01), d.y, Math.cos(d.th) * (R + 0.01)); }

      // hielos: caen con giro y se asientan
      hielos.forEach((o, i) => {
        const d = o.userData;
        const h = ctx.caida(t, d.t - 0.45, { altura: 3.2, rebote: 0.3, g: 28 });
        const asiento = d.apoyo || 0;
        o.visible = t > d.t - 0.45;
        o.position.set(d.p[0], d.p[1] + h.y, d.p[2]);
        const gira = (1 - ctx.entre(t, d.t - 0.45, d.t + 0.5, 'salida')) * 3.2;
        o.rotation.set(d.r[0] + gira * 0.7, d.r[1] + gira, d.r[2] + gira * 0.4);
        if (asiento && h.y < 0.001) o.position.y = d.p[1];
      });

      // salpicadura al golpe
      datosS.forEach((d, i) => {
        const s = t - T_GOLPE;
        if (s < 0 || s > 0.7) { m4.makeScale(1e-5, 1e-5, 1e-5); salpica.setMatrixAt(i, m4); return; }
        const x = Math.cos(d.a) * (0.62 + d.v * s), z = Math.sin(d.a) * (0.62 + d.v * s), y = Math.max(0, 0.02 + d.up * s - 9.8 * s * s * 0.5);
        const vy = d.up - 9.8 * s;
        pv.set(x, y, z);
        const sc = d.s * (1 - s / 0.7);
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(d.a) * d.v, vy, Math.sin(d.a) * d.v).normalize());
        sv.set(sc, sc * 2.2, sc);
        m4.compose(pv, q, sv); salpica.setMatrixAt(i, m4);
      });
      salpica.instanceMatrix.needsUpdate = true;

      // limón y menta
      rodajas.forEach(o => {
        const d = o.userData;
        const h = ctx.caida(t, d.t - 0.4, { altura: 2.6, rebote: 0.22, g: 26 });
        o.visible = t > d.t - 0.4;
        o.position.set(d.p[0], d.p[1] + h.y, d.p[2]);
        const gira = (1 - ctx.entre(t, d.t - 0.4, d.t + 0.3, 'salida'));
        o.rotation.set(d.r[0] + gira * 1.4, d.r[1] + gira * 2, d.r[2] + gira * 0.8);
      });
      hojas.forEach(o => {
        const d = o.userData;
        const p = ctx.entre(t, d.t0 - 0.9, d.t0, 'salida');
        o.visible = p > 0;
        o.position.set(d.x + 0.25 * Math.sin((1 - p) * 6), d.y + (1 - p) * 2.2, d.z);
        o.rotation.set(-Math.PI / 2 + (1 - p) * 1.2 * Math.sin(t * 5), 0, d.giro + (1 - p) * 2);
      });

      burbujas.pintar(t, ctx.entre(t, 5.6, 6.8));
      burbujasCerca.pintar(t, ctx.entre(t, 6.2, 7.2));
      motas.pintar(t, 1);

      r1.mostrar(ctx.entre(t, 1.7, 2.6) - ctx.entre(t, 3.7, 4.1));
      r2.en = anclaGota;
      r2.mostrar(ctx.entre(t, 5.0, 5.9) - ctx.entre(t, 6.25, 6.6));
      r3.mostrar(ctx.entre(t, 7.7, 8.5) - ctx.entre(t, 9.0, 9.3));
      titular.mostrar(ctx.entre(t, 9.55, 10.9));
    },
  };
}
