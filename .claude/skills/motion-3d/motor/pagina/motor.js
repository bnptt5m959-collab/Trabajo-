// motor.js · el motor de motion-3d (versión 2: «calidad de estudio»).
//
// Pone todo lo que no cambia de un vídeo a otro (renderer, luz, postproceso,
// tipografía, cámara por claves, rótulos…) y carga la ESCENA que escribe Claude:
//
//   export const ajustes = { duracion: 15, formato: '16:9', post: { ... } };
//   export function crear(THREE, ctx) {
//     ...monta objetos, luces y cámara...
//     return { pintar(t) { ...coloca todo para el segundo t... } };
//   }
//
// Regla de oro: pintar(t) depende SOLO de t. Nada de requestAnimationFrame,
// Date.now ni Math.random dentro de pintar: así cada fotograma sale idéntico
// por mucho que se repita, se puede dibujar en cualquier orden y el desenfoque
// de movimiento (varios instantes por fotograma) funciona solo.
//
// Tubería de imagen por fotograma (GPU):
//   N subfotogramas (escena → HDR con MSAA) promediados = desenfoque de movimiento
//   → oclusión ambiental (GTAO) → profundidad de campo con bokeh (+ efecto maqueta)
//   → resplandor (bloom) → tone mapping (ACES / AgX / neutro) → gradación de color,
//   aberración cromática, viñeta y grano → capa 2D (rótulos y títulos nítidos).
// En CPU (SwiftShader) se rebaja sola: sin GTAO, sin subfotogramas, bokeh con menos muestras.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const FORMATOS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350] };

let W = 1920, H = 1080, FPS = 30;
let renderer, escena, camara, comp, g;
let pintarEscena = () => {}, dibujar2d = null, debajo2d = null;
let rotulos = [], titulos = [], cifras = [], contactos = [], tras = [];
let fuente3d = null;
let Q = null;            // calidad efectiva (gpu/cpu, boceto/final)
let P = null;            // ajustes de postproceso vivos (la escena los cambia)
let camInfo = { mira: null, foco: null, apertura: null };

// ---------------------------------------------------------------------------
//  Curvas de movimiento (ease) y utilidades de tiempo
// ---------------------------------------------------------------------------
const c1 = 1.70158, c2 = c1 * 1.525, c3 = c1 + 1;
const ease = {
  lineal: x => x,
  suave: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  salida: x => 1 - Math.pow(1 - x, 3),
  entrada: x => x * x * x,
  salidaFuerte: x => 1 - Math.pow(1 - x, 5),
  suaveFuerte: x => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  expo: x => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  rebote: x => 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
  // anticipación: retrocede un poco antes de salir (cosas que «cogen impulso»)
  anticipa: x => c3 * x * x * x - c1 * x * x,
  anticipaRebote: x => (x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2),
  elastico: x => (x === 0 || x === 1) ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  botar: x => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  },
};
const curva = e => (typeof e === 'function' ? e : (ease[e] || ease.lineal));
const limitar = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const entre = (t, a, b, e = 'lineal') => curva(e)(limitar((t - a) / (b - a || 1e-6)));
const mezcla = (a, b, p) => {
  if (Array.isArray(a)) return a.map((v, i) => v + (b[i] - v) * p);
  if (a && a.isColor) return a.clone().lerp(b, p);
  if (a && a.isVector3) return a.clone().lerp(b, p);
  return a + (b - a) * p;
};
// muelle(t, inicio, {frecuencia, amortigua}) → 0→1 con sobrepaso y oscilación que se apaga
function muelle(t, inicio, op = {}) {
  const s = t - inicio;
  if (s <= 0) return 0;
  const f = op.frecuencia ?? 2.2, a = op.amortigua ?? 6;
  return 1 - Math.exp(-a * s) * Math.cos(2 * Math.PI * f * s);
}

function claves(t, pares, e = 'suave') {
  if (t <= pares[0][0]) return pares[0][1];
  for (let i = 0; i < pares.length - 1; i++) {
    const [t0, v0] = pares[i], [t1, v1, e1] = pares[i + 1];
    if (t < t1) return mezcla(v0, v1, curva(e1 || e)((t - t0) / (t1 - t0 || 1e-6)));
  }
  return pares[pares.length - 1][1];
}

function azar(semilla = 1) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const vec = v => (v && v.isVector3 ? v.clone() : new THREE.Vector3(...(v || [0, 0, 0])));
const color = c => (c && c.isColor ? c : new THREE.Color(c));
const hdr = (c, k = 1) => color(c).clone().multiplyScalar(k);

// ---------------------------------------------------------------------------
//  Cámara
// ---------------------------------------------------------------------------
function fovAdaptado(fov) {
  if (W >= H) return fov;
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 16 / 9);
  const quiero = hfov * 0.72;
  const v = 2 * Math.atan(Math.tan(quiero / 2) / (W / H));
  return Math.min(100, THREE.MathUtils.radToDeg(v));
}

// camaraPorClaves([{t, pos, mira, fov, giro, foco, apertura, ease}, ...], {continuo, deriva, ease})
//   foco: punto [x,y,z] o distancia en metros donde está nítido (por defecto, el punto «mira»)
//   apertura: cuánto se desenfoca lo que no está a foco (0 = nada, 0.3 suave, 0.8 macro)
function camaraPorClaves(lista, op = {}) {
  const ks = lista.map(k => ({ ...k, pos: vec(k.pos), mira: vec(k.mira || [0, 0, 0]), fov: k.fov ?? 35 }));
  const curvaPos = ks.length > 2 ? new THREE.CatmullRomCurve3(ks.map(k => k.pos), false, 'centripetal') : null;
  const curvaMira = ks.length > 2 ? new THREE.CatmullRomCurve3(ks.map(k => k.mira), false, 'centripetal') : null;
  const deriva = op.deriva ?? 0;
  const valFoco = k => (k.foco === undefined ? k.mira : (Array.isArray(k.foco) || k.foco.isVector3 ? vec(k.foco) : k.foco));
  return t => {
    let pos, mira, fov, giro = 0, ia = 0, ib = 0, pl = 0;
    if (t <= ks[0].t) { pos = ks[0].pos.clone(); mira = ks[0].mira.clone(); fov = ks[0].fov; giro = ks[0].giro || 0; }
    else if (t >= ks[ks.length - 1].t) { const k = ks[ks.length - 1]; ia = ib = ks.length - 1; pos = k.pos.clone(); mira = k.mira.clone(); fov = k.fov; giro = k.giro || 0; }
    else {
      let i = 0;
      while (i < ks.length - 2 && t >= ks[i + 1].t) i++;
      const a = ks[i], b = ks[i + 1];
      const local = (t - a.t) / (b.t - a.t);
      const p = curva(b.ease || op.ease || 'suave')(local);
      ia = i; ib = i + 1; pl = p;
      if (op.continuo && curvaPos) {
        const tot = ks[ks.length - 1].t - ks[0].t;
        const u = curva(op.ease || 'lineal')((t - ks[0].t) / tot);
        const tt = ks[0].t + u * tot;
        let j = 0;
        while (j < ks.length - 2 && tt >= ks[j + 1].t) j++;
        const lj = (tt - ks[j].t) / (ks[j + 1].t - ks[j].t);
        const uc = (j + lj) / (ks.length - 1);
        pos = curvaPos.getPoint(uc); mira = curvaMira.getPoint(uc);
        fov = mezcla(ks[j].fov, ks[j + 1].fov, lj);
        giro = mezcla(ks[j].giro || 0, ks[j + 1].giro || 0, lj);
        ia = j; ib = j + 1; pl = lj;
      } else {
        pos = a.pos.clone().lerp(b.pos, p); mira = a.mira.clone().lerp(b.mira, p);
        fov = mezcla(a.fov, b.fov, p); giro = mezcla(a.giro || 0, b.giro || 0, p);
      }
    }
    if (deriva) {
      pos.x += deriva * Math.sin(t * 0.61 + 0.3);
      pos.y += deriva * 0.6 * Math.sin(t * 0.83 + 1.1);
      pos.z += deriva * 0.5 * Math.sin(t * 0.47 + 2.0);
    }
    camara.position.copy(pos);
    camara.up.set(0, 1, 0);
    camara.lookAt(mira);
    if (giro) camara.rotateZ(THREE.MathUtils.degToRad(giro));
    camara.fov = fovAdaptado(fov);
    camara.updateProjectionMatrix();
    camara.updateMatrixWorld();
    // foco y apertura (profundidad de campo) siguen a las claves
    const fa = valFoco(ks[ia]), fb = valFoco(ks[ib]);
    if (typeof fa === 'number' && typeof fb === 'number') camInfo.foco = mezcla(fa, fb, pl);
    else camInfo.foco = (fa.isVector3 ? fa : mira).clone().lerp(fb.isVector3 ? fb : mira, pl);
    const aa = ks[ia].apertura, ab = ks[ib].apertura;
    camInfo.apertura = (aa === undefined && ab === undefined) ? null : mezcla(aa ?? ab, ab ?? aa, pl);
    camInfo.mira = mira;
  };
}

// Rigs de cámara ya hechos (devuelven una función cam(t) como camaraPorClaves)
const rig = {
  // órbita alrededor de un punto: ángulos en grados (0 = de frente, +z)
  orbita(op = {}) {
    const c = vec(op.centro || [0, 1, 0]), r0 = op.radio ?? 6, r1 = op.radioFin ?? r0;
    const [a0, a1] = op.angulos || [-25, 25], [h0, h1] = op.alturas || [op.alto ?? 1.5, op.alto ?? 1.5];
    const [t0, t1] = op.t || [0, 8], [f0, f1] = op.fovs || [op.fov ?? 32, op.fov ?? 32];
    return t => {
      const p = entre(t, t0, t1, op.ease || 'suave');
      const a = THREE.MathUtils.degToRad(mezcla(a0, a1, p)), r = mezcla(r0, r1, p);
      camara.position.set(c.x + Math.sin(a) * r, c.y + mezcla(h0, h1, p), c.z + Math.cos(a) * r);
      camara.up.set(0, 1, 0); camara.lookAt(c);
      camara.fov = fovAdaptado(mezcla(f0, f1, p)); camara.updateProjectionMatrix(); camara.updateMatrixWorld();
      camInfo.mira = c; camInfo.foco = op.foco ? vec(op.foco) : c; camInfo.apertura = op.apertura ?? null;
    };
  },
  // empujón (dolly in): de «desde» a «hasta» mirando a «mira»; con fov que se cierra
  empujon(op = {}) {
    return camaraPorClaves([
      { t: (op.t || [0, 8])[0], pos: op.desde, mira: op.mira, fov: (op.fovs || [34, 30])[0], apertura: op.apertura },
      { t: (op.t || [0, 8])[1], pos: op.hasta, mira: op.mira, fov: (op.fovs || [34, 30])[1], apertura: op.apertura, ease: op.ease || 'suave' },
    ], { deriva: op.deriva ?? 0.04 });
  },
  // grúa: sube o baja mientras mira al centro
  grua(op = {}) {
    const c = op.mira || [0, 1, 0];
    return camaraPorClaves([
      { t: (op.t || [0, 8])[0], pos: op.desde, mira: c, fov: op.fov ?? 32, apertura: op.apertura },
      { t: (op.t || [0, 8])[1], pos: op.hasta, mira: op.miraFin || c, fov: op.fovFin ?? op.fov ?? 32, apertura: op.apertura, ease: op.ease || 'suave' },
    ], { deriva: op.deriva ?? 0.05 });
  },
};

// ---------------------------------------------------------------------------
//  Entradas de objetos
// ---------------------------------------------------------------------------
function base(obj) {
  if (!obj.userData._base) obj.userData._base = { pos: obj.position.clone(), esc: obj.scale.clone(), rot: obj.rotation.clone() };
  return obj.userData._base;
}

function entrada(obj, t, inicio, op = {}) {
  const b = base(obj);
  const dur = op.dur ?? 0.6, dist = op.dist ?? 1, desde = op.desde || 'escala';
  let p = limitar((t - inicio) / dur);
  if (op.fin !== undefined) p = Math.min(p, 1 - limitar((t - op.fin) / (op.durSalida ?? 0.4)));
  obj.position.copy(b.pos); obj.scale.copy(b.esc); obj.rotation.copy(b.rot);
  obj.visible = p > 0.001;
  if (!obj.visible) return 0;
  if (desde === 'escala') {
    obj.scale.multiplyScalar(Math.max(0.0001, ease.rebote(p)));
  } else if (desde === 'abajo' || desde === 'arriba' || desde === 'izquierda' || desde === 'derecha') {
    const e = desde === 'arriba' ? ease.botar(p) : ease.rebote(p);
    const eje = (desde === 'abajo' || desde === 'arriba') ? 'y' : 'x';
    const signo = (desde === 'abajo' || desde === 'izquierda') ? -1 : 1;
    obj.position[eje] += signo * dist * (1 - e);
    if (desde !== 'arriba') obj.scale.multiplyScalar(Math.max(0.0001, 0.4 + 0.6 * ease.salida(p)));
  } else if (desde === 'giro') {
    obj.scale.multiplyScalar(Math.max(0.0001, ease.rebote(p)));
    obj.rotation.y += (1 - ease.salida(p)) * Math.PI * 1.5;
  } else if (desde === 'muelle') {
    const m = muelle(t, inicio, { frecuencia: op.frecuencia ?? 1.6, amortigua: op.amortigua ?? 5.5 });
    obj.scale.multiplyScalar(Math.max(0.0001, m));
  }
  return p;
}

function caida(t, inicio, op = {}) {
  const h = op.altura ?? 3, e = op.rebote ?? 0.45, gr = op.g ?? 30;
  let s = t - inicio;
  if (s <= 0) return { y: h, aplastar: 0, tocando: false };
  const t1 = Math.sqrt(2 * h / gr);
  if (s < t1) return { y: h - 0.5 * gr * s * s, aplastar: 0, tocando: false };
  s -= t1;
  let v = gr * t1 * e;
  for (let k = 0; k < 8 && v > 0.2; k++) {
    const vuelo = 2 * v / gr;
    if (s < vuelo) {
      const y = v * s - 0.5 * gr * s * s;
      const golpe = Math.max(0, 1 - s / 0.08) * (v / (gr * t1));
      return { y, aplastar: golpe, tocando: s < 0.03 };
    }
    s -= vuelo; v *= e;
  }
  return { y: 0, aplastar: 0, tocando: true };
}

// ---------------------------------------------------------------------------
//  Materiales base
// ---------------------------------------------------------------------------
const mat = {
  plastico: (c = '#e8e8e8', x = {}) => new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4, ...x }),
  brillante: (c = '#e8e8e8', x = {}) => new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, ...x }),
  metal: (c = '#c9ccd1', x = {}) => new THREE.MeshStandardMaterial({ color: color(c), metalness: 1, roughness: 0.28, ...x }),
  cepillado: (c = '#c3c6cc', x = {}) => new THREE.MeshPhysicalMaterial({ color: color(c), metalness: 1, roughness: 0.42, anisotropy: 0.85, ...x }),
  ceramica: (c = '#f4f1ea', x = {}) => new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.12, ...x }),
  vidrio: (c = '#dfefff', x = {}) => (Q && Q.gpu && x.transmision !== false)
    ? new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.03, metalness: 0, transmission: 1, thickness: 0.4, ior: 1.45, envMapIntensity: 1.4, clearcoat: 1, specularIntensity: 1, ...x, transmision: undefined })
    : new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, envMapIntensity: 1.6, clearcoat: 1, ...x, transmision: undefined }),
  hielo: (c = '#eaf6ff', x = {}) => (Q && Q.gpu)
    ? new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.12, transmission: 1, thickness: 0.8, ior: 1.31, envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: color('#cfe9ff'), attenuationDistance: 2, ...x })
    : new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 1.6, ...x }),
  agua: (c = '#ffffff', x = {}) => (Q && Q.gpu)
    ? new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.0, transmission: 1, thickness: 0.15, ior: 1.33, envMapIntensity: 1.8, clearcoat: 1, ...x })
    : new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.02, transparent: true, opacity: 0.4, clearcoat: 1, envMapIntensity: 2.2, ...x }),
  arcilla: (c = '#f2b8a0', x = {}) => new THREE.MeshStandardMaterial({ color: color(c), roughness: 0.86, metalness: 0, ...x }),
  papel: (c = '#f7f3ea', x = {}) => new THREE.MeshStandardMaterial({ color: color(c), roughness: 0.95, metalness: 0, side: THREE.DoubleSide, ...x }),
  mate: (c = '#cccccc', x = {}) => new THREE.MeshStandardMaterial({ color: color(c), roughness: 0.7, metalness: 0, ...x }),
  carton: (c = '#c89a63', x = {}) => new THREE.MeshStandardMaterial({ color: color(c), roughness: 0.92, metalness: 0, ...x }),
  goma: (c = '#222222', x = {}) => new THREE.MeshStandardMaterial({ color: color(c), roughness: 0.9, metalness: 0, ...x }),
  liquido: (c = '#3b1f12', x = {}) => new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.12, clearcoat: 1, ...x }),
  terciopelo: (c = '#7d2433', x = {}) => new THREE.MeshPhysicalMaterial({ color: color(c), roughness: 0.85, sheen: 1, sheenRoughness: 0.5, sheenColor: color(c).clone().lerp(new THREE.Color('#ffffff'), 0.4), ...x }),
  // emisivo: luces, pantallas, neones, ventanas. Intensidad > 1 → brilla (bloom).
  emisivo: (c = '#ffd27a', intensidad = 2, x = {}) => new THREE.MeshStandardMaterial({ color: '#000000', emissive: color(c), emissiveIntensity: intensidad, ...x }),
  // luz pura (sin sombreado), en HDR: lo más barato para bombillas y tubos
  luz: (c = '#ffd27a', intensidad = 4, x = {}) => new THREE.MeshBasicMaterial({ color: hdr(c, intensidad), ...x }),
  plano: (c = '#ffffff', x = {}) => new THREE.MeshBasicMaterial({ color: color(c), ...x }),
};

// ---------------------------------------------------------------------------
//  Geometrías: TODO con bisel por defecto (nada de aristas vivas)
// ---------------------------------------------------------------------------
function malla(geo, m) {
  const o = new THREE.Mesh(geo, m || mat.mate());
  o.castShadow = true; o.receiveShadow = true;
  return o;
}
// caja(w, h, d, mat, radio): sin radio → bisel automático (8 % del lado menor). radio: 0 → arista viva.
const caja = (w, h, d, m, radio, seg = 3) => {
  const r = radio === undefined ? Math.min(w, h, d) * 0.08 : radio;
  return malla(r > 0 ? new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999) : new THREE.BoxGeometry(w, h, d), m);
};
const cilindro = (rArr, rAb, alto, m, seg = 48, abierto = false) => malla(new THREE.CylinderGeometry(rArr, rAb, alto, seg, 1, abierto), m);
// cilindroBisel(radio, alto, mat, {bisel, seg}) → disco/pastilla/lata con los cantos redondeados
function perfilBisel(r, alto, b, pasos = 6) {
  b = Math.min(b, r * 0.5, alto * 0.5);
  const p = [[0, 0]];
  for (let i = 0; i <= pasos; i++) { const a = -Math.PI / 2 + (i / pasos) * Math.PI / 2; p.push([r - b + Math.cos(a) * b, b + Math.sin(a) * b]); }
  for (let i = 0; i <= pasos; i++) { const a = (i / pasos) * Math.PI / 2; p.push([r - b + Math.cos(a) * b, alto - b + Math.sin(a) * b]); }
  p.push([0, alto]);
  return p;
}
const cilindroBisel = (r, alto, m, op = {}) => {
  const o = torno(perfilBisel(r, alto, op.bisel ?? Math.min(r, alto) * 0.12), m, op.seg ?? 64);
  if (op.centrar !== false) o.geometry.translate(0, -alto / 2, 0);
  return o;
};
const esfera = (r, m, seg = 40) => malla(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);
const toro = (r, tubo_, m, arco = Math.PI * 2) => malla(new THREE.TorusGeometry(r, tubo_, 20, 64, arco), m);
const cono = (r, alto, m, seg = 40) => malla(new THREE.ConeGeometry(r, alto, seg), m);
const plano = (w, h, m) => { const o = malla(new THREE.PlaneGeometry(w, h), m); o.castShadow = false; return o; };
const torno = (perfil, m, seg = 64) => malla(new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), seg), m);
const tubo = (puntos, radio, m, seg = 64, cerrado = false) => malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos.map(vec), cerrado), seg, radio, 12, cerrado), m);
function extruir(puntos, fondo_, m, bisel) {
  if (bisel === undefined) bisel = Math.min(0.02, fondo_ * 0.3);   // bisel por defecto, proporcionado al grosor
  const forma = puntos instanceof THREE.Shape ? puntos : new THREE.Shape(puntos.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(forma, { depth: fondo_, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: 24 });
  geo.translate(0, 0, -fondo_ / 2);
  return malla(geo, m);
}
function grupo(...hijos) { const gq = new THREE.Group(); hijos.forEach(h => gq.add(h)); return gq; }
function sombras(obj, proyecta = true, recibe = true) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = proyecta; o.receiveShadow = recibe; } });
  return obj;
}

// instancias(geo, mat, n, (i, o) => { o.pos=[..]; o.rot=[..]; o.esc=1|[..]; o.color='#..' }) → InstancedMesh
// Luego, para moverlas en pintar: inst.colocar(i, pos, rot, esc) y al final inst.listo()
function instancias(geo, m, n, cada) {
  const im = new THREE.InstancedMesh(geo, m, n);
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  im.colocar = (i, pos, rot = [0, 0, 0], esc = 1) => {
    p.set(...pos); e.set(...rot); q.setFromEuler(e);
    if (Array.isArray(esc)) s.set(...esc); else s.set(esc, esc, esc);
    m4.compose(p, q, s); im.setMatrixAt(i, m4);
  };
  im.listo = () => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; };
  if (cada) {
    for (let i = 0; i < n; i++) {
      const o = { pos: [0, 0, 0], rot: [0, 0, 0], esc: 1 };
      cada(i, o);
      im.colocar(i, o.pos, o.rot, o.esc);
      if (o.color) im.setColorAt(i, color(o.color));
    }
    im.listo();
  }
  return im;
}

// textura2d(ancho, alto, (g, w, h) => { ...canvas 2D... }) → textura para pegar en 3D
function textura2d(ancho, alto, dibujar) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  const gg = c.getContext('2d');
  dibujar(gg, ancho, alto);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  tx.needsUpdate = true;
  tx.userData.lienzo = c;
  return tx;
}

// ---------------------------------------------------------------------------
//  Texturas procedurales (deterministas): color + relieve + rugosidad
// ---------------------------------------------------------------------------
function ruidoValor(semilla, L) {            // ruido de valor que se repite cada L celdas (texturas sin costuras)
  const rnd = azar(semilla), tabla = new Float32Array(L * L);
  for (let i = 0; i < L * L; i++) tabla[i] = rnd();
  const s = x => x * x * (3 - 2 * x);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const a = ((xi % L) + L) % L, b = ((yi % L) + L) % L, a1 = (a + 1) % L, b1 = (b + 1) % L;
    const v00 = tabla[b * L + a], v10 = tabla[b * L + a1], v01 = tabla[b1 * L + a], v11 = tabla[b1 * L + a1];
    return (v00 + (v10 - v00) * fx) + ((v01 + (v11 - v01) * fx) - (v00 + (v10 - v00) * fx)) * fy;
  };
}
function fbm(semilla, base = 4, octavas = 4) {
  const capas = Array.from({ length: octavas }, (_, o) => ruidoValor(semilla + o * 101, base << o));
  return (u, v) => { let s = 0, a = 0.5, n = 0; capas.forEach((f, o) => { s += f(u * (base << o), v * (base << o)) * a; n += a; a *= 0.5; }); return s / n; };
}
function lienzoDe(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texDeLienzo(c, srgb, rep) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (rep) t.repeat.set(rep[0], rep[1] ?? rep[0]);
  t.needsUpdate = true;
  return t;
}
// genera {map, normalMap, roughnessMap} a partir de funciones por píxel (u, v ∈ [0,1))
function texturaProcedural(op, fn) {
  const n = op.tam ?? 512, rep = op.repetir;
  const cC = lienzoDe(n, n), cN = lienzoDe(n, n), cR = lienzoDe(n, n);
  const dC = cC.getContext('2d').createImageData(n, n), dN = cN.getContext('2d').createImageData(n, n), dR = cR.getContext('2d').createImageData(n, n);
  const alt = new Float32Array(n * n);
  // el lienzo es sRGB: el color se escribe en sRGB (THREE.Color guarda lineal)
  const base = color(op.color || '#888888').clone().convertLinearToSRGB();
  const out = { c: [0, 0, 0], h: 0, r: 0.8 };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    fn(x / n, y / n, out, base);
    dC.data[i * 4] = limitar(out.c[0]) * 255; dC.data[i * 4 + 1] = limitar(out.c[1]) * 255; dC.data[i * 4 + 2] = limitar(out.c[2]) * 255; dC.data[i * 4 + 3] = 255;
    const r = limitar(out.r) * 255; dR.data[i * 4] = r; dR.data[i * 4 + 1] = r; dR.data[i * 4 + 2] = r; dR.data[i * 4 + 3] = 255;
    alt[i] = out.h;
  }
  const f = op.relieve ?? 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    const dx = (alt[y * n + ((x + 1) % n)] - alt[y * n + ((x - 1 + n) % n)]) * f;
    const dy = (alt[((y + 1) % n) * n + x] - alt[((y - 1 + n) % n) * n + x]) * f;
    const l = Math.hypot(dx, dy, 1);
    dN.data[i * 4] = (-dx / l * 0.5 + 0.5) * 255; dN.data[i * 4 + 1] = (dy / l * 0.5 + 0.5) * 255; dN.data[i * 4 + 2] = (1 / l * 0.5 + 0.5) * 255; dN.data[i * 4 + 3] = 255;
  }
  cC.getContext('2d').putImageData(dC, 0, 0); cN.getContext('2d').putImageData(dN, 0, 0); cR.getContext('2d').putImageData(dR, 0, 0);
  return { map: texDeLienzo(cC, true, rep), normalMap: texDeLienzo(cN, false, rep), roughnessMap: texDeLienzo(cR, false, rep), lienzo: cC };
}
const srgbLin = c => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; };
const texturas = {
  // cartón kraft con fibras, manchas y (si ondulado) las líneas de la onda
  carton(op = {}) {
    const fib = fbm(op.semilla ?? 11, 16, 3), man = fbm((op.semilla ?? 11) + 7, 3, 3);
    return texturaProcedural({ color: '#c39a66', relieve: 1.6, ...op }, (u, v, o, b) => {
      const f = fib(u * 1.0, v * 6.0), m = man(u, v), onda = op.ondulado ? 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * (op.ondas ?? 60)) : 0.5;
      const k = 0.86 + 0.18 * f - 0.12 * Math.max(0, m - 0.6) + 0.04 * onda;
      o.c[0] = b.r * k; o.c[1] = b.g * k; o.c[2] = b.b * k;
      o.h = f * 0.6 + onda * 0.5; o.r = 0.86 + 0.1 * f;
    });
  },
  // madera con vetas
  madera(op = {}) {
    const n1 = fbm(op.semilla ?? 21, 4, 4), n2 = fbm((op.semilla ?? 21) + 3, 24, 2);
    const claro = color(op.color || '#b07a4a').clone().convertLinearToSRGB(), oscuro = color(op.oscuro || '#6b4226').clone().convertLinearToSRGB();
    return texturaProcedural({ relieve: 1.2, ...op }, (u, v, o) => {
      const veta = Math.abs(Math.sin((v * (op.vetas ?? 9) + n1(u * 0.6, v) * 2.6) * Math.PI));
      const k = Math.pow(veta, 0.6) * 0.8 + n2(u * 0.3, v * 3) * 0.2;
      o.c[0] = oscuro.r + (claro.r - oscuro.r) * k; o.c[1] = oscuro.g + (claro.g - oscuro.g) * k; o.c[2] = oscuro.b + (claro.b - oscuro.b) * k;
      o.h = k * 0.4; o.r = 0.55 + 0.25 * (1 - k);
    });
  },
  // papel con fibras muy suaves
  papel(op = {}) {
    const n1 = fbm(op.semilla ?? 31, 24, 3), n2 = fbm((op.semilla ?? 31) + 5, 4, 2);
    return texturaProcedural({ color: '#f3eee4', relieve: 0.8, ...op }, (u, v, o, b) => {
      const k = 0.95 + 0.06 * n1(u, v) - 0.04 * n2(u, v);
      o.c[0] = b.r * k; o.c[1] = b.g * k; o.c[2] = b.b * k; o.h = n1(u, v) * 0.5; o.r = 0.92;
    });
  },
  // tela con trama
  tela(op = {}) {
    const n1 = fbm(op.semilla ?? 41, 8, 3), hilos = op.hilos ?? 90;
    return texturaProcedural({ color: '#3b5a8a', relieve: 2.5, ...op }, (u, v, o, b) => {
      const a = Math.sin(u * Math.PI * 2 * hilos), c = Math.sin(v * Math.PI * 2 * hilos);
      const trama = (Math.floor(u * hilos) + Math.floor(v * hilos)) % 2 ? a * a : c * c;
      const k = 0.78 + 0.2 * trama + 0.08 * n1(u, v);
      o.c[0] = b.r * k; o.c[1] = b.g * k; o.c[2] = b.b * k; o.h = trama; o.r = 0.9;
    });
  },
  // metal cepillado: rayas finas en una dirección (úsalo con metalness 1)
  cepillado(op = {}) {
    const n1 = fbm(op.semilla ?? 51, 2, 3), n2 = ruidoValor((op.semilla ?? 51) + 9, 512);
    return texturaProcedural({ color: '#c8ccd2', relieve: 0.6, ...op }, (u, v, o, b) => {
      const raya = n2(u * 4, v * 512) * 0.7 + n1(u, v) * 0.3;
      const k = 0.9 + 0.14 * raya;
      o.c[0] = b.r * k; o.c[1] = b.g * k; o.c[2] = b.b * k; o.h = raya * 0.3; o.r = (op.rugosidad ?? 0.32) + 0.16 * (raya - 0.5);
    });
  },
  // asfalto (mojado con charcos si mojado > 0): charcos = oscuros y espejo; devuelve también .charcos (máscara)
  asfalto(op = {}) {
    const grano = ruidoValor(op.semilla ?? 61, 256), n1 = fbm((op.semilla ?? 61) + 1, 3, 4), n2 = fbm((op.semilla ?? 61) + 2, 12, 2);
    const moj = op.mojado ?? 0.5;
    const mask = lienzoDe(op.tam ?? 512, op.tam ?? 512), dm = mask.getContext('2d').createImageData(mask.width, mask.height);
    let idx = 0;
    const res = texturaProcedural({ color: '#2b2d33', relieve: 3, ...op }, (u, v, o, b) => {
      const gr = grano(u * 256, v * 256), ch = n1(u, v);
      const charco = limitar((ch - (0.62 - moj * 0.28)) / 0.06);
      const k = (0.75 + 0.5 * gr * gr + 0.15 * n2(u, v)) * (1 - 0.35 * charco);
      o.c[0] = b.r * k; o.c[1] = b.g * k; o.c[2] = b.b * k;
      o.h = gr * (1 - charco) * 0.8; o.r = (0.82 - 0.25 * moj) * (1 - charco) + 0.04 * charco;
      const a = 255 * (1 - charco * 0.9);
      dm.data[idx++] = a; dm.data[idx++] = a; dm.data[idx++] = a; dm.data[idx++] = 255;
    });
    mask.getContext('2d').putImageData(dm, 0, 0);
    res.charcos = texDeLienzo(mask, false, op.repetir);
    return res;
  },
  // condensación: miles de gotitas (relieve + brillo). Úsalo en latas, botellas y vasos fríos:
  // material.normalMap = c.normalMap; material.roughnessMap = c.roughnessMap (repetir según el tamaño del objeto)
  condensacion(op = {}) {
    const n = op.tam ?? 1024, rnd = azar(op.semilla ?? 81);
    const c = lienzoDe(n, n), gg = c.getContext('2d');
    gg.fillStyle = '#000'; gg.fillRect(0, 0, n, n);
    gg.globalCompositeOperation = 'lighter';
    const gota = (x, y, r, k) => {
      for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) {     // sin costuras
        if (x + dx < -r || x + dx > n + r || y + dy < -r || y + dy > n + r) continue;
        const gr = gg.createRadialGradient(x + dx - r * 0.25, y + dy - r * 0.25, 0, x + dx, y + dy, r);
        gr.addColorStop(0, `rgba(255,255,255,${k})`); gr.addColorStop(0.7, `rgba(255,255,255,${k * 0.55})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        gg.fillStyle = gr; gg.beginPath(); gg.ellipse(x + dx, y + dy, r, r * (1 + rnd() * 0.25), 0, 0, Math.PI * 2); gg.fill();
      }
    };
    const total = op.cantidad ?? 5200;
    for (let i = 0; i < total; i++) { const s = rnd(); gota(rnd() * n, rnd() * n, 1.2 + Math.pow(s, 3) * (op.grande ?? 9) * n / 1024, 0.5 + 0.5 * rnd()); }
    gg.globalCompositeOperation = 'source-over';
    const d = gg.getImageData(0, 0, n, n).data;
    const cN = lienzoDe(n, n), cR = lienzoDe(n, n);
    const dN = cN.getContext('2d').createImageData(n, n), dR = cR.getContext('2d').createImageData(n, n);
    const h = (x, y) => d[((((y + n) % n) * n) + ((x + n) % n)) * 4] / 255;
    const f = op.relieve ?? 3;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4, dx = (h(x + 1, y) - h(x - 1, y)) * f, dy = (h(x, y + 1) - h(x, y - 1)) * f, l = Math.hypot(dx, dy, 1);
      dN.data[i] = (-dx / l * 0.5 + 0.5) * 255; dN.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; dN.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; dN.data[i + 3] = 255;
      const enGota = Math.min(1, h(x, y) * 3);
      const r = ((op.empanado ?? 0.42) * (1 - enGota) + 0.04 * enGota) * 255;
      dR.data[i] = r; dR.data[i + 1] = r; dR.data[i + 2] = r; dR.data[i + 3] = 255;
    }
    cN.getContext('2d').putImageData(dN, 0, 0); cR.getContext('2d').putImageData(dR, 0, 0);
    return { normalMap: texDeLienzo(cN, false, op.repetir), roughnessMap: texDeLienzo(cR, false, op.repetir) };
  },
  // ruido genérico (yeso, piedra, plástico gastado)
  ruido(op = {}) {
    const n1 = fbm(op.semilla ?? 71, op.escala ?? 8, 4);
    return texturaProcedural({ color: '#bbbbbb', relieve: 1.5, ...op }, (u, v, o, b) => {
      const k = 1 - (op.fuerza ?? 0.15) + 2 * (op.fuerza ?? 0.15) * n1(u, v);
      o.c[0] = b.r * k; o.c[1] = b.g * k; o.c[2] = b.b * k; o.h = n1(u, v); o.r = op.rugosidad ?? 0.7;
    });
  },
};
// superficie('carton'|'madera'|'papel'|'tela'|'cepillado'|'asfalto'|'ruido', {color, repetir:[x,y], ...}) → material listo
function superficie(tipo, op = {}) {
  const t = texturas[tipo](op);
  const extra = op.material || {};
  const metal = tipo === 'cepillado';
  const m = new (metal ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({
    map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: metal ? 1 : 0,
    normalScale: new THREE.Vector2(op.relieveMat ?? 1, op.relieveMat ?? 1), ...(metal ? { anisotropy: 0.6 } : {}), ...extra,
  });
  m.userData.texturas = t;
  return m;
}

// revelar(material, {eje:'u'|'v', color, fuerza, ancho, invertir}) → el material aparece barrido por una
// línea de luz (impresión, escaneo, «se dibuja»). El material necesita un map. Devuelve .p(0→1).
function revelar(m, op = {}) {
  const U = { uRev: { value: 0 }, uBordeColor: { value: hdr(op.color || '#ffd59a', 1) }, uBorde: { value: op.fuerza ?? 6 }, uAncho: { value: op.ancho ?? 0.012 } };
  const eje = (op.eje || 'u') === 'u' ? 'x' : 'y';
  const coord = op.invertir ? `(1.0 - vMapUv.${eje})` : `vMapUv.${eje}`;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform float uRev; uniform vec3 uBordeColor; uniform float uBorde; uniform float uAncho;\n' + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n if (${coord} > uRev + 0.0001) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n totalEmissiveRadiance += uBordeColor * uBorde * smoothstep(uRev - uAncho, uRev, ${coord}) * step(uRev, 0.9999);`);
  };
  m.customProgramCacheKey = () => 'revelar-' + eje + (op.invertir ? 'i' : '');
  m.needsUpdate = true;
  return { p(x) { U.uRev.value = limitar(x, 0, 1.001); }, uniforms: U };
}

// brilloBorde(material, {color, fuerza, potencia}) → los bordes del objeto brillan (fresnel). Hace que el agua,
// las burbujas y el vidrio se lean sobre fondos oscuros, como en los anuncios. Devuelve los uniforms.
function brilloBorde(m, op = {}) {
  const U = { uBordeC: { value: hdr(op.color || '#ffffff', op.fuerza ?? 1.5) }, uBordeP: { value: op.potencia ?? 3 } };
  const previo = m.onBeforeCompile;
  const clavePrevia = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  m.onBeforeCompile = (sh, r) => {
    if (previo) previo(sh, r);
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform vec3 uBordeC; uniform float uBordeP;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n { float frs = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), uBordeP); totalEmissiveRadiance += uBordeC * frs; }');
  };
  m.customProgramCacheKey = () => clavePrevia + '|borde';
  m.needsUpdate = true;
  return U;
}

// pegatina(dibujar(g, w, h), {ancho, alto, px, borde, curva}) → plano troquelado con borde blanco y brillo
function pegatina(dibujar, op = {}) {
  const px = op.px ?? 512, w = op.ancho ?? 1, h = op.alto ?? 1;
  const cw = Math.round(px * Math.max(1, w / h)), ch = Math.round(px * Math.max(1, h / w));
  const arte = lienzoDe(cw, ch); dibujar(arte.getContext('2d'), cw, ch);
  const tx = textura2d(cw, ch, (gg) => {
    const b = (op.borde ?? 0.05) * Math.min(cw, ch);
    if (b > 0) {   // borde troquelado: el dibujo dilatado en blanco
      const sil = lienzoDe(cw, ch), gs = sil.getContext('2d');
      gs.drawImage(arte, 0, 0); gs.globalCompositeOperation = 'source-in'; gs.fillStyle = op.colorBorde || '#ffffff'; gs.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; gg.drawImage(sil, Math.cos(a) * b, Math.sin(a) * b); }
    }
    gg.drawImage(arte, 0, 0);
  });
  const geo = new THREE.PlaneGeometry(w, h, op.curva ? 32 : 1, 1);
  if (op.curva) {     // se dobla sobre un cilindro de ese radio (pegatina en una lata, en un tubo)
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), a = x / op.curva; p.setX(i, Math.sin(a) * op.curva); p.setZ(i, Math.cos(a) * op.curva - op.curva); }
    geo.computeVertexNormals();
  }
  const m = new THREE.MeshPhysicalMaterial({ map: tx, transparent: true, alphaTest: 0.4, roughness: op.rugosidad ?? 0.35, clearcoat: op.brillo ?? 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const o = new THREE.Mesh(geo, m);
  o.receiveShadow = true; o.castShadow = false;
  return o;
}
// etiquetaCilindro(textura, {radio, alto, arco, desde, y}) → trozo de cilindro con la textura (etiquetas de latas, botes)
function etiquetaCilindro(tx, op = {}) {
  const arco = op.arco ?? Math.PI * 2;
  // centro de la textura (u = 0,5) mirando a +z (de frente a la cámara por defecto)
  const geo = new THREE.CylinderGeometry(op.radio ?? 0.5, op.radio ?? 0.5, op.alto ?? 1, 128, 1, true, op.desde ?? -arco / 2, arco);
  const m = new THREE.MeshPhysicalMaterial({ map: tx, transparent: !!op.transparente, alphaTest: op.transparente ? 0.3 : 0, roughness: op.rugosidad ?? 0.3, clearcoat: op.brillo ?? 0.8, clearcoatRoughness: 0.12, metalness: op.metal ?? 0, side: THREE.FrontSide, ...(op.material || {}) });
  const o = new THREE.Mesh(geo, m);
  o.position.y = op.y ?? 0;
  o.receiveShadow = true; o.castShadow = true;
  return o;
}

// ---------------------------------------------------------------------------
//  Texto 3D (Archivo Black, con tildes y eñes) y neón de verdad
// ---------------------------------------------------------------------------
function texto3d(texto, op = {}) {
  const geo = new TextGeometry(texto, {
    font: fuente3d, size: op.tam ?? 1, depth: op.fondo ?? 0.35, curveSegments: op.curvas ?? 8,
    bevelEnabled: (op.bisel ?? 0.03) > 0, bevelThickness: op.bisel ?? 0.03, bevelSize: (op.bisel ?? 0.03) * 0.8, bevelSegments: 3,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (op.centrar !== false) geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -(bb.max.z + bb.min.z) / 2);
  return malla(geo, op.mat || mat.plastico('#ffffff'));
}

function letras3d(texto, op = {}) {
  const tam = op.tam ?? 1, gq = new THREE.Group();
  const escala = tam / fuente3d.data.resolution;
  let x = 0;
  const letras = [];
  [...texto].forEach((ch, i) => {
    const glifo = fuente3d.data.glyphs[ch] || fuente3d.data.glyphs['?'];
    const avance = (glifo ? glifo.ha : fuente3d.data.resolution * 0.5) * escala + (op.espacio ?? 0.04) * tam;
    if (ch.trim()) {
      const m = Array.isArray(op.mats) ? op.mats[i % op.mats.length] : (op.mat || mat.plastico('#ffffff'));
      const l = texto3d(ch, { ...op, mat: m, centrar: false });
      l.geometry.computeBoundingBox();
      const bb = l.geometry.boundingBox;
      const cx = (bb.max.x + bb.min.x) / 2, cy = (bb.max.y + bb.min.y) / 2;
      l.geometry.translate(-cx, -cy, -(op.fondo ?? 0.35) / 2);
      l.position.set(x + cx, cy, 0);
      l.userData.letra = ch;
      letras.push(l);
      gq.add(l);
    }
    x += avance;
  });
  const ancho = x - (op.espacio ?? 0.04) * tam;
  letras.forEach(l => { l.position.x -= ancho / 2; l.position.y -= tam * 0.36; base(l); });
  gq.userData.letras = letras;
  gq.userData.ancho = ancho;
  return gq;
}

// neon(puntos, {color, grosor, intensidad, cerrado}) → tubo de neón (brilla con el bloom)
function neon(puntos, op = {}) {
  const c = op.color || '#ff2f72';
  const o = tubo(puntos, op.grosor ?? 0.025, mat.luz(mezclaBlanco(c, 0.35), op.intensidad ?? 6), op.seg ?? Math.max(32, puntos.length * 8), !!op.cerrado);
  o.castShadow = false; o.receiveShadow = false;
  o.userData.neon = true;
  return o;
}
function mezclaBlanco(c, k) { return color(c).clone().lerp(new THREE.Color('#ffffff'), k); }
// neonTexto('CINE', {tam, color, grosor, intensidad, soporte}) → letras hechas con tubo de neón (contorno de la letra)
function neonTexto(texto, op = {}) {
  const tam = op.tam ?? 1, gq = new THREE.Group();
  const formas = fuente3d.generateShapes(texto, tam);
  const m = mat.luz(mezclaBlanco(op.color || '#ff2f72', 0.3), op.intensidad ?? 6);
  const grosor = op.grosor ?? tam * 0.035;
  const caja_ = new THREE.Box2();
  formas.forEach(f => f.getPoints(4).forEach(p => caja_.expandByPoint(p)));
  const cx = (caja_.max.x + caja_.min.x) / 2, cy = (caja_.max.y + caja_.min.y) / 2;
  const contorno = pts => {
    if (pts.length < 3) return;
    const v = pts.map(p => new THREE.Vector3(p.x - cx, p.y - cy, 0));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v, true, 'catmullrom', 0.1), Math.max(24, v.length * 3), grosor, 8, true);
    const o = new THREE.Mesh(geo, m); o.userData.neon = true;
    gq.add(o);
  };
  formas.forEach(f => {
    contorno(f.getPoints(op.detalle ?? 6));
    f.holes.forEach(h => contorno(h.getPoints(op.detalle ?? 6)));
  });
  gq.userData.material = m;
  gq.userData.ancho = caja_.max.x - caja_.min.x;
  return gq;
}

// ---------------------------------------------------------------------------
//  Partículas deterministas: vapor, motas (bokeh), chispas, burbujas, gotas, confeti
// ---------------------------------------------------------------------------
let texturaHumo = null;
function spriteSuave() {
  if (texturaHumo) return texturaHumo;
  texturaHumo = textura2d(128, 128, (gg, w) => {
    const r = gg.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = r; gg.fillRect(0, 0, w, w);
  });
  return texturaHumo;
}
function vapor(op = {}) {
  const n = op.cantidad ?? 40, rnd = azar(op.semilla ?? 7);
  const origen = vec(op.origen || [0, 0, 0]);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
  const fases = Array.from({ length: n }, () => ({ f: rnd(), a: rnd() * Math.PI * 2, r: rnd(), v: 0.7 + rnd() * 0.6 }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const m = new THREE.PointsMaterial({ size: op.tam ?? 0.35, map: spriteSuave(), transparent: true, depthWrite: false, vertexColors: true, sizeAttenuation: true });
  const pts = new THREE.Points(geo, m);
  const c = color(op.color || '#ffffff');
  const alto = op.altura ?? 1.4, ancho = op.ancho ?? 0.25, vel = op.velocidad ?? 0.5, opac = op.opacidad ?? 0.55;
  pts.frustumCulled = false;
  pts.pintar = (t, fuerza = 1) => {
    fases.forEach((q, i) => {
      const u = ((t * vel * q.v + q.f) % 1 + 1) % 1;
      const abre = ancho * (0.3 + u);
      pos[i * 3] = origen.x + Math.sin(q.a + t * 1.3 * q.v + u * 3) * abre * (0.5 + q.r);
      pos[i * 3 + 1] = origen.y + u * alto;
      pos[i * 3 + 2] = origen.z + Math.cos(q.a + t * 1.1) * abre * 0.6 * q.r;
      col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b; col[i * 4 + 3] = Math.sin(Math.PI * u) * opac * fuerza;
    });
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  return pts;
}

// particulas({tipo, cantidad, centro, zona:[ancho, alto, fondo], color(es), tam, velocidad, semilla, intensidad})
//   tipo: 'motas' (puntos de luz que flotan: con desenfoque → bokeh), 'chispas', 'burbujas', 'gotas', 'confeti'
//   → objeto con .pintar(t, fuerza) (llámalo en pintar)
function particulas(op = {}) {
  const tipo = op.tipo || 'motas', n = op.cantidad ?? 60, rnd = azar(op.semilla ?? 9);
  const c0 = vec(op.centro || [0, 1, 0]), [zx, zy, zz] = op.zona || [6, 3, 4];
  const cols = (Array.isArray(op.colores) ? op.colores : [op.color || (tipo === 'chispas' ? '#ffb347' : '#ffffff')]).map(color);
  const tam = op.tam ?? ({ motas: 0.03, chispas: 0.012, burbujas: 0.05, gotas: 0.03, confeti: 0.06 }[tipo]);
  let geo, m;
  if (tipo === 'motas') { geo = new THREE.IcosahedronGeometry(1, 2); m = new THREE.MeshBasicMaterial({ color: '#ffffff' }); }
  else if (tipo === 'chispas') { geo = new THREE.BoxGeometry(1, 1, 1); m = new THREE.MeshBasicMaterial({ color: '#ffffff' }); }
  else if (tipo === 'burbujas') { geo = new THREE.SphereGeometry(1, 24, 16); m = mat.agua('#ffffff', { thickness: 0.0, ior: 1.0, iridescence: 0.9, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 520], envMapIntensity: 3 }); }
  else if (tipo === 'gotas') { geo = new THREE.SphereGeometry(1, 16, 12); m = mat.agua('#ffffff', { thickness: 0.1 }); }
  else { geo = new THREE.PlaneGeometry(1, 0.6); m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, color: '#ffffff' }); }
  if (tipo === 'burbujas' || tipo === 'gotas') brilloBorde(m, { color: op.colorBorde || '#dff6ff', fuerza: op.borde ?? 1.4, potencia: 2.6 });
  const im = new THREE.InstancedMesh(geo, m, n);
  im.frustumCulled = false;
  im.castShadow = tipo === 'confeti'; im.receiveShadow = false;
  const datos = Array.from({ length: n }, (_, i) => ({
    x: (rnd() - 0.5) * zx, y: (rnd() - 0.5) * zy, z: (rnd() - 0.5) * zz, f: rnd(), v: 0.6 + rnd() * 0.8, s: 0.5 + rnd(), a: rnd() * 6.283, b: rnd() * 6.283, c: cols[i % cols.length],
  }));
  const intens = op.intensidad ?? (tipo === 'motas' ? 3 : tipo === 'chispas' ? 8 : 1);
  datos.forEach((d, i) => im.setColorAt(i, tipo === 'motas' || tipo === 'chispas' ? d.c.clone().multiplyScalar(intens) : d.c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), dir = new THREE.Vector3(), y1 = new THREE.Vector3(0, 1, 0);
  const vel = op.velocidad ?? 1;
  im.pintar = (t, fuerza = 1) => {
    datos.forEach((d, i) => {
      let sc = tam * d.s * fuerza;
      if (tipo === 'motas') {
        p.set(c0.x + d.x + 0.25 * Math.sin(t * 0.3 * vel + d.a), c0.y + d.y + 0.2 * Math.sin(t * 0.23 * vel + d.b), c0.z + d.z + 0.2 * Math.cos(t * 0.27 * vel + d.a));
        sc *= 0.7 + 0.3 * Math.sin(t * 1.7 + d.b);
        q.identity(); s.set(sc, sc, sc);
      } else if (tipo === 'chispas') {
        const per = 0.9 / vel, u = (((t / per) + d.f) % 1 + 1) % 1, age = u * per;
        dir.set(Math.cos(d.a) * 1.6, 2.2 + d.v * 1.5, Math.sin(d.a) * 1.6).multiplyScalar(vel);
        p.set(c0.x + dir.x * age, c0.y + dir.y * age - 4.9 * age * age, c0.z + dir.z * age);
        const vy = dir.y - 9.8 * age;
        dir.set(dir.x, vy, dir.z).normalize();
        q.setFromUnitVectors(y1, dir);
        sc *= (1 - u);
        s.set(sc, sc * 9 * (1 - u * 0.5), sc);
      } else if (tipo === 'burbujas') {
        const u = (((t * 0.22 * vel * d.v) + d.f) % 1 + 1) % 1;
        p.set(c0.x + d.x + 0.05 * Math.sin(t * 3 + d.a), c0.y - zy / 2 + u * zy, c0.z + d.z + 0.04 * Math.cos(t * 2.4 + d.b));
        sc *= Math.sin(Math.PI * Math.min(1, u * 1.15));
        q.identity(); s.set(sc, sc, sc);
      } else if (tipo === 'gotas') {
        const u = (((t * 0.5 * vel * d.v) + d.f) % 1 + 1) % 1;
        p.set(c0.x + d.x, c0.y + zy / 2 - u * u * zy, c0.z + d.z);
        q.identity(); s.set(sc, sc * (1.2 + u * 1.5), sc);
      } else {
        const u = (((t * 0.18 * vel * d.v) + d.f) % 1 + 1) % 1;
        p.set(c0.x + d.x + 0.3 * Math.sin(t * 1.3 + d.a), c0.y + zy / 2 - u * zy, c0.z + d.z + 0.3 * Math.cos(t * 1.1 + d.b));
        e.set(t * 3 * d.v + d.a, t * 2.2 + d.b, t * 1.7 * d.v); q.setFromEuler(e);
        s.set(sc, sc, sc);
      }
      if (sc <= 1e-5) s.set(1e-5, 1e-5, 1e-5);
      m4.compose(p, q, s); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  return im;
}

// ---------------------------------------------------------------------------
//  Luces, suelo, fondo y entorno
// ---------------------------------------------------------------------------
function luzConSombra(intensidad, colorLuz, dir, area, mapa) {
  const l = new THREE.DirectionalLight(color(colorLuz), intensidad);
  l.position.copy(vec(dir));
  l.castShadow = true;
  l.shadow.mapSize.set(Q && Q.gpu ? Math.max(mapa, 2048) : mapa, Q && Q.gpu ? Math.max(mapa, 2048) : mapa);
  const s = l.shadow.camera;
  s.left = -area; s.right = area; s.top = area; s.bottom = -area; s.near = 0.1; s.far = 120;
  l.shadow.bias = -0.0004; l.shadow.normalBias = 0.025;
  l.shadow.radius = 4; l.shadow.blurSamples = 16;
  escena.add(l); escena.add(l.target);
  return l;
}
let rectIniciado = false;
function luzArea(colorLuz, intensidad, ancho, alto, pos, mira = [0, 1, 0]) {
  if (!rectIniciado) { RectAreaLightUniformsLib.init(); rectIniciado = true; }
  const l = new THREE.RectAreaLight(color(colorLuz), intensidad, ancho, alto);
  l.position.copy(vec(pos)); l.lookAt(vec(mira));
  escena.add(l);
  return l;
}
const luces = {
  estudio(op = {}) {
    const i = op.intensidad ?? 1;
    const hemi = new THREE.HemisphereLight(color(op.cielo || '#ffffff'), color(op.tierra || '#b9b3a8'), (op.ambiente ?? 0.9) * i);
    escena.add(hemi);
    const clave = luzConSombra(2.6 * i, op.color || '#fff6ea', op.direccion || [5, 9, 6], op.area ?? 6, op.mapa ?? 2048);
    const relleno = new THREE.DirectionalLight(color(op.colorRelleno || '#dfe9ff'), (op.relleno ?? 0.7) * i);
    relleno.position.set(-7, 4, 3); escena.add(relleno);
    const contra = new THREE.DirectionalLight(color(op.colorContra || '#ffffff'), (op.contra ?? 1.1) * i);
    contra.position.set(-2, 6, -9); escena.add(contra);
    return { hemi, clave, relleno, contra };
  },
  exterior(op = {}) {
    const i = op.intensidad ?? 1;
    const hemi = new THREE.HemisphereLight(color(op.cielo || '#cfe6ff'), color(op.tierra || '#8a7a5c'), (op.ambiente ?? 1.1) * i);
    escena.add(hemi);
    const sol = luzConSombra(3.0 * i, op.color || '#ffe7c4', op.direccion || [12, 18, 8], op.area ?? 14, op.mapa ?? 2048);
    return { hemi, sol };
  },
  // producto: caja de luz grande (suave) + dos recortes de color detrás + sombra suave al suelo.
  // Pensada para un protagonista en el origen de 1-3 m de alto.
  producto(op = {}) {
    const i = op.intensidad ?? 1, c = vec(op.centro || [0, 1, 0]);
    const hemi = new THREE.HemisphereLight(color(op.cielo || '#ffffff'), color(op.tierra || '#202020'), (op.ambiente ?? 0.25) * i);
    escena.add(hemi);
    const dir = op.direccion || [-3, 6, 4];
    const clave = luzArea(op.color || '#fff4e8', (op.fuerzaClave ?? 6) * i, op.anchoClave ?? 3, op.altoClave ?? 3, [c.x + dir[0], c.y + dir[1] * 0.6, c.z + dir[2]], c);
    const sombra = luzConSombra((op.fuerzaSombra ?? 1.2) * i, op.color || '#fff4e8', [dir[0] * 2, dir[1] * 2.2, dir[2] * 2], op.area ?? 4, op.mapa ?? 2048);
    sombra.target.position.copy(c);
    const [ci, cd] = op.recortes || ['#ff8a5c', '#5cc8ff'];
    const rIzq = luzArea(ci, (op.fuerzaRecorte ?? 14) * i, 0.6, 4, [c.x - 3.2, c.y + 0.6, c.z - 2.6], c);
    const rDer = luzArea(cd, (op.fuerzaRecorte ?? 14) * i, 0.6, 4, [c.x + 3.2, c.y + 0.6, c.z - 2.6], c);
    const tope = luzArea(op.colorTope || '#ffffff', (op.fuerzaTope ?? 3) * i, 2.5, 2.5, [c.x, c.y + 4, c.z + 0.5], c);
    return { hemi, clave, sombra, rIzq, rDer, tope };
  },
  // noche: luna fría con sombra + cielo azul muy tenue (las luces de verdad las pones tú: practica(), neon())
  noche(op = {}) {
    const i = op.intensidad ?? 1;
    const hemi = new THREE.HemisphereLight(color(op.cielo || '#3a4a8c'), color(op.tierra || '#120e18'), (op.ambiente ?? 0.6) * i);
    escena.add(hemi);
    const luna = luzConSombra((op.luna ?? 0.6) * i, op.colorLuna || '#9fb4ff', op.direccion || [-6, 12, -8], op.area ?? 12, op.mapa ?? 2048);
    return { hemi, luna };
  },
};
// practica(pos, {color, intensidad, distancia, bombilla, radio, sombra}) → luz real de la escena (bombilla, farola, lámpara)
function practica(pos, op = {}) {
  const c = op.color || '#ffc27a';
  const l = new THREE.PointLight(color(c), op.intensidad ?? 3, op.distancia ?? 4, op.caida ?? 2);
  l.position.copy(vec(pos));
  if (op.sombra) { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.radius = 3; l.shadow.bias = -0.002; }
  escena.add(l);
  let b = null;
  if (op.bombilla !== false) {
    b = esfera(op.radio ?? 0.04, mat.luz(mezclaBlanco(c, 0.4), op.brillo ?? 8), 16);
    b.castShadow = false; b.receiveShadow = false;
    b.position.copy(l.position);
    escena.add(b);
  }
  return { luz: l, bombilla: b };
}

function suelo(op = {}) {
  const tam = op.tam ?? 200;
  const m = op.tipo === 'sombra'
    ? new THREE.ShadowMaterial({ opacity: op.opacidad ?? 0.25, color: color(op.colorSombra || '#000000') })
    : op.material || (op.mate === false
      ? new THREE.MeshStandardMaterial({ color: color(op.color || '#eeeeee'), roughness: op.rugosidad ?? 0.95, metalness: 0 })
      : new THREE.MeshLambertMaterial({ color: color(op.color || '#eeeeee') }));
  const s = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), m);
  s.rotation.x = -Math.PI / 2; s.position.y = op.y ?? 0;
  s.receiveShadow = true;
  escena.add(s);
  return s;
}
// sueloEspejo({color, reflejo, tam, y, resolucion, mascara}) → suelo brillante que refleja la escena
// (estudio de producto sobre negro, asfalto mojado con charcos: mascara = textura con los charcos)
function sueloEspejo(op = {}) {
  const tam = op.tam ?? 60, y = op.y ?? 0;
  const res = Q.gpu ? (op.resolucion ?? Q.reflejo) : Q.reflejo;
  const ref = new Reflector(new THREE.PlaneGeometry(tam, tam), { clipBias: 0.003, textureWidth: Math.round(W * res), textureHeight: Math.round(H * res), color: 0x7f7f7f, multisample: Q.gpu ? 4 : 0 });
  ref.rotation.x = -Math.PI / 2; ref.position.y = y; ref.userData.sinAO = true;   // la capa de encima ya cuenta para el AO
  escena.add(ref);
  const capaM = op.material || new THREE.MeshStandardMaterial({ color: color(op.color || '#101012'), roughness: op.rugosidad ?? 0.35, metalness: 0, transparent: true, opacity: 1 - (op.reflejo ?? 0.35), ...(op.mascara ? { alphaMap: op.mascara } : {}) });
  if (op.mascara && !op.material) capaM.opacity = 1;
  const capa = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), capaM);
  capa.rotation.x = -Math.PI / 2; capa.position.y = y + 0.002; capa.receiveShadow = true; capa.userData.conAO = true;
  escena.add(capa);
  return { reflector: ref, capa };
}
// sombraContacto(objeto | [x,y,z], {radio, opacidad, y, alto}) → sombra suave y oscura justo donde el objeto toca el suelo.
// Si le das un objeto, lo sigue sola y se aclara cuando el objeto sube.
let texContacto = null;
function sombraContacto(obj, op = {}) {
  texContacto = texContacto || textura2d(256, 256, (gg, w) => {
    const r = gg.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.35, 'rgba(0,0,0,0.6)'); r.addColorStop(0.7, 'rgba(0,0,0,0.15)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = r; gg.fillRect(0, 0, w, w);
  });
  const m = new THREE.MeshBasicMaterial({ map: texContacto, transparent: true, depthWrite: false, opacity: op.opacidad ?? 0.65, color: color(op.color || '#000000'), polygonOffset: true, polygonOffsetFactor: -4 });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  s.rotation.x = -Math.PI / 2; s.renderOrder = 1;
  const y0 = op.y ?? 0.003, r = op.radio ?? 0.8;
  s.position.set(0, y0, 0); s.scale.set(r * 2, r * 2 * (op.alargar ?? 1), 1);
  escena.add(s);
  if (obj && obj.isObject3D) contactos.push({ s, obj, y0, r, alto: op.alto ?? 1.5, op: op.opacidad ?? 0.65, base: op.base ?? 0 });
  else if (obj) s.position.set(obj[0], y0, obj[2]);
  return s;
}
function actualizarContactos() {
  const p = new THREE.Vector3();
  contactos.forEach(c => {
    c.obj.getWorldPosition(p);
    const h = Math.max(0, p.y - c.base - c.y0);
    const k = limitar(h / c.alto);
    c.s.visible = c.obj.visible;
    c.s.position.set(p.x, c.y0, p.z);
    const esc = c.r * 2 * (1 + k * 0.8);
    c.s.scale.set(esc, esc, 1);
    c.s.material.opacity = c.op * (1 - k) * (1 - k);
  });
}

function fondo(c) {
  if (c && !Array.isArray(c) && typeof c === 'object' && !c.isColor) {
    // {tipo: 'radial', centro, borde, x, y} → degradado radial (foco de luz en el fondo)
    escena.background = textura2d(512, 512, (gg, w, h) => {
      const r = gg.createRadialGradient(w * (c.x ?? 0.5), h * (c.y ?? 0.45), 0, w * (c.x ?? 0.5), h * (c.y ?? 0.45), w * (c.radio ?? 0.75));
      r.addColorStop(0, c.centro); if (c.medio) r.addColorStop(0.45, c.medio); r.addColorStop(1, c.borde);
      gg.fillStyle = r; gg.fillRect(0, 0, w, h);
    });
  } else if (Array.isArray(c)) {
    escena.background = textura2d(16, 512, (gg, w, h) => {
      const gr = gg.createLinearGradient(0, 0, 0, h);
      c.forEach((cc, i) => gr.addColorStop(i / (c.length - 1), cc));
      gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
    });
  } else {
    escena.background = color(c);
  }
}
function niebla(c, cerca = 20, lejos = 80) { escena.fog = new THREE.Fog(color(c), cerca, lejos); }

let pmrem = null, texturaEntorno = null;
function entorno(intensidad = 0.6) {
  if (!intensidad) { escena.environment = null; return; }
  if (!texturaEntorno) {
    pmrem = pmrem || new THREE.PMREMGenerator(renderer);
    texturaEntorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  }
  escena.environment = texturaEntorno;
  escena.environmentIntensity = intensidad;
}
// entornoEstudio({fondo, suelo, paneles:[{pos, tam:[w,h], color, fuerza}], intensidad})
// → reflejos de plató: cajas de luz y tiras que se ven reflejadas en metal, vidrio y plástico brillante.
function entornoEstudio(op = {}) {
  pmrem = pmrem || new THREE.PMREMGenerator(renderer);
  const e = new THREE.Scene();
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { arriba: { value: color(op.fondo || '#1a1c22') }, abajo: { value: color(op.suelo || '#060608') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 arriba; uniform vec3 abajo; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(abajo, arriba, smoothstep(-0.25, 0.6, vP.y)), 1.); }',
  }));
  e.add(cielo);
  const paneles = op.paneles || [
    { pos: [0, 8, 2], tam: [8, 6], color: '#ffffff', fuerza: 3.2 },          // caja de luz cenital
    { pos: [-7, 2.5, 3], tam: [1.4, 9], color: '#fff3e6', fuerza: 5 },      // tira izquierda
    { pos: [7, 2.5, 1], tam: [1.4, 9], color: '#eaf4ff', fuerza: 5 },       // tira derecha
    { pos: [0, 2, -9], tam: [10, 3], color: '#ffffff', fuerza: 1.2 },       // fondo
    { pos: [4, 1, 7], tam: [3, 3], color: '#ffffff', fuerza: 1.5 },         // relleno frontal
  ];
  paneles.forEach(p => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.tam[0], p.tam[1]), new THREE.MeshBasicMaterial({ color: hdr(p.color || '#ffffff', p.fuerza ?? 3), side: THREE.DoubleSide }));
    m.position.copy(vec(p.pos)); m.lookAt(0, 1, 0);
    e.add(m);
  });
  const tx = pmrem.fromScene(e, op.suavidad ?? 0.02).texture;
  escena.environment = tx;
  escena.environmentIntensity = op.intensidad ?? 1;
  return tx;
}

// ---------------------------------------------------------------------------
//  POSTPROCESO (GPU)
// ---------------------------------------------------------------------------
const POST_BASE = {
  exposicion: 1, tonemap: 'aces',
  bloom: { fuerza: 0.35, radio: 0.55, umbral: 1.0 },
  ao: { fuerza: 1, radio: 0.35, grosor: 1.0 },
  dof: { apertura: 0.25, foco: null, max: 18 },
  maqueta: { fuerza: 0, foco: 0.5, ancho: 0.18 },
  movimiento: { muestras: 8, obturador: 0.5 },
  grano: 0.035, vineta: 0.28, aberracion: 0.8,
  grado: { contraste: 1.04, saturacion: 1.04, temperatura: 0, sombras: null, luces: null, mezcla: 0.12 },
};
function fusionar(a, b) {
  const r = Array.isArray(a) ? [...a] : { ...a };
  for (const k in (b || {})) {
    const v = b[k];
    r[k] = (v && typeof v === 'object' && !Array.isArray(v) && !v.isObject3D && !v.isVector3 && !v.isColor && a && typeof a[k] === 'object' && a[k] !== null) ? fusionar(a[k], v) : v;
  }
  return r;
}

let rt = {}, gtao = null, bloom = null, cuadAcum = null, cuadDof = null, cuadFinal = null, cuadCopia = null;
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

function prepararPost() {
  const opRT = { type: THREE.HalfFloatType, depthBuffer: false };
  const Wr = Math.round(W * Q.escala), Hr = Math.round(H * Q.escala);
  rt.escena = new THREE.WebGLRenderTarget(Wr, Hr, { type: THREE.HalfFloatType, samples: Q.msaa, depthTexture: new THREE.DepthTexture(Wr, Hr, THREE.UnsignedIntType) });
  rt.acum = new THREE.WebGLRenderTarget(Wr, Hr, opRT);
  rt.a = new THREE.WebGLRenderTarget(Wr, Hr, opRT);
  rt.b = new THREE.WebGLRenderTarget(Wr, Hr, opRT);

  cuadCopia = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: null }, peso: { value: 1 } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t; uniform float peso; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * peso, 1.); }',
  }));
  cuadAcum = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: null }, peso: { value: 1 } }, vertexShader: VS, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    fragmentShader: 'uniform sampler2D t; uniform float peso; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * peso, 1.); }',
  }));

  // Profundidad de campo con bokeh: «una sola pasada» por espiral de ángulo áureo
  // (técnica pública de Dennis Gustafsson, 2018), con efecto maqueta añadido.
  cuadDof = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2(Wr, Hr) },
      cerca: { value: 0.05 }, lejos: { value: 600 }, foco: { value: 5 }, apertura: { value: 0.25 },
      maxBlur: { value: 18 }, paso: { value: 0.5 }, escala: { value: Hr / 1080 },
      mqFuerza: { value: 0 }, mqFoco: { value: 0.5 }, mqAncho: { value: 0.18 },
    },
    vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `
      #include <packing>
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res;
      uniform float cerca, lejos, foco, apertura, maxBlur, paso, escala, mqFuerza, mqFoco, mqAncho;
      varying vec2 vUv;
      const float GA = 2.39996323;
      float prof(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cerca, lejos); }
      float coc(float z, vec2 uv) {
        float c = apertura * 42.0 * escala * abs(1.0 - foco / max(z, 0.001));
        float m = mqFuerza * maxBlur * escala * smoothstep(mqAncho, mqAncho + 0.32, abs(uv.y - mqFoco));
        return min(max(c, m), maxBlur * escala);
      }
      void main() {
        float zc = prof(vUv);
        float cc = coc(zc, vUv);
        vec3 col = texture2D(tColor, vUv).rgb;
        float tot = 1.0;
        float mb = maxBlur * escala;
        if (mb < 0.5) { gl_FragColor = vec4(col, 1.); return; }
        float r = paso;
        float ang = 0.0;
        for (int i = 0; i < 900; i++) {
          if (r >= mb) break;
          vec2 tc = vUv + vec2(cos(ang), sin(ang)) * r / res;
          vec3 sc = texture2D(tColor, tc).rgb;
          float zs = prof(tc);
          float cs = coc(zs, tc);
          if (zs > zc) cs = clamp(cs, 0.0, cc * 2.0);
          float m = smoothstep(r - 0.5, r + 0.5, cs);
          col += mix(col / tot, sc, m);
          tot += 1.0;
          r += paso / r;
          ang += GA;
        }
        gl_FragColor = vec4(col / tot, 1.);
      }`,
  }));

  // Pase final: exposición, aberración, tone mapping, gradación, viñeta y grano
  cuadFinal = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: {
      t: { value: null }, res: { value: new THREE.Vector2(W, H) }, exposicion: { value: 1 }, modo: { value: 1 },
      grano: { value: 0.035 }, semilla: { value: 0 }, vineta: { value: 0.28 }, aberracion: { value: 0.8 },
      contraste: { value: 1.04 }, saturacion: { value: 1.04 }, temperatura: { value: 0 },
      tSombras: { value: new THREE.Vector3(0, 0, 0) }, tLuces: { value: new THREE.Vector3(0, 0, 0) },
    },
    vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `
      uniform sampler2D t; uniform vec2 res; uniform float exposicion, grano, semilla, vineta, aberracion, contraste, saturacion, temperatura;
      uniform int modo; uniform vec3 tSombras, tLuces;
      varying vec2 vUv;
      // ACES (ajuste de three.js r170) · AgX (Filament / three.js r170) · Neutro (Khronos PBR Neutral)
      vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
      vec3 aces(vec3 c){
        const mat3 I = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
        const mat3 O = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));
        c = c / 0.6; c = I * c; c = RRTAndODTFit(c); c = O * c; return clamp(c, 0., 1.);
      }
      vec3 agxC(vec3 x){ vec3 x2=x*x; vec3 x4=x2*x2; return 15.5*x4*x2 - 40.14*x4*x + 31.96*x4 - 6.868*x2*x + 0.4298*x2 + 0.1191*x - 0.00232; }
      vec3 agx(vec3 c){
        const mat3 A = mat3(vec3(0.6274,0.0691,0.0164), vec3(0.3293,0.9195,0.0880), vec3(0.0433,0.0113,0.8956));
        const mat3 B = mat3(vec3(1.6605,-0.1246,-0.0182), vec3(-0.5876,1.1329,-0.1006), vec3(-0.0728,-0.0083,1.1187));
        const mat3 In = mat3(vec3(0.856627153315983,0.137318972929847,0.11189821299995), vec3(0.0951212405381588,0.761241990602591,0.0767994186031903), vec3(0.0482516061458583,0.101439036467562,0.811302368396859));
        const mat3 Out = mat3(vec3(1.1271005818144368,-0.1413297634984383,-0.14132976349843826), vec3(-0.11060664309660323,1.157823702216272,-0.11060664309660294), vec3(-0.016493938717834573,-0.016493938717834257,1.2519364065950405));
        c = A * c; c = In * c; c = max(c, 1e-10); c = log2(c); c = (c + 12.47393) / 16.500; c = clamp(c, 0., 1.);
        c = agxC(c); c = Out * c; c = pow(max(vec3(0.), c), vec3(2.2)); c = B * c; return clamp(c, 0., 1.);
      }
      vec3 neutro(vec3 c){
        const float S = 0.76; const float D = 0.15;
        float x = min(c.r, min(c.g, c.b)); float off = x < 0.08 ? x - 6.25*x*x : 0.04; c -= off;
        float pk = max(c.r, max(c.g, c.b)); if (pk < S) return c;
        float d = 1. - S; float np = 1. - d*d/(pk + d - S); c *= np/pk;
        float gg = 1. - 1./(D*(pk - np) + 1.); return mix(c, vec3(np), gg);
      }
      vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - 0.055, step(0.0031308, c)); }
      float hash(vec2 p){ p = fract(p*vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y)*p.x); }
      void main(){
        vec2 d = vUv - 0.5;
        float r2 = dot(d*vec2(res.x/res.y, 1.), d*vec2(res.x/res.y, 1.));
        vec2 off = d * aberracion * r2 * 2.2 / res * (res.y/1080.0) * 1.0;
        vec3 c;
        c.r = texture2D(t, vUv - off).r; c.g = texture2D(t, vUv).g; c.b = texture2D(t, vUv + off).b;
        c *= exposicion;
        c *= vec3(1.0 + temperatura*0.08, 1.0, 1.0 - temperatura*0.08);
        if (modo == 1) c = aces(c); else if (modo == 2) c = agx(c); else if (modo == 3) c = clamp(neutro(c), 0., 1.); else c = clamp(c, 0., 1.);
        c = aSRGB(c);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, saturacion);
        c = (c - 0.5) * contraste + 0.5;
        c += tSombras * (1.0 - smoothstep(0.0, 0.6, l)) + tLuces * smoothstep(0.4, 1.0, l);
        float v = smoothstep(0.25, 1.25, length(d * vec2(1.0, res.y/res.x) * 1.9));
        c *= 1.0 - vineta * v;
        float n = hash(gl_FragCoord.xy + semilla * 17.13) + hash(gl_FragCoord.xy * 1.37 + semilla * 3.1) - 1.0;
        c += n * grano * (0.6 + 0.4 * (1.0 - abs(l - 0.5) * 2.0));
        gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
      }`,
  }));

  if (Q.ao) {
    const mr = Math.random, r = azar(1234); Math.random = r;     // ruido del GTAO repetible
    gtao = new GTAOPass(escena, camara, Wr, Hr);
    Math.random = mr;
    gtao.output = GTAOPass.OUTPUT.Default;
    // El AO no debe «ver» suelos enormes (en ángulo rasante dejan rectángulos oscuros) ni lo
    // transparente (vidrio, gotas, burbujas, sombras de contacto): esos no ocluyen.
    const ocultarBase = gtao.overrideVisibility.bind(gtao);
    gtao.overrideVisibility = function () {
      ocultarBase();
      this.scene.traverse(o => {
        if (o.isSprite) { o.visible = false; return; }   // los Sprite saldrían como cuadros negros
        if (!o.isMesh) return;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (o.userData.sinAO || (!o.userData.conAO && m && (m.transparent || m.transmission > 0 || m.isShadowMaterial))) o.visible = false;
      });
    };
  }
  bloom = new UnrealBloomPass(new THREE.Vector2(Q.gpu ? Wr : Wr / 2, Q.gpu ? Hr : Hr / 2), 0.35, 0.55, 1.0);
}

function pase(cuad, destino) { renderer.setRenderTarget(destino); cuad.render(renderer); }

function distanciaFoco() {
  const f = P.dof.foco ?? camInfo.foco;
  const enVista = v => -v.clone().applyMatrix4(camara.matrixWorldInverse).z;
  if (f === null || f === undefined) return camInfo.mira ? enVista(camInfo.mira) : 6;
  if (typeof f === 'number') return f;
  if (f.isObject3D) return enVista(f.getWorldPosition(new THREE.Vector3()));
  return enVista(vec(f));
}

function dibujar3d(t) {
  const N = Math.max(1, Math.round(Q.subfotogramas ? (P.movimiento.muestras || 1) : 1));
  const obt = P.movimiento.obturador ?? 0.5;
  // orden: el último subfotograma es el más cercano a t (su profundidad y su AO son los que se usan)
  const offs = [];
  for (let i = 0; i < N; i++) offs.push(N === 1 ? 0 : ((i + 0.5) / N - 0.5) * obt / FPS);
  offs.sort((a, b) => Math.abs(b) - Math.abs(a));
  renderer.autoClear = true;
  for (let i = 0; i < N; i++) {
    pintarEscena(t + offs[i]);
    actualizarContactos();
    escena.updateMatrixWorld(true);
    renderer.setRenderTarget(rt.escena);
    renderer.clear();
    renderer.render(escena, camara);
    if (N > 1) {
      if (i === 0) { cuadCopia.material.uniforms.t.value = rt.escena.texture; cuadCopia.material.uniforms.peso.value = 1 / N; pase(cuadCopia, rt.acum); }
      else { cuadAcum.material.uniforms.t.value = rt.escena.texture; cuadAcum.material.uniforms.peso.value = 1 / N; renderer.setRenderTarget(rt.acum); renderer.autoClear = false; cuadAcum.render(renderer); renderer.autoClear = true; }
    }
  }
  let src = N > 1 ? rt.acum : rt.escena;
  const libre = () => (src === rt.a ? rt.b : rt.a);
  // oclusión ambiental (contacto y rincones oscuros)
  if (Q.ao && gtao && P.ao.fuerza > 0) {
    gtao.updateGtaoMaterial({ radius: P.ao.radio, thickness: P.ao.grosor, distanceExponent: 1, scale: 1 });
    gtao.blendIntensity = P.ao.fuerza;
    gtao.output = P.ao.ver ? GTAOPass.OUTPUT[P.ao.ver] : GTAOPass.OUTPUT.Default;   // depuración: 'AO', 'Denoise', 'Depth', 'Normal'
    const dst = libre();
    // con overrideMaterial, three.js pintaría el plano del FONDO (2×2 en el origen) en el búfer del AO:
    // sale un rectángulo negro. Se quita el fondo solo durante este pase.
    const fondoGuardado = escena.background; escena.background = null;
    gtao.render(renderer, dst, src);
    escena.background = fondoGuardado;
    src = dst;
  }
  // profundidad de campo + efecto maqueta
  const ap = camInfo.apertura ?? P.dof.apertura;
  const mq = Q.gpu ? P.maqueta.fuerza : 0;      // en CPU el efecto maqueta va por la capa 2D
  if ((ap > 0 || mq > 0) && P.dof.max > 0) {
    const u = cuadDof.material.uniforms;
    u.tColor.value = src.texture; u.tDepth.value = rt.escena.depthTexture;
    u.cerca.value = camara.near; u.lejos.value = camara.far;
    u.foco.value = distanciaFoco(); u.apertura.value = ap; u.maxBlur.value = P.dof.max; u.paso.value = Q.pasoDof;
    u.mqFuerza.value = mq; u.mqFoco.value = P.maqueta.foco; u.mqAncho.value = P.maqueta.ancho;
    const dst = libre();
    pase(cuadDof, dst);
    src = dst;
  }
  // resplandor (bloom): lo que pasa de «umbral» irradia
  if (P.bloom.fuerza > 0 && Q.gpu) {             // en CPU el resplandor va por la capa 2D
    if (src === rt.escena) { cuadCopia.material.uniforms.t.value = src.texture; cuadCopia.material.uniforms.peso.value = 1; pase(cuadCopia, rt.a); src = rt.a; }
    bloom.strength = P.bloom.fuerza; bloom.radius = P.bloom.radio; bloom.threshold = P.bloom.umbral;
    bloom.render(renderer, null, src);
  }
  const f = cuadFinal.material.uniforms, G = P.grado;
  f.t.value = src.texture; f.exposicion.value = P.exposicion;
  f.modo.value = { aces: 1, agx: 2, neutro: 3, ninguno: 0 }[P.tonemap] ?? 1;
  f.grano.value = P.grano; f.semilla.value = Math.round(t * FPS) % 997; f.vineta.value = P.vineta; f.aberracion.value = P.aberracion;
  f.contraste.value = G.contraste; f.saturacion.value = G.saturacion; f.temperatura.value = G.temperatura;
  const tinte = (c, k) => { if (!c) return new THREE.Vector3(0, 0, 0); const k2 = color(c); const l = 0.2126 * k2.r + 0.7152 * k2.g + 0.0722 * k2.b; return new THREE.Vector3((k2.r - l) * k, (k2.g - l) * k, (k2.b - l) * k); };
  f.tSombras.value = tinte(G.sombras, G.mezcla ?? 0.12); f.tLuces.value = tinte(G.luces, G.mezcla ?? 0.12);
  renderer.setRenderTarget(null);
  cuadFinal.render(renderer);
  if (N > 1) pintarEscena(t);     // deja la escena en t para la capa 2D (rótulos que siguen a piezas)
}

// API para la escena: ctx.post
const post = {
  ajustar(op) { P = fusionar(P, op); return post; },
  get valores() { return P; },
  foco(f) { P.dof.foco = f; return post; },             // objeto, [x,y,z] o distancia; null = lo que mira la cámara
  apertura(a) { P.dof.apertura = a; return post; },
  // compatibilidad con escenas de la versión 1
  maqueta(op = {}) {
    P.maqueta = { fuerza: op.fuerza ?? 1, foco: op.foco ?? 0.5, ancho: op.ancho ?? 0.18 };
    return { foco(f) { P.maqueta.foco = f; }, fuerza(k) { P.maqueta.fuerza = k; }, ancho(a) { P.maqueta.ancho = a; } };
  },
  brillo(op = {}) {
    P.bloom.fuerza = (op.fuerza ?? 0.45) * 1.3; P.bloom.radio = limitar((op.radio ?? 7) / 12, 0.1, 1);
    if (op.umbral !== undefined) P.bloom.umbral = op.umbral;
    return { fuerza(k) { P.bloom.fuerza = k * 1.3; }, radio(r) { P.bloom.radio = limitar(r / 12, 0.1, 1); } };
  },
};

// ---------------------------------------------------------------------------
//  Capa 2D encima: rótulos, títulos y cifras (tipografía Inter)
// ---------------------------------------------------------------------------
const u = () => Math.min(W, H) / 1080;
const ACENTO = '#ff5a36';

function puntoPantalla(en, desplaza) {
  const v = en && en.isObject3D ? en.getWorldPosition(new THREE.Vector3()) : vec(en);
  if (desplaza) v.add(vec(desplaza));
  const p = v.project(camara);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, detras: p.z > 1 };
}

function rotulo(op) {
  const r = { ...op, p: 0, mostrar(p) { r.p = limitar(p); return r; } };
  rotulos.push(r);
  return r;
}
function titulo(op) {
  const T = { ...op, p: 0, mostrar(p) { T.p = limitar(p); return T; } };
  titulos.push(T);
  return T;
}
function cifra(op) {
  const C = { ...op, p: 0, valor: 0, mostrar(p, valor) { C.p = limitar(p); if (valor !== undefined) C.valor = valor; return C; } };
  cifras.push(C);
  return C;
}
const numero = (v, dec = 0) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' });

function cajaRedonda(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// Rótulo FINO (por defecto): punto de anclaje · línea guía fina con codo · círculo numerado de trazo ·
// texto en versalitas con espaciado que se escribe letra a letra · subtítulo fino debajo.
function pintarRotuloFino(r, a) {
  const k = u(), oscuro = r.tema === 'oscuro', acento = r.acento || (oscuro ? '#ffd27a' : ACENTO);
  const tinta = r.color || (oscuro ? 'rgba(255,255,255,0.96)' : 'rgba(18,18,22,0.92)');
  const pPunto = ease.rebote(limitar(r.p / 0.25));
  const pLinea = ease.suave(limitar((r.p - 0.08) / 0.42));
  const pCirc = ease.salida(limitar((r.p - 0.32) / 0.3));
  const pTexto = limitar((r.p - 0.42) / 0.5);
  const dist = (r.dist ?? 150) * k, lado = r.lado || 'derecha';
  const tam = (r.tam ?? 28) * k, tamS = tam * 0.72;
  const txt = String(r.texto).toUpperCase();
  g.save();
  g.font = `500 ${tam}px Inter`; g.letterSpacing = `${tam * 0.16}px`;
  const wT = g.measureText(txt).width;
  g.font = `400 ${tamS}px Inter`; g.letterSpacing = `${tamS * 0.02}px`;
  const wS = r.sub ? g.measureText(r.sub).width : 0;
  const circ = r.num !== undefined ? tam * 0.74 : 0;
  const hueco = circ ? circ * 2 + 12 * k : 0;
  const ancho = hueco + Math.max(wT, wS);
  let bx, by, dir;
  if (r.fijo) { bx = r.fijo[0] * W; by = r.fijo[1] * H; dir = bx >= a.x ? 1 : -1; }
  else {
    dir = lado === 'izquierda' ? -1 : 1;
    const sube = lado === 'arriba' ? -1 : lado === 'abajo' ? 1 : -0.45;
    bx = a.x + dir * dist * (lado === 'arriba' || lado === 'abajo' ? 0.55 : 1);
    by = a.y + sube * dist * 0.62;
  }
  // codo: diagonal desde la pieza y tramo horizontal hasta el texto
  const codoX = bx - dir * Math.min(46 * k, Math.abs(bx - a.x) * 0.4), codoY = by;
  const largo1 = Math.hypot(codoX - a.x, codoY - a.y), largo2 = Math.abs(bx - codoX), tot = largo1 + largo2;
  const hecho = pLinea * tot;
  g.strokeStyle = tinta; g.lineWidth = 1.6 * k; g.lineCap = 'round';
  if (r.sombra !== false) { g.shadowColor = oscuro ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.35)'; g.shadowBlur = 6 * k; }
  g.beginPath(); g.moveTo(a.x, a.y);
  if (hecho <= largo1) g.lineTo(a.x + (codoX - a.x) * hecho / largo1, a.y + (codoY - a.y) * hecho / largo1);
  else { g.lineTo(codoX, codoY); g.lineTo(codoX + (bx - codoX) * (hecho - largo1) / Math.max(1, largo2), codoY); }
  if (pLinea > 0) g.stroke();
  // anclaje: punto lleno + anillo
  g.fillStyle = acento;
  g.beginPath(); g.arc(a.x, a.y, 4.5 * k * pPunto, 0, Math.PI * 2); g.fill();
  g.strokeStyle = acento; g.lineWidth = 1.4 * k; g.globalAlpha = 0.55 * pPunto;
  g.beginPath(); g.arc(a.x, a.y, 10 * k * pPunto, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = 1;
  // bloque de texto (a la derecha o a la izquierda del final de la línea)
  const x0 = dir > 0 ? bx + 10 * k : bx - 10 * k - ancho;
  let tx = x0;
  if (circ && pCirc > 0) {
    const cx = x0 + circ + 1 * k, cy = by;
    g.strokeStyle = acento; g.lineWidth = 1.5 * k;
    g.beginPath(); g.arc(cx, cy, circ, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pCirc); g.stroke();
    g.globalAlpha = pCirc; g.fillStyle = acento; g.font = `500 ${tam * 0.82}px Inter`; g.letterSpacing = '0px';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(r.num), cx, cy + 1 * k);
    g.globalAlpha = 1;
    tx = x0 + hueco;
  }
  g.textAlign = 'left'; g.textBaseline = 'middle';
  if (pTexto > 0) {
    const n = Math.ceil(txt.length * Math.min(1, pTexto * 1.35));
    g.font = `500 ${tam}px Inter`; g.letterSpacing = `${tam * 0.16}px`; g.fillStyle = tinta;
    g.fillText(txt.slice(0, n), tx, by - (r.sub ? tamS * 0.62 : 0));
    if (r.sub) {
      const ps = limitar((pTexto - 0.35) / 0.65);
      g.globalAlpha = ps * 0.78; g.font = `400 ${tamS}px Inter`; g.letterSpacing = `${tamS * 0.02}px`;
      g.fillText(r.sub, tx, by + tam * 0.62 + (1 - ps) * 6 * k);
      g.globalAlpha = 1;
    }
  }
  g.letterSpacing = '0px';
  g.restore();
}

function pintarRotulo(r) {
  if (r.p <= 0) return;
  const a = puntoPantalla(r.en, r.desplaza);
  if (a.detras) return;
  if ((r.estilo || 'fino') === 'fino') { pintarRotuloFino(r, a); return; }
  // estilo «caja» (versión 1)
  const k = u();
  const oscuro = r.tema === 'oscuro';
  const acento = r.acento || ACENTO;
  const pPunto = ease.rebote(limitar(r.p / 0.3));
  const pLinea = ease.salida(limitar((r.p - 0.12) / 0.4));
  const pCaja = ease.salida(limitar((r.p - 0.35) / 0.65));
  const dist = (r.dist ?? 170) * k;
  let bx, by;
  if (r.fijo) { bx = r.fijo[0] * W; by = r.fijo[1] * H; }
  else {
    const lado = r.lado || 'derecha';
    bx = a.x + (lado === 'derecha' ? dist : lado === 'izquierda' ? -dist : 0);
    by = a.y + (lado === 'arriba' ? -dist * 0.8 : lado === 'abajo' ? dist * 0.8 : -dist * 0.42);
  }
  const fT = 700, tamT = (r.tam ?? 30) * k, tamS = tamT * 0.72;
  g.font = `${fT} ${tamT}px Inter`;
  const wT = g.measureText(r.texto).width;
  g.font = `500 ${tamS}px Inter`;
  const wS = r.sub ? g.measureText(r.sub).width : 0;
  const pad = 16 * k, circ = r.num !== undefined ? tamT * 1.25 : 0;
  const ancho = pad * 2 + (circ ? circ + 12 * k : 0) + Math.max(wT, wS);
  const alto = pad * 2 + tamT * 1.1 + (r.sub ? tamS * 1.3 : 0);
  const izq = bx < a.x - 1 ? bx - ancho : (Math.abs(bx - a.x) <= 1 ? bx - ancho / 2 : bx);
  const arriba = by - alto / 2;
  const fx = Math.abs(bx - a.x) <= 1 ? bx : (bx < a.x ? izq + ancho : izq);
  const fy = Math.abs(bx - a.x) <= 1 ? (by < a.y ? arriba + alto : arriba) : by;
  g.save();
  g.strokeStyle = oscuro ? 'rgba(255,255,255,0.9)' : 'rgba(20,20,24,0.85)';
  g.lineWidth = 2.5 * k;
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + (fx - a.x) * pLinea, a.y + (fy - a.y) * pLinea); g.stroke();
  g.fillStyle = acento;
  g.beginPath(); g.arc(a.x, a.y, 8 * k * pPunto, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 3 * k * pPunto; g.stroke();
  if (pCaja > 0) {
    g.globalAlpha = pCaja;
    const dy = (1 - pCaja) * 14 * k;
    g.shadowColor = 'rgba(0,0,0,0.22)'; g.shadowBlur = 22 * k; g.shadowOffsetY = 8 * k;
    g.fillStyle = oscuro ? 'rgba(18,18,22,0.92)' : 'rgba(255,255,255,0.96)';
    cajaRedonda(izq, arriba + dy, ancho, alto, 14 * k); g.fill();
    g.shadowColor = 'transparent';
    let tx = izq + pad;
    if (circ) {
      g.fillStyle = acento;
      g.beginPath(); g.arc(tx + circ / 2, arriba + dy + alto / 2, circ / 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.font = `800 ${tamT * 0.78}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(r.num), tx + circ / 2, arriba + dy + alto / 2 + 1 * k);
      tx += circ + 12 * k;
    }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = oscuro ? '#ffffff' : '#141418';
    g.font = `${fT} ${tamT}px Inter`;
    const base1 = arriba + dy + pad + tamT * 0.88;
    g.fillText(r.texto, tx, base1);
    if (r.sub) {
      g.fillStyle = oscuro ? 'rgba(255,255,255,0.7)' : '#5d5f66';
      g.font = `500 ${tamS}px Inter`;
      g.fillText(r.sub, tx, base1 + tamS * 1.3);
    }
  }
  g.restore();
}

// Título. efecto: 'letras' (cada letra entra con desenfoque y sube; por defecto) · 'linea' (versión 1) ·
// 'tracking' (las letras se juntan desde muy separadas). etiqueta = versalitas de color encima.
function pintarTitulo(T) {
  if (T.p <= 0) return;
  const k = u();
  const lineas = String(T.texto).split('\n');
  const tam = (T.tam ?? 76) * k, alto = tam * 1.06;
  const pos = T.pos || 'arriba-izquierda';
  const centrado = pos === 'arriba' || pos === 'abajo' || pos === 'centro';
  const margen = (T.margen ?? 96) * k;
  const bloque = lineas.length * alto + (T.sub ? tam * 0.62 : 0) + (T.etiqueta ? tam * 0.62 : 0);
  let x = centrado ? W / 2 : margen;
  let y = pos.startsWith('arriba') ? margen * 0.9 : pos === 'centro' ? (H - bloque) / 2 : H - margen * 0.9 - bloque;
  if (T.y !== undefined) y = T.y * H;
  if (T.x !== undefined) x = T.x * W;
  const efecto = T.efecto || 'letras';
  const sombra = () => { if (T.sombra) { g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 18 * k; g.shadowOffsetY = 4 * k; } };
  g.save();
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  if (T.etiqueta) {
    const pe = ease.salida(limitar(T.p / 0.4));
    const te = tam * 0.24, sp = te * 0.28;
    g.font = `600 ${te}px Inter`; g.letterSpacing = `${sp}px`;
    const et = T.etiqueta.toUpperCase();
    const we = g.measureText(et).width;
    const ex = centrado ? x - we / 2 : x;
    g.globalAlpha = pe;
    if ((T.estiloEtiqueta || 'texto') === 'pastilla') {
      g.font = `800 ${tam * 0.3}px Inter`; g.letterSpacing = `${tam * 0.04}px`;
      const wp = g.measureText(et).width + tam * 0.36, px = centrado ? x - wp / 2 : x;
      g.fillStyle = T.colorEtiqueta || ACENTO; cajaRedonda(px, y, wp, tam * 0.5, tam * 0.25); g.fill();
      g.fillStyle = '#ffffff'; g.fillText(et, px + tam * 0.18, y + tam * 0.36);
    } else {
      g.fillStyle = T.colorEtiqueta || ACENTO;
      const lx = centrado ? ex : x;
      if (!centrado) { g.fillRect(lx, y + te * 0.55, tam * 0.36 * pe, Math.max(1.5, 2 * k)); }
      g.fillText(et, centrado ? ex : lx + tam * 0.5, y + te * 0.9);
    }
    g.letterSpacing = '0px';
    y += tam * 0.62;
    g.globalAlpha = 1;
  }
  g.font = `${T.peso ?? 800} ${tam}px ${T.fuente || 'Inter'}`;
  const esp = T.espaciado ?? -0.025;
  lineas.forEach((ln, i) => {
    const yb = y + (i + 1) * alto - tam * 0.2;
    if (efecto === 'linea') {
      const pl = ease.salidaFuerte(limitar((T.p - i * 0.12) / 0.55));
      if (pl <= 0) return;
      g.save();
      g.letterSpacing = `${tam * esp}px`;
      g.beginPath(); g.rect(0, y + i * alto - tam * 0.1, W, alto + tam * 0.12); g.clip();
      g.globalAlpha = Math.min(1, pl * 1.5); sombra();
      g.fillStyle = T.color || '#111114';
      g.textAlign = centrado ? 'center' : 'left';
      g.fillText(ln, x, yb + (1 - pl) * alto);
      g.restore();
      return;
    }
    // por letras: medir cada letra con el espaciado final
    const chars = [...ln];
    const anchos = chars.map(ch => g.measureText(ch).width + tam * esp);
    const total = anchos.reduce((s, v) => s + v, 0) - tam * esp;
    let cx = centrado ? x - total / 2 : x;
    const nL = chars.length;
    chars.forEach((ch, j) => {
      const ord = i * 0.15 + (j / Math.max(1, nL)) * 0.35;
      const pl = limitar((T.p - ord) / 0.5);
      const e = ease.salidaFuerte(pl);
      if (pl > 0 && ch.trim()) {
        g.save();
        g.globalAlpha = Math.min(1, pl * 1.8);
        const borroso = (1 - e) * 14 * k;
        if (borroso > 0.3) g.filter = `blur(${borroso.toFixed(1)}px)`;
        sombra();
        g.fillStyle = T.color || '#111114';
        let dx = 0;
        if (efecto === 'tracking') dx = (j - nL / 2) * tam * 0.35 * (1 - e);
        g.fillText(ch, cx + dx, yb + (efecto === 'tracking' ? 0 : (1 - e) * tam * 0.45));
        g.restore();
      }
      cx += anchos[j];
    });
  });
  if (T.sub) {
    const ps = ease.salida(limitar((T.p - 0.4) / 0.5));
    g.globalAlpha = ps;
    g.font = `${T.pesoSub ?? 400} ${tam * 0.3}px Inter`;
    g.letterSpacing = `${tam * 0.3 * (T.espaciadoSub ?? 0.01)}px`;
    g.textAlign = centrado ? 'center' : 'left';
    sombra();
    g.fillStyle = T.colorSub || 'rgba(20,20,24,0.68)';
    g.fillText(T.sub, x, y + lineas.length * alto + tam * 0.42 + (1 - ps) * 10 * k);
    g.letterSpacing = '0px';
  }
  g.restore();
}

function pintarCifra(C) {
  if (C.p <= 0) return;
  const k = u();
  const a = C.en ? puntoPantalla(C.en, C.desplaza) : { x: (C.x ?? 0.5) * W, y: (C.y ?? 0.5) * H };
  if (a.detras) return;
  const tam = (C.tam ?? 64) * k;
  const pe = ease.rebote(limitar(C.p));
  g.save();
  g.globalAlpha = limitar(C.p * 2);
  g.translate(a.x, a.y);
  g.scale(0.6 + 0.4 * pe, 0.6 + 0.4 * pe);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `800 ${tam}px Inter`;
  g.letterSpacing = `${-tam * 0.02}px`;
  if (C.sombra !== false) { g.shadowColor = 'rgba(0,0,0,0.28)'; g.shadowBlur = 16 * k; g.shadowOffsetY = 5 * k; }
  g.fillStyle = C.color || '#111114';
  g.fillText(`${C.prefijo || ''}${numero(C.valor, C.decimales || 0)}${C.sufijo || ''}`, 0, 0);
  if (C.pie) {
    g.letterSpacing = `${tam * 0.34 * 0.12}px`;
    g.font = `500 ${tam * 0.3}px Inter`;
    g.fillStyle = C.colorPie || C.color || '#111114';
    g.globalAlpha = limitar(C.p * 2) * 0.8;
    g.fillText(C.pie.toUpperCase(), 0, tam * 0.55);
  }
  g.restore();
}

// ---------------------------------------------------------------------------
//  Efectos 2D de la versión 1 (solo en CPU, donde los pases de WebGL cuestan ~5×)
// ---------------------------------------------------------------------------
let lienzoBrillo = null, lienzoMedio = null, lienzoCuarto = null;
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
function enmascarar(gq, w, h, foco, ancho, dureza) {
  gq.globalCompositeOperation = 'destination-in';
  const gr = gq.createLinearGradient(0, 0, 0, h);
  const a = limitar(foco - ancho), b = limitar(foco + ancho * 0.7);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(limitar(a * dureza), 'rgba(0,0,0,0.85)');
  gr.addColorStop(a, 'rgba(0,0,0,0)');
  gr.addColorStop(b, 'rgba(0,0,0,0)');
  gr.addColorStop(limitar(b + (1 - b) * (1 - dureza)), 'rgba(0,0,0,0.85)');
  gr.addColorStop(1, 'rgba(0,0,0,1)');
  gq.fillStyle = gr; gq.fillRect(0, 0, w, h);
  gq.globalCompositeOperation = 'source-over';
}
function efectosCPU() {
  const k = H / 720;
  if (P.bloom.fuerza > 0) {
    lienzoBrillo = lienzoBrillo || lienzo(W / 4, H / 4);
    const gb = lienzoBrillo.getContext('2d');
    gb.filter = 'brightness(0.8) contrast(4) saturate(1.4)';
    gb.drawImage(comp, 0, 0, lienzoBrillo.width, lienzoBrillo.height);
    gb.filter = 'none';
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = limitar(P.bloom.fuerza / 1.3);
    g.filter = `blur(${P.bloom.radio * 12 * k}px)`; g.drawImage(lienzoBrillo, 0, 0, W, H); g.restore();
  }
  const M = P.maqueta;
  if (M && M.fuerza > 0) {
    lienzoMedio = lienzoMedio || lienzo(W / 2, H / 2);
    lienzoCuarto = lienzoCuarto || lienzo(W / 4, H / 4);
    const gm = lienzoMedio.getContext('2d'), gc = lienzoCuarto.getContext('2d');
    gm.clearRect(0, 0, lienzoMedio.width, lienzoMedio.height);
    gm.filter = `blur(${2.2 * M.fuerza * k}px)`; gm.drawImage(comp, 0, 0, lienzoMedio.width, lienzoMedio.height); gm.filter = 'none';
    enmascarar(gm, lienzoMedio.width, lienzoMedio.height, M.foco, M.ancho, 0.55);
    gc.clearRect(0, 0, lienzoCuarto.width, lienzoCuarto.height);
    gc.filter = `blur(${2.6 * M.fuerza * k}px)`; gc.drawImage(comp, 0, 0, lienzoCuarto.width, lienzoCuarto.height); gc.filter = 'none';
    enmascarar(gc, lienzoCuarto.width, lienzoCuarto.height, M.foco, M.ancho * 1.8, 0.3);
    g.drawImage(lienzoMedio, 0, 0, W, H); g.drawImage(lienzoCuarto, 0, 0, W, H);
  }
}

// ---------------------------------------------------------------------------
//  Carga de la escena y captura de fotogramas (lo que llama hacer.py)
// ---------------------------------------------------------------------------
async function cargarFuentes() {
  await Promise.all(['300', '400', '500', '600', '700', '800'].map(p => document.fonts.load(`${p} 40px Inter`)));
  await document.fonts.load('40px "Archivo Black"');
  const buf = await (await fetch('/fuentes/ArchivoBlack.ttf')).arrayBuffer();
  fuente3d = new Font(new TTFLoader().parse(buf));
}

function calidad(gpu, nivel) {
  // gpu: tarjeta gráfica (rápido) · cpu: SwiftShader (lento: se rebaja solo)
  // escala = resolución a la que se dibuja el 3D (los textos van siempre a tamaño completo)
  if (gpu) return nivel === 'boceto'
    ? { gpu: true, nivel, msaa: 4, ao: true, subfotogramas: false, pasoDof: 0.9, escala: 1, reflejo: 0.6 }
    : { gpu: true, nivel, msaa: 4, ao: true, subfotogramas: true, pasoDof: 0.5, escala: 1, reflejo: 0.6 };
  return nivel === 'boceto'
    ? { gpu: false, nivel, msaa: 0, ao: false, subfotogramas: false, pasoDof: 2.4, escala: 0.5, reflejo: 0.2 }
    : { gpu: false, nivel, msaa: 2, ao: false, subfotogramas: false, pasoDof: 2.0, escala: 0.67, reflejo: 0.25 };
}

window.cargar = async function cargar(datos) {
  await cargarFuentes();
  const mod = await import(datos.escena);
  const aj = { ...(mod.ajustes || {}) };
  const [fw, fh] = FORMATOS[datos.formato || aj.formato || '16:9'] || FORMATOS['16:9'];
  W = datos.ancho || fw; H = datos.alto || fh;
  if (datos.ancho && !datos.alto) H = Math.round(W * fh / fw);
  FPS = datos.fps || aj.fps || 30;
  Q = calidad(datos.gpu !== false && !!datos.gpu, datos.calidad || 'final');
  P = fusionar(POST_BASE, aj.post || {});
  if (aj.exposicion !== undefined && !(aj.post && aj.post.exposicion !== undefined)) P.exposicion = aj.exposicion;

  const lienzo3d = document.createElement('canvas');
  lienzo3d.width = W; lienzo3d.height = H;
  renderer = new THREE.WebGLRenderer({ canvas: lienzo3d, antialias: false, preserveDrawingBuffer: true, powerPreference: Q.gpu ? 'high-performance' : 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (datos.sinSombras) renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.NoToneMapping;          // el tone mapping lo hace el pase final
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  escena = new THREE.Scene();
  escena.background = new THREE.Color('#f2efe9');
  camara = new THREE.PerspectiveCamera(fovAdaptado(35), W / H, 0.05, 600);
  camara.position.set(0, 3, 12); camara.lookAt(0, 0, 0);
  entorno(aj.entorno ?? 0.5);
  prepararPost();

  comp = document.createElement('canvas');
  comp.width = W; comp.height = H;
  g = comp.getContext('2d');

  const ctx = {
    THREE, escena, camara, renderer, ancho: W, alto: H, vertical: H > W, u: u(), fps: FPS,
    duracion: datos.duracion || aj.duracion || 10, gpu: Q.gpu, calidad: Q.nivel,
    ease, curva, entre, mezcla, claves, limitar, azar, vec, color, hdr, numero, muelle,
    camaraPorClaves, rig, fov: fovAdaptado, base, entrada, caida,
    mat, malla, caja, cilindro, cilindroBisel, perfilBisel, esfera, toro, cono, plano, torno, tubo, extruir, grupo, sombras, instancias, textura2d,
    texturas, superficie, pegatina, etiquetaCilindro, revelar, brilloBorde,
    texto3d, letras3d, neon, neonTexto, vapor, particulas,
    luces, luzArea, practica, suelo, sueloEspejo, sombraContacto, fondo, niebla, entorno, entornoEstudio, post,
    rotulo, titulo, cifra, puntoPantalla,
    RoundedBoxGeometry, BufferGeometryUtils,
    get fuente3d() { return fuente3d; },
  };
  const r = await mod.crear(THREE, ctx);
  if (typeof r === 'function') pintarEscena = r;
  else { pintarEscena = r.pintar || (() => {}); dibujar2d = r.dibujar2d || null; debajo2d = r.debajo2d || null; }
  const momentos = (r && r.momentos) || mod.momentos || aj.momentos || null;
  // compila los shaders antes del primer fotograma (si no, el primero tarda mucho)
  pintarEscena(0); escena.updateMatrixWorld(true);
  try { renderer.compile(escena, camara); } catch (e) { /* no pasa nada */ }
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    ancho: W, alto: H, duracion: ctx.duracion, fps: aj.fps || null, momentos,
    titulo: aj.titulo || null, webgl: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '',
    calidad: Q,
  };
};

window.captura = function captura(t, calidadJpeg = 0.92) {
  rotulos.forEach(r => { r.p = 0; });
  titulos.forEach(T => { T.p = 0; });
  cifras.forEach(C => { C.p = 0; });
  const t0 = performance.now();
  dibujar3d(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.filter = 'none';
  g.drawImage(renderer.domElement, 0, 0);
  if (!Q.gpu) efectosCPU();
  if (debajo2d) { g.save(); debajo2d(g, t); g.restore(); }
  const t1 = performance.now();
  rotulos.forEach(pintarRotulo);
  cifras.forEach(pintarCifra);
  titulos.forEach(pintarTitulo);
  if (dibujar2d) { g.save(); dibujar2d(g, t); g.restore(); }
  const t2 = performance.now();
  const jpg = comp.toDataURL('image/jpeg', calidadJpeg).split(',')[1];
  const pf = window.perfil;
  pf.n++; pf.dibujo += t1 - t0; pf.capa += t2 - t1; pf.jpeg += performance.now() - t2;
  return jpg;
};
window.perfil = { n: 0, dibujo: 0, capa: 0, jpeg: 0 };

window.motorListo = true;
