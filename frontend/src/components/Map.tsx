import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, get as getProjection } from "ol/proj";

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

const CAPTURE_TARGETS = [
  "EPSG:4326",
  "EPSG:3857",
  "EPSG:9377",
];

interface MapComponentProps {
  projection: string;

  layers: GeoJSONLayer[];

  layerTargetProjection?: string | null;

  reprojectedLayer?: unknown | null;

  activeCategories: Set<string>;

  onLayerProjectionChange: (
    info: LayerProjectionInfo
  ) => void;

  onCoordinateCapture?: (
    point: CapturedPoint
  ) => void;
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

        fill: new Fill({
          color: getCategoryColor(category),
        }),

        stroke: new Stroke({
          color: "white",
          width: 2,
        }),
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
  const mapRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    fetch("/data/deportivos.geojson")
      .then((response) => response.json())
      .then((data) => {
        onLayerProjectionChange(
          detectLayerProjection(data)
        );
      });

    const deportivosSource =
      new VectorSource();

    const deportivosLayer =
      new VectorLayer({
        source: deportivosSource,
        style: createCategoryStyle(activeCategories),
      });

    const uploadedLayers = layers.map((layer) => {
      const source = new VectorSource();

      const vectorLayer = new VectorLayer({
        source,

        visible: layer.visible,

        style: createCategoryStyle(activeCategories),
      });

      const sourceProjection =
        layer.projection.code;

      const features = reprojectGeoJSON(
        layer.data,
        sourceProjection,
        projection
      );

      source.addFeatures(features);

      return vectorLayer;
    });

    fetch("/data/deportivos.geojson")
      .then((response) => response.json())
      .then((data) => {
        const dataToDisplay =
          reprojectedLayer ?? data;

        const sourceProjection =
          reprojectedLayer &&
          layerTargetProjection
            ? layerTargetProjection
            : "EPSG:4326";

        const features = reprojectGeoJSON(
          dataToDisplay,
          sourceProjection,
          projection
        );

        deportivosSource.addFeatures(
          features
        );
      });

    const captureSource =
      new VectorSource();

    const captureLayer =
      new VectorLayer({
        source: captureSource,

        style: new Style({
          image: new CircleStyle({
            radius: 8,

            fill: new Fill({
              color: "#1e88e5",
            }),

            stroke: new Stroke({
              color: "white",
              width: 2,
            }),
          }),
        }),
      });

    const map = new Map({
      target: mapRef.current,

      layers: [
        new TileLayer({
          source: new OSM(),
        }),

        deportivosLayer,

        ...uploadedLayers,

        captureLayer,
      ],

      view: new View({
        projection:
          getProjection(projection) ??
          undefined,

        center:
          projection === "EPSG:4326"
            ? [-75.58, 6.17]
            : fromLonLat([
                -75.58,
                6.17,
              ]),

        zoom: 12,
      }),
    });

    const popupElement =
      document.createElement("div");

    popupElement.className =
      "map-popup";

    const popup = new Overlay({
      element: popupElement,
      positioning: "bottom-center",
      stopEvent: false,
      offset: [0, -10],
    });

    map.addOverlay(popup);

    map.on(
      "singleclick",
      (event) => {
        const feature =
          map.forEachFeatureAtPixel(
            event.pixel,
            (feature) => feature
          );

        if (!feature) {
          popupElement.style.display =
            "none";

          return;
        }

        const properties =
          feature.getProperties() as Record<
            string,
            unknown
          >;

        const nombre =
          properties["nombre"] ?? "Sin nombre";

        const municipio =
          properties["municipio"] ?? "-";

        const tipo =
          properties["tipo"] ?? "-";

        const categoria = getCategoryLabel(
          getFeatureCategory(properties)
        );

        popupElement.innerHTML = `
          <strong>${nombre}</strong>
          <br />
          Municipio: ${municipio}
          <br />
          Tipo: ${tipo}
          <br />
          Categoría: ${categoria}
        `;

        popupElement.style.display =
          "block";

        popup.setPosition(
          event.coordinate
        );
      }
    );

    map.on(
      "singleclick",
      (event) => {
        const clicked =
          event.coordinate as [
            number,
            number
          ];

        captureSource.clear();

        captureSource.addFeature(
          new Feature(
            new Point(clicked)
          )
        );

        if (!onCoordinateCapture)
          return;

        const entries =
          CAPTURE_TARGETS.map(
            (code) => {
              const [x, y] =
                transformCoordinate(
                  clicked,
                  projection,
                  code
                );

              return {
                code,

                label:
                  getProjectionLabel(
                    code
                  ),

                x,
                y,

                unit:
                  isGeographic(code)
                    ? ("deg" as const)
                    : ("m" as const),
              };
            }
          );

        onCoordinateCapture({
          viewProjection:
            projection,

          entries,
        });
      }
    );

    return () => {
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

  return (
    <div
      ref={mapRef}
      className="map-container"
    />
  );
}

export default MapComponent;
