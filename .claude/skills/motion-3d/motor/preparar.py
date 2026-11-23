#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preparar.py · deja lista la skill «motion-3d» en este ordenador.

Qué hace (él solo, sin preguntar nada):
  1. Crea un entorno de Python propio dentro de la carpeta de la skill (.venv).
  2. Instala lo que necesita: el navegador que dibuja (playwright), el montador
     de vídeo (imageio-ffmpeg trae ffmpeg), Pillow y numpy (para medir vídeos).
  3. Busca un navegador: usa el Chrome o el Edge que ya tengas. Solo si no hay
     ninguno descarga Chromium.
  4. Comprueba que ese navegador dibuja 3D (WebGL) por PROCESADOR (respaldo que
     vale en cualquier ordenador) y si además puede usar la TARJETA GRÁFICA
     (Direct3D en Windows, Metal en Mac): con tarjeta, el vídeo sale con todos los
     efectos (desenfoque de movimiento, oclusión, bokeh) y diez veces más rápido.
     Con tarjeta NVIDIA, hacer.py vigila la temperatura (guardia térmica).

Se puede ejecutar todas las veces que haga falta: si ya está todo, tarda un par
de segundos y no toca nada.

Uso:
    python motor/preparar.py            (en Mac: python3 motor/preparar.py)
    uv run motor/preparar.py            (si no tienes Python pero sí uv)
"""
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

MOTOR = Path(__file__).resolve().parent
RAIZ = MOTOR.parent
VENV = RAIZ / ".venv"
ENTORNO = MOTOR / "entorno.json"
PAQUETES = ["playwright>=1.40", "imageio-ffmpeg>=0.4.9", "pillow>=10", "numpy>=1.24"]
MODULOS = ["playwright", "imageio_ffmpeg", "PIL", "numpy"]

for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def decir(texto):
    """Mensajes cortos y en llano; nunca falla por la codificación de la consola."""
    try:
        print(texto, flush=True)
    except UnicodeEncodeError:
        print(texto.encode("ascii", "replace").decode("ascii"), flush=True)


def python_del_venv():
    if os.name == "nt":
        return VENV / "Scripts" / "python.exe"
    return VENV / "bin" / "python"


def ejecutar(orden, **kw):
    """Lanza una orden y devuelve (código, salida)."""
    try:
        r = subprocess.run(orden, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                           text=True, encoding="utf-8", errors="replace", **kw)
        return r.returncode, r.stdout or ""
    except FileNotFoundError:
        return 127, "no encontrado: %s" % orden[0]
    except subprocess.TimeoutExpired:
        return 124, "se ha pasado de tiempo"


def venv_completo():
    py = python_del_venv()
    if not py.exists():
        return False
    codigo, _ = ejecutar([str(py), "-c", "import " + ", ".join(MODULOS)])
    return codigo == 0


def crear_venv():
    uv = shutil.which("uv")
    py = python_del_venv()
    if not py.exists():
        decir("· Creando el entorno de la skill…")
        if uv:
            codigo, salida = ejecutar([uv, "venv", str(VENV)])
            if codigo != 0:
                # uv puede traer su propio Python si el del sistema no vale
                codigo, salida = ejecutar([uv, "venv", "--python", "3.12", str(VENV)])
        else:
            codigo, salida = ejecutar([sys.executable, "-m", "venv", str(VENV)])
        if codigo != 0 or not py.exists():
            decir("No he podido crear el entorno de Python. Detalle:\n" + salida[-1500:])
            sys.exit(1)

    decir("· Instalando el dibujante 3D y el montador de vídeo (1-2 minutos la primera vez)…")
    if uv:
        codigo, salida = ejecutar([uv, "pip", "install", "--python", str(py)] + PAQUETES)
        if codigo != 0:
            # segundo intento con pip normal (por si uv no puede con algo)
            ejecutar([str(py), "-m", "ensurepip", "--upgrade"])
            codigo, salida = ejecutar([str(py), "-m", "pip", "install", "--quiet"] + PAQUETES)
    else:
        ejecutar([str(py), "-m", "pip", "install", "--quiet", "--upgrade", "pip"])
        codigo, salida = ejecutar([str(py), "-m", "pip", "install", "--quiet"] + PAQUETES)
    if codigo != 0:
        decir("No he podido instalar las piezas. ¿Hay conexión a internet? Detalle:\n" + salida[-1500:])
        sys.exit(1)


# Las mismas opciones que usa hacer.py: WebGL por software (SwiftShader), nunca la GPU.
PRUEBA_NAVEGADOR = r"""
import json, sys
from playwright.sync_api import sync_playwright
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
        "--disable-gpu-compositing", "--force-device-scale-factor=1"]
canales = ["chrome", "msedge", "chromium-propio"]
elegido, motor3d = None, None
with sync_playwright() as p:
    for canal in canales:
        try:
            if canal == "chromium-propio":
                nav = p.chromium.launch(headless=True, args=ARGS)
            else:
                nav = p.chromium.launch(headless=True, channel=canal, args=ARGS)
            pag = nav.new_page()
            pag.set_content("<canvas id=c width=64 height=64></canvas>")
            info = pag.evaluate('''() => {
                const gl = document.getElementById('c').getContext('webgl2');
                if (!gl) return null;
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
            }''')
            nav.close()
            if info:
                elegido, motor3d = canal, info
                break
        except Exception as e:
            continue
print(json.dumps({"canal": elegido, "webgl": motor3d}))
"""


def buscar_navegador():
    py = python_del_venv()
    decir("· Buscando un navegador que dibuje 3D (Chrome o Edge)…")

    def probar():
        codigo, salida = ejecutar([str(py), "-c", PRUEBA_NAVEGADOR], timeout=180)
        try:
            return json.loads(salida.strip().splitlines()[-1])
        except Exception:
            return {}

    res = probar()
    if not res.get("canal"):
        decir("· No encuentro Chrome ni Edge que valgan: descargo Chromium (solo esta vez, unos 150 MB)…")
        ejecutar([str(py), "-m", "playwright", "install", "chromium"])
        res = probar()
    if not res.get("canal"):
        decir("No he conseguido abrir ningún navegador con 3D. Instala Google Chrome y vuelve a ejecutar esto.")
        sys.exit(1)
    return res["canal"], res.get("webgl") or ""


PRUEBA_GPU = r"""
import json, sys
from playwright.sync_api import sync_playwright
canal, angle = sys.argv[1], sys.argv[2]
ARGS = [angle, "--enable-gpu", "--ignore-gpu-blocklist", "--force_high_performance_gpu"]
res = None
with sync_playwright() as p:
    try:
        nav = p.chromium.launch(headless=True, args=ARGS) if canal == "chromium-propio" else p.chromium.launch(headless=True, channel=canal, args=ARGS)
        pag = nav.new_page()
        pag.set_content("<canvas id=c width=64 height=64></canvas>")
        res = pag.evaluate('''() => {
            const gl = document.getElementById('c').getContext('webgl2', {powerPreference: 'high-performance'});
            if (!gl) return null;
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        }''')
        nav.close()
    except Exception:
        res = None
print(json.dumps({"gpu": res}))
"""


def buscar_gpu(canal):
    """¿Puede ese navegador dibujar 3D con la tarjeta gráfica? Devuelve su nombre o False."""
    py = python_del_venv()
    angle = "--use-angle=metal" if sys.platform == "darwin" else ("--use-angle=d3d11" if os.name == "nt" else "--use-angle=gl")
    codigo, salida = ejecutar([str(py), "-c", PRUEBA_GPU, canal, angle], timeout=120)
    try:
        gpu = json.loads(salida.strip().splitlines()[-1]).get("gpu")
    except Exception:
        gpu = None
    if not gpu or any(x in gpu.lower() for x in ("swiftshader", "llvmpipe", "software", "basic render")):
        return False
    return gpu


def probar_ffmpeg():
    py = python_del_venv()
    codigo, salida = ejecutar([str(py), "-c",
                               "import imageio_ffmpeg, subprocess; e = imageio_ffmpeg.get_ffmpeg_exe(); "
                               "subprocess.run([e, '-version'], check=True, stdout=subprocess.DEVNULL); print(e)"])
    if codigo != 0:
        decir("El montador de vídeo (ffmpeg) no arranca. Detalle:\n" + salida[-800:])
        sys.exit(1)


def main():
    t0 = time.time()
    if sys.version_info < (3, 9):
        decir("Hace falta Python 3.9 o más nuevo. Instala Python desde python.org (o «uv») y repite.")
        sys.exit(1)

    ya = venv_completo() and ENTORNO.exists()
    if ya and "--forzar" not in sys.argv:
        decir("Todo listo: la skill ya estaba preparada. Escribe /motion-3d para empezar.")
        return

    if not venv_completo():
        crear_venv()
    if not venv_completo():
        decir("La instalación no ha quedado completa. Vuelve a ejecutar este mismo archivo.")
        sys.exit(1)

    canal, webgl = buscar_navegador()
    probar_ffmpeg()
    por_cpu = "swiftshader" in webgl.lower()
    decir("· Probando si puede usar la tarjeta gráfica…")
    gpu = buscar_gpu(canal)
    ENTORNO.write_text(json.dumps({"canal": canal, "webgl": webgl, "por_cpu": por_cpu, "gpu": gpu},
                                  ensure_ascii=False, indent=2), encoding="utf-8")

    nombres = {"chrome": "Google Chrome", "msedge": "Microsoft Edge", "chromium-propio": "Chromium"}
    decir("")
    decir("Todo listo en %d segundos." % round(time.time() - t0))
    decir("  · Dibuja con: %s" % nombres.get(canal, canal))
    if gpu:
        guardia = " · con guardia térmica (para a 78 °C)" if shutil.which("nvidia-smi") else ""
        decir("  · 3D por: la tarjeta gráfica (%s)%s" % (gpu, guardia))
    else:
        decir("  · 3D por: el procesador (no hay tarjeta gráfica que valga: los vídeos salen con menos efectos y tardan más)")
    decir("Ya puedes escribir /motion-3d y pedir tu motion (o /galeria-3d para ver los estilos).")


if __name__ == "__main__":
    main()
