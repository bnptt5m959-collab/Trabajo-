# Instalar la skill «motion-3d»

**Claude: estas instrucciones son para ti.** El usuario te ha pasado `motion-3d.zip` y te ha pedido que instales la skill. Hazlo tú todo, sin pedirle que escriba órdenes, y háblale en español llano.

## Qué hay en el zip
```
INSTALAR.md        ← este archivo
motion-3d/         ← la skill (SKILL.md, REFERENCIA.md, motor/, estilos/, galeria/, prompts/)
galeria-3d/        ← la orden /galeria-3d (abre la galería de estilos)
```

## Pasos

**1. Copia las dos carpetas `motion-3d` y `galeria-3d` dentro de la carpeta de skills del usuario**, de modo que queden:

`~/.claude/skills/motion-3d/SKILL.md` y `~/.claude/skills/galeria-3d/SKILL.md`

(`~` es la carpeta personal del usuario: `C:\Users\<nombre>` en Windows, `/Users/<nombre>` en Mac). Crea `~/.claude/skills` si no existe. Si ya había una versión anterior, sustituye sus archivos pero **no borres** la subcarpeta `motion-3d/.venv` (así no hay que reinstalar nada).

- Windows (PowerShell): `Expand-Archive -Path "<ruta del zip>" -DestinationPath "$env:TEMP\motion-3d-zip" -Force` y luego `New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null; Copy-Item -Recurse -Force "$env:TEMP\motion-3d-zip\motion-3d","$env:TEMP\motion-3d-zip\galeria-3d" "$env:USERPROFILE\.claude\skills\"`.
- Mac / Linux: `unzip -o "<ruta del zip>" -d /tmp/motion-3d-zip` y luego `mkdir -p ~/.claude/skills && cp -R /tmp/motion-3d-zip/motion-3d /tmp/motion-3d-zip/galeria-3d ~/.claude/skills/`.

**2. Prepara la skill** (crea su entorno e instala lo que necesita; 1-2 minutos la primera vez):

- Windows: `python "$env:USERPROFILE\.claude\skills\motion-3d\motor\preparar.py"`
- Mac / Linux: `python3 ~/.claude/skills/motion-3d/motor/preparar.py`

Si el ordenador no tiene Python (la orden falla con «no se reconoce» o «not found»):
- Si tiene `uv`: `uv run --python 3.12 <ruta>/motor/preparar.py`
- Si tampoco: instala `uv` con su instalador oficial (Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` · Mac/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`), abre una terminal nueva y usa la orden anterior. `uv` trae su propio Python.

`preparar.py` usa el Chrome o el Edge que ya tenga el ordenador (solo descarga Chromium si no hay ninguno), comprueba si puede dibujar el 3D con la **tarjeta gráfica** (Direct3D en Windows, Metal en Mac: todos los efectos y unas diez veces más rápido; con tarjeta NVIDIA vigila la temperatura) o, si no, con el **procesador** (calidad rebajada sola), y termina diciendo «Todo listo» y con cuál dibuja.

Si estás **actualizando** una versión anterior, ejecuta `preparar.py --forzar` (misma orden, añadiendo `--forzar`) para que vuelva a detectar la tarjeta gráfica.

**3. Avisa al usuario.** Dile, más o menos:

> Ya está instalada. Escribe **/galeria-3d** para ver los 10 estilos, o **/motion-3d** y tu tema (por ejemplo: «explica cómo funciona una impresora 3D, 15 segundos, 16:9»).

Si `/motion-3d` o `/galeria-3d` no le aparecen en la lista, que cierre y vuelva a abrir Claude Code: las skills nuevas se cargan al empezar.

## Qué instala y qué necesita
- Necesita: conexión a internet solo para instalar, y Google Chrome o Microsoft Edge (si no hay, descarga Chromium).
- Instala, dentro de la propia carpeta de la skill (`.venv`), cuatro paquetes de código abierto: `playwright` (abre el navegador sin ventana), `imageio-ffmpeg` (monta el MP4), `pillow` y `numpy` (hojas de revisión y medidas de vídeos).
- Lleva dentro three.js r170 y sus complementos (licencia MIT) y las fuentes Inter y Archivo Black (licencia OFL): funciona sin internet.
- No pide claves, cuentas ni pagos. Para desinstalar, basta con borrar `~/.claude/skills/motion-3d` y `~/.claude/skills/galeria-3d`.
