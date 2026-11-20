import Overlay from "ol/Overlay";
import type OlMap from "ol/Map";
import type { FeatureLike } from "ol/Feature";

import { estadoEvento } from "./eventosSupabase";
import { getCategoryColor, getFeatureCategory } from "./eventCategories";

/*
 * Animaciones de los eventos EN VIVO.
 *
 * Las teselas del mapa no se pueden animar, así que guardamos los eventos con
 * fechas que pasan por ellas y, mientras estén en curso, les ponemos encima un
 * elemento HTML con animación CSS (los estilos están en Map.css). El elemento no
 * recibe clics: el clic sigue llegando al punto del mapa y abre el popup normal.
 */

interface EventoDinamico {
  coordenada: [number, number];
  zoom: number;
  categoria: string;
  subcategoria: string;
  inicio: string;
  fin: string;
}

// Cada categoría tiene su propia animación
const PLANTILLAS: Record<string, string> = {
  // Ondas de sonido + ecualizador
  musica:
    '<span class="live-marker__ring"></span>' +
    '<span class="live-marker__ring"></span>' +
    '<span class="live-marker__ring"></span>' +
    '<span class="live-marker__eq"><i></i><i></i><i></i><i></i></span>',

  // Latido rápido + balón que gira alrededor
  deportivo:
    '<span class="live-marker__ring"></span>' +
    '<span class="live-marker__ring"></span>' +
    '<span class="live-marker__orbit"><i></i></span>',

  // Brillo suave + destellos que titilan
  familiar:
    '<span class="live-marker__glow"></span>' +
    '<span class="live-marker__sparks"><i></i><i></i><i></i><i></i></span>',

  // Radar lento
  otros:
    '<span class="live-marker__ring"></span>' +
    '<span class="live-marker__ring"></span>',
};

const REVISION_MS = 10000;

interface CoordenadaLike {
  getFlatCoordinates?: () => ArrayLike<number>;
  getGeometry?: () =>
    | {
        getType: () => string;
        getCoordinates?: () => ArrayLike<number>;
      }
    | undefined;
}

// Las teselas pueden traer RenderFeature o Feature: se leen las dos formas
function coordenadaDe(feature: FeatureLike): [number, number] | null {
  const f = feature as unknown as CoordenadaLike;

  if (typeof f.getFlatCoordinates === "function") {
    const c = f.getFlatCoordinates();
    return c.length >= 2 ? [c[0], c[1]] : null;
  }

  const geometria = f.getGeometry?.();

  if (geometria && geometria.getType() === "Point" && geometria.getCoordinates) {
    const c = geometria.getCoordinates();
    return [c[0], c[1]];
  }

  return null;
}

export function createLiveMarkers(
  activeCategories: Set<string>,
  activeSubcategories: Set<string>
) {
  const eventos: Record<string, EventoDinamico> = {};
  const overlays: Record<string, Overlay> = {};

  let mapa: OlMap | null = null;
  let temporizadorRevision: number | undefined;
  let temporizadorSync: number | undefined;

  function crearOverlay(evento: EventoDinamico): Overlay {
    const elemento = document.createElement("div");

    elemento.className = `live-marker live-marker--${evento.categoria}`;
    elemento.style.setProperty("--live-color", getCategoryColor(evento.categoria));
    elemento.innerHTML = PLANTILLAS[evento.categoria] ?? PLANTILLAS["otros"];

    return new Overlay({
      element: elemento,
      position: evento.coordenada,
      positioning: "center-center",
      stopEvent: false,
    });
  }

  // Pone/quita animaciones según qué eventos están en curso ahora mismo
  function sincronizar() {
    if (!mapa) return;

    const ahora = new Date();
    const vivos: Record<string, true> = {};

    for (const clave of Object.keys(eventos)) {
      const evento = eventos[clave];

      if (!activeCategories.has(evento.categoria)) continue;

      if (
        evento.subcategoria.trim() !== "" &&
        !activeSubcategories.has(`${evento.categoria}:${evento.subcategoria}`)
      ) {
        continue;
      }

      const estado = estadoEvento(
        { fecha_inicio: evento.inicio, fecha_fin: evento.fin },
        ahora
      );

      if (estado !== "en_curso") continue;

      vivos[clave] = true;

      if (!overlays[clave]) {
        overlays[clave] = crearOverlay(evento);
        mapa.addOverlay(overlays[clave]);
      } else {
        overlays[clave].setPosition(evento.coordenada);
      }
    }

    for (const clave of Object.keys(overlays)) {
      if (!vivos[clave]) {
        mapa.removeOverlay(overlays[clave]);
        delete overlays[clave];
      }
    }
  }

  // Varias teselas llegan juntas: se agrupan en una sola sincronización
  function programarSincronizacion() {
    if (temporizadorSync !== undefined) return;

    temporizadorSync = window.setTimeout(() => {
      temporizadorSync = undefined;
      sincronizar();
    }, 60);
  }

  return {
    // Se llama con las características de cada tesela que se descarga
    registrar(features: FeatureLike[], zoom: number) {
      for (const feature of features) {
        const propiedades = feature.getProperties() as Record<string, unknown>;

        const inicio = propiedades["fecha_inicio"];
        const fin = propiedades["fecha_fin"];

        if (typeof inicio !== "string" || typeof fin !== "string") continue;

        const coordenada = coordenadaDe(feature);
        if (!coordenada) continue;

        const clave = [
          propiedades["id"] ?? "",
          propiedades["nombre"] ?? "",
          inicio,
          fin,
        ].join("|");

        const anterior = eventos[clave];

        // Nos quedamos con la posición de la tesela más cercana (mayor zoom)
        if (anterior && anterior.zoom > zoom) continue;

        eventos[clave] = {
          coordenada,
          zoom,
          categoria: getFeatureCategory(propiedades),
          subcategoria:
              typeof propiedades["subcategoria"] === "string"
                ? propiedades["subcategoria"]
                : "",
          inicio,
          fin,
        };
      }

      programarSincronizacion();
    },

    conectar(map: OlMap) {
      mapa = map;
      sincronizar();

      temporizadorRevision = window.setInterval(sincronizar, REVISION_MS);
    },

    destruir() {
      window.clearInterval(temporizadorRevision);
      window.clearTimeout(temporizadorSync);

      if (mapa) {
        for (const clave of Object.keys(overlays)) {
          mapa.removeOverlay(overlays[clave]);
        }
      }

      for (const clave of Object.keys(overlays)) delete overlays[clave];
      for (const clave of Object.keys(eventos)) delete eventos[clave];

      mapa = null;
    },
  };
}