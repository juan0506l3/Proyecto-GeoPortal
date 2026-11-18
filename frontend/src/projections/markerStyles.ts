import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Icon from "ol/style/Icon";

import { getCategoryColor } from "./eventCategories";

/*
 * Tres tipos de marcador en el mapa:
 *
 *  1. Lugar fijo     -> casita (estructura permanente) con un dibujo por categoría
 *  2. Evento próximo -> círculo hueco con borde de color
 *  3. Evento en vivo -> círculo con centro blanco (las ondas animadas las dibuja
 *                       liveMarkers.ts encima)
 */

/* ───────────── 1. Lugares fijos ───────────── */

// Cuerpo de la casita: techo en punta + paredes redondeadas
const CUERPO_LUGAR =
  '<path d="M16 2.5 30 12.5V30a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12.5z" ' +
  'fill="COLOR" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>';

// Dibujo blanco que va dentro de la casita según la categoría
const DIBUJOS: Record<string, string> = {
  // Nota musical
  musica:
    '<circle cx="12.7" cy="26.4" r="3.3" fill="#ffffff"/>' +
    '<rect x="15" y="16" width="2.2" height="10.4" fill="#ffffff"/>' +
    '<path d="M17.2 16l5.3 1.8v3.6l-5.3-1.8z" fill="#ffffff"/>',

  // Copa de campeón
  deportivo:
    '<path d="M11 15h10v5.2a5 5 0 0 1-10 0z" fill="#ffffff"/>' +
    '<path d="M11 16.5H8.8v1.6c0 1.9 1.1 3 2.7 3.4" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M21 16.5h2.2v1.6c0 1.9-1.1 3-2.7 3.4" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>' +
    '<rect x="15" y="25" width="2" height="3" fill="#ffffff"/>' +
    '<rect x="11.5" y="28" width="9" height="2.2" rx="1" fill="#ffffff"/>',

  // Corazón
  familiar:
    '<path d="M16 29.6s-7.4-4.7-7.4-9.7A4 4 0 0 1 16 18a4 4 0 0 1 7.4 1.9c0 5-7.4 9.7-7.4 9.7z" fill="#ffffff"/>',

  // Estrella
  otros:
    '<polygon points="16.0,15.0 18.0,20.2 23.6,20.5 19.2,24.1 20.7,29.5 16.0,26.4 11.3,29.5 12.8,24.1 8.4,20.5 14.0,20.2" fill="#ffffff"/>',
};

export function crearSvgLugarFijo(categoria: string): string {
  const color = getCategoryColor(categoria);
  const dibujo = DIBUJOS[categoria] ?? DIBUJOS["otros"];

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="34" viewBox="0 0 32 36">' +
    CUERPO_LUGAR.replace("COLOR", color) +
    dibujo +
    "</svg>"
  );
}

const estilosLugar: Record<string, Style> = {};

export function estiloLugarFijo(categoria: string): Style {
  if (!estilosLugar[categoria]) {
    estilosLugar[categoria] = new Style({
      image: new Icon({
        src:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(crearSvgLugarFijo(categoria)),
        // La base de la casita queda justo sobre el punto
        anchor: [0.5, 1],
      }),
    });
  }

  return estilosLugar[categoria];
}

/* ───────────── 2. Eventos próximos ───────────── */

const estilosProximo: Record<string, Style> = {};

export function estiloEventoProximo(categoria: string): Style {
  if (!estilosProximo[categoria]) {
    estilosProximo[categoria] = new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: "white" }),
        stroke: new Stroke({
          color: getCategoryColor(categoria),
          width: 3,
        }),
      }),
    });
  }

  return estilosProximo[categoria];
}

/* ───────────── 3. Eventos en vivo ───────────── */

const estilosEnVivo: Record<string, Style[]> = {};

export function estiloEventoEnVivo(categoria: string): Style[] {
  if (!estilosEnVivo[categoria]) {
    estilosEnVivo[categoria] = [
      // Círculo de color con borde blanco
      new Style({
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({ color: getCategoryColor(categoria) }),
          stroke: new Stroke({ color: "white", width: 2.5 }),
        }),
      }),

      // Centro blanco: se ve como el punto de "transmisión en vivo"
      new Style({
        image: new CircleStyle({
          radius: 3.2,
          fill: new Fill({ color: "white" }),
        }),
      }),
    ];
  }

  return estilosEnVivo[categoria];
}