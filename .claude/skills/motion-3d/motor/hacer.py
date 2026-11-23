#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hacer.py · convierte una escena 3D (escena.js) en un vídeo MP4.

Uso:
    python motor/hacer.py mi-motion/escena.js                  (el vídeo entero)
    python motor/hacer.py mi-motion/escena.js --boceto         (solo la hoja de revisión: una imagen por momento)
    python motor/hacer.py mi-motion/escena.js --fotograma 4.5  (un fotograma suelto a tamaño real)
    python motor/hacer.py escena.js --formato 9:16             (vertical para Reels/Shorts/TikTok)
    python motor/hacer.py escena.js --previa                   (1280×720, hasta 12 s: la previa de la galería)
    python motor/hacer.py escena.js --tramo 2 4                (solo del segundo 2 al 4)

    python motor/hacer.py escena.js --calidad boceto           (rápido: sin desenfoque de movimiento)
    python motor/hacer.py escena.js --cpu                      (forzar el procesador aunque haya tarjeta gráfica)

Cómo funciona: abre Chrome/Edge sin ventana, carga la escena, pide cada
fotograma con pintar(t), lo captura en JPEG y se lo pasa a ffmpeg, que monta un
MP4 H.264 normal (yuv420p, +faststart) que abre cualquier programa.
El 3D se dibuja con la TARJETA GRÁFICA si la hay (WebGL por hardware: Direct3D
en Windows, Metal en Mac) y si no con el PROCESADOR (SwiftShader), con la
calidad rebajada sola. Con tarjeta NVIDIA hay una GUARDIA TÉRMICA: mira la
temperatura cada 2 s y, si llega a 78 °C, deja de dibujar hasta que baja a 68 °C
(guarda un registro de temperaturas por vídeo). Solo se hace un vídeo cada vez:
si hay otro en marcha, espera su turno.
"""
import argparse
import asyncio
import base64
import io
import json
import mimetypes
import os
import subprocess
import sys
import time
from pathlib import Path

MOTOR = Path(__file__).resolve().parent
RAIZ = MOTOR.parent
VENV = RAIZ / ".venv"
ENTORNO = MOTOR / "entorno.json"
PAGINA = MOTOR / "pagina"
ORIGEN = "http://motion3d.local"
FPS = 30
PESTANAS = 1          # 1 por defecto (máximo 2)
CALIDAD_JPEG = 0.93
COMUNES = ["--force-device-scale-factor=1", "--hide-scrollbars", "--mute-audio",
           "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
           "--disable-backgrounding-occluded-windows"]
# 3D por procesador (SwiftShader): respaldo cuando no hay tarjeta gráfica que valga
ARGS_CPU = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
            "--disable-gpu-compositing"] + COMUNES
# Guardia térmica (solo con NVIDIA): para a ≥78 °C y sigue a ≤68 °C
TEMP_PARAR, TEMP_SEGUIR, CADA_MS = 78, 68, 500   # medido: esta GPU sube 14 °C en 4 s; leer cada 2 s llegaba tarde


def args_gpu():
    """WebGL por la tarjeta gráfica. En portátiles con dos gráficas, fuerza la potente."""
    if sys.platform == "darwin":
        angle = "--use-angle=metal"
    elif os.name == "nt":
        angle = "--use-angle=d3d11"
    else:
        angle = "--use-angle=gl"
    return [angle, "--enable-gpu", "--ignore-gpu-blocklist", "--force_high_performance_gpu"] + COMUNES


def es_software(webgl):
    w = (webgl or "").lower()
    return any(x in w for x in ("swiftshader", "llvmpipe", "software", "basic render"))

for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def decir(texto=""):
    print(texto, flush=True)


# --------------------------------------------------------------------------
#  Entorno: este archivo se relanza solo con el Python de la skill
# --------------------------------------------------------------------------
def python_del_venv():
    return VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def asegurar_entorno():
    py = python_del_venv()
    try:
        dentro = Path(sys.prefix).resolve() == VENV.resolve()
    except Exception:
        dentro = False
    if dentro:
        return
    if not py.exists() or not ENTORNO.exists():
        decir("Preparando la skill por primera vez…")
        r = subprocess.run([sys.executable, str(MOTOR / "preparar.py")])
        if r.returncode != 0 or not py.exists():
            sys.exit(1)
    r = subprocess.run([str(py), str(Path(__file__).resolve())] + sys.argv[1:])
    sys.exit(r.returncode)


# --------------------------------------------------------------------------
#  Un vídeo cada vez (cerrojo del sistema: se suelta solo si el proceso muere)
# --------------------------------------------------------------------------
class Turno:
    """Cola por orden de llegada: cada vídeo saca su número (un archivo bloqueado
    mientras vive su proceso) y espera a que no quede nadie vivo delante."""

    def __init__(self):
        import tempfile
        self.cola = Path(tempfile.gettempdir()) / "motion-3d-cola"
        self.cola.mkdir(exist_ok=True)
        self.mio = None
        self.f = None
        self.espera = 0.0

    @staticmethod
    def _bloquear(f):
        if os.name == "nt":
            import msvcrt
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)

    @staticmethod
    def _soltar(f):
        try:
            if os.name == "nt":
                import msvcrt
                f.seek(0)
                msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        except Exception:
            pass

    def _vivo(self, ruta):
        """¿Sigue vivo el dueño de ese número? (si su archivo se deja bloquear, ya no)."""
        try:
            f = open(ruta, "a+")
        except Exception:
            return True
        try:
            self._bloquear(f)
        except OSError:
            f.close()
            return True
        self._soltar(f)
        f.close()
        try:
            ruta.unlink()
        except Exception:
            pass
        return False

    def __enter__(self):
        t0 = time.time()
        self.mio = self.cola / ("%020d-%d.turno" % (time.time_ns(), os.getpid()))
        self.f = open(self.mio, "a+")
        self._bloquear(self.f)
        avisado = False
        while True:
            delante = [r for r in sorted(self.cola.glob("*.turno")) if r.name < self.mio.name]
            vivos = [r for r in delante if self._vivo(r)]
            if not vivos:
                break
            if not avisado:
                decir("· Hay %d vídeo(s) dibujándose antes que este: espero mi turno "
                      "(uno cada vez para no cargar el ordenador)…" % len(vivos))
                avisado = True
            time.sleep(1.5)
        self.espera = time.time() - t0
        return self

    def __exit__(self, *a):
        try:
            self._soltar(self.f)
            self.f.close()
            self.mio.unlink()
        except Exception:
            pass


# --------------------------------------------------------------------------
#  Navegador
# --------------------------------------------------------------------------
def ffmpeg_exe():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def canal_navegador():
    try:
        return json.loads(ENTORNO.read_text(encoding="utf-8")).get("canal") or "chrome"
    except Exception:
        return "chrome"


def leer_entorno():
    try:
        return json.loads(ENTORNO.read_text(encoding="utf-8"))
    except Exception:
        return {}


def guardar_entorno(**cambios):
    try:
        e = leer_entorno()
        e.update(cambios)
        ENTORNO.write_text(json.dumps(e, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


async def abrir_navegador(p, gpu=False):
    canal = canal_navegador()
    orden = [canal] + [c for c in ("chrome", "msedge", "chromium-propio") if c != canal]
    args = args_gpu() if gpu else ARGS_CPU
    ultimo = None
    for c in orden:
        try:
            if c == "chromium-propio":
                return await p.chromium.launch(headless=True, args=args)
            return await p.chromium.launch(headless=True, channel=c, args=args)
        except Exception as e:
            ultimo = e
    raise RuntimeError("No he podido abrir el navegador. Ejecuta motor/preparar.py --forzar. (%s)" % ultimo)


def servir(carpeta_escena):
    """Sirve el motor y la carpeta de la escena desde una dirección inventada (sin abrir puertos)."""
    mapa = {
        "/pagina/": PAGINA, "/three/": MOTOR / "three", "/fuentes/": MOTOR / "fuentes", "/escena/": carpeta_escena,
    }

    async def atender(route):
        url = route.request.url.split("?")[0].split("#")[0]
        ruta = url[len(ORIGEN):]
        if ruta in ("", "/", "/index.html"):
            archivo = PAGINA / "index.html"
        else:
            archivo = None
            for pref, carpeta in mapa.items():
                if ruta.startswith(pref):
                    from urllib.parse import unquote
                    archivo = (carpeta / unquote(ruta[len(pref):])).resolve()
                    break
        if not archivo or not archivo.exists():
            await route.fulfill(status=404, body="no existe: " + ruta)
            return
        tipo = mimetypes.guess_type(str(archivo))[0] or "application/octet-stream"
        if archivo.suffix in (".js", ".mjs"):
            tipo = "text/javascript"
        await route.fulfill(status=200, body=archivo.read_bytes(), content_type=tipo,
                            headers={"Cache-Control": "no-store"})
    return atender


async def abrir_pagina(nav, datos, carpeta_escena):
    pag = await nav.new_page(viewport={"width": 640, "height": 360})
    errores = []
    pag.on("pageerror", lambda e: errores.append(str(e)))
    pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    await pag.route(ORIGEN + "/**", servir(carpeta_escena))
    await pag.goto(ORIGEN + "/index.html")
    await pag.wait_for_function("window.motorListo === true", timeout=60000)
    try:
        info = await pag.evaluate("d => cargar(d)", datos)
    except Exception as e:
        detalle = "; ".join(errores[:3])
        raise RuntimeError("La escena tiene un error: %s %s" % (str(e).split("\n")[0], detalle))
    if errores:
        decir("AVISO: la consola del navegador dice: " + " | ".join(errores[:3]))
    return pag, info


# --------------------------------------------------------------------------
#  Vigilante: fotogramas vacíos, imagen congelada y cuánto se mueve
# --------------------------------------------------------------------------
class Vigilante:
    def __init__(self, fps):
        self.fps = fps
        self.previa = None
        self.racha = 0
        self.inicio_racha = 0.0
        self.quietos = []
        self.blancos = []
        self.difs = []

    def mirar(self, n, jpg):
        from PIL import Image, ImageChops, ImageStat
        t = n / self.fps
        im = Image.open(io.BytesIO(jpg))
        im.draft("L", (im.width // 8, im.height // 8))
        im = im.convert("L")
        if ImageStat.Stat(im).stddev[0] < 2.0:
            self.blancos.append(round(t, 2))
        if self.previa is not None and self.previa.size == im.size:
            dif = ImageStat.Stat(ImageChops.difference(im, self.previa)).mean[0]
            self.difs.append(dif)
            if dif < 0.08:
                if self.racha == 0:
                    self.inicio_racha = t
                self.racha += 1
            else:
                self.cerrar_racha()
        self.previa = im

    def cerrar_racha(self):
        if self.racha > self.fps * 1.2:
            self.quietos.append((round(self.inicio_racha, 2), round(self.racha / self.fps, 2)))
        self.racha = 0

    def resumen(self):
        if not self.difs:
            return {}
        mov = sum(1 for d in self.difs if d >= 0.08)
        return {"pct_fotogramas_con_movimiento": round(100 * mov / len(self.difs), 1),
                "tramos_quietos": self.quietos, "fotogramas_vacios": self.blancos[:10]}


# --------------------------------------------------------------------------
#  Guardia térmica: lee la temperatura de la tarjeta NVIDIA cada 0,5 s y, si
#  llega a 78 °C, no deja pintar más fotogramas hasta que baja a 68 °C.
#  Guarda un registro (CSV) por vídeo. Sin nvidia-smi no hace nada.
# --------------------------------------------------------------------------
class GuardiaTermica:
    def __init__(self, activa, registro=None):
        import shutil
        self.exe = shutil.which("nvidia-smi") if activa else None
        self._proc = None
        self.registro = registro
        self.temp = None
        self.maxima = None
        self.pausas = 0
        self.segundos_pausa = 0.0
        self.lecturas = []
        self._tarea = None
        self._t0 = time.time()

    @property
    def activa(self):
        return self.exe is not None

    async def _leer(self):
        try:
            proc = await asyncio.create_subprocess_exec(
                self.exe, "--query-gpu=temperature.gpu,power.draw,utilization.gpu",
                "--format=csv,noheader,nounits", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
            out, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
            campos = [c.strip() for c in out.decode("utf-8", "replace").splitlines()[0].split(",")]
            temp = float(campos[0])
            pot = float(campos[1]) if len(campos) > 1 and campos[1].replace(".", "", 1).isdigit() else None
            uso = float(campos[2]) if len(campos) > 2 and campos[2].replace(".", "", 1).isdigit() else None
            return temp, pot, uso
        except Exception:
            return None, None, None

    async def _bucle(self):
        """Un solo nvidia-smi que escribe una línea cada 0,5 s (no se lanza un proceso por lectura)."""
        try:
            self._proc = await asyncio.create_subprocess_exec(
                self.exe, "--query-gpu=temperature.gpu,power.draw,utilization.gpu", "--format=csv,noheader,nounits",
                "-lms", str(CADA_MS), stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        except Exception:
            return
        while True:
            linea = await self._proc.stdout.readline()
            if not linea:
                break
            campos = [c.strip() for c in linea.decode("utf-8", "replace").split(",")]
            try:
                temp = float(campos[0])
            except Exception:
                continue
            num = lambda v: float(v) if v.replace(".", "", 1).isdigit() else None
            pot = num(campos[1]) if len(campos) > 1 else None
            uso = num(campos[2]) if len(campos) > 2 else None
            self.temp = temp
            self.maxima = temp if self.maxima is None else max(self.maxima, temp)
            self.lecturas.append((round(time.time() - self._t0, 1), temp, pot, uso))

    async def empezar(self):
        if self.activa and self._tarea is None:
            temp, _, _ = await self._leer()
            if temp is None:
                self.exe = None
                return
            self.temp = self.maxima = temp
            self._tarea = asyncio.create_task(self._bucle())

    async def esperar(self):
        """Antes de cada fotograma: si la tarjeta está a 78 °C o más, espera a que baje a 68 °C."""
        if not self.activa or self.temp is None:
            return
        if self.temp < TEMP_PARAR:
            # regulación suave: cerca del límite, o recién salida de una pausa, respira un poco entre
            # fotogramas (al reanudar a tope el sensor salta 8-12 °C en medio segundo)
            respiro = 0.0
            if self.temp >= TEMP_PARAR - 4:
                respiro = 0.06 * (self.temp - (TEMP_PARAR - 5))
            if time.time() < getattr(self, "_suave_hasta", 0):
                respiro = max(respiro, 0.35)
            if respiro > 0:
                self.segundos_pausa += respiro
                await asyncio.sleep(respiro)
            return
        t0 = time.time()
        self.pausas += 1
        decir("   · Tarjeta gráfica a %.0f °C: paro de dibujar hasta que baje a %d °C (guardia térmica)…" % (self.temp, TEMP_SEGUIR))
        while self.temp is not None and self.temp > TEMP_SEGUIR:
            await asyncio.sleep(0.5)
        pausa = time.time() - t0
        self.segundos_pausa += pausa
        self._suave_hasta = time.time() + 6.0       # arranque suave tras la pausa (al reanudar a tope el sensor salta 10-15 °C)
        decir("   · %.0f °C: sigo (pausa de %.0f s)." % (self.temp, pausa))

    async def parar(self):
        if self._proc and self._proc.returncode is None:
            try:
                self._proc.terminate()
                await asyncio.wait_for(self._proc.wait(), timeout=3)
            except Exception:
                pass
        if self._tarea:
            self._tarea.cancel()
            try:
                await self._tarea
            except BaseException:
                pass
            self._tarea = None
        if self.registro and self.lecturas:
            try:
                with open(self.registro, "w", encoding="utf-8") as f:
                    f.write("segundo,temperatura_c,potencia_w,uso_pct\n")
                    for fila in self.lecturas:
                        f.write(",".join("" if v is None else str(v) for v in fila) + "\n")
            except Exception:
                pass

    def resumen(self):
        if not self.activa or self.maxima is None:
            return {}
        return {"gpu_temp_max_c": self.maxima, "pausas_termicas": self.pausas,
                "segundos_en_pausa_termica": round(self.segundos_pausa, 1),
                "registro_temperaturas": str(self.registro) if self.registro else None}


# --------------------------------------------------------------------------
#  Dibujo
# --------------------------------------------------------------------------
def tiempos_de_revision(info, desde, hasta):
    """Un fotograma por momento de la escena; si no los hay, 6 repartidos."""
    ms = info.get("momentos") or []
    lista = []
    for m in ms:
        if isinstance(m, dict):
            t, nombre = float(m.get("t", 0)), str(m.get("nombre", ""))
        else:
            t, nombre = float(m[0]), str(m[1]) if len(m) > 1 else ""
        if desde <= t <= hasta:
            lista.append((t, nombre))
    if not lista:
        dur = hasta - desde
        lista = [(round(desde + dur * (i + 0.5) / 6, 2), "") for i in range(6)]
    return lista


async def dibujar_video(datos, carpeta, salida, registro, fps, desde, hasta, pestanas, revisar, gpu, guardia, crf=18):
    from playwright.async_api import async_playwright
    n0 = int(round(desde * fps))
    n1 = int(round(hasta * fps))
    total = n1 - n0
    exe = ffmpeg_exe()
    orden = [exe, "-y", "-hide_banner", "-loglevel", "error",
             "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
             "-vf", "scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p",
             "-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-tune", "film",
             "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
             "-r", str(fps), "-an", "-movflags", "+faststart", str(salida)]
    interes = {int(round(t * fps)): (t, nombre) for t, nombre in revisar}
    guardados = {}
    vigia = Vigilante(fps)
    async with async_playwright() as p:
        nav = await abrir_navegador(p, gpu)
        await guardia.empezar()
        try:
            paginas = []
            info = None
            for _ in range(max(1, min(2, pestanas))):
                pag, info = await abrir_pagina(nav, datos, carpeta)
                paginas.append(pag)
            log = open(registro, "wb")
            proc = await asyncio.create_subprocess_exec(*orden, stdin=asyncio.subprocess.PIPE, stdout=log, stderr=log)
            hechos = {}
            sig = {"pedir": n0, "escribir": n0}
            aviso = asyncio.Condition()
            fallo = []
            t_ini = time.time()

            async def obrero(pag):
                while not fallo:
                    await guardia.esperar()
                    async with aviso:
                        while sig["pedir"] - sig["escribir"] > 24 and not fallo:
                            await aviso.wait()
                        n = sig["pedir"]
                        if n >= n1:
                            return
                        sig["pedir"] += 1
                    try:
                        b64 = await pag.evaluate("([t, q]) => captura(t, q)", [n / fps, CALIDAD_JPEG])
                    except Exception as e:
                        fallo.append(str(e).split("\n")[0])
                        async with aviso:
                            aviso.notify_all()
                        return
                    async with aviso:
                        hechos[n] = base64.b64decode(b64)
                        aviso.notify_all()

            async def escritor():
                ultimo = time.time()
                while sig["escribir"] < n1 and not fallo:
                    async with aviso:
                        while sig["escribir"] not in hechos and not fallo:
                            await aviso.wait()
                        if fallo:
                            return
                        n = sig["escribir"]
                        jpg = hechos.pop(n)
                    vigia.mirar(n, jpg)
                    if n in interes:
                        guardados[n] = jpg
                    try:
                        proc.stdin.write(jpg)
                        await proc.stdin.drain()
                    except Exception as e:
                        fallo.append("ffmpeg se ha cerrado: %s" % e)
                        return
                    async with aviso:
                        sig["escribir"] += 1
                        aviso.notify_all()
                    if time.time() - ultimo > 15:
                        ultimo = time.time()
                        hecho = n - n0 + 1
                        seg = (time.time() - t_ini) / max(1, hecho)
                        temp = (" · GPU %.0f °C" % guardia.temp) if guardia.activa and guardia.temp else ""
                        decir("   dibujando… %d %% (%.2f s por fotograma, quedan ~%d s)%s" %
                              (100 * hecho // total, seg, seg * (total - hecho), temp))

            await asyncio.gather(escritor(), *[obrero(pg) for pg in paginas])
            vigia.cerrar_racha()
            try:
                proc.stdin.close()
            except Exception:
                pass
            await proc.wait()
            log.close()
            if fallo:
                raise RuntimeError("El dibujo se ha interrumpido: " + fallo[0])
            if proc.returncode != 0:
                raise RuntimeError("El montaje del vídeo ha fallado. Detalle en " + str(registro))
        finally:
            await guardia.parar()
            await nav.close()
    fotos = [(interes[n][0], interes[n][1], guardados[n]) for n in sorted(guardados)]
    return info, vigia, fotos


async def cargar_info(datos, carpeta, gpu):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        nav = await abrir_navegador(p, gpu)
        try:
            _, info = await abrir_pagina(nav, datos, carpeta)
        finally:
            await nav.close()
    return info


async def dibujar_sueltos(datos, carpeta, tiempos, gpu, guardia):
    """Captura solo unos fotogramas (para el boceto o para mirar un instante)."""
    from playwright.async_api import async_playwright
    fotos = []
    async with async_playwright() as p:
        nav = await abrir_navegador(p, gpu)
        await guardia.empezar()
        try:
            pag, info = await abrir_pagina(nav, datos, carpeta)
            for t, nombre in tiempos:
                await guardia.esperar()
                b64 = await pag.evaluate("([t, q]) => captura(t, q)", [t, 0.93])
                fotos.append((t, nombre, base64.b64decode(b64)))
        finally:
            await guardia.parar()
            await nav.close()
    return info, fotos


# --------------------------------------------------------------------------
#  Hoja de revisión
# --------------------------------------------------------------------------
def fuente(tam):
    from PIL import ImageFont
    propia = MOTOR / "fuentes" / "Inter.ttf"
    try:
        f = ImageFont.truetype(str(propia), tam)
        try:
            f.set_variation_by_axes([tam, 700])
        except Exception:
            pass
        return f
    except Exception:
        pass
    for nombre in ("arialbd.ttf", "Arial Bold.ttf", "arial.ttf", "DejaVuSans-Bold.ttf", "Helvetica.ttc"):
        try:
            return ImageFont.truetype(nombre, tam)
        except Exception:
            continue
    return ImageFont.load_default()


def hoja_de_revision(fotos, base, titulo=""):
    """fotos: [(segundo, nombre, jpg), …] → una hoja JPG con todas, en orden."""
    from PIL import Image, ImageDraw
    if not fotos:
        return None
    muestra = Image.open(io.BytesIO(fotos[0][2]))
    vertical = muestra.height > muestra.width
    mw, mh = (300, 533) if vertical else (620, int(620 * muestra.height / muestra.width))
    cols = 4 if vertical else 3
    filas = (len(fotos) + cols - 1) // cols
    cab, pie = 56, 40
    hoja = Image.new("RGB", (cols * (mw + 12) + 12, cab + filas * (mh + pie + 12) + 12), (30, 30, 34))
    d = ImageDraw.Draw(hoja)
    d.text((14, 12), titulo or "Hoja de revisión", fill=(255, 214, 102), font=fuente(28))
    for i, (seg, nombre, jpg) in enumerate(fotos):
        x = 12 + (i % cols) * (mw + 12)
        y = cab + (i // cols) * (mh + pie + 12)
        im = Image.open(io.BytesIO(jpg)).convert("RGB").resize((mw, mh), Image.LANCZOS)
        hoja.paste(im, (x, y))
        d.text((x + 2, y + mh + 6), ("%.1f s  %s" % (seg, nombre))[:58], fill=(235, 235, 235), font=fuente(22))
    ruta = Path(str(base) + "-revision.jpg")
    hoja.save(ruta, quality=88)
    return ruta


# --------------------------------------------------------------------------
#  Principal
# --------------------------------------------------------------------------
def decidir_modo(a, datos, carpeta):
    """¿Tarjeta gráfica o procesador? La primera vez lo prueba y lo apunta en entorno.json."""
    ent = leer_entorno()
    if a.cpu:
        return False, ent.get("webgl") or "procesador"
    if ent.get("gpu") is False and not a.gpu:
        return False, ent.get("webgl") or "procesador"
    if ent.get("gpu") and not a.gpu:
        return True, ent["gpu"]
    try:
        info = asyncio.run(cargar_info(dict(datos, gpu=True, calidad="boceto"), carpeta, True))
        webgl = info.get("webgl") or ""
    except Exception as e:
        webgl = "fallo: %s" % str(e).split("\n")[0][:120]
    if webgl and not webgl.startswith("fallo") and not es_software(webgl):
        guardar_entorno(gpu=webgl)
        return True, webgl
    decir("· No hay tarjeta gráfica que valga para el 3D (%s): dibujo con el procesador, con la calidad rebajada sola." % (webgl or "?"))
    guardar_entorno(gpu=False)
    return False, ent.get("webgl") or "procesador"


def main():
    asegurar_entorno()
    ap = argparse.ArgumentParser(description="Convierte una escena 3D (escena.js) en un vídeo MP4.")
    ap.add_argument("escena", help="ruta del archivo escena.js")
    ap.add_argument("--salida", help="ruta del MP4 (por defecto, junto a la escena y con su nombre)")
    ap.add_argument("--boceto", action="store_true", help="solo la hoja de revisión (una imagen por momento)")
    ap.add_argument("--fotograma", type=float, nargs="+", help="guarda fotogramas sueltos a tamaño real (segundos)")
    ap.add_argument("--formato", choices=["16:9", "9:16", "1:1", "4:5"], help="cambia el formato sin tocar la escena")
    ap.add_argument("--ancho", type=int, help="ancho en píxeles (el alto sale del formato)")
    ap.add_argument("--duracion", type=float, help="duración en segundos (si no, la de la escena)")
    ap.add_argument("--fps", type=int, help="fotogramas por segundo (30 por defecto)")
    ap.add_argument("--tramo", type=float, nargs=2, metavar=("DESDE", "HASTA"), help="solo ese trozo (segundos)")
    ap.add_argument("--previa", action="store_true", help="previa de galería: 1280×720 (hasta 12 s)")
    ap.add_argument("--calidad", choices=["boceto", "final"], help="boceto = rápido (sin desenfoque de movimiento); final = todo")
    ap.add_argument("--cpu", action="store_true", help="dibujar con el procesador aunque haya tarjeta gráfica")
    ap.add_argument("--gpu", action="store_true", help="volver a probar la tarjeta gráfica")
    ap.add_argument("--sin-guardia", action="store_true", help="quitar la guardia térmica (no recomendado)")
    ap.add_argument("--pestanas", type=int, default=PESTANAS, help="pestañas a la vez (1 o 2)")
    a = ap.parse_args()

    escena = Path(a.escena).resolve()
    if not escena.exists():
        decir("No encuentro la escena: %s" % escena)
        sys.exit(1)
    carpeta = escena.parent
    datos = {"escena": "/escena/%s?v=%d" % (escena.name, int(time.time() * 1000))}
    if a.formato:
        datos["formato"] = a.formato
    if a.ancho:
        datos["ancho"] = a.ancho
    if a.previa:
        datos["ancho"], datos["alto"] = 1280, 720
    if a.duracion:
        datos["duracion"] = a.duracion
    if a.fps:
        datos["fps"] = a.fps

    nombre = escena.stem if escena.stem != "escena" else carpeta.name
    if a.salida:
        salida = Path(a.salida).resolve()
    elif a.previa:
        salida = carpeta / "previa.mp4"
    else:
        salida = carpeta / (nombre + ".mp4")
    salida.parent.mkdir(parents=True, exist_ok=True)
    base = salida.with_suffix("")
    trabajo = carpeta / ".trabajo"
    trabajo.mkdir(exist_ok=True)

    with Turno() as turno:
        t0 = time.time()   # el reloj empieza cuando nos toca (sin contar la espera)
        gpu, webgl = decidir_modo(a, datos, carpeta)
        datos["gpu"] = gpu
        datos["calidad"] = a.calidad or ("boceto" if a.boceto else "final")
        guardia = GuardiaTermica(gpu and not a.sin_guardia, trabajo / (nombre + "-temperaturas.csv"))
        modo = ("tarjeta gráfica · %s" % webgl) if gpu else "procesador (calidad rebajada)"
        if a.fotograma:
            _, fotos = asyncio.run(dibujar_sueltos(datos, carpeta, [(t, "") for t in a.fotograma], gpu, guardia))
            for t, _n, jpg in fotos:
                r = Path("%s-fotograma-%06.2f.jpg" % (base, t))
                r.write_bytes(jpg)
                decir("FOTOGRAMA %.2f s: %s" % (t, r))
            decir("(%d fotograma(s) en %.1f s · %s · calidad %s%s)" % (
                len(fotos), time.time() - t0, modo, datos["calidad"],
                (" · GPU máx. %.0f °C" % guardia.maxima) if guardia.maxima else ""))
            return

        try:
            info = asyncio.run(cargar_info(datos, carpeta, gpu))
        except Exception as e:
            if not gpu or "La escena tiene un error" in str(e):
                raise
            decir("· La tarjeta gráfica no ha arrancado (%s): sigo con el procesador." % str(e).splitlines()[0][:120])
            gpu = datos["gpu"] = False
            guardia = GuardiaTermica(False)
            modo = "procesador (calidad rebajada)"
            info = asyncio.run(cargar_info(datos, carpeta, gpu))
        dur = float(info.get("duracion") or 10)
        if a.previa and not a.duracion:
            dur = min(dur, 12.0)
        fps = a.fps or int(info.get("fps") or FPS)
        desde, hasta = (a.tramo if a.tramo else (0.0, dur))
        hasta = min(hasta, dur) if not a.tramo else hasta
        revisar = tiempos_de_revision(info, desde, hasta)
        titulo = "%s · %dx%d · %.1f s" % (nombre, info["ancho"], info["alto"], hasta - desde)

        if a.boceto:
            _, fotos = asyncio.run(dibujar_sueltos(datos, carpeta, revisar, gpu, guardia))
            ruta = hoja_de_revision(fotos, base, titulo + " · BOCETO")
            decir("BOCETO listo en %.0f s (%s)." % (time.time() - t0, modo))
            decir("HOJA: %s" % ruta)
            decir("Mírala con tus ojos y puntúala con la lista de «Dirección de arte» antes de hacer el vídeo.")
            return

        total = int(round((hasta - desde) * fps))
        decir("Dibujando %d fotogramas (%.1f s a %d fps, %dx%d) con %s, calidad %s…" %
              (total, hasta - desde, fps, info["ancho"], info["alto"], modo, datos["calidad"]))
        t_dibujo = time.time()
        info, vigia, fotos = asyncio.run(dibujar_video(datos, carpeta, salida, trabajo / (nombre + "-ffmpeg.log"),
                                                       fps, desde, hasta, a.pestanas, revisar, gpu, guardia,
                                                       crf=26 if a.previa else 18))
        t_dibujo = time.time() - t_dibujo
    ruta = hoja_de_revision(fotos, base, titulo)
    seg = time.time() - t0
    res = vigia.resumen()
    term = guardia.resumen()
    neto = max(0.001, t_dibujo - term.get("segundos_en_pausa_termica", 0))
    informe = {"video": str(salida), "segundos_de_reloj": round(seg, 1), "fotogramas": total,
               "s_por_fotograma": round(seg / max(1, total), 3), "s_por_fotograma_dibujando": round(neto / max(1, total), 3),
               "peso_mb": round(salida.stat().st_size / 1e6, 2), "modo": modo, "calidad": datos["calidad"],
               "ancho": info["ancho"], "alto": info["alto"], "fps": fps, **res, **term}
    (trabajo / (nombre + "-informe.json")).write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    decir("VÍDEO: %s" % salida)
    decir("HOJA: %s" % ruta)
    decir("Hecho en %.0f s (%.2f s por fotograma dibujando) · %.1f MB · movimiento en el %s %% de los fotogramas." %
          (seg, neto / max(1, total), informe["peso_mb"], res.get("pct_fotogramas_con_movimiento", "?")))
    if term:
        decir("GPU: máx. %.0f °C · pausas térmicas: %d (%.0f s) · registro: %s" % (
            term["gpu_temp_max_c"], term["pausas_termicas"], term["segundos_en_pausa_termica"], term["registro_temperaturas"]))
    if turno.espera > 3:
        decir("(Además esperó %.0f s en la cola a que acabaran otros vídeos.)" % turno.espera)
    for ini, d in res.get("tramos_quietos", []):
        decir("AVISO: la imagen está quieta %.1f s desde el segundo %.1f (¿falta movimiento de cámara?)" % (d, ini))
    if res.get("fotogramas_vacios"):
        decir("REVISA: fotogramas vacíos en los segundos %s" % res["fotogramas_vacios"])


if __name__ == "__main__":
    main()
