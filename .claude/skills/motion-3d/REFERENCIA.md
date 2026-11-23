# Referencia del motor (`ctx`) · versión 2

Lo que recibe `crear(THREE, ctx)`. Unidades: 1 = un metro «de maqueta»; un protagonista de 1-3 de alto queda bien con la cámara a 5-9 de distancia y `fov` 24-35. Y hacia arriba.

Antes de escribir, lee la sección **Dirección de arte** de `SKILL.md`: este archivo dice QUÉ hay; aquella, CÓMO usarlo para que parezca de estudio.

## Básico
| | |
|---|---|
| `ctx.escena`, `ctx.camara`, `ctx.renderer` | los objetos de three.js |
| `ctx.ancho`, `ctx.alto`, `ctx.vertical`, `ctx.duracion`, `ctx.fps` | tamaño, si es vertical, duración y fotogramas por segundo |
| `ctx.gpu`, `ctx.calidad` | si dibuja la tarjeta gráfica y si es `'boceto'` o `'final'` (para rebajar algo a mano si hiciera falta) |
| `ctx.u` | escala de la capa 2D (1 a 1080 px de alto) |
| `ajustes` | `{ duracion, formato: '16:9'|'9:16'|'1:1'|'4:5', fps, post: {...} }` (ver **Postproceso**) |

La escena devuelve `{ pintar(t), momentos, debajo2d(g, t), dibujar2d(g, t) }`:
- `pintar(t)` depende **solo de t** (se llama varias veces por fotograma para el desenfoque de movimiento, en cualquier orden).
- `momentos`: 4-6 `{t, nombre}` → las imágenes de la hoja de revisión.
- `debajo2d(g, t)` / `dibujar2d(g, t)`: dibujo 2D (canvas) debajo / encima de rótulos y títulos.

## Tiempo y movimiento
| | |
|---|---|
| `ctx.entre(t, a, b, ease)` | 0→1 entre los segundos a y b (limitado), con curva |
| `ctx.claves(t, [[0, v0], [2, v1, 'rebote'], [5, v2]], ease)` | valor por claves (número, lista `[x,y,z]` o `THREE.Color`) |
| `ctx.mezcla(a, b, p)` | interpola números, listas, vectores o colores |
| `ctx.ease.*` | `lineal suave salida entrada salidaFuerte suaveFuerte expo rebote anticipa anticipaRebote elastico botar` |
| `ctx.muelle(t, inicio, {frecuencia: 2.2, amortigua: 6})` | 0→1 con sobrepaso que se apaga (muelle de verdad) |
| `ctx.azar(semilla)` | números al azar repetibles (úsala en `crear`, nunca `Math.random`) |
| `ctx.entrada(obj, t, inicio, {dur, desde:'escala'|'abajo'|'arriba'|'izquierda'|'derecha'|'giro'|'muelle', dist, fin, durSalida})` | aparece con rebote (y desaparece con `fin`). Recoloca el objeto desde su posición inicial: suma tus desplazamientos DESPUÉS |
| `ctx.base(obj)` | posición/escala/giro iniciales (`.pos .esc .rot`) |
| `ctx.caida(t, inicio, {altura, rebote, g})` | `{y, aplastar, tocando}`: caída con botes de verdad (usa `aplastar` para el squash) |

## Cámara (y foco)
```js
const cam = ctx.camaraPorClaves([
  { t: 0, pos: [6, 4, 8], mira: [0, 1, 0], fov: 32, apertura: 0.3 },
  { t: 4, pos: [1.2, 1.4, 2.4], mira: [0.2, 1.2, 0.5], fov: 26, foco: [0.3, 1.25, 0.6], apertura: 0.9, ease: 'suave' },
  { t: 8, pos: [-5, 3, 6], mira: [0, 1, 0], fov: 30, giro: -3 },
], { deriva: 0.04, continuo: false });
// en pintar: cam(t)
```
- `foco`: punto `[x,y,z]` o distancia que sale nítido (por defecto, el punto `mira`). `apertura`: cuánto se desenfoca lo demás (0 nada · 0,25-0,4 plano general · 0,8-1 macro · 1-1,3 maqueta). Se interpolan entre claves: **cambio de foco** gratis.
- `continuo: true` pasa por todas las claves sin pararse (vuelos, grúas). `deriva` = balanceo de cámara en mano (0,03-0,1). `giro` inclina el horizonte.
- Rigs hechos (devuelven `cam(t)` igual): `ctx.rig.orbita({centro, radio, radioFin, angulos:[-25,25], alturas:[1.5,2], t:[0,8], fovs:[32,28], apertura})` · `ctx.rig.empujon({desde, hasta, mira, t, fovs, apertura})` (dolly in) · `ctx.rig.grua({desde, hasta, mira, miraFin, t, fov})`.
- Foco a mano en `pintar`: `ctx.post.foco(objeto | [x,y,z] | distancia)` y `ctx.post.apertura(a)`.
- En vertical abre el `fov` solo para que quepa lo mismo de ancho.

## Luz
| | |
|---|---|
| `ctx.luces.producto({centro, direccion:[-3,6,4], fuerzaClave, recortes:['#ffae4f','#4fe0ff'], fuerzaRecorte, fuerzaTope, ambiente, area})` | plató de anuncio: caja de luz grande y suave + dos **luces de recorte** de color detrás + luz cenital + sombra suave al suelo |
| `ctx.luces.estudio({intensidad, direccion, area, mapa, ambiente, relleno, contra, color, cielo, tierra})` | plató claro: principal con sombra + relleno + contraluz |
| `ctx.luces.exterior({intensidad, direccion, area, cielo, tierra})` | sol con sombra + cielo |
| `ctx.luces.noche({luna, ambiente, cielo, tierra, direccion, area})` | luna fría con sombra + cielo azul tenue (las luces de verdad las pones tú) |
| `ctx.practica([x,y,z], {color, intensidad, distancia, bombilla:true, radio, brillo, sombra})` | **luz práctica**: bombilla visible que ilumina de verdad (farolas, lámparas, ventanas, faros). `{luz, bombilla}` |
| `ctx.luzArea(color, intensidad, ancho, alto, pos, mira)` | caja de luz rectangular (reflejos de softbox en metal y plástico) |
| `ctx.entornoEstudio({fondo, suelo, intensidad, paneles:[{pos, tam:[w,h], color, fuerza}]})` | **reflejos**: lo que se ve reflejado en metal, vidrio y barniz. Tiras verticales = líneas de brillo en latas y botellas; paneles de color = reflejos de neón |
| `ctx.entorno(0.5)` | reflejos genéricos de habitación (versión 1) |

Luces de three.js normales también valen (`new THREE.PointLight`, `SpotLight`). Con tarjeta gráfica caben 10-20 luces sin problema; sombras: 1-3 luces.

## Fondo, suelo y sombras
| | |
|---|---|
| `ctx.fondo('#c')` · `ctx.fondo(['#arriba', '#medio', '#abajo'])` · `ctx.fondo({tipo:'radial', centro, medio, borde, x, y, radio})` | liso, degradado vertical o **radial** (foco de luz detrás del protagonista) |
| `ctx.niebla('#c', cerca, lejos)` | funde el suelo con el fondo (mismo color que la parte baja del fondo) |
| `ctx.suelo({color, tipo:'sombra', opacidad, y, mate, rugosidad, material})` | suelo que recibe sombras |
| `ctx.sueloEspejo({color, reflejo:0.35, rugosidad, tam, y, resolucion, mascara, material})` | suelo **brillante que refleja** (producto sobre negro, asfalto mojado: `material` con `alphaMap` = charcos) |
| `ctx.sombraContacto(objeto | [x,y,z], {radio, opacidad, alto, base, alargar})` | sombra oscura y suave justo donde el objeto toca el suelo; si le das un objeto lo sigue y se aclara cuando sube |

## Materiales (`ctx.mat.*(color, extra)`)
`plastico` · `brillante` · `metal` · `cepillado` (metal cepillado, anisótropo) · `ceramica` · `vidrio` (transmisión real con tarjeta) · `hielo` · `agua` · `arcilla` · `papel` · `mate` · `carton` · `goma` · `liquido` · `terciopelo` (tela con brillo de borde) · `emisivo(color, intensidad)` · `luz(color, intensidad)` (bombillas, tubos, pantallas: >1 brilla con el bloom) · `plano`. `extra` = propiedades de three.js (`{roughness: 0.2}`, `{map: textura}`, `{clearcoat: 1}`…).
- `ctx.brilloBorde(material, {color, fuerza:1.5, potencia:3})` → los bordes brillan (fresnel): imprescindible para que **agua, gotas, burbujas y vidrio** se lean sobre fondos oscuros.
- `ctx.revelar(material, {eje:'u'|'v', color, fuerza, ancho, invertir})` → el material aparece barrido por una **línea de luz** (se imprime, se escanea, se dibuja). Necesita `map`. Devuelve `.p(0→1)`.

## Texturas procedurales (sin descargar nada; repetibles)
`ctx.superficie(tipo, {color, repetir:[x,y], semilla, tam, ...})` → material listo. Tipos: `carton` (`{ondulado:true}`), `madera` (`{color, oscuro, vetas}`), `papel`, `tela` (`{hilos}`), `cepillado` (metal), `asfalto` (`{mojado: 0-1}`), `ruido` (yeso, piedra).
`ctx.texturas.<tipo>(op)` → solo los mapas `{map, normalMap, roughnessMap}` (el asfalto añade `.charcos`, una máscara para el suelo espejo). Extra: `ctx.texturas.condensacion({tam, repetir, cantidad, grande, relieve, empanado})` → `{normalMap, roughnessMap}` de miles de gotitas (latas y vasos fríos: úsalos como `clearcoatNormalMap` / `clearcoatRoughnessMap` y anima `clearcoatNormalScale` para que «se empañe»).
`ctx.textura2d(ancho, alto, (g, w, h) => {…})` → dibuja tú con canvas 2D (etiquetas, carteles, pantallas, fachadas con ventanas).

## Piezas (devuelven una malla con sombras; añádela con `ctx.escena.add` o a un grupo)
| | |
|---|---|
| `ctx.caja(w, h, d, mat, radio)` | caja **con bisel automático** (8 % del lado menor). `radio: 0` = arista viva (casi nunca) |
| `ctx.cilindroBisel(r, alto, mat, {bisel, seg})` | disco/pastilla/botón/rueda con cantos redondeados |
| `ctx.cilindro`, `ctx.esfera`, `ctx.cono`, `ctx.toro`, `ctx.plano` | formas básicas |
| `ctx.torno([[radio, y], …], mat)` | pieza de revolución: latas, botellas, tazas, macetas (pon el perfil con detalle: cuello, borde, fondo) |
| `ctx.tubo([[x,y,z], …], radio, mat)` | tubos, cables, asas |
| `ctx.extruir(puntos | THREE.Shape, grosor, mat, bisel)` | silueta con grosor (bisel automático) |
| `ctx.instancias(geo, mat, n, (i, o) => { o.pos=[..]; o.rot=[..]; o.esc=..; o.color='#..' })` | muchas piezas iguales en una sola malla; para moverlas: `inst.colocar(i, pos, rot, esc)` + `inst.listo()` |
| `ctx.pegatina(dibujar, {ancho, alto, px, borde, curva, brillo})` | pegatina troquelada con borde blanco (con `curva` = radio, se dobla sobre una lata o un tubo) |
| `ctx.etiquetaCilindro(textura, {radio, alto, arco, desde, y, brillo})` | etiqueta envuelta en un cilindro (el centro de la textura mira a +z) |
| `ctx.texto3d('Texto', {tam, fondo, bisel, mat})` · `ctx.letras3d('HOLA', {tam, fondo, mats})` | texto con volumen (Archivo Black, con tildes) |
| `ctx.neon(puntos, {color, grosor, intensidad, cerrado})` · `ctx.neonTexto('CINE', {tam, color, grosor, intensidad})` | **neón de verdad**: tubo con la forma de la línea o del contorno de cada letra. `grupo.userData.material` para encenderlo/parpadear |
| `ctx.grupo(a, b, …)` · `ctx.sombras(obj, proyecta, recibe)` | agrupar · cambiar sombras de un grupo |

## Partículas (deterministas; llama `.pintar(t, fuerza)` en `pintar`)
- `ctx.particulas({tipo, cantidad, centro, zona:[ancho, alto, fondo], color | colores, tam, velocidad, intensidad, semilla})`:
  `motas` (puntos de luz que flotan → con desenfoque, **bokeh**) · `chispas` (con gravedad, brillan) · `burbujas` (de jabón/gas, con brillo de borde) · `gotas` (caen) · `confeti` (dan vueltas).
- `ctx.vapor({origen, cantidad, altura, ancho, tam, color, opacidad, velocidad})` → vapor/humo.

## Postproceso (`ajustes.post` y `ctx.post`)
Valores por defecto (buenos para casi todo; cámbialos en `ajustes.post`):
```js
post: {
  exposicion: 1, tonemap: 'aces',                       // 'aces' (cine, contraste) · 'agx' (suave) · 'neutro' (colores de marca exactos)
  bloom: { fuerza: 0.35, radio: 0.55, umbral: 1.0 },    // lo que pasa de «umbral» irradia: luces 2-8, neón 5-8
  ao: { fuerza: 1, radio: 0.35 },                       // oclusión ambiental: rincones y contactos oscuros
  dof: { apertura: 0.25, foco: null, max: 18 },         // desenfoque por distancia (bokeh); foco null = lo que mira la cámara
  maqueta: { fuerza: 0, foco: 0.5, ancho: 0.18 },       // franja nítida horizontal (tilt-shift): 0,6-1 en maquetas
  movimiento: { muestras: 8, obturador: 0.5 },          // desenfoque de movimiento (solo con tarjeta y calidad final)
  grano: 0.035, vineta: 0.28, aberracion: 0.8,
  grado: { contraste: 1.04, saturacion: 1.04, temperatura: 0, sombras: '#1a3a5c', luces: '#ffcf9a', mezcla: 0.12 },
}
```
- En `pintar` puedes animar cualquier valor: `ctx.post.ajustar({ maqueta: { fuerza: 0.8 }, bloom: { fuerza: 0.6 } })`.
- `ctx.post.brillo({fuerza, radio})` y `ctx.post.maqueta({foco, fuerza, ancho})` (versión 1) siguen valiendo y devuelven controles.
- El tone mapping cambia algo los colores (ACES oscurece y satura los medios): mira la hoja y ajusta; para un color de marca exacto, `tonemap: 'neutro'`.

## Capa 2D: rótulos, títulos y cifras (tipografía Inter, siempre nítida encima de los efectos)
```js
const r = ctx.rotulo({ texto: 'Extrusor', sub: 'funde a 200 °C', num: 2, en: pieza, desplaza: [0, 0.4, 0],
                       lado: 'derecha'|'izquierda'|'arriba'|'abajo', dist: 150, tema: 'claro'|'oscuro', acento: '#ff5a36',
                       color, fijo: [0.7, 0.3], tam: 28, estilo: 'fino'|'caja' });
const T = ctx.titulo({ texto: 'Línea 1\nLínea 2', sub: 'subtítulo', etiqueta: 'paso 1', pos: 'arriba-izquierda'|'arriba'|'abajo'|'abajo-izquierda'|'centro',
                       tam: 120, color, colorSub, colorEtiqueta, sombra: true, x, y, efecto: 'letras'|'tracking'|'linea',
                       fuente: '"Archivo Black"', peso: 400, espaciado: -0.025, estiloEtiqueta: 'texto'|'pastilla' });
const C = ctx.cifra({ en: pieza, desplaza: [0, 1, 0], prefijo, sufijo: ' €', decimales, tam: 64, color, pie: 'De 2022 a hoy' });
// en pintar: r.mostrar(ctx.entre(t, 2, 3) - ctx.entre(t, 5, 5.4));  T.mostrar(ctx.entre(t, 8, 9.2));  C.mostrar(1, 12500 * ctx.entre(t, 1, 4, 'salida'));
```
- **Rótulo fino** (por defecto): punto de anclaje con anillo · línea guía fina con codo · círculo numerado de trazo · texto en versalitas con espaciado que se escribe letra a letra · subtítulo fino. `tema: 'oscuro'` = texto blanco (para fondos oscuros); sobre colores vivos usa `color` y `acento` de la tinta de la marca. `estilo: 'caja'` = tarjeta blanca de la versión 1.
- **Título**: por defecto entra letra a letra con desenfoque (`efecto: 'letras'`); etiqueta en versalitas de color con raya. Para marcas: `fuente: '"Archivo Black"', peso: 400`.
- `en` puede ser un objeto 3D (lo sigue) o `[x,y,z]`; `fijo` pone el texto en un sitio fijo de la pantalla (0-1) y la línea va a la pieza.
- `ctx.numero(12500)` → «12.500». `ctx.puntoPantalla(obj)` → `{x, y}` en píxeles.

## Rendimiento
- **Con tarjeta gráfica** (lo normal): 0,05-0,15 s por fotograma a 1080p con todo (8 subfotogramas, AO, bokeh, bloom). Un vídeo de 15 s ≈ 1 minuto. Con NVIDIA, la guardia térmica puede pausar unos segundos: es normal.
- **Sin tarjeta** (procesador): se rebaja solo (sin desenfoque de movimiento ni AO, bokeh con menos muestras, resplandor y maqueta en 2D). 1-3 s por fotograma: avisa al usuario.
- Muchas piezas iguales → `ctx.instancias`. Si se mueven en `pintar`, `frustumCulled = false` (ya viene así).
- Vidrio, hielo, agua y burbujas usan transmisión real con tarjeta: cuestan un pase extra, no pasa nada; en CPU pasan a transparentes simples.
