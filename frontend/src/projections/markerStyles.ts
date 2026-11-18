import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Icon from "ol/style/Icon";

import { getCategoryColor } from "./eventCategories";

/*
 * Tres tipos de marcador en el mapa:
 *
 *  1. Lugar fijo     -> casita (estructura permanente) con un dibujo por categoria
 *  2. Evento proximo -> circulo hueco con borde de color
 *  3. Evento en vivo -> circulo con centro blanco (las ondas animadas las dibuja
 *                       liveMarkers.ts encima)
 */

/* ------------- 1. Lugares fijos ------------- */

// Mezcla un color #rrggbb con blanco (0 = igual, 1 = blanco)
function aclarar(hex: string, cantidad: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const mezclar = (c: number) => Math.round(c + (255 - c) * cantidad);

  const r = mezclar((n >> 16) & 255);
  const g = mezclar((n >> 8) & 255);
  const b = mezclar(n & 255);

  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Silueta de la casita: techo en punta + paredes con esquinas suaves
const SILUETA = "M16 2.5 30 12.5V30a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12.5z";

// Dibujo blanco que va dentro de la casita segun la categoria
const DIBUJOS: Record<string, string> = {
  // Nota musical
  musica:
    '<circle cx="12.7" cy="26.4" r="3.3" fill="#ffffff"/>' +
    '<rect x="15" y="16" width="2.2" height="10.4" fill="#ffffff"/>' +
    '<path d="M17.2 16l5.3 1.8v3.6l-5.3-1.8z" fill="#ffffff"/>',

  // Copa de campeon
  deportivo:
    '<path d="M11 15h10v5.2a5 5 0 0 1-10 0z" fill="#ffffff"/>' +
    '<path d="M11 16.5H8.8v1.6c0 1.9 1.1 3 2.7 3.4" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M21 16.5h2.2v1.6c0 1.9-1.1 3-2.7 3.4" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>' +
    '<rect x="15" y="25" width="2" height="3" fill="#ffffff"/>' +
    '<rect x="11.5" y="28" width="9" height="2.2" rx="1" fill="#ffffff"/>',

  // Familia: dos adultos y un nino en el centro
  familiar:
    '<circle cx="9" cy="18.6" r="2.1" fill="#ffffff"/>' +
    '<path d="M6 29.6v-4a3 3 0 0 1 6 0v4z" fill="#ffffff"/>' +
    '<circle cx="23" cy="18.6" r="2.1" fill="#ffffff"/>' +
    '<path d="M20 29.6v-4a3 3 0 0 1 6 0v4z" fill="#ffffff"/>' +
    '<circle cx="16" cy="22.8" r="1.8" fill="#ffffff"/>' +
    '<path d="M13.4 29.6v-2.2a2.6 2.6 0 0 1 5.2 0v2.2z" fill="#ffffff"/>',

  // Edificio con columnas (lugar emblematico)
  otros:
    '<path d="M16 15.2 24.6 19.4H7.4z" fill="#ffffff"/>' +
    '<rect x="9.2" y="21" width="2.3" height="6.4" rx="0.4" fill="#ffffff"/>' +
    '<rect x="14.85" y="21" width="2.3" height="6.4" rx="0.4" fill="#ffffff"/>' +
    '<rect x="20.5" y="21" width="2.3" height="6.4" rx="0.4" fill="#ffffff"/>' +
    '<rect x="7.4" y="28.2" width="17.2" height="2.2" rx="0.7" fill="#ffffff"/>',
};

export function crearSvgLugarFijo(categoria: string): string {
  const color = getCategoryColor(categoria);
  const dibujo = DIBUJOS[categoria] ?? DIBUJOS["otros"];

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="34" viewBox="0 0 32 36">' +
    "<defs>" +
    // Degradado suave: mas claro arriba, color pleno abajo
    '<linearGradient id="g-' + categoria + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + aclarar(color, 0.22) + '"/>' +
    '<stop offset="1" stop-color="' + color + '"/>' +
    "</linearGradient>" +
    "</defs>" +
    // Contorno oscuro tenue: separa la casita del fondo del mapa
    '<path d="' + SILUETA + '" fill="none" stroke="#000000" stroke-opacity="0.28" ' +
    'stroke-width="3.6" stroke-linejoin="round"/>' +
    // Cuerpo con borde blanco fino
    '<path d="' + SILUETA + '" fill="url(#g-' + categoria + ')" stroke="#ffffff" stroke-width="1.8" ' +
    'stroke-linejoin="round"/>' +
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

/* ------------- 2. Eventos proximos ------------- */

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

/* ------------- 3. Eventos en vivo ------------- */

const estilosEnVivo: Record<string, Style[]> = {};

export function estiloEventoEnVivo(categoria: string): Style[] {
  if (!estilosEnVivo[categoria]) {
    estilosEnVivo[categoria] = [
      // Circulo de color con borde blanco
      new Style({
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({ color: getCategoryColor(categoria) }),
          stroke: new Stroke({ color: "white", width: 2.5 }),
        }),
      }),

      // Centro blanco: se ve como el punto de "transmision en vivo"
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