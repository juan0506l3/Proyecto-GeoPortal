import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { get as getProjection } from "ol/proj";

import "./Map.css";
import "ol/ol.css";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
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

import {
  reprojectGeoJSON,
  reprojectGeoJSONData,
} from "../projections/reproject";

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
  filtrarEventosVigentes,
  type EventoRow,
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
  onPointSelected?: (lonLat: [number, number]) => void;
}

const INTERVALO_REVISION_VIGENCIA_MS = 60000;

const ESRI_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services";

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
  '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">' +
  '<circle cx="22" cy="22" r="14" fill="rgba(32,82,149,0.22)"/>' +
  '<circle cx="22" cy="22" r="14" fill="none" stroke="#ffffff" stroke-width="4"/>' +
  '<circle cx="22" cy="22" r="14" fill="none" stroke="#205295" stroke-width="2"/>' +
  '<path d="M22 3v12M22 29v12M3 22h12M29 22h12" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M22 3v12M22 29v12M3 22h12M29 22h12" stroke="#205295" stroke-width="2.5" stroke-linecap="round"/>' +
  '<circle cx="22" cy="22" r="4.5" fill="#205295" stroke="#ffffff" stroke-width="2"/></svg>';

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

    const deportivosSource = new VectorSource();

    const deportivosLayer = new VectorLayer({
      source: deportivosSource,
      style: createCategoryStyle(activeCategories),
    });

    deportivosLayer.set("layerName", "Eventos (Supabase)");

    deportivosLayer.set(
      "layerProjectionCode",
      "EPSG:4326"
    );

    let allEventos: EventoRow[] = [];

    const syncDeportivosSource = () => {
      const vigentes = filtrarEventosVigentes(allEventos);

      const geojson = eventosToGeoJSON(vigentes);

  
      const destino = layerTargetProjection ?? projection;

    
      const geojsonReprojectado =
        reprojectGeoJSONData(
          geojson,
          "EPSG:4326",
          destino
        );

      const features =
        destino === projection
          ? reprojectGeoJSON(
              geojsonReprojectado,
              destino,
              projection
            )
          : reprojectGeoJSON(
              geojsonReprojectado,
              destino,
              projection
            );

      deportivosSource.clear();
      deportivosSource.addFeatures(features);

  
      deportivosLayer.set(
        "layerProjectionCode",
        destino
      );
    };

    supabase
      .from("eventos")
      .select("*")
      .then(
        ({
          data,
          error,
        }: {
          data: EventoRow[] | null;
          error: unknown;
        }) => {
          if (error || !data) {
            console.error("Error cargando eventos de Supabase:", error);
            return;
          }

          allEventos = data;

          onLayerProjectionChange(
            detectLayerProjection(eventosToGeoJSON(allEventos))
          );

          syncDeportivosSource();
        }
      );

    const vigenciaIntervalId = window.setInterval(
      syncDeportivosSource,
      INTERVALO_REVISION_VIGENCIA_MS
    );

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

    const eventosChannel = supabase
      .channel("eventos-live")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "eventos" },
        (payload: any) => {
          const nuevo = payload.new as EventoRow;
          allEventos = [...allEventos, nuevo];
          syncDeportivosSource();
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "eventos" },
        (payload: any) => {
          const actualizado = payload.new as EventoRow;

          allEventos = allEventos.map((row) =>
            row.id === actualizado.id ? actualizado : row
          );

          syncDeportivosSource();
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: "eventos" },
        (payload: any) => {
          const eliminado = payload.old as { id: string };

          allEventos = allEventos.filter(
            (row) => row.id !== eliminado.id
          );

          syncDeportivosSource();
        }
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
          anchor: [0.5, 0.5],
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
      let hitLayer: VectorLayer<VectorSource> | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          hitFeature = feature;
          hitLayer = layer as VectorLayer<VectorSource> | null;
          return true;
        },
        {
          layerFilter: (candidate) => candidate !== captureLayer,
        }
      );

      if (hitFeature) {
        const properties = (
          hitFeature as FeatureLike
        ).getProperties() as Record<string, unknown>;

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

      const clicked = event.coordinate as [number, number];

      captureSource.clear();
      captureSource.addFeature(
        new Feature(new Point(clicked))
      );

      if (onPointSelected) {
        const lonLat = transformCoordinate(
          clicked,
          projection,
          "EPSG:4326"
        ) as [number, number];

        onPointSelected(lonLat);
      }

      if (!onCoordinateCapture) return;

      const layerName = hitLayer
        ? ((hitLayer as VectorLayer<VectorSource>).get(
            "layerName"
          ) as string | undefined)
        : undefined;

      const layerCode = hitLayer
        ? ((hitLayer as VectorLayer<VectorSource>).get(
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
