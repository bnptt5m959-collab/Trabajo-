---
name: galeria-3d
description: Abre en el navegador la galería de estilos de la skill motion-3d (10 motion graphics 3D en bucle con el botón «Usar este estilo»). Úsala cuando el usuario escriba «/galeria-3d» o pida ver la galería, los estilos o los ejemplos de motion 3D.
---

# Galería de estilos 3D

Abre la galería de la skill **motion-3d** y explica en una línea cómo se usa.

1. Busca la carpeta de la skill motion-3d: `~/.claude/skills/motion-3d` (en Windows `C:\Users\<nombre>\.claude\skills\motion-3d`). Si no está ahí, búscala junto a esta skill (`../motion-3d`).
2. Ejecuta (Windows `python`, Mac `python3`):
   ```
   python <carpeta de motion-3d>/motor/galeria.py
   ```
   Crea la página con los estilos que haya y la abre en el navegador. Si el ordenador no tiene Python, abre directamente `<carpeta de motion-3d>/galeria/index.html` en el navegador.
3. Dile al usuario, en español llano:

> Te he abierto la galería en el navegador. Si quieres, escribe arriba tu tema; luego pulsa **«Usar este estilo»** en el que te guste y pega aquí lo que se ha copiado (Ctrl+V o Cmd+V).

Cuando el usuario pegue `/motion-3d estilo:NN (…). Mi tema: …`, sigue la skill motion-3d en el modo (b), con ese estilo.
