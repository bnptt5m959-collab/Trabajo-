#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
medir.py · mide en NÚMEROS un vídeo (de referencia o tuyo) para modelar su método.

Uso:
    python motor/medir.py referencia.mp4
    python motor/medir.py mi-motion.mp4 --comparar "referencia.mp4-medidas/medidas.json"

Saca a <vídeo>-medidas/:
  · hoja.jpg       → hoja de contacto: un fotograma cada medio segundo, con su segundo
  · cortes/        → un fotograma de cada plano (justo después de cada corte)
  · medidas.json   → duración, cortes por segundo, duración media de plano, % de
                     fotogramas con movimiento y con la cámara moviéndose, pausas,
                     picos de movimiento, brillo, contraste, temperatura y paleta.
Con --comparar enseña las dos medidas lado a lado y marca lo que se aleja > 25 %.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

MOTOR = Path(__file__).resolve().parent
RAIZ = MOTOR.parent
VENV = RAIZ / ".venv"

for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def asegurar_entorno():
    py = VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    try:
        dentro = Path(sys.prefix).resolve() == VENV.resolve()
    except Exception:
        dentro = False
    if dentro:
        return
    if not py.exists():
        r = subprocess.run([sys.executable, str(MOTOR / "preparar.py")])
        if r.returncode != 0:
            sys.exit(1)
    sys.exit(subprocess.run([str(py), str(Path(__file__).resolve())] + sys.argv[1:]).returncode)


def ffmpeg_exe():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def info_video(ruta):
    r = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", str(ruta)], stderr=subprocess.PIPE, stdout=subprocess.PIPE,
                       text=True, encoding="utf-8", errors="replace")
    txt = r.stderr
    dur = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", txt)
    tam = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", txt)
    fps = re.search(r"([\d.]+)\s*fps", txt)
    if not dur or not tam:
        raise SystemExit("No puedo leer el vídeo: %s" % ruta)
    d = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3))
    return d, int(tam.group(1)), int(tam.group(2)), float(fps.group(1)) if fps else 0.0


def leer_fotogramas(ruta, fps, w, h):
    import numpy as np
    orden = [ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-i", str(ruta),
             "-vf", "fps=%g,scale=%d:%d" % (fps, w, h), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    datos = subprocess.run(orden, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL).stdout
    n = len(datos) // (w * h * 3)
    return np.frombuffer(datos[: n * w * h * 3], dtype=np.uint8).reshape(n, h, w, 3)


def kmedias(px, k=6, vueltas=12):
    import numpy as np
    rnd = np.random.default_rng(3)
    c = px[rnd.choice(len(px), k, replace=False)].astype(float)
    for _ in range(vueltas):
        d = ((px[:, None, :] - c[None]) ** 2).sum(-1)
        et = d.argmin(1)
        for j in range(k):
            sel = px[et == j]
            if len(sel):
                c[j] = sel.mean(0)
    cuenta = np.bincount(et, minlength=k)
    orden = cuenta.argsort()[::-1]
    return [("#%02x%02x%02x" % tuple(int(v) for v in c[j]), round(100 * cuenta[j] / len(px), 1)) for j in orden]


def medir(ruta, carpeta):
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    dur, W, H, fps_v = info_video(ruta)
    vertical = H > W
    fps = 10 if dur <= 120 else 5
    w, h = (216, 384) if vertical else (384, 216)
    fot = leer_fotogramas(ruta, fps, w, h)
    if len(fot) < 3:
        raise SystemExit("El vídeo es demasiado corto para medirlo.")
    gris = fot.astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    peq = gris[:, ::4, ::4]
    # diferencia entre fotogramas y por celdas (8×8) para saber si se mueve todo (cámara) o una parte
    dif = np.abs(np.diff(peq, axis=0))
    media = dif.mean(axis=(1, 2))
    gh, gw = peq.shape[1] // 8, peq.shape[2] // 8
    celdas = dif[:, : gh * 8, : gw * 8].reshape(len(dif), 8, gh, 8, gw).mean(axis=(2, 4))
    frac = (celdas > 1.6).mean(axis=(1, 2))
    # cortes: cambio grande de histograma + diferencia alta
    hist = np.stack([np.histogram(g, bins=16, range=(0, 255))[0] / g.size for g in peq])
    dh = np.abs(np.diff(hist, axis=0)).sum(1)
    cortes = [i + 1 for i in range(len(dh)) if dh[i] > 0.45 and media[i] > 14]
    limpio = [c for k, c in enumerate(cortes) if k == 0 or c - cortes[k - 1] > fps * 0.25]
    t_cortes = [round(c / fps, 2) for c in limpio]
    no_corte = np.ones(len(media), bool)
    for c in limpio:
        no_corte[c - 1] = False
    mueve = (media > 0.9) & no_corte
    camara = (frac > 0.55) & no_corte
    # pausas: tramos quietos de 0,5 s o más
    pausas, ini = [], None
    for i, m in enumerate(mueve.tolist() + [True]):
        if not m and ini is None:
            ini = i
        elif m and ini is not None:
            if (i - ini) / fps >= 0.5:
                pausas.append([round(ini / fps, 2), round((i - ini) / fps, 2)])
            ini = None
    # picos de movimiento (energía suavizada a 1 s)
    ven = max(1, int(fps))
    energia = np.convolve(np.where(no_corte, media, 0), np.ones(ven) / ven, mode="same")
    picos = []
    for i in np.argsort(energia)[::-1]:
        if all(abs(i - p) > fps * 1.5 for p in picos):
            picos.append(int(i))
        if len(picos) == 3:
            break
    # luz y color
    f = fot.astype(np.float32)
    brillo = float(gris.mean())
    contraste = float(gris.std(axis=(1, 2)).mean())
    temperatura = float((f[..., 0] - f[..., 2]).mean())
    mx, mn = f.max(-1), f.min(-1)
    saturacion = float(np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0).mean() * 100)
    muestra = fot[:: max(1, fps // 2), ::6, ::6].reshape(-1, 3).astype(float)
    paleta = kmedias(muestra[:: max(1, len(muestra) // 6000)], 6)
    lado = "más luz arriba" if gris[:, : h // 3].mean() > gris[:, -h // 3:].mean() + 8 else (
        "más luz abajo" if gris[:, -h // 3:].mean() > gris[:, : h // 3].mean() + 8 else "luz pareja arriba/abajo")
    izq, der = gris[:, :, : w // 3].mean(), gris[:, :, -w // 3:].mean()
    lado += ", " + ("luz desde la izquierda" if izq > der + 8 else "luz desde la derecha" if der > izq + 8 else "sin lado claro")

    planos = len(limpio) + 1
    m = {
        "video": str(ruta), "duracion_s": round(dur, 2), "tamano": "%dx%d" % (W, H), "fps": fps_v,
        "planos": planos, "cortes_por_segundo": round(len(limpio) / dur, 3),
        "duracion_media_plano_s": round(dur / planos, 2), "segundos_de_los_cortes": t_cortes,
        "pct_fotogramas_con_movimiento": round(100 * mueve.mean(), 1),
        "pct_fotogramas_con_camara_en_movimiento": round(100 * camara.mean(), 1),
        "intensidad_media_movimiento": round(float(media[no_corte].mean()) if no_corte.any() else 0, 2),
        "pausas_s": pausas, "segundos_quietos_total": round(sum(p[1] for p in pausas), 2),
        "picos_de_movimiento_s": [round(p / fps, 2) for p in sorted(picos)],
        "brillo_0_255": round(brillo, 1), "contraste": round(contraste, 1),
        "temperatura_R_menos_B": round(temperatura, 1),
        "tono": "cálido" if temperatura > 8 else "frío" if temperatura < -8 else "neutro",
        "saturacion_pct": round(saturacion, 1), "luz": lado, "paleta": paleta,
    }
    carpeta.mkdir(parents=True, exist_ok=True)
    (carpeta / "medidas.json").write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")

    # hoja de contacto: un fotograma cada 0,5 s (máximo 48)
    paso = max(1, int(fps * 0.5))
    idx = list(range(0, len(fot), paso))
    if len(idx) > 48:
        idx = [idx[int(i * len(idx) / 48)] for i in range(48)]
    cols = 8 if not vertical else 10
    tw, th = (240, 135) if not vertical else (135, 240)
    filas = (len(idx) + cols - 1) // cols
    hoja = Image.new("RGB", (cols * (tw + 6) + 6, filas * (th + 26) + 6), (28, 28, 32))
    d = ImageDraw.Draw(hoja)
    try:
        fuente = ImageFont.truetype(str(MOTOR / "fuentes" / "Inter.ttf"), 15)
    except Exception:
        fuente = ImageFont.load_default()
    for k, i in enumerate(idx):
        x, y = 6 + (k % cols) * (tw + 6), 6 + (k // cols) * (th + 26)
        hoja.paste(Image.fromarray(fot[i]).resize((tw, th)), (x, y))
        marca = " · corte" if any(abs(i - c) <= paso // 2 for c in limpio) else ""
        d.text((x + 2, y + th + 4), "%.1f s%s" % (i / fps, marca), fill=(230, 230, 230), font=fuente)
    hoja.save(carpeta / "hoja.jpg", quality=86)
    cdir = carpeta / "cortes"
    cdir.mkdir(exist_ok=True)
    for k, c in enumerate([0] + limpio):
        j = min(len(fot) - 1, c + int(fps * 0.3))
        Image.fromarray(fot[j]).save(cdir / ("plano-%02d-%.1fs.jpg" % (k + 1, j / fps)), quality=88)
    return m


CLAVES = [("duracion_s", "Duración (s)"), ("planos", "Planos"), ("cortes_por_segundo", "Cortes por segundo"),
          ("duracion_media_plano_s", "Duración media de plano (s)"),
          ("pct_fotogramas_con_movimiento", "% fotogramas con movimiento"),
          ("pct_fotogramas_con_camara_en_movimiento", "% con la cámara moviéndose"),
          ("intensidad_media_movimiento", "Intensidad del movimiento"),
          ("segundos_quietos_total", "Segundos quietos (pausas)"),
          ("brillo_0_255", "Brillo (0-255)"), ("contraste", "Contraste"),
          ("temperatura_R_menos_B", "Temperatura (+ cálido)"), ("saturacion_pct", "Saturación %")]


def imprimir(m):
    print("MEDIDAS de %s" % m["video"])
    for k, nombre in CLAVES:
        print("  %-32s %s" % (nombre, m[k]))
    print("  %-32s %s" % ("Tono / luz", "%s · %s" % (m["tono"], m["luz"])))
    print("  %-32s %s" % ("Pausas [inicio, duración]", m["pausas_s"][:8]))
    print("  %-32s %s" % ("Picos de movimiento (s)", m["picos_de_movimiento_s"]))
    print("  %-32s %s" % ("Paleta (color, %)", ", ".join("%s %s%%" % p for p in m["paleta"])))


def comparar(mio, ref):
    print("\nCOMPARACIÓN (tuyo frente a la referencia; ✗ = se aleja más de un 25 %)")
    print("  %-32s %12s %12s" % ("", "tuyo", "referencia"))
    lejos = []
    for k, nombre in CLAVES:
        a, b = mio.get(k), ref.get(k)
        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            continue
        base = max(abs(b), 1e-6)
        dist = abs(a - b) / base
        malo = dist > 0.25 and k not in ("duracion_s", "brillo_0_255", "contraste", "temperatura_R_menos_B", "saturacion_pct")
        if malo:
            lejos.append(nombre)
        print("  %-32s %12s %12s %s" % (nombre, a, b, "✗" if malo else ""))
    if lejos:
        print("\nAJUSTA: " + "; ".join(lejos))
    else:
        print("\nEl ritmo y el movimiento se parecen a los de la referencia.")


def main():
    asegurar_entorno()
    ap = argparse.ArgumentParser(description="Mide en números el ritmo, la cámara, la luz y la paleta de un vídeo.")
    ap.add_argument("video")
    ap.add_argument("--comparar", help="medidas.json de la referencia para compararlas")
    ap.add_argument("--salida", help="carpeta de salida (por defecto <vídeo>-medidas)")
    a = ap.parse_args()
    ruta = Path(a.video).resolve()
    carpeta = Path(a.salida) if a.salida else Path(str(ruta) + "-medidas")
    m = medir(ruta, carpeta)
    imprimir(m)
    print("HOJA: %s" % (carpeta / "hoja.jpg"))
    print("MEDIDAS: %s" % (carpeta / "medidas.json"))
    if a.comparar:
        comparar(m, json.loads(Path(a.comparar).read_text(encoding="utf-8")))


if __name__ == "__main__":
    main()
