# Licencias de lo que va dentro

| Qué | Dónde | Licencia |
|---|---|---|
| three.js r170 (motor 3D) | `motor/three/three.module.min.js` | MIT — texto completo en `motor/three/LICENSE` |
| Complementos de three.js r170 (paquete oficial `three@0.170.0` de npm): `RoundedBoxGeometry`, `TextGeometry`, `RoomEnvironment`, `TTFLoader`, `FontLoader`, `EffectComposer`, `RenderPass`, `ShaderPass`, `OutputPass`, `Pass`/`FullScreenQuad`, `UnrealBloomPass` (resplandor), `GTAOPass` + `GTAOShader` + `PoissonDenoiseShader` (oclusión ambiental), `SimplexNoise`, `Reflector` (suelo espejo), `RectAreaLightUniformsLib` + `RectAreaLightTexturesLib` (cajas de luz), `BokehPass`/`BokehShader`, `TiltShift`, `CopyShader`, `LuminosityHighPassShader`, `OutputShader`, `BufferGeometryUtils` | `motor/three/addons/` | MIT (los mismos autores y el mismo texto de `motor/three/LICENSE`) |
| opentype.js 1.3.4 (lee las fuentes para el texto 3D; viene con three.js) | `motor/three/addons/libs/opentype.module.js` | MIT (aviso en la cabecera del archivo) |
| Inter (tipografía de rótulos y títulos) | `motor/fuentes/Inter.ttf` | SIL Open Font License 1.1 — `motor/fuentes/Inter-OFL.txt` |
| Archivo Black (tipografía del texto 3D y de marcas) | `motor/fuentes/ArchivoBlack.ttf` | SIL Open Font License 1.1 — `motor/fuentes/ArchivoBlack-OFL.txt` |

El resto es código propio de esta skill: motor, postproceso (profundidad de campo con bokeh escrita a partir de la técnica pública «bokeh en una sola pasada» de Dennis Gustafsson, 2018; desenfoque de movimiento por acumulación; tone mapping ACES/AgX/neutro con las fórmulas públicas que usa three.js), texturas procedurales, escenas de los estilos, galería y guías. Nada se descarga de internet al dibujar.
