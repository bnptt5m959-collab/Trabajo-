---
name: motion-3d
description: Crea motion graphics 3D (MP4) con calidad de estudio hechos 100 % con código en el ordenador del usuario con three.js — escena con objetos con volumen, materiales, luz de cine, profundidad de campo, resplandor y una cámara que se mueve — sin generadores de vídeo, sin créditos ni claves. Úsala cuando el usuario escriba «/motion-3d», pida un «motion 3D», «motion graphic en 3D», «animación 3D de…», «explica en 3D cómo funciona…», «anuncio 3D de un producto», «vídeo 3D con three.js», quiera usar un estilo de la galería («/motion-3d estilo:04 …»), modelar un motion a partir de un vídeo de referencia, o pasar un motion 2D a 3D. Para ver los estilos: /galeria-3d.
---

# Motion 3D

El usuario te pide un tema («explica cómo funciona una impresora 3D, 15 s, 16:9») y tú le devuelves un **MP4 de motion graphics 3D con aspecto de estudio**. Todo se hace en su ordenador: tú escribes un archivo `escena.js` y `motor/hacer.py` lo dibuja fotograma a fotograma con three.js (con la tarjeta gráfica si la hay) y lo monta en MP4.

Habla siempre en español llano. El usuario no tiene por qué saber nada de 3D: la dirección de arte es cosa tuya, y **el listón es el de un anuncio o una cabecera de estudio, no el de una demo técnica**.

`SKILL` = la carpeta donde está este archivo. Python se llama `python` en Windows y `python3` en Mac. Usa rutas completas en las órdenes.

## La idea que lo cambia todo

Un motion 3D «correcto» (formas lisas, aristas vivas, luz uniforme, escena vacía) parece **de juguete**. Lo que lo hace parecer de estudio no es el 3D, es la **dirección de arte**: luz con intención, óptica de cámara de cine, materiales con detalle, densidad, color cerrado y coreografía. El motor ya hace el trabajo pesado (desenfoque de movimiento, oclusión ambiental, bokeh, resplandor, tone mapping, grano); tu trabajo es **usarlo siempre** y seguir las seis reglas de abajo.

## Dirección de arte (REGLAS DURAS)

**1. Luz.** Nunca luz plana. Siempre:
- **Luces prácticas y emisivos** que brillan (bombillas, neón, pantallas, ventanas, faros, filamentos): `ctx.practica`, `ctx.neon`, `ctx.neonTexto`, `ctx.mat.luz(color, 3-8)`. Lo que pasa de 1 brilla con el bloom.
- **Luz de recorte** que separa al protagonista del fondo (borde luminoso detrás): `ctx.luces.producto({recortes: [cálido, frío]})` o luces detrás a los lados.
- **Contraste cálido/frío** (ámbar contra cian, sodio contra azul noche, vela contra luna).
- **Sombras suaves con contacto**: luz con sombra + `ctx.sombraContacto(objeto)` bajo cada objeto que toca el suelo.
- **Reflejos de entorno** en todo lo brillante: `ctx.entornoEstudio({paneles})` (tiras verticales = líneas de brillo en latas y botellas). Suelo brillante con `ctx.sueloEspejo` cuando el plató sea oscuro.

**2. Óptica.** Cámara de cine, no de visor 3D:
- **Profundidad de campo siempre**: `apertura` 0,25-0,4 en planos generales, 0,8-1 en macros, 1-1,3 en maquetas (+ `post.maqueta`). El foco va donde está la historia; usa **cambios de foco** entre claves.
- **Encuadres cerrados** (fov 24-32 ≈ 50-85 mm; macro fov 22-26 muy cerca). Nada de planos lejanos con la pieza pequeña en medio.
- **La cámara empuja, orbita o baja despacio con easing**; nunca quieta más de 1 s (`deriva` 0,03-0,1).
- **Desenfoque de movimiento** en lo rápido y en las transiciones: sale solo en calidad final; dale motivos (giros rápidos, caídas, pasadas de cámara).

**3. Materiales y detalle.**
- **Texturas** en todo lo que ocupe pantalla: `ctx.superficie('carton'|'madera'|'papel'|'tela'|'cepillado'|'asfalto'|'ruido')`, etiquetas y carteles con `ctx.textura2d`, pegatinas con `ctx.pegatina`, condensación con `ctx.texturas.condensacion`.
- **Bisel en todos los cantos** (`ctx.caja` ya lo pone; `ctx.cilindroBisel`, perfiles de `ctx.torno` con cuello, borde y fondo). Ninguna caja con arista viva.
- **Materiales distintos juntos**: metal + vidrio + plástico mate + tela. Agua, gotas, burbujas y vidrio con `ctx.brilloBorde` para que se lean sobre oscuro.
- **Densidad**: decenas de objetos pequeños que cuentan algo (gente diminuta, hielos, rodajas, cables, tornillos, carteles, aparatos en las azoteas, hojas). Una escena vacía es la señal número uno de «juguete».
- **Animación secundaria**: algo se mece, sube, cae o parpadea siempre (`ctx.particulas` motas/burbujas/chispas/confeti, `ctx.vapor`, lluvia, bombillas que se persiguen, neón que parpadea al encenderse).

**4. Color.** Paleta cerrada por pieza (3-5 colores + 1 acento) escrita arriba de la escena como constantes. Fondo en degradado (`ctx.fondo` lineal o radial). Tone mapping fílmico (`aces` por defecto; `neutro` si hay un color de marca que debe salir exacto). Gradación con sombras frías y luces cálidas (`post.grado`), **grano y viñeta sutiles** (ya vienen puestos). Nada de rojo/verde/azul puros.

**5. Tipografía.** Rótulos **finos** (el estilo por defecto: círculo numerado de trazo + línea guía fina con codo + versalitas con espaciado que se escriben letra a letra). Titulares grandes con movimiento y desenfoque (`efecto: 'letras'`), en Archivo Black para marcas. Jerarquía limpia: etiqueta pequeña en versalitas de color → titular → subtítulo fino. Máximo 2-3 rótulos a la vez, nunca encima del protagonista ni cortados por el borde.

**6. Coreografía.**
- **El protagonista se revela en el primer medio segundo** (entra, cae, se enciende o la cámara lo descubre ya en el fotograma 1).
- **Nada quieto más de 1 s.**
- **Anticipación y rebote**: `ctx.caida` con `aplastar`, `ease.anticipa`, `ctx.muelle`, temblor de cámara en los golpes.
- **Entradas escalonadas** (0,1-0,25 s entre piezas), nunca todo a la vez.
- **Plano final «de anuncio»** de 2-3 s: protagonista entero y bien iluminado en un tercio, titular con marca o idea en el otro tercio, cámara empujando despacio.

### Recetas de plató (punto de partida; ajústalas al tema)
- **Producto / anuncio** (latas, botellas, zapatillas, gadgets): fondo radial oscuro del color de la marca, `luces.producto` con recortes cálido/frío, `entornoEstudio` con tiras, `sueloEspejo` oscuro, `sombraContacto`, motas de bokeh al fondo, macro con apertura 0,8-1, plano final con la marca. Ejemplo completo: `estilos/10-lata-con-etiqueta`.
- **Maqueta / ciudad / lugar** (de noche): `luces.noche` + muchas `practica` (farolas, faros), neón, ventanas emisivas, asfalto mojado (`texturas.asfalto` + `sueloEspejo` con charcos), gente y coches diminutos, lluvia, `post.maqueta` 0,6-1 + apertura 1-1,3 desde arriba, bajada de grúa a pie de calle. Ejemplo completo: `estilos/07-maqueta-nocturna`.
- **Cómo funciona / despiece** (máquinas, aparatos): plató claro o medio (`luces.estudio` + recorte), piezas con material propio y bisel, vista explotada con entradas escalonadas, rótulos finos numerados, macro a la pieza clave con cambio de foco, chispas o vapor donde trabaje la máquina. Ejemplos completos: `estilos/04-vista-explotada` (despiece) y `estilos/03-boceto-a-objeto` (del boceto al objeto).
- **Datos** (cifras, crecimiento): objetos que representan el dato (monedas, edificios, columnas) con material rico y luz práctica, cifras grandes con `ctx.cifra`, cámara que recorre de menos a más. Ejemplo completo: `estilos/05-datos-en-rascacielos`.

## El flujo (síguelo en este orden)

**0. ¿Está lista?** Si no existe `SKILL/motor/entorno.json`, ejecuta `python SKILL/motor/preparar.py` (1-2 minutos la primera vez). Dirá si dibuja con la tarjeta gráfica o con el procesador.

**1. El encargo.** Saca del mensaje: tema, duración (por defecto **12 s**) y formato (**16:9** por defecto; «vertical», «reel», «short» o «tiktok» → 9:16). No preguntes nada más si ya hay tema. Si no hay tema, propón 5 ideas numeradas y espera.

**2. Elige el modo** (más abajo): (a) desde un tema, (b) con un estilo de la galería, (c) con un vídeo de referencia, (d) pasar un motion 2D a 3D.

**3. El guion visual y la dirección de arte.** Escribe en el chat, en pocas líneas: los **momentos** (qué se ve, qué rótulo sale y en qué segundo; el primero en el 0-0,5 s y el último, el plano de anuncio) y la **dirección de arte**: receta de plató, paleta (con sus colores), de dónde viene la luz (prácticas, recortes, cálido/frío), qué detalle y qué animación secundaria lleva. En los modos (a) y (b) sigue sin esperar (salvo que el usuario pida aprobarlo); en (c) y (d) espera su OK a las imágenes fijas (paso 5).

**4. La escena.** Antes de escribir tu primera escena de la conversación, **lee `SKILL/REFERENCIA.md`** (todo lo que da el motor) y la escena de ejemplo de la receta que vayas a usar (`estilos/10-lata-con-etiqueta` o `06-producto-y-su-mundo` para producto, `07-maqueta-nocturna` para lugares, `04-vista-explotada` para despieces, `05-datos-en-rascacielos` para datos; o la del estilo elegido). Todas las escenas de `estilos/` están hechas a la calidad que se pide: son la vara mínima. Escribe `escena.js` en una carpeta nueva `motion-3d/<nombre-corto>/` dentro de la carpeta en la que está abierto Claude Code (si no puedes escribir ahí, en la carpeta de Vídeos del usuario).

**5. Boceto y AUTORREVISIÓN (obligatoria).**
```
python SKILL/motor/hacer.py motion-3d/<nombre>/escena.js --boceto
```
Tarda segundos y crea `<nombre>-revision.jpg` (una imagen por momento). **Ábrela y puntúala con tus ojos**, de 0 a 2 en cada regla de la Dirección de arte:

| Regla | 0 | 2 |
|---|---|---|
| 1 Luz | plana, sin brillos | prácticas que brillan, recorte, cálido/frío, sombras de contacto, reflejos |
| 2 Óptica | todo nítido, plano lejano | desenfoque con foco donde está la historia, encuadres cerrados |
| 3 Materiales y detalle | colores lisos, aristas vivas, escena vacía | texturas, bisel, decenas de detalles, algo se mueve siempre |
| 4 Color | colores sueltos, fondo liso, quemado o empastado | paleta cerrada, degradado, ni quemados ni negros sin detalle |
| 5 Tipografía | rótulos cortados, encima de la pieza o por defecto | finos, legibles, sin tapar nada, jerarquía clara |
| 6 Coreografía | entra tarde, tramos quietos, final flojo | se revela en 0,5 s, escalonado, rebote, plano de anuncio |

Escribe la puntuación en el chat (una línea por regla con lo que falla). **Si no llega a 10 de 12, o si alguna regla tiene 0, corrige y repite el boceto.** Busca también los fallos típicos (abajo). Para ver un instante a tamaño real: `--fotograma 4.5`. En los modos (c) y (d), enseña la hoja al usuario y **espera su OK** antes de animar.

**6. El vídeo.**
```
python SKILL/motor/hacer.py motion-3d/<nombre>/escena.js
```
Con **tarjeta gráfica**: 0,05-0,15 s por fotograma a 1080p con todos los efectos (un vídeo de 15 s ≈ 1 minuto). Con NVIDIA hay una **guardia térmica**: si la tarjeta llega a 78 °C, para hasta que baja a 68 °C (lo dice en pantalla y guarda un registro de temperaturas en `.trabajo/`); es normal y protege el ordenador. Sin tarjeta, con el **procesador**: calidad rebajada sola y 1-3 s por fotograma; avisa al usuario de cuánto va a tardar. Al acabar escribe la ruta del `VÍDEO`, la `HOJA` y, si hay algo raro, líneas `AVISO:` o `REVISA:`. **Vuelve a mirar la hoja** (ya con desenfoque de movimiento) y arregla lo que veas antes de entregar.

**7. Entrega.** Ruta completa del MP4, duración, y una línea de lo que puede pedirte ahora («más lento al principio», «otro color de marca», «en vertical», «cambia el rótulo 2»).

**8. Cambios hablando.** No empieces de cero: edita la `escena.js` que ya existe y vuelve a lanzar `hacer.py`. Para el vertical sin tocar nada: `--formato 9:16` (revisa el boceto: en vertical cabe menos de ancho).

## Los cuatro modos

**(a) Desde un tema.** Inventa la escena con la receta de plató que mejor le vaya: 1 protagonista, 3-5 piezas o pasos, paleta cerrada y mucho detalle alrededor. Explica el «cómo funciona» con rótulos finos numerados que aparecen en orden mientras la cámara va de pieza en pieza, con un macro en la pieza clave.

**(b) Con un estilo de la galería** (`/motion-3d estilo:04 (Vista explotada). Mi tema: …`). Lee `SKILL/estilos/<NN-nombre>/ficha.json` y su `escena.js`. **Copia la escena a la carpeta del usuario y úsala de base**: conserva la luz, la cámara, los materiales, el postproceso y el ritmo del estilo, y cambia el contenido (objetos, piezas, rótulos, colores si hace falta) por el tema del usuario. Ajusta la duración repartiendo los momentos.

**(c) Con un vídeo de referencia** que aporta el usuario:
1. Mídelo: `python SKILL/motor/medir.py "<vídeo>"`. Saca una hoja de contacto (un fotograma cada medio segundo) y un `medidas.json` con **números**: duración, cortes por segundo, % de movimiento, pausas, picos, brillo, contraste, temperatura de color y paleta.
2. **Mira la hoja de contacto**: cómo entra la cámara, cuántos planos, qué luz (dura/suave, cálida/fría, prácticas, recortes), qué óptica (desenfoque, distancia focal), qué materiales y detalle, cómo aparecen las cosas, qué tipografía.
3. Escribe al usuario las medidas en una tabla corta y el **método** que vas a copiar.
4. **Coge solo el método.** NO copies marcas, logos, personajes, escenario, textos ni la paleta exacta: paleta propia de la misma familia.
5. Monta la escena con su tema y ese ritmo. Boceto con un momento por plano de la referencia, **enséñaselo y espera su OK**.
6. Haz el vídeo y mídelo: `python SKILL/motor/medir.py "<tu vídeo>" --comparar "<vídeo de referencia>-medidas/medidas.json"`. Ajusta lo que se aleje más de un 25 % antes de entregar.

**(d) Pasar un motion 2D a 3D.** **Mantén el guion, los textos, los tiempos y la composición**. Cambia cada forma plana por un objeto con volumen, material y bisel, quita las sombras pintadas y pon luces que las proyecten, añade profundidad de campo y movimiento de cámara (una entrada, un giro suave y un plano final). Boceto con un momento por escena del 2D, **enséñaselo y espera su OK**, y luego el vídeo.

## Cómo es una escena

```js
// escena.js
export const ajustes = { duracion: 12, formato: '16:9', post: { bloom: { fuerza: 0.4, umbral: 2 }, grado: { sombras: '#0f6a72', luces: '#ffcf8a' } } };

export function crear(THREE, ctx) {
  // Paleta cerrada
  const FONDO = '#0b2523', MARCA = '#ffd31f', TINTA = '#0a3d3b', CALIDO = '#ffae4f', FRIO = '#4fe0ff';
  ctx.fondo({ tipo: 'radial', centro: '#1b4a45', borde: '#020707' });
  ctx.entornoEstudio({ paneles: [{ pos: [-6, 3, 5], tam: [3, 7], color: '#fff1dc', fuerza: 2.4 }, { pos: [7, 3, 2], tam: [0.9, 9], color: '#ffffff', fuerza: 3 }] });
  ctx.luces.producto({ centro: [0, 1, 0], recortes: [CALIDO, FRIO] });
  ctx.sueloEspejo({ color: '#081a18', reflejo: 0.3, rugosidad: 0.6 });

  const taza = ctx.torno([[0,0],[0.5,0],[0.6,0.9],[0.55,0.92],[0.45,0.1],[0,0.1]], ctx.mat.ceramica('#ffffff'));
  ctx.escena.add(taza);
  ctx.sombraContacto(taza, { radio: 0.7 });
  const vapor = ctx.vapor({ origen: [0, 0.9, 0] }); ctx.escena.add(vapor);
  const motas = ctx.particulas({ tipo: 'motas', centro: [0, 2, -5], zona: [12, 5, 3], colores: [CALIDO, FRIO] }); ctx.escena.add(motas);

  const cam = ctx.camaraPorClaves([
    { t: 0, pos: [3, 1.6, 5], mira: [0, 0.6, 0], fov: 30, apertura: 0.35 },
    { t: 5, pos: [0.9, 1.0, 1.6], mira: [0, 0.7, 0], fov: 24, apertura: 0.9 },     // macro con poco foco
    { t: 12, pos: [-0.6, 1.3, 5.6], mira: [-0.9, 0.6, 0], fov: 28, apertura: 0.35 }, // plano de anuncio
  ], { deriva: 0.04 });
  const r1 = ctx.rotulo({ texto: 'Cerámica', sub: 'esmalte brillante', num: 1, en: taza, desplaza: [0.5, 0.8, 0], tema: 'oscuro', acento: MARCA });
  const T = ctx.titulo({ texto: 'Mañanas', etiqueta: 'Nueva taza', sub: 'hecha a mano', x: 0.08, y: 0.32, tam: 150, color: '#fff6df', colorEtiqueta: MARCA, fuente: '"Archivo Black"', peso: 400 });

  return {
    momentos: [{ t: 0.4, nombre: 'aparece' }, { t: 5, nombre: 'macro' }, { t: 11.5, nombre: 'plano final' }],
    pintar(t) {                 // SOLO depende de t
      cam(t);
      ctx.entrada(taza, t, 0.0, { desde: 'abajo', dur: 0.5 });
      vapor.pintar(t); motas.pintar(t);
      r1.mostrar(ctx.entre(t, 3, 4) - ctx.entre(t, 7, 7.4));
      T.mostrar(ctx.entre(t, 9, 10.2));
    },
  };
}
```

Reglas duras de código:
- `pintar(t)` depende **solo de t** (se llama varias veces por fotograma para el desenfoque de movimiento): nada de `Math.random()`, `Date.now()` ni `requestAnimationFrame` dentro. Para azar, `const rnd = ctx.azar(7)` en `crear` y guarda los valores.
- Pon **4-6 `momentos`**: son las imágenes de la hoja de revisión.
- Todo texto en español con tildes y eñes (las tipografías las tienen).

## Fallos típicos (búscalos en la hoja)

- **Quemado**: zonas blancas sin detalle o una niebla de resplandor → baja emisivos y luces prácticas, sube `bloom.umbral` (1,5-2,2) o baja `bloom.fuerza`.
- **Agua, vidrio o burbujas negros** sobre fondo oscuro → `ctx.brilloBorde` y algo de `emissive` frío; los hielos, algo esmerilados (`roughness` 0,2).
- Reflejos rectangulares raros en el suelo → sube la `rugosidad` del suelo espejo (0,5-0,7).
- Objetos que flotan (sin sombra de contacto) o que se atraviesan.
- Rótulos encima de la pieza, cortados por el borde o encima de otros (cambia `lado`, `dist` o usa `fijo`). Texto claro sobre fondo claro (usa `tema`/`color`).
- La cámara atraviesa un objeto o se planta detrás de una farola/pared: revisa los planos cercanos al suelo.
- Marca o texto principal cortado por la curvatura de una lata/botella: hazlo más estrecho o gira el objeto.
- Todo nítido (se te olvidó la `apertura`) o el foco en el sitio equivocado.
- Escena vacía o quieta: añade detalle y animación secundaria.
- `AVISO: la imagen está quieta…` → añade deriva o una clave de cámara en ese tramo.

## La galería de estilos

`/galeria-3d` (o `python SKILL/motor/galeria.py`) abre en el navegador una página con los estilos: un vídeo en bucle, para qué sirve cada uno y el botón **«Usar este estilo»**, que copia al portapapeles `/motion-3d estilo:NN (nombre). Mi tema: …`. Cada estilo está en `SKILL/estilos/NN-nombre/` con `escena.js` (ejemplo completo), `ficha.json` (cómo se construye: luz, cámara, materiales, ritmo) y `previa.mp4`.

Para añadir un estilo nuevo: crea `SKILL/estilos/11-<nombre>/` con su `escena.js` y `ficha.json`, haz `hacer.py …/escena.js --previa` y vuelve a abrir la galería.

## Órdenes del motor

| Orden | Para qué |
|---|---|
| `hacer.py escena.js` | el vídeo entero, calidad final (MP4 junto a la escena) |
| `hacer.py escena.js --boceto` | solo la hoja de revisión (segundos) |
| `hacer.py escena.js --fotograma 3.2 6` | fotogramas sueltos a tamaño real (calidad final) |
| `hacer.py escena.js --calidad boceto` | vídeo rápido sin desenfoque de movimiento (para revisar el ritmo) |
| `hacer.py escena.js --formato 9:16` | vertical (también `1:1` y `4:5`) |
| `hacer.py escena.js --fps 25` · `--tramo 2 5` | menos fotogramas · solo un trozo |
| `hacer.py escena.js --previa` | 1280×720 (hasta 12 s): previa de galería |
| `hacer.py escena.js --cpu` · `--gpu` | forzar el procesador · volver a probar la tarjeta gráfica |
| `hacer.py escena.js --salida ruta.mp4` | otro nombre o carpeta |
| `medir.py vídeo.mp4 [--comparar medidas.json]` | medir una referencia (modo c) |
| `galeria.py` | abrir la galería |

El MP4 sale en H.264 (yuv420p, +faststart): se abre en cualquier editor, móvil o red social. No lleva sonido. Solo se dibuja un vídeo cada vez (si hay otro, espera en cola solo).

## Qué hay en esta carpeta

- `motor/` — `hacer.py` (dibuja y monta; elige tarjeta gráfica o procesador; guardia térmica), `preparar.py` (instala y detecta la tarjeta), `medir.py` (mide vídeos), `galeria.py` (abre la galería), `pagina/` (el motor 3D y su postproceso), `three/` (three.js r170 y sus complementos, licencia MIT, sin internet), `fuentes/` (Inter y Archivo Black, licencia OFL).
- `REFERENCIA.md` — todo lo que da `ctx` (léela antes de escribir).
- `estilos/` — los estilos de la galería.
- `prompts/prompts.md` — prompts de ejemplo.
- `galeria/index.html` — la galería (la regenera `galeria.py`).
- `LICENCIAS.md` — licencias de three.js, sus complementos y las fuentes.
