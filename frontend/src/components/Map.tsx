import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
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

import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Icon from "ol/style/Icon";
import type BaseLayer from "ol/layer/Base";
import Overlay from "ol/Overlay";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import type { FeatureLike } from "ol/Feature";

import { reprojectGeoJSON } from "../projections/reproject";

import { detectLayerProjection } from "../projections/detectLayerProjection";
import type { LayerProjectionInfo } from "../projections/detectLayerProjection";

import type { GeoJSONLayer } from "../projections/layers";

import { transformCoordinate } from "../projections/transform";
import { createPolygonStyle, isPolygon } from "../projections/polygonStyle";
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

import {
  escapeHtml,
  etiquetaEnlace,
  normalizarMunicipio,
  normalizarUrl,
} from "../projections/eventoUtils";

interface MapComponentProps {
  projection: string;
  layers: GeoJSONLayer[];
  layerTargetProjection?: string | null;
  reprojectedLayer?: unknown | null;
  activeCategories: Set<string>;
  onLayerProjectionChange: (info: LayerProjectionInfo) => void;
  onCoordinateCapture?: (point: CapturedPoint) => void;
  onPointSelected?: (lonLat: [number, number]) => void;
}

const INTERVALO_REVISION_VIGENCIA_MS = 60000;

const ESRI_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services";

const SATELLITE_URL = `${ESRI_TILES}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
const PLACES_URL = `${ESRI_TILES}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`;
const ROADS_URL = `${ESRI_TILES}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`;

const ESRI_ATTRIBUTIONS =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const SATELLITE_FAILURE_LIMIT = 6;

type BaseMapId = "hybrid" | "satellite" | "osm";

const BASE_MAP_OPTIONS: { id: BaseMapId; label: string }[] = [
  { id: "hybrid", label: "Híbrido" },
  { id: "satellite", label: "Satélite" },
  { id: "osm", label: "Mapa" },
];

interface BaseLayers {
  osm: BaseLayer;
  satellite: BaseLayer;
  labels: BaseLayer[];
}

function createEsriLayer(url: string) {
  return new TileLayer({
    source: new XYZ({
      url,
      attributions: ESRI_ATTRIBUTIONS,
      maxZoom: 19,
    }),
    visible: false,
  });
}

function applyBaseMap(layers: BaseLayers, id: BaseMapId) {
  layers.osm.setVisible(id === "osm");
  layers.satellite.setVisible(id !== "osm");
  layers.labels.forEach((layer) => layer.setVisible(id === "hybrid"));
}

const CAPTURE_MARKER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 32 42">' +
  '<path d="M16 1C8 1 1.5 7.4 1.5 15.3 1.5 26 16 41 16 41s14.5-15 14.5-25.7C30.5 7.4 24 1 16 1z" fill="#205295" stroke="#ffffff" stroke-width="2"/>' +
  '<circle cx="16" cy="15" r="5.5" fill="#ffffff"/></svg>';

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
  activeCategories,
  onLayerProjectionChange,
  onCoordinateCapture,
  onPointSelected,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const eventosLayerRef = useRef<VectorTileLayer | null>(null);
  const layerTargetProjectionRef = useRef<string | null>(
    layerTargetProjection ?? null
  );

  layerTargetProjectionRef.current = layerTargetProjection ?? null;

  const [baseMap, setBaseMap] = useState<BaseMapId>("hybrid");
  const [satelliteFailed, setSatelliteFailed] = useState(false);
  const baseMapRef = useRef<BaseMapId>(baseMap);
  const baseLayersRef = useRef<BaseLayers | null>(null);

  const viewStateRef = useRef<{
    center: [number, number];
    zoom: number;
    projection: string;
  } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const eventosTileSource = new VectorTileSource({
      format: new MVT(),
      projection: "EPSG:3857",
      tileGrid: createXYZ({
        maxZoom: 22,
        tileSize: 256,
      }),

      tileUrlFunction: (tileCoord) => {
        if (!tileCoord) return undefined;

        const [z, x, y] = tileCoord;
        const limite = 2 ** z;

        if (
          !Number.isInteger(z) ||
          z < 0 ||
          z > 22 ||
          !Number.isInteger(x) ||
          !Number.isInteger(y) ||
          y < 0 ||
          y >= limite
        ) {
          return undefined;
        }

        const xyzX = ((x % limite) + limite) % limite;

        return `${z}/${xyzX}/${y}`;
      },

      tileLoadFunction: (tile, url) => {
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
                  throw new Error("Coordenadas de tesela no válidas.");
                }

                const { data, error } = await supabase.rpc(
                  "eventos_mvt_base64",
                  { p_z: z, p_x: x, p_y: y }
                );

                if (error) throw error;

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

    eventosLayerRef.current = deportivosLayer;

    const detectedProjection = detectLayerProjection(
      eventosToGeoJSON([])
    );

    const activeLayerProjection = layerTargetProjectionRef.current
      ? {
          ...detectedProjection,
          code: layerTargetProjectionRef.current,
          source: "declarado" as const,
        }
      : detectedProjection;

    deportivosLayer.set(
      "layerProjectionCode",
      activeLayerProjection.code
    );

    onLayerProjectionChange(activeLayerProjection);

    const vigenciaIntervalId = window.setInterval(() => {
      deportivosLayer.changed();
    }, INTERVALO_REVISION_VIGENCIA_MS);

    const uploadedLayers = layers.map((layer, index) => {
      const source = new VectorSource();

      const pointStyle = createCategoryStyle(activeCategories);
      const polygonStyle = createPolygonStyle(index);

      const vectorLayer = new VectorLayer({
        source,
        visible: layer.visible,
        style: (feature: FeatureLike) =>
          isPolygon(feature) ? polygonStyle(feature) : pointStyle(feature),
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

    const captureSource = new VectorSource();

    const captureLayer = new VectorLayer({
      source: captureSource,
      style: new Style({
        image: new Icon({
          src:
            "data:image/svg+xml;utf8," +
            encodeURIComponent(CAPTURE_MARKER_SVG),
          anchor: [0.5, 1],
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
      ? transformCoordinate(saved.center, saved.projection, projection)
      : defaultCenter;

    const initialZoom = saved ? saved.zoom : 12;

    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: false,
    });

    const satelliteLayer = createEsriLayer(SATELLITE_URL);
    const placesLayer = createEsriLayer(PLACES_URL);
    const roadsLayer = createEsriLayer(ROADS_URL);

    const baseLayers: BaseLayers = {
      osm: osmLayer,
      satellite: satelliteLayer,
      labels: [placesLayer, roadsLayer],
    };

    applyBaseMap(baseLayers, baseMapRef.current);
    baseLayersRef.current = baseLayers;

    const satelliteSource = satelliteLayer.getSource() as XYZ;
    let consecutiveErrors = 0;

    satelliteSource.on("tileloadend", () => {
      consecutiveErrors = 0;
    });

    satelliteSource.on("tileloaderror", () => {
      consecutiveErrors += 1;

      if (
        consecutiveErrors >= SATELLITE_FAILURE_LIMIT &&
        baseMapRef.current !== "osm"
      ) {
        setSatelliteFailed(true);
        setBaseMap("osm");
      }
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        osmLayer,
        satelliteLayer,
        placesLayer,
        roadsLayer,
        ...uploadedLayers,
        deportivosLayer,
        captureLayer,
      ],
      view: new View({
        projection: getProjection(projection) ?? undefined,
        center: initialCenter,
        zoom: initialZoom,
      }),
    });

    const resizeObserver = new ResizeObserver(() => map.updateSize());
    resizeObserver.observe(mapRef.current);

    const popupElement = document.createElement("div");
    popupElement.className = "map-popup";

    const popup = new Overlay({
      element: popupElement,
      positioning: "bottom-center",
      stopEvent: true,
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

      const selectedFeature = hitFeature as FeatureLike | null;
      const selectedLayer = hitLayer as BaseLayer | null;

      if (selectedFeature) {
        const properties = selectedFeature.getProperties() as Record<
          string,
          unknown
        >;

        const nombre = escapeHtml(properties["nombre"] ?? "Sin nombre");

        const municipio = escapeHtml(
          normalizarMunicipio(
            properties["municipio"] as string | null | undefined
          ) ?? "-"
        );

        const tipo = escapeHtml(properties["tipo"] ?? "-");

        const direccion = properties["direccion"]
          ? escapeHtml(properties["direccion"])
          : null;

        const enlacePublicacion = normalizarUrl(
          properties["flyer_url"] as string | null | undefined
        );

        const categoria = getCategoryLabel(getFeatureCategory(properties));

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
              ).toLocaleString()} – ${new Date(fechaFin).toLocaleString()}`
            : "";

        const direccionHtml = direccion
          ? `<br />Dirección: ${direccion}`
          : "";

        const enlaceHtml = enlacePublicacion
          ? `<br /><a class="map-popup__link" href="${escapeHtml(
              enlacePublicacion
            )}" target="_blank" rel="noopener noreferrer">${etiquetaEnlace(
              enlacePublicacion
            )} ↗</a>`
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
            ${direccionHtml}
            <br />
            Tipo: ${tipo}
            <br />
            Categoría: ${categoria}
            ${vigenciaHtml}
            ${enlaceHtml}
          </div>
        `;

        popupElement.style.display = "block";
        popup.setPosition(event.coordinate);

        if (flyerPath) {
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from("eventos-flyers")
              .createSignedUrl(flyerPath, 3600);

          const flyerContainer =
            popupElement.querySelector(".map-popup__flyer");

          if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error(
              "Error obteniendo URL firmada del flyer:",
              signedUrlError
            );

            if (flyerContainer) {
              flyerContainer.innerHTML = `
                <div class="map-popup__flyer-error">
                  No se pudo cargar el flyer.
                </div>
              `;
            }
          } else if (flyerContainer) {
            flyerContainer.innerHTML = `
              <img
                class="map-popup__flyer-image"
                src="${signedUrlData.signedUrl}"
                alt="Flyer de ${nombre}"
              />
            `;
          }
        }
      } else {
        popupElement.style.display = "none";
      }

      const clicked = event.coordinate as [number, number];

      captureSource.clear();
      captureSource.addFeature(new Feature(new Point(clicked)));

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
        ? (selectedLayer.get("layerProjectionCode") as string | undefined)
        : undefined;

      const targetCode = layerCode ?? projection;
      const displayName = layerName ?? "Vista del mapa (sin capa)";

      const [x, y] = transformCoordinate(clicked, projection, targetCode);

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
      resizeObserver.disconnect();
      map.setTarget(undefined);
    };
  }, [
    projection,
    layers,
    activeCategories,
    onLayerProjectionChange,
    onCoordinateCapture,
    onPointSelected,
  ]);

  useEffect(() => {
    if (!layerTargetProjection) return;

    const eventosLayer = eventosLayerRef.current;

    if (!eventosLayer) return;

    eventosLayer.set(
      "layerProjectionCode",
      layerTargetProjection
    );

    eventosLayer.changed();

    const detectedProjection = detectLayerProjection(
      eventosToGeoJSON([])
    );

    onLayerProjectionChange({
      ...detectedProjection,
      code: layerTargetProjection,
      source: "declarado",
    });
  }, [layerTargetProjection, onLayerProjectionChange]);

  useEffect(() => {
    baseMapRef.current = baseMap;

    if (baseLayersRef.current) {
      applyBaseMap(baseLayersRef.current, baseMap);
    }
  }, [baseMap]);

  const handleBaseMapChange = (id: BaseMapId) => {
    setSatelliteFailed(false);
    setBaseMap(id);
  };

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />

      <div className="basemap-control">
        {satelliteFailed && baseMap === "osm" && (
          <div className="basemap-notice">
            El satélite no está disponible ahora. Mostrando OpenStreetMap.
          </div>
        )}

        <div className="basemap-switch" role="group" aria-label="Mapa base">
          {BASE_MAP_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`basemap-switch__btn${
                baseMap === option.id ? " basemap-switch__btn--active" : ""
              }`}
              onClick={() => handleBaseMapChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MapComponent;
