import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, get as getProjection } from "ol/proj";
import "./Map.css";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Overlay from "ol/Overlay";

import "ol/ol.css";

interface MapComponentProps {
  projection: string;
  onLayerProjectionChange: (projection: string) => void;
}

function MapComponent({ projection, onLayerProjectionChange }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    fetch("/data/deportivos.geojson")
      .then((response) => response.json())
      .then((data) => {
        const layerProjection =
          data.crs?.properties?.name || "EPSG:4326";

        onLayerProjectionChange(layerProjection);
      });

    const deportivosSource = new VectorSource();

    const deportivosLayer = new VectorLayer({
      source: deportivosSource,

      style: new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: "red",
          }),
          stroke: new Stroke({
            color: "white",
            width: 2,
          }),
        }),
      }),
    });

    fetch("/data/deportivos.geojson")
      .then((response) => response.json())
      .then((data) => {
        const format = new GeoJSON();

        const features = format.readFeatures(data, {
          dataProjection: "EPSG:4326",
          featureProjection: projection,
        });

        deportivosSource.addFeatures(features);
      });

    const map = new Map({
      target: mapRef.current,

      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        deportivosLayer,
      ],

      view: new View({
        projection: getProjection(projection) ?? undefined,
        center:
          projection === "EPSG:4326"
            ? [-75.58, 6.17]
            : fromLonLat([-75.58, 6.17]),
        zoom: 12,
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
      const feature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature
      );

      if (!feature) {
        popupElement.style.display = "none";
        return;
      }

      const nombre = feature.get("nombre");
      const municipio = feature.get("municipio");
      const tipo = feature.get("tipo");

      popupElement.innerHTML = `
        <strong>${nombre}</strong>
        <br />
        Municipio: ${municipio}
        <br />
        Tipo: ${tipo}
      `;

      popupElement.style.display = "block";
      popup.setPosition(event.coordinate);
    });

    return () => {
      map.setTarget(undefined);
    };
  }, [projection]);

  return <div ref={mapRef} className="map-container" />;
}

export default MapComponent;