#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
galeria.py · abre la galería de estilos de motion-3d en el navegador.

Lee estilos/*/ficha.json, escribe galeria/index.html (una tarjeta por estilo
con su previa en bucle) y la abre. No necesita internet ni servidor: es un
archivo local con los vídeos al lado.

Uso:
    python motor/galeria.py            (crea la página y la abre)
    python motor/galeria.py --no-abrir (solo la crea)
"""
import json
import sys
import webbrowser
from pathlib import Path

MOTOR = Path(__file__).resolve().parent
RAIZ = MOTOR.parent
ESTILOS = RAIZ / "estilos"
SALIDA = RAIZ / "galeria" / "index.html"
# comunidad de Daniel Alcaide en Skool (botón de la barra y bloque final de la galería)
SKOOL = "https://www.skool.com/expert-ia/about?utm_source=skill-motion3d&utm_medium=galeria&utm_campaign=skill-motion3d"

for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PLANTILLA = r"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Galería de estilos 3D</title>
<style>
  @font-face { font-family: 'Inter'; src: url('../motor/fuentes/Inter.ttf') format('truetype'); font-weight: 100 900; }
  @font-face { font-family: 'Archivo Black'; src: url('../motor/fuentes/ArchivoBlack.ttf') format('truetype'); }
  :root {
    --fondo: #07080b; --tarjeta: #101217; --tarjeta-2: #14171d; --tinta: #f4f1ea; --suave: #9a9ca6; --tenue: #6b6e79;
    --linea: rgba(255,255,255,.07); --linea-2: rgba(255,255,255,.14);
    --acento: #ffb454; --acento-2: #ff7a45; --frio: #59d7ff;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--fondo); color: var(--tinta); font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; }
  body { -webkit-font-smoothing: antialiased; min-height: 100vh;
    background:
      radial-gradient(1100px 620px at 12% -8%, rgba(255,150,70,.13), transparent 60%),
      radial-gradient(900px 600px at 92% 2%, rgba(70,180,255,.11), transparent 60%),
      radial-gradient(1200px 900px at 50% 120%, rgba(120,90,255,.08), transparent 60%),
      var(--fondo);
    background-attachment: fixed; }
  body::after { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 50; opacity: .06; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>"); }
  .barra { position: sticky; top: 0; z-index: 5; background: rgba(7,8,11,.72); backdrop-filter: blur(16px) saturate(1.3); -webkit-backdrop-filter: blur(16px) saturate(1.3); border-bottom: 1px solid var(--linea); }
  .barra-in { max-width: 1440px; margin: 0 auto; padding: 14px 40px; display: flex; align-items: center; gap: 22px; }
  .marca { font-weight: 700; letter-spacing: .01em; font-size: 15px; display: flex; align-items: center; gap: 11px; white-space: nowrap; color: var(--tinta); }
  .marca svg { width: 28px; height: 28px; filter: drop-shadow(0 4px 14px rgba(255,150,70,.45)); }
  .marca span { color: var(--tenue); font-weight: 500; }
  .tema { flex: 1; display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,.04); border: 1px solid var(--linea-2); border-radius: 14px; padding: 4px 8px 4px 16px; transition: border-color .2s ease, box-shadow .2s ease; }
  .tema:focus-within { border-color: rgba(255,180,84,.6); box-shadow: 0 0 0 4px rgba(255,180,84,.12); }
  .tema label { font-size: 11.5px; font-weight: 600; color: var(--suave); white-space: nowrap; letter-spacing: .14em; text-transform: uppercase; }
  .tema input { flex: 1; border: 0; outline: 0; font: inherit; font-size: 15px; padding: 10px 4px; background: transparent; color: var(--tinta); min-width: 0; }
  .tema input::placeholder { color: var(--tenue); }
  main { max-width: 1440px; margin: 0 auto; padding: 56px 40px 96px; }
  .cabecera { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 40px; flex-wrap: wrap; }
  .etiqueta { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--acento); margin-bottom: 16px; }
  .etiqueta::before { content: ''; width: 28px; height: 1.5px; background: var(--acento); }
  h1 { font-family: 'Archivo Black', 'Inter', sans-serif; font-weight: 400; font-size: 64px; line-height: 1; letter-spacing: -.025em; margin: 0;
    background: linear-gradient(180deg, #ffffff 0%, #d9d4c9 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { color: var(--suave); font-size: 17px; line-height: 1.55; margin: 16px 0 0; max-width: 660px; }
  .sub b { color: var(--tinta); font-weight: 600; }
  .cuenta { font-size: 12px; color: var(--suave); font-weight: 600; letter-spacing: .18em; text-transform: uppercase; border: 1px solid var(--linea-2); padding: 9px 14px; border-radius: 999px; }
  .rejilla { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .tarjeta { position: relative; background: linear-gradient(180deg, var(--tarjeta-2), var(--tarjeta)); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column;
    border: 1px solid var(--linea); box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 24px 60px rgba(0,0,0,.45);
    transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease, border-color .35s ease; }
  .tarjeta::before { content: ''; position: absolute; inset: -1px; border-radius: 21px; padding: 1px; pointer-events: none; opacity: 0; transition: opacity .35s ease;
    background: linear-gradient(140deg, rgba(255,180,84,.85), rgba(255,122,69,.15) 40%, rgba(89,215,255,.55));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
  .tarjeta:hover { transform: translateY(-6px); box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 34px 80px rgba(0,0,0,.6), 0 0 60px rgba(255,150,70,.12); }
  .tarjeta:hover::before { opacity: 1; }
  .video { position: relative; aspect-ratio: 16 / 9; background: #0b0c10; overflow: hidden; }
  .video video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .7s cubic-bezier(.2,.8,.2,1), filter .5s ease; filter: saturate(1.02); }
  .video::after { content: ''; position: absolute; inset: auto 0 0 0; height: 38%; background: linear-gradient(180deg, transparent, rgba(16,18,23,.85)); pointer-events: none; }
  .tarjeta:hover .video video { transform: scale(1.045); filter: saturate(1.12) brightness(1.05); }
  .num { position: absolute; top: 14px; left: 14px; z-index: 2; font-family: 'Archivo Black', 'Inter', sans-serif; font-size: 13px; letter-spacing: .04em; color: #fff;
    background: rgba(10,11,15,.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.16); padding: 6px 11px; border-radius: 999px; }
  .cuerpo { padding: 6px 24px 24px; display: flex; flex-direction: column; gap: 12px; flex: 1; position: relative; }
  .nombre { font-size: 22px; font-weight: 700; letter-spacing: -.02em; margin: 0; color: var(--tinta); }
  .bueno { font-size: 14.5px; line-height: 1.55; color: var(--suave); margin: 0; }
  .bueno b { color: var(--tinta); font-weight: 600; }
  details { font-size: 13.5px; color: var(--suave); line-height: 1.55; border-top: 1px solid var(--linea); padding-top: 12px; }
  details summary { cursor: pointer; font-weight: 600; color: var(--tinta); list-style: none; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; }
  details summary::-webkit-details-marker { display: none; }
  details summary::before { content: '+'; display: inline-block; width: 18px; color: var(--acento); font-weight: 700; }
  details[open] summary::before { content: '–'; }
  details p { margin: 8px 0 0; }
  details p b { color: #d6d3cb; font-weight: 600; }
  .boton { margin-top: auto; align-self: flex-start; border: 0; cursor: pointer; font: inherit; font-weight: 700; font-size: 15px; color: #1a1209;
    background: linear-gradient(135deg, #ffd27a, var(--acento) 45%, var(--acento-2)); padding: 13px 20px; border-radius: 13px; display: inline-flex; align-items: center; gap: 9px;
    box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 10px 26px rgba(255,130,60,.28); transition: transform .15s ease, box-shadow .25s ease, filter .2s ease; }
  .boton:hover { filter: brightness(1.06); box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 14px 36px rgba(255,130,60,.45), 0 0 0 4px rgba(255,180,84,.14); }
  .boton:active { transform: scale(.97); }
  .boton svg { width: 17px; height: 17px; }
  .aviso { position: fixed; left: 50%; bottom: 40px; transform: translate(-50%, 30px) scale(.98); opacity: 0;
    background: rgba(18,20,26,.82); backdrop-filter: blur(18px) saturate(1.4); -webkit-backdrop-filter: blur(18px) saturate(1.4); border: 1px solid rgba(255,255,255,.14);
    color: #fff; padding: 16px 22px 16px 18px; border-radius: 16px; font-size: 15px; box-shadow: 0 24px 60px rgba(0,0,0,.55);
    transition: all .35s cubic-bezier(.2,.9,.3,1.2); max-width: min(760px, calc(100vw - 32px)); display: flex; gap: 14px; align-items: center; z-index: 10; pointer-events: none; }
  .aviso.ver { opacity: 1; transform: translate(-50%, 0) scale(1); }
  .aviso .ok { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #47e39a, #1fae6b); display: grid; place-items: center; flex: none; box-shadow: 0 0 22px rgba(60,220,140,.45); }
  .aviso code { font-family: 'Inter', sans-serif; font-weight: 700; color: var(--acento); }
  .aviso small { display: block; color: rgba(255,255,255,.62); margin-top: 3px; font-size: 13px; }
  .vacio { padding: 40px; text-align: center; color: var(--suave); }
  /* comunidad de Skool: botón fijo en la barra y bloque al final */
  .skool { display: inline-flex; align-items: center; gap: 9px; white-space: nowrap; font-weight: 700; font-size: 14px; color: var(--tinta); text-decoration: none;
    padding: 11px 16px; border-radius: 12px; border: 1px solid rgba(255,180,84,.45);
    background: linear-gradient(135deg, rgba(255,180,84,.18), rgba(255,122,69,.07)); box-shadow: 0 0 26px rgba(255,150,70,.12);
    transition: border-color .2s ease, box-shadow .25s ease, transform .15s ease; }
  .skool:hover { border-color: rgba(255,190,100,.9); box-shadow: 0 0 0 4px rgba(255,180,84,.12), 0 0 36px rgba(255,150,70,.28); }
  .skool:active { transform: scale(.97); }
  .skool svg { width: 18px; height: 18px; color: var(--acento); }
  .comunidad { margin-top: 64px; border-radius: 24px; padding: 46px 52px; display: flex; align-items: center; justify-content: space-between; gap: 36px; flex-wrap: wrap;
    border: 1px solid var(--linea-2); box-shadow: 0 1px 0 rgba(255,255,255,.05) inset, 0 30px 80px rgba(0,0,0,.5);
    background: radial-gradient(640px 320px at 0% 0%, rgba(255,150,70,.20), transparent 70%), radial-gradient(640px 320px at 100% 100%, rgba(89,215,255,.13), transparent 70%), linear-gradient(180deg, var(--tarjeta-2), var(--tarjeta)); }
  .comunidad h3 { font-family: 'Archivo Black', 'Inter', sans-serif; font-weight: 400; font-size: 36px; line-height: 1.08; letter-spacing: -.02em; margin: 0 0 12px; color: #fff; }
  .comunidad p { color: var(--suave); font-size: 16.5px; line-height: 1.6; margin: 0; max-width: 640px; }
  .comunidad p b { color: var(--tinta); font-weight: 600; }
  a.boton { text-decoration: none; font-size: 16px; padding: 16px 24px; }
  @media (max-width: 700px) { .comunidad { padding: 30px 22px; } .comunidad h3 { font-size: 27px; } .skool .sk { display: none; } }
  /* la última tarjeta, si queda sola en su fila, se hace destacada a todo el ancho */
  @media (min-width: 1181px) {
    .tarjeta:last-child:nth-child(3n+1) { grid-column: 1 / -1; flex-direction: row; }
    .tarjeta:last-child:nth-child(3n+1) .video { flex: 0 0 64%; }
    .tarjeta:last-child:nth-child(3n+1) .video::after { inset: 0 0 0 auto; width: 34%; height: auto; background: linear-gradient(90deg, transparent, rgba(16,18,23,.92)); }
    .tarjeta:last-child:nth-child(3n+1) .cuerpo { padding: 40px 40px 36px; justify-content: center; gap: 16px; }
    .tarjeta:last-child:nth-child(3n+1) .nombre { font-size: 34px; letter-spacing: -.025em; }
    .tarjeta:last-child:nth-child(3n+1) .bueno { font-size: 16px; }
    .tarjeta:last-child:nth-child(3n+1) .boton { margin-top: 8px; }
  }
  @media (max-width: 1180px) { .rejilla { grid-template-columns: repeat(2, minmax(0, 1fr)); } h1 { font-size: 50px; } }
  @media (max-width: 700px) {
    .rejilla { grid-template-columns: 1fr; }
    .barra-in, main { padding-left: 16px; padding-right: 16px; }
    .barra-in { flex-wrap: wrap; }
    .tema { flex-basis: 100%; }
    h1 { font-size: 38px; }
  }
</style>
</head>
<body>
<div class="barra"><div class="barra-in">
  <div class="marca"><svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="m1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".55" stop-color="#ffb454"/><stop offset="1" stop-color="#ff7a45"/></linearGradient></defs><path d="M16 2.5 28 9v14L16 29.5 4 23V9z" fill="url(#m1)"/><path d="M16 2.5 28 9 16 15.5 4 9z" fill="#fff" fill-opacity=".42"/><path d="M16 15.5V29.5L4 23V9z" fill="#000" fill-opacity=".14"/></svg>motion-3d <span>· estilos</span></div>
  <div class="tema"><label for="tema">Tu tema</label><input id="tema" placeholder="opcional · p. ej. cómo funciona una impresora 3D, 15 s, 16:9" autocomplete="off"></div>
  <a class="skool" href="__SKOOL__" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>Mi comunidad<span class="sk"> en Skool</span></span></a>
</div></div>
<main>
  <div class="cabecera">
    <div>
      <div class="etiqueta">Hecho solo con código · three.js</div>
      <h1>Galería de estilos 3D</h1>
      <p class="sub">Motion graphics 3D con luz de cine, profundidad de campo y materiales de verdad, dibujados en tu ordenador. Elige uno, pulsa <b>«Usar este estilo»</b> y pega el texto en Claude Code.</p>
    </div>
    <div class="cuenta" id="cuenta"></div>
  </div>
  <div class="rejilla" id="rejilla"></div>
  <section class="comunidad">
    <div>
      <div class="etiqueta">Mi comunidad</div>
      <h3>¿Quieres más skills como esta?</h3>
      <p>En mi comunidad de Skool comparto <b>todas las skills que voy creando</b>, las herramientas con las que hago mis vídeos y <b>una clase en directo cada semana</b>.</p>
    </div>
    <a class="boton" href="__SKOOL__" target="_blank" rel="noopener">Entrar en la comunidad
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></a>
  </section>
</main>
<div class="aviso" id="aviso"><span class="ok"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg></span><div><span id="aviso-texto"></span><small>Pégalo en Claude Code (Ctrl+V o Cmd+V) y pulsa Enter.</small></div></div>
<script>
const ESTILOS = __DATOS__;
const rejilla = document.getElementById('rejilla');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
document.getElementById('cuenta').textContent = ESTILOS.length + ' estilos';
if (!ESTILOS.length) rejilla.innerHTML = '<div class="vacio">Todavía no hay estilos con previa.</div>';
ESTILOS.forEach(e => {
  const c = e.como_se_construye || {};
  const n = String(e.numero).padStart(2, '0');
  const art = document.createElement('article');
  art.className = 'tarjeta';
  art.dataset.n = n;
  art.innerHTML = `
    <div class="video"><span class="num">${esc(n)}</span>${e.previa ? `<video src="${esc(e.previa)}" autoplay muted loop playsinline preload="auto"></video>` : ''}</div>
    <div class="cuerpo">
      <h2 class="nombre">${esc(e.nombre)}</h2>
      <p class="bueno"><b>Bueno para</b> ${esc((e.bueno_para || '').replace(/^./, m => m.toLowerCase()))}</p>
      <details><summary>Cómo se construye</summary>
        ${c.luz ? `<p><b>Luz:</b> ${esc(c.luz)}</p>` : ''}
        ${c.camara ? `<p><b>Cámara:</b> ${esc(c.camara)}</p>` : ''}
        ${c.materiales ? `<p><b>Materiales:</b> ${esc(c.materiales)}</p>` : ''}
        ${c.ritmo ? `<p><b>Ritmo:</b> ${esc(c.ritmo)}</p>` : ''}
      </details>
      <button class="boton" data-n="${esc(n)}" data-nombre="${esc(e.nombre)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        Usar este estilo
      </button>
    </div>`;
  rejilla.appendChild(art);
});
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch (e) {}
  const ta = document.createElement('textarea');
  ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  return ok;
}
let reloj = null;
rejilla.addEventListener('click', async ev => {
  const b = ev.target.closest('.boton');
  if (!b) return;
  const tema = document.getElementById('tema').value.trim();
  const texto = `/motion-3d estilo:${b.dataset.n} (${b.dataset.nombre}). Mi tema: ${tema}`;
  await copiar(texto);
  document.getElementById('aviso-texto').innerHTML = 'Copiado: <code>' + esc(texto) + '</code>';
  const a = document.getElementById('aviso');
  a.classList.add('ver');
  clearTimeout(reloj);
  reloj = setTimeout(() => a.classList.remove('ver'), 3800);
});
</script>
</body>
</html>
"""


def leer_estilos():
    lista = []
    for carpeta in sorted(p for p in ESTILOS.iterdir() if p.is_dir()):
        ficha = carpeta / "ficha.json"
        if not ficha.exists():
            continue
        try:
            datos = json.loads(ficha.read_text(encoding="utf-8"))
        except Exception as e:
            print("AVISO: la ficha de %s no se puede leer (%s)" % (carpeta.name, e))
            continue
        previa = carpeta / "previa.mp4"
        datos["previa"] = ("../estilos/%s/previa.mp4" % carpeta.name) if previa.exists() else ""
        datos.setdefault("numero", int(carpeta.name[:2]) if carpeta.name[:2].isdigit() else 0)
        datos.setdefault("nombre", carpeta.name)
        lista.append(datos)
    lista.sort(key=lambda d: d.get("numero", 0))
    return lista


def main():
    estilos = leer_estilos()
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    datos = json.dumps(estilos, ensure_ascii=False).replace("</", "<\\/")
    SALIDA.write_text(PLANTILLA.replace("__DATOS__", datos).replace("__SKOOL__", SKOOL), encoding="utf-8")
    print("GALERÍA: %s (%d estilos)" % (SALIDA, len(estilos)))
    if "--no-abrir" not in sys.argv:
        webbrowser.open(SALIDA.as_uri())
        print("Abierta en el navegador. Pulsa «Usar este estilo» y pega el texto aquí.")


if __name__ == "__main__":
    main()
