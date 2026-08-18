---
name: designing-elearning-fundacion
description: Genera UI on-brand (landing, componentes, pantallas, dashboards) para la app de e-learning interna de la Fundación. Úsese siempre que se diseñe, maquete o estilice cualquier interfaz de esta app —pantallas de ruta/curso, tarjetas, botones, formularios, tableros de progreso— o cuando se mencionen sus colores (navy, lavanda, lima, coral), su tipografía o su estilo "builder". Aplícalo aunque la persona no diga explícitamente "marca" o "guía de estilo": si el resultado es una vista de esta plataforma de aprendizaje interno, este skill manda.
---

# Diseño — E-learning interno de la Fundación

## 1. Identidad

Este producto es una **app de e-learning para uso interno de los colaboradores de la Fundación**. Aprenden, siguen rutas por unidades, registran progreso y ganan certificaciones/insignias.

Se siente **motivador, inspirador y disruptivo**.

Personalidad: **audaz pero confiable**. Energía de "builder" (constructor), no de aula infantil. Serio en la tinta, vivo en los acentos. Referente de cabecera: la estética de LAB10 (bandas oscuras con carácter + un acento eléctrico + microcopy en monoespaciada), no la ruta blanda de mascota + degradado morado.

## 2. Tokens

### Color — por rol, no como cinco iguales
- **Primario · #192962** (navy) — ancla. Texto principal, títulos, nav, estructura y **botón CTA sólido**. Es el "casi negro" con carácter; evita el negro puro.
- **Secundario · #BEA4E8** (lavanda) — links, botones secundarios, tarjetas destacadas, tags de categoría. Nunca como texto ni como CTA (contraste flojo).
- **Fondo · #FAFAFA** (off-white) — lienzo general. Las tarjetas van en blanco puro `#FFFFFF` para que "floten".
- **Texto · #192962** sobre claro. Rampa neutra de apoyo: `#5B5E6E` secundario · `#9A9DAB` hint · `#EDEEF2` divisor.
- **Acento · #BBEF7F** (lima) — **estado activo, progreso, "completado", ítem seleccionado**. Sobre lima el texto va en navy. Es acento, no botón.
- **Acento cálido · #D55947** (coral) — la especia: **un** acento hero por pantalla, tiles de dato cálidos y estados de alerta/error. Nunca de relleno.

Tintes y hovers (para un sistema real):
- Navy: hover `#0F1C4D` · tint bg `#EBEEF7`
- Lavanda: tint `#F1EBFA`
- Lima: tint `#F1FADF` · texto-sobre-lima `#173404`
- Coral: hover `#C24634` · tint `#FBEAE6`
- Warning (no está en paleta, se necesita): ámbar `#E8A93B`

Ratio de uso **60 / 30 / 10**: ~60% neutros, ~30% navy/lavanda estructural, ~10% lima + coral de acento.

### Tipografía
- **Títulos · Space Grotesk**, peso **500**. (Carácter geométrico que rompe con el default del sector.)
- **Cuerpo / UI · Inter**, peso **400** (500 para énfasis). Números tabulares para métricas.
- **Etiquetas / microcopy · monoespaciada** (JetBrains Mono o IBM Plex Mono), **MAYÚSCULA, letter-spacing 0.08–0.12em**. Este es el sello: `DÍA 1 DE 5`, `CLASE 01 · GUÍA`, `PROGRESO`.
- Solo dos pesos por texto: 400 y 500. Nada de 600/700 pesados.

### Espaciado
- Escala base **8px**: `4 · 8 · 16 · 24 · 32 · 48 · 64`.
- Radios: **12px** componentes · **16px** tarjetas · **999px** pills (botones/badges).
- Padding interno de tarjeta **≥24px**; separación entre secciones **≥48px**.
- Sombras: **sutiles y de una sola profundidad** en toda la app. Nunca borde + sombra + fondo tintado a la vez en la misma tarjeta — elige uno.
- Ancho máximo de lectura ~720px.

## 3. Componentes

- **Botones.** Forma pill (`radius 999px`). *Primario:* fondo navy `#192962`, texto blanco; hover `#0F1C4D`; active `scale(0.98)`. *Secundario:* ghost, texto lavanda `#534AB7` sin fondo, o borde navy 0.5px. *Un solo botón primario por vista.* La lima jamás es botón.
- **Cards.** Fondo blanco `#FFFFFF` sobre lienzo off-white; **o** borde hairline `0.5px #EDEEF2` **o** sombra sutil, no ambos; radius 16px; padding 24px. Métrica/dato: tile de color tint (lima/coral/lavanda) con número grande + etiqueta mono debajo.
- **Inputs.** Radius 12px, borde hairline; foco = anillo navy/lavanda (`0 0 0 2px #BEA4E8`); error = borde + texto coral `#D55947` con mensaje concreto. Placeholder = ejemplo real, no "escribe aquí".
- **Estados de progreso.** Barra/anillo en lima sobre pista `#EDEEF2`; ítem activo = fila con fondo lima-tint `#F1FADF` + check en lima; ítem pendiente = check hueco gris.

## 4. Do's & Don'ts (anti-AI)

✅ **Hacer**
- Contenido real (nombres, cifras y textos verdaderos), nunca "Lorem ipsum".
- Microcopy en **monoespaciada mayúscula** para etiquetas y metadatos — es la firma anti-genérico.
- **1 acento por pantalla**: el navy manda, la lima marca lo vivo, el coral aparece una vez.
- Asimetría intencional; jerarquía por tamaño y espacio, no por cajas dentro de cajas.
- Navy audaz como negativo (bandas o secciones oscuras con carácter, estilo LAB10).

❌ **Evitar**
- **La ruta "AlfiTutor":** mascota sonriente, ilustraciones stock de estudiantes felices, glassmorphism, fondos lavanda difuminados.
- **Gradientes morados** y degradados de marca: la paleta ya es vibrante en plano.
- **Poppins** e **Inter como titular por defecto** (Inter solo va en cuerpo). Nada de todo centrado.
- Emojis como bullets o como iconos; usar iconos de línea consistentes.
- Sombras infladas, y usar los cinco colores a peso parejo (efecto piñata).
- Texto claro sobre lima o lavanda (son claros → el texto va en navy).

## 5. Voz del copy

Tono: **directo, humano y de builder** — habla como quien construye, no como folleto. Verbo primero, frases cortas, sin "!", sin "simplemente". Etiquetas en mayúscula mono; títulos en frase.

- Ejemplo de botón: **"Continuar"** · **"Empezar el reto"**
- Ejemplo de título: **"Tu ruta, unidad por unidad"**
- Ejemplo de etiqueta (mono): **"DÍA 1 DE 5 · 7/7 COMPLETADO"**
- Ejemplo de estado vacío: **"Aún no has empezado. Tu primer módulo te espera."**
