import { describe, expect, it } from "vitest";
import { detectHtmlLayout } from "./htmlLayout";

// Recortes con la misma estructura que los módulos reales del 24/09/2026.
const PRESENTACION = `<style>
#stage-wrap{position:fixed; inset:0; z-index:1; overflow:hidden;}
#deck{position:absolute; width:1600px; height:900px;}
</style>
<script>const k = Math.min(innerWidth/1600, innerHeight/900);</script>`;

const ARTICULO = `<style>
.progress{position:fixed;top:0;left:0;height:3px}
.scrolly-wrapper{position:relative;height:350vh}
.sticky-chart{position:sticky;top:15vh}
h1{font-size:clamp(2.5rem,6.2vw,4.65rem)}
</style>`;

const CALCULADORA = `<div style="font-family:sans-serif;padding:16px">
<label>Valor <input id="v" type="number"></label><button onclick="calc()">Calcular</button>
</div><script>function calc(){}</script>`;

describe("detectHtmlLayout", () => {
  it("presentación que se escala a la ventana → cuadro 16:9", () => {
    expect(detectHtmlLayout(PRESENTACION)).toBe("slides");
  });

  it("artículo con barra fija, sticky y alturas en vh → cuadro del alto de la pantalla", () => {
    expect(detectHtmlLayout(ARTICULO)).toBe("page");
  });

  it("recurso corto sin dependencias de la ventana → se ajusta al contenido", () => {
    expect(detectHtmlLayout(CALCULADORA)).toBe("fragment");
  });

  it("un modal a pantalla completa no convierte un artículo en presentación", () => {
    const conModal = `${ARTICULO}<style>.modal{position:fixed;inset:0;background:rgba(0,0,0,.5)}</style>`;
    expect(detectHtmlLayout(conModal)).toBe("page");
  });

  it("vw sin vh no cuenta como página: solo cambia tamaños con el ancho", () => {
    expect(detectHtmlLayout(`<style>h1{font-size:5vw}</style><h1>Hola</h1>`)).toBe("fragment");
  });

  it("detecta el escenario también en un atributo style", () => {
    const inline = `<div style="position:fixed; inset:0"></div><script>onresize=()=>innerWidth</script>`;
    expect(detectHtmlLayout(inline)).toBe("slides");
  });

  it("es rápida con HTML grande con imágenes incrustadas (antes tardaba 72 s)", () => {
    const imagen = `<img src="data:image/png;base64,${"A".repeat(300_000)}">`;
    const t = performance.now();
    expect(detectHtmlLayout(PRESENTACION + imagen + ARTICULO)).toBe("slides");
    expect(performance.now() - t).toBeLessThan(200);
  });

  it("el autor puede forzar el tipo con una meta etiqueta, en cualquier orden de atributos", () => {
    expect(detectHtmlLayout(`<meta name="equidata-layout" content="page">${CALCULADORA}`)).toBe("page");
    expect(detectHtmlLayout(`<meta content="fragment" name="equidata-layout">${PRESENTACION}`)).toBe("fragment");
    expect(detectHtmlLayout(`<meta name="equidata-layout" content="otra-cosa">${CALCULADORA}`)).toBe("fragment");
  });
});
