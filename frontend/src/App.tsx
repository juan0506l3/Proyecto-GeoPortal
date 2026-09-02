import { useState } from "react";
import MapComponent from "./components/Map";
import Sidebar from "./components/Sidebar";
import type { LayerProjectionInfo } from "./projections/detectLayerProjection";
import type { CapturedPoint } from "./projections/types";
import { reprojectGeoJSONData } from "./projections/reproject";
import type { GeoJSONLayer } from "./projections/layers";
import { detectLayerProjection } from "./projections/detectLayerProjection";
import { EVENT_CATEGORIES } from "./projections/eventCategories";
import "./App.css";

function App() {
  // SRE del visor
  const [projection, setProjection] =
    useState("EPSG:3857");

  // SRE que el usuario selecciona como destino
  const [targetProjection, setTargetProjection] =
    useState("EPSG:3857");

  // Información del SRE original de la capa
  const [layerProjection, setLayerProjection] =
    useState<LayerProjectionInfo | null>(null);

  // Coordenada capturada
  const [capturedPoint, setCapturedPoint] =
    useState<CapturedPoint | null>(null);

  // SRE al que fue reproyectada la capa
  const [layerTargetProjection, setLayerTargetProjection] =
    useState<string | null>(null);

  // Resultado GeoJSON de la reproyección
  const [reprojectedLayer, setReprojectedLayer] =
    useState<unknown | null>(null);

  // Capas GeoJSON cargadas por el usuario
  const [layers, setLayers] =
    useState<GeoJSONLayer[]>([]);

  // Categorías de evento activas en el panel "Filtrar eventos"
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(EVENT_CATEGORIES.map((category) => category.id))
  );

  const handleToggleCategory = (categoryId: string) => {
    setActiveCategories((previous) => {
      const next = new Set(previous);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  const handleReproject = async () => {
    if (!layerProjection) {
      console.log(
        "No hay información del SRE de la capa"
      );
      return;
    }

    try {
      const response = await fetch(
        "/data/deportivos.geojson"
      );

      const data = await response.json();

      const result = reprojectGeoJSONData(
        data,
        layerProjection.code,
        targetProjection
      );

      setReprojectedLayer(result);
      setLayerTargetProjection(
        targetProjection
      );
    } catch (error) {
      console.error(
        "Error al reproyectar la capa:",
        error
      );
    }
  };

  const handleGeoJSONLoaded = (
    data: unknown,
    fileName: string
  ) => {
    const projectionInfo =
      detectLayerProjection(data);

    const newLayer: GeoJSONLayer = {
      id: crypto.randomUUID(),
      name: fileName,
      data,
      visible: true,
      projection: projectionInfo,
    };

    setLayers((previousLayers) => [
      ...previousLayers,
      newLayer,
    ]);
  };

  const handleLayerVisibilityChange = (
    id: string,
    visible: boolean
  ) => {
    setLayers((previousLayers) =>
      previousLayers.map((layer) =>
        layer.id === id
          ? { ...layer, visible }
          : layer
      )
    );
  };

  const handleLayerDelete = (id: string) => {
    setLayers((previousLayers) =>
      previousLayers.filter((layer) => layer.id !== id)
    );
  };

  const handleLayerDownload = (id: string) => {
    const layer = layers.find((item) => item.id === id);

    if (!layer) return;

    const blob = new Blob(
      [JSON.stringify(layer.data, null, 2)],
      { type: "application/geo+json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = layer.name.toLowerCase().endsWith(".geojson")
      ? layer.name
      : `${layer.name}.geojson`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <h1>GeoPortal</h1>
      </header>

      <div className="app-layout__body">
        <MapComponent
          projection={projection}
          layers={layers}
          layerTargetProjection={
            layerTargetProjection
          }
          reprojectedLayer={
            reprojectedLayer
          }
          activeCategories={activeCategories}
          onLayerProjectionChange={
            setLayerProjection
          }
          onCoordinateCapture={
            setCapturedPoint
          }
        />

        <Sidebar
          capturedPoint={capturedPoint}
          onFileLoaded={handleGeoJSONLoaded}
          activeCategories={activeCategories}
          onToggleCategory={handleToggleCategory}
          layers={layers}
          onLayerVisibilityChange={handleLayerVisibilityChange}
          onLayerDelete={handleLayerDelete}
          onLayerDownload={handleLayerDownload}
          projection={projection}
          onProjectionChange={setProjection}
          layerProjection={layerProjection}
          targetProjection={targetProjection}
          onTargetProjectionChange={setTargetProjection}
          onReproject={handleReproject}
        />
      </div>
    </div>
  );
}

export default App;