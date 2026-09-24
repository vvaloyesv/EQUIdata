/**
 * Qué tipo de cuadro necesita un módulo HTML de autor.
 *
 * El HTML lo escribe el profesor y puede ser cualquier cosa: desde una
 * calculadora de 1 KB hasta un artículo con scrollytelling o una presentación
 * que se escala sola a la ventana. Cada uno necesita un cuadro distinto:
 *
 * - "slides": el HTML ocupa toda la ventana con un escenario fijo
 *   (`position: fixed; inset: 0`) y se reescala según `innerWidth/innerHeight`.
 *   Necesita un cuadro 16:9 que quepa en la pantalla, como un video. Con un
 *   cuadro de alto arbitrario se encoge y deja los controles fuera.
 * - "page": documento completo que depende del alto de la ventana (unidades
 *   `vh`, `position: fixed/sticky`, `innerHeight`): barra de lectura, gráficos
 *   que se animan con el scroll. Necesita un cuadro del alto de la pantalla,
 *   con scroll propio. Ajustarlo al alto de su contenido rompe esos efectos,
 *   porque `vh` pasa a depender del propio cuadro.
 * - "fragment": recurso corto que fluye normal (calculadora, ejercicio). El
 *   cuadro se ajusta a su contenido, sin scroll propio.
 *
 * Quien escribe el HTML puede forzar el tipo con
 * `<meta name="equidata-layout" content="slides|page|fragment">`.
 */

export type HtmlLayout = "slides" | "page" | "fragment";

const LAYOUTS: readonly HtmlLayout[] = ["slides", "page", "fragment"];

function forcedLayout(html: string): HtmlLayout | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/name\s*=\s*["']equidata-layout["']/i.test(tag)) continue;
    const value = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]?.trim().toLowerCase();
    if (value && (LAYOUTS as readonly string[]).includes(value)) return value as HtmlLayout;
  }
  return null;
}

/**
 * ¿Hay un elemento `position: fixed` con `inset: 0` (escenario a pantalla
 * completa)? Mira solo la regla o el atributo `style` alrededor de cada
 * `position: fixed`, acotado por llaves y comillas: una sola pasada sobre el
 * texto. (Partir todo el CSS en reglas con una expresión regular es
 * cuadrático con HTML que trae imágenes incrustadas: 72 s con un módulo real
 * de 296 KB.)
 */
function hasFullScreenStage(html: string): boolean {
  const WINDOW = 400;
  const fixed = /position\s*:\s*fixed/gi;
  let match: RegExpExecArray | null;
  while ((match = fixed.exec(html))) {
    const from = Math.max(0, match.index - WINDOW);
    const to = Math.min(html.length, match.index + WINDOW);
    const before = html.slice(from, match.index);
    const after = html.slice(match.index, to);
    const start = Math.max(before.lastIndexOf("{"), before.lastIndexOf('"'), before.lastIndexOf("'"));
    const endCandidates = ["}", '"', "'"].map((c) => after.indexOf(c, 1)).filter((i) => i > 0);
    const end = endCandidates.length ? Math.min(...endCandidates) : after.length;
    const rule = before.slice(start + 1) + after.slice(0, end);
    if (/\binset\s*:\s*0\b/i.test(rule)) return true;
  }
  return false;
}

export function detectHtmlLayout(html: string): HtmlLayout {
  const forced = forcedLayout(html);
  if (forced) return forced;

  // Un escenario fijo a pantalla completa que además se escala con el tamaño
  // de la ventana es una presentación (y no, por ejemplo, el fondo de un modal).
  const scalesWithWindow = /\binner(Width|Height)\b/.test(html);
  if (scalesWithWindow && hasFullScreenStage(html)) return "slides";

  const dependsOnViewport =
    /position\s*:\s*(fixed|sticky)/i.test(html) ||
    /\b\d+(\.\d+)?[dsl]?vh\b/i.test(html) ||
    /\binnerHeight\b/.test(html);
  return dependsOnViewport ? "page" : "fragment";
}
