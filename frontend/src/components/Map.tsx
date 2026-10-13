
import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile";
import VectorTile from "ol/VectorTile";
import TileState from "ol/TileState";
import MVT from "ol/format/MVT";
import { createXYZ } from "ol/tilegrid";
import { get as getProjection } from "ol/proj";
import type { Extent } from "ol/extent";
import type Projection from "ol/proj/Projection";
import type { default as OlFeature } from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

import "./Map.css";
import "ol/ol.css";

import type BaseLayer from "ol/layer/Base";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Overlay from "ol/Overlay";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import type { FeatureLike } from "ol/Feature";

import { reprojectGeoJSON } from "../projections/reproject";

import { detectLayerProjection } from "../projections/detectLayerProjection";
import type { LayerProjectionInfo } from "../projections/detectLayerProjection";

import type { GeoJSONLayer } from "../projections/layers";

import { transformCoordinate } from "../projections/transform";
import {
  getProjectionLabel,
  isGeographic,
} from "../projections/projections";

import {
  getFeatureCategory,
  getCategoryColor,
  getCategoryLabel,
} from "../projections/eventCategories";

import { supabase } from "../lib/supabaseClient";
import {
  eventosToGeoJSON,
  esEventoVigente,
} from "../projections/eventosSupabase";

import type { CapturedPoint } from "../projections/types";

interface MapComponentProps {
  projection: string;
  layers: GeoJSONLayer[];
  layerTargetProjection?: string | null;
  reprojectedLayer?: unknown | null;
  activeCategories: Set<string>;
  onLayerProjectionChange: (info: LayerProjectionInfo) => void;
  onCoordinateCapture?: (point: CapturedPoint) => void;
  // Coordenada del clic en el mapa, siempre en EPSG:4326 (lon, lat).
  // Se usa para prellenar el formulario de creación de eventos.
  onPointSelected?: (lonLat: [number, number]) => void;
}

// Cada cuánto se vuelve a evaluar la vigencia de los eventos dinámicos.
const INTERVALO_REVISION_VIGENCIA_MS = 60000;

function createCategoryStyle(activeCategories: Set<string>) {
  return (feature: FeatureLike) => {
    const category = getFeatureCategory(
      feature.getProperties() as Record<string, unknown>
    );

    if (!activeCategories.has(category)) {
      return undefined;
    }

    return new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: getCategoryColor(category) }),
        stroke: new Stroke({ color: "white", width: 2 }),
      }),
    });
  };
}

// Conserva los filtros por categoría y oculta los eventos dinámicos
// que estén fuera de su periodo de vigencia.
function createEventCategoryStyle(activeCategories: Set<string>) {
  const categoryStyle = createCategoryStyle(activeCategories);

  return (feature: FeatureLike) => {
    const properties = feature.getProperties() as Record<string, unknown>;

    const fechaInicio =
      typeof properties["fecha_inicio"] === "string"
        ? properties["fecha_inicio"]
        : null;

    const fechaFin =
      typeof properties["fecha_fin"] === "string"
        ? properties["fecha_fin"]
        : null;

    if (
      !esEventoVigente({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
    ) {
      return undefined;
    }

    return categoryStyle(feature);
  };
}

function MapComponent({
  projection,
  layers,
  layerTargetProjection,
  reprojectedLayer,
  activeCategories,
  onLayerProjectionChange,
  onCoordinateCapture,
  onPointSelected,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const viewStateRef = useRef<{
    center: [number, number];
    zoom: number;
    projection: string;
  } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // --- Capa de eventos de Supabase mediante teselas vectoriales ---

    const eventosTileSource = new VectorTileSource({
      format: new MVT(),
      projection: "EPSG:3857",
      tileGrid: createXYZ({
        maxZoom: 22,
        tileSize: 256,
      }),

      // Convierte la coordenada Y interna de OpenLayers a XYZ.
      tileUrlFunction: (tileCoord) => {
        if (!tileCoord) return undefined;

        const [z, x, y] = tileCoord;

        if (
          !Number.isInteger(z) ||
          z < 0 ||
          z > 22
        ) {
          return undefined;
        }

        const limite = 2 ** z;
        const xyzY = -y - 1;

        // No solicitar teselas que estén fuera del mundo vertical.
        if (
          !Number.isInteger(x) ||
          !Number.isInteger(xyzY) ||
          xyzY < 0 ||
          xyzY >= limite
        ) {
          return undefined;
        }

        // Normalizar X para admitir el desplazamiento horizontal del mapa.
        const xyzX = ((x % limite) + limite) % limite;

        return `${z}/${xyzX}/${xyzY}`;
      },

      tileLoadFunction: (tile, url) => {
        // OpenLayers tipa el argumento como Tile en esta función.
        // La fuente VectorTile crea objetos VectorTile.
        const vectorTile = tile as VectorTile<OlFeature<Geometry>>;

        vectorTile.setLoader(
          (
            extent: Extent,
            _resolution: number,
            tileProjection: Projection
          ) => {
            void (async () => {
              try {
                const [z, x, y] = url.split("/").map(Number);

                if (
                  !Number.isInteger(z) ||
                  !Number.isInteger(x) ||
                  !Number.isInteger(y)
                ) {
                  throw new Error(
                    "Coordenadas de tesela no válidas."
                  );
                }

                const { data, error } = await supabase.rpc(
                  "eventos_mvt_base64",
                  {
                    p_z: z,
                    p_x: x,
                    p_y: y,
                  }
                );

                if (error) {
                  throw error;
                }

                if (!data) {
                  vectorTile.setFeatures([]);
                  return;
                }

                const binary = window.atob(data);
                const bytes = new Uint8Array(binary.length);

                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }

                const format = vectorTile.getFormat();

                const features = format.readFeatures(bytes, {
                  extent,
                  featureProjection: tileProjection,
                });

                vectorTile.setFeatures(features);
              } catch (error) {
                console.error(
                  "Error cargando tesela de eventos desde Supabase:",
                  error
                );

                // Informa a OpenLayers del fallo de carga.
                vectorTile.setState(TileState.ERROR);
              }
            })();
          }
        );
      },
    });

    const deportivosLayer = new VectorTileLayer({
      source: eventosTileSource,
      style: createEventCategoryStyle(activeCategories),
    });

    deportivosLayer.set("layerName", "Eventos (Supabase)");

    // Las coordenadas originales de los eventos están en EPSG:4326.
    deportivosLayer.set("layerProjectionCode", "EPSG:4326");

    // Conserva la detección de la proyección declarada de la capa.
    onLayerProjectionChange(
      detectLayerProjection(eventosToGeoJSON([]))
    );

    // Actualiza los estilos cuando pueda cambiar la vigencia de un evento.
    const vigenciaIntervalId = window.setInterval(() => {
      deportivosLayer.changed();
    }, INTERVALO_REVISION_VIGENCIA_MS);

    // --- Capas GeoJSON: se siguen cargando directamente ---

    const uploadedLayers = layers.map((layer) => {
      const source = new VectorSource();

      const vectorLayer = new VectorLayer({
        source,
        visible: layer.visible,
        style: createCategoryStyle(activeCategories),
      });

      const sourceProjection = layer.projection.code;

      vectorLayer.set("layerName", layer.name);
      vectorLayer.set("layerProjectionCode", sourceProjection);

      const features = reprojectGeoJSON(
        layer.data,
        sourceProjection,
        projection
      );

      source.addFeatures(features);

      return vectorLayer;
    });

    // --- Actualización de teselas mediante Supabase Realtime ---

    const actualizarTeselasEventos = () => {
      eventosTileSource.refresh();
    };

    const eventosChannel = supabase
      .channel("eventos-live")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "eventos" },
        actualizarTeselasEventos
      )
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "eventos" },
        actualizarTeselasEventos
      )
      .on(
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: "eventos" },
        actualizarTeselasEventos
      )
      .subscribe();

    // --- Capa auxiliar para el punto capturado ---

    const captureSource = new VectorSource();

    const captureLayer = new VectorLayer({
      source: captureSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: "#1e88e5" }),
          stroke: new Stroke({ color: "white", width: 2 }),
        }),
      }),
    });

    const saved = viewStateRef.current;

    const defaultCenter = isGeographic(projection)
      ? ([-75.58, 6.17] as [number, number])
      : (transformCoordinate(
          [-75.58, 6.17],
          "EPSG:4326",
          projection
        ) as [number, number]);

    const initialCenter = saved
      ? transformCoordinate(
          saved.center,
          saved.projection,
          projection
        )
      : defaultCenter;

    const initialZoom = saved ? saved.zoom : 12;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        deportivosLayer,
        ...uploadedLayers,
        captureLayer,
      ],
      view: new View({
        projection: getProjection(projection) ?? undefined,
        center: initialCenter,
        zoom: initialZoom,
      }),
    });

    // --- Ventana emergente ---

    const popupElement = document.createElement("div");
    popupElement.className = "map-popup";

    const popup = new Overlay({
      element: popupElement,
      positioning: "bottom-center",
      stopEvent: false,
      offset: [0, -10],
    });

    map.addOverlay(popup);

    map.on("singleclick", async (event) => {
      let hitFeature: FeatureLike | null = null;
      let hitLayer: BaseLayer | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          hitFeature = feature;
          hitLayer = layer ?? null;
          return true;
        },
        {
          layerFilter: (candidate) => candidate !== captureLayer,
        }
      );

      // Las asignaciones realizadas dentro del callback de OpenLayers
      // no se reflejan en el análisis de flujo de TypeScript.
      const selectedFeature = hitFeature as FeatureLike | null;
      const selectedLayer = hitLayer as BaseLayer | null;

      if (selectedFeature) {
        const properties = selectedFeature.getProperties() as Record<
          string,
          unknown
        >;

        const nombre = properties["nombre"] ?? "Sin nombre";
        const municipio = properties["municipio"] ?? "-";
        const tipo = properties["tipo"] ?? "-";

        const categoria = getCategoryLabel(
          getFeatureCategory(properties)
        );

        const fechaInicio = properties["fecha_inicio"] as
          | string
          | null
          | undefined;

        const fechaFin = properties["fecha_fin"] as
          | string
          | null
          | undefined;

        const flyerPath = properties["flyer_path"] as
          | string
          | null
          | undefined;

        const vigenciaHtml =
          fechaInicio && fechaFin
            ? `<br />Vigencia: ${new Date(
                fechaInicio
              ).toLocaleString()} – ${new Date(
                fechaFin
              ).toLocaleString()}`
            : "";

        popupElement.innerHTML = `
          <div class="map-popup__flyer">
            ${
              flyerPath
                ? `<div class="map-popup__flyer-loading">
                    Cargando flyer...
                  </div>`
                : ""
            }
          </div>

          <div class="map-popup__info">
            <strong>${nombre}</strong>
            <br />
            Municipio: ${municipio}
            <br />
            Tipo: ${tipo}
            <br />
            Categoría: ${categoria}
            ${vigenciaHtml}
          </div>
        `;

        popupElement.style.display = "block";
        popup.setPosition(event.coordinate);

        // El bucket es privado: se genera una URL firmada.
        if (flyerPath) {
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from("eventos-flyers")
              .createSignedUrl(flyerPath, 3600);

          if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error(
              "Error obteniendo URL firmada del flyer:",
              signedUrlError
            );

            const flyerContainer =
              popupElement.querySelector(".map-popup__flyer");

            if (flyerContainer) {
              flyerContainer.innerHTML = `
                <div class="map-popup__flyer-error">
                  No se pudo cargar el flyer.
                </div>
              `;
            }
          } else {
            const flyerContainer =
              popupElement.querySelector(".map-popup__flyer");

            if (flyerContainer) {
              flyerContainer.innerHTML = `
                <img
                  class="map-popup__flyer-image"
                  src="${signedUrlData.signedUrl}"
                  alt="Flyer de ${nombre}"
                />
              `;
            }
          }
        }
      } else {
        popupElement.style.display = "none";
      }

      // --- Captura de coordenadas del clic ---

      const clicked = event.coordinate as [number, number];

      captureSource.clear();
      captureSource.addFeature(
        new Feature(new Point(clicked))
      );

      // Coordenada en EPSG:4326 para el formulario de eventos.
      if (onPointSelected) {
        const lonLat = transformCoordinate(
          clicked,
          projection,
          "EPSG:4326"
        ) as [number, number];

        onPointSelected(lonLat);
      }

      if (!onCoordinateCapture) return;

      const layerName = selectedLayer
        ? (selectedLayer.get("layerName") as string | undefined)
        : undefined;

      const layerCode = selectedLayer
        ? (selectedLayer.get(
            "layerProjectionCode"
          ) as string | undefined)
        : undefined;

      const targetCode = layerCode ?? projection;
      const displayName =
        layerName ?? "Vista del mapa (sin capa)";

      const [x, y] = transformCoordinate(
        clicked,
        projection,
        targetCode
      );

      onCoordinateCapture({
        viewProjection: projection,
        entries: [
          {
            code: targetCode,
            label: getProjectionLabel(targetCode),
            layerName: displayName,
            x,
            y,
            unit: isGeographic(targetCode)
              ? ("deg" as const)
              : ("m" as const),
          },
        ],
      });
    });

    return () => {
      // Guarda la vista antes de destruir el mapa.
      const currentView = map.getView();
      const center = currentView.getCenter();

      if (center) {
        viewStateRef.current = {
          center: center as [number, number],
          zoom: currentView.getZoom() ?? 12,
          projection,
        };
      }

      window.clearInterval(vigenciaIntervalId);
      supabase.removeChannel(eventosChannel);
      map.setTarget(undefined);
    };
  }, [
    projection,
    layers,
    layerTargetProjection,
    reprojectedLayer,
    activeCategories,
    onLayerProjectionChange,
    onCoordinateCapture,
    onPointSelected,
  ]);

  return <div ref={mapRef} className="map-container" />;
}

export default MapComponent;
