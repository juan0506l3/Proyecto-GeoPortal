import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { get as getProjection } from "ol/proj";

import "./Map.css";
import "ol/ol.css";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
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

import type { CapturedPoint } from "../projections/types";

import type { GeoJSONLayer } from "../projections/layers";

interface MapComponentProps {
  projection: string;
  layers: GeoJSONLayer[];
  layerTargetProjection?: string | null;
  reprojectedLayer?: unknown | null;
  activeCategories: Set<string>;
  onLayerProjectionChange: (info: LayerProjectionInfo) => void;
  onCoordinateCapture?: (point: CapturedPoint) => void;
}

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
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

 
  const viewStateRef = useRef<{
    center: [number, number];
    zoom: number;
    projection: string;
  } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    fetch("/data/deportivos.geojson")
      .then((response) => response.json())
      .then((data) => {
        onLayerProjectionChange(detectLayerProjection(data));
      });

    const deportivosSource = new VectorSource();

    const deportivosLayer = new VectorLayer({
      source: deportivosSource,
      style: createCategoryStyle(activeCategories),
    });


    deportivosLayer.set("layerName", "Eventos (deportivos.geojson)");
    deportivosLayer.set(
      "layerProjectionCode",
      layerTargetProjection ?? "EPSG:4326"
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

      const features = reprojectGeoJSON(layer.data, sourceProjection, projection);

      source.addFeatures(features);

      return vectorLayer;
    });

    fetch("/data/deportivos.geojson")
      .then((response) => response.json())
      .then((data) => {
        const dataToDisplay = reprojectedLayer ?? data;

        const sourceProjection =
          reprojectedLayer && layerTargetProjection
            ? layerTargetProjection
            : "EPSG:4326";

        const features = reprojectGeoJSON(dataToDisplay, sourceProjection, projection);

        deportivosSource.addFeatures(features);
      });

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
      : (transformCoordinate([-75.58, 6.17], "EPSG:4326", projection) as [
          number,
          number,
        ]);

    const initialCenter = saved
      ? transformCoordinate(saved.center, saved.projection, projection)
      : defaultCenter;

    const initialZoom = saved ? saved.zoom : 12;

    const map = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() }), deportivosLayer, ...uploadedLayers, captureLayer],
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

    map.on("singleclick", (event) => {
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
        const properties = (hitFeature as FeatureLike).getProperties() as Record<
          string,
          unknown
        >;
        const nombre = properties["nombre"] ?? "Sin nombre";
        const municipio = properties["municipio"] ?? "-";
        const tipo = properties["tipo"] ?? "-";
        const categoria = getCategoryLabel(getFeatureCategory(properties));

        popupElement.innerHTML = `
          <strong>${nombre}</strong>
          <br />
          Municipio: ${municipio}
          <br />
          Tipo: ${tipo}
          <br />
          Categoría: ${categoria}
        `;

        popupElement.style.display = "block";
        popup.setPosition(event.coordinate);
      } else {
        popupElement.style.display = "none";
      }

      // --- Captura de coordenadas: una sola entrada, en el SRE de la
      // capa donde cayó el clic (o del mapa base si no hay capa) ---
      const clicked = event.coordinate as [number, number];

      captureSource.clear();
      captureSource.addFeature(new Feature(new Point(clicked)));

      if (!onCoordinateCapture) return;

      const layerName = hitLayer
        ? ((hitLayer as VectorLayer<VectorSource>).get("layerName") as
            | string
            | undefined)
        : undefined;

      const layerCode = hitLayer
        ? ((hitLayer as VectorLayer<VectorSource>).get(
            "layerProjectionCode"
          ) as string | undefined)
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
            unit: isGeographic(targetCode) ? ("deg" as const) : ("m" as const),
          },
        ],
      });
    });

    return () => {
      // 🆕 Guarda dónde estaba mirando el usuario antes de destruir el mapa
      const currentView = map.getView();
      const center = currentView.getCenter();

      if (center) {
        viewStateRef.current = {
          center: center as [number, number],
          zoom: currentView.getZoom() ?? 12,
          projection,
        };
      }

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
  ]);

  return <div ref={mapRef} className="map-container" />;
}

export default MapComponent;
