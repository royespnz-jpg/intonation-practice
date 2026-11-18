# Intonation Practice

Una práctica cronometrada de entonación con los **14 patrones** del inventario del manual (*Inventory of Intonation
Patterns Having Grammatical Meanings*, Lessons 6 & 7). Son dos lecturas en voz alta, que se graban, y una parte escrita
en la que los estudiantes escriben los números de cada patrón. Cada grabación va a tu Google Drive y a una planilla
donde ponés la nota. La parte escrita se corrige sola.

## La práctica

| Parte | Qué hacen | Tiempo | Puntos |
| --- | --- | --- | --- |
| **Reading 1** | Leen en voz alta 15 oraciones; cada una muestra el nombre de su patrón | 50 s para preparar · 1 min para leer | 15 |
| **Reading 2** | Otras 15 oraciones, con el mismo formato | 50 s para preparar · 1 min para leer | 15 |
| **Part 3** | 10 oraciones con el nombre del patrón; escriben los números (1 bajo, 2 normal, 3 alto, 4 extra alto) | 5 min (pueden enviar antes) | 10 |

En total son **40 puntos** y unos 9 minutos. Las consignas se oyen (voz del navegador) y se leen en pantalla. Las
oraciones aparecen cuando empieza el reloj de preparación.

- **Los 14 patrones en cada lectura, más uno.** La Reading 1 tiene dos clases de *nonfinal intonation* (*distantly
  connected* y *suspense*). La Reading 2 tiene una oración con dos patrones juntos (*Command + direct address*).
  Entre las dos lecturas y la Part 3 aparecen las tres clases de *nonfinal* y las dos de *tag question*. La Part 3 tiene
  10 patrones distintos.
- **Oraciones, no conversaciones**, todas nuevas: ninguna sale del manual ni del *Recording VI*.
- **La negrita.** Cuando el patrón es solo una parte de la oración (la *tag*, el nombre, el primer grupo de palabras, la
  palabra en *focus*), esas palabras van en **negrita**. Si no hay negrita, el patrón es toda la oración.
- **Los números nunca aparecen en la página.** En las lecturas, los estudiantes ven solo la oración y el nombre del
  patrón. En la Part 3 tienen que escribirlos. Los números están solo en **tu copia** del script (hoja *Patterns*), que
  no está en este repositorio.
- **La Part 3 acepta las respuestas escritas de varias formas.** No importan los espacios ni el tipo de guion, y entre
  grupos de palabras vale una barra, una coma o una barra vertical. Cuando el manual da dos fórmulas, se aceptan las dos.
- **El reloj** es un anillo que se vacía. Es verde azulado mientras preparan o escriben y rojo mientras graba. Se pone
  ámbar en los últimos 10 segundos, y en los últimos 5 se pone rojo y parpadea.
- **El micrófono** se pide una vez, en la prueba antes de empezar. Después graba solo durante cada minuto de lectura y
  se cierra al terminar la Reading 2.
- **No se pierde nada.** Cada grabación y las respuestas se guardan en el navegador y se envían enseguida. Si se corta
  internet, se reintenta el envío. Al final el estudiante ve “✓ Sent” en cada parte.
- **Si se recarga la página**, la práctica sigue desde la lectura que estaba grabando, o desde la Part 3. La planilla lo
  cuenta en *Restarts*, y también cuenta cuántas veces el estudiante salió de la página.

## Instalación

1. **La planilla y el script.**
   1. Creá una planilla **nueva** (<https://sheets.new>) y abrí **Extensiones → Apps Script**.
   2. Borrá lo que haya y pegá **tu copia** del script, la que tiene la clave. Te la paso aparte, porque no está en el
      repositorio. Son 6 partes cortas:
      - La **parte 1** va en `Código.gs`, reemplazando todo.
      - Cada una de las otras va en un archivo nuevo (**＋ → Secuencia de comandos**, llamalo `parte2`, `parte3`…).
      - Cada parte empieza con `/* ── Intonation Practice · parte N de 6 ── */` y termina con
        `/* ── fin de la parte N de 6 ── */`. Si no ves esa última línea, se cortó al pegar.
   3. Guardá, elegí **`setup`**, **▶ Ejecutar** y aceptá los permisos.

   `setup` crea las hojas *Exams*, *Responses*, *Written*, *Patterns* y *Rubric*, y la carpeta *Intonation Practice —
   Recordings* en tu Drive.

   > El [`Code.gs`](google-apps-script/Code.gs) y las [partes](google-apps-script/partes/) de este repositorio también
   > funcionan, pero no tienen la clave: guardan las respuestas de la Part 3 sin corregirlas y la hoja *Patterns* queda
   > sin los números. La página **Teacher** te avisa si conectaste esa copia.
2. **Implementar → Nueva implementación → Aplicación web.** Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier
   persona**. Copiá la URL que termina en `/exec`.
3. **En la práctica, abrí la página Teacher** (`…/#teacher`, código **1234**). Pegá la URL, tocá *Test* y después *Save*.
   - Ahí está el link para los estudiantes. Si escribís el grupo (por ejemplo *3B*), el link lo lleva y los audios de ese
     grupo quedan en su propia carpeta.
   - También están todas las oraciones con el nombre de su patrón, una **vista previa** de cada paso (sin grabar nada) y
     un link para probar la práctica completa (queda marcada *demo* en la planilla).
   - Para no tener que pegar la URL en cada computadora, también podés ponerla en [`js/config.js`](js/config.js)
     (`SCRIPT_URL`).

> **¿Cambiaste el script?** Guardar no alcanza: la URL `/exec` sigue usando la versión anterior hasta que la publiques.
> Andá a **Implementar → Administrar implementaciones → ✏️ (la implementación de siempre) → Versión: Nueva versión →
> Implementar.** Así la URL no cambia.

### Qué guarda la planilla

| Hoja | Qué tiene |
| --- | --- |
| **Exams** | Una fila por estudiante: inicio, nombre, grupo, estado, lecturas enviadas, puntos de la Part 3, fin, veces que salió de la página, reinicios, **total** (suma automática, de 40) y la carpeta de sus audios |
| **Responses** | Una fila por lectura: las oraciones con sus patrones, segundos, **▶ Listen** (el audio en tu Drive), **Score** (la celda acepta solo de 0 a 15), *Out of* y *Comments* |
| **Written** | Una fila por oración de la Part 3: la oración, el patrón, lo que escribió el estudiante, las respuestas aceptadas, ✓ o ✗ y el punto |
| **Patterns** | Todas las oraciones con su patrón, sus números y una nota para corregir (las palabras en negrita van en MAYÚSCULAS) |
| **Rubric** | Cómo se puntúa cada parte |

Los audios quedan en *Intonation Practice — Recordings / grupo / nombre · código* (sin grupo en el link, van a *No group*).

## Cambiar la práctica

Las oraciones, los nombres de los patrones y los relojes están en [`js/format.js`](js/format.js). Las consignas cambian
solas con los relojes; por ejemplo, el tiempo de preparación es `PREP` (en segundos). Los números de cada oración están
en un archivo privado (`key/key.mjs`) que nunca se sube al repositorio. Después de cambiar algo:

```bash
npm run gs        # copia las oraciones al script y lo vuelve a partir en partes cortas
                  # (con key/key.mjs presente, escribe también tu copia con la clave en google-apps-script/private/)
npm run version   # antes de publicar: pone una versión nueva a los archivos (?v=…)
npm test
```

Si cambiaste el script, pegá de nuevo las partes que cambiaron y publicá una versión nueva (ver arriba).

## Publicarlo

En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`** → **Save**.
En uno o dos minutos queda en `https://royespnz-jpg.github.io/<nombre-del-repositorio>/`.

## Probarlo

```bash
npm start     # http://localhost:8080 ( …/?demo=1 prueba con los relojes reales; …/?quick=1 los acorta al 10 %)
npm test
```

No hay dependencias ni build: es HTML, CSS y JavaScript. Funciona en Chrome, Edge, Firefox y Safari, también en el
celular. Conviene usar auriculares.

*Material de clase basado en el inventario de patrones de entonación del* Manual of American English Pronunciation
*(Lessons 6 & 7).*
