import { useState } from "react";
import MapComponent from "./components/Map";
import ProjectionSelector from "./components/ProjectionSelector";
import LayerSrsInfo from "./components/LayerSrsInfo";
import CoordinateCapture from "./components/CoordinateCapture";
import type { LayerProjectionInfo } from "./projections/detectLayerProjection";
import type { CapturedPoint } from "./projections/types";
import LayerProjectionControl from "./components/LayerProjectionControl";
import { reprojectGeoJSONData } from "./projections/reproject";
import GeoJSONUploader from "./components/GeoJSONUploader";
import type { GeoJSONLayer } from "./projections/layers";
import { detectLayerProjection } from "./projections/detectLayerProjection";
import LayerList from "./components/LayerList";

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

      console.log(
        "Reproyección completada:"
      );

      console.log(
        `${layerProjection.code} → ${targetProjection}`
      );

      console.log(
        "GeoJSON reproyectado:",
        result
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

    console.log(
      "Nueva capa cargada:",
      newLayer
    );
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

  return (
    <div>
      <h1>GeoPortal</h1>

      <ProjectionSelector
        projection={projection}
        onChange={setProjection}
      />

      <p>
        <strong>
          SRE actual del visor:
        </strong>{" "}
        {projection}
      </p>

      <LayerSrsInfo
        info={layerProjection}
      />

      <LayerProjectionControl
        layerProjection={
          layerProjection?.code ??
          "Desconocido"
        }
        targetProjection={
          targetProjection
        }
        onTargetProjectionChange={
          setTargetProjection
        }
        onReproject={
          handleReproject
        }
      />

      <GeoJSONUploader
        onFileLoaded={
          handleGeoJSONLoaded
        }
      />

      <LayerList
        layers={layers}
        onVisibilityChange={
          handleLayerVisibilityChange
        }
      />

      {layerTargetProjection && (
        <div>
          <p>
            <strong>
              SRE de la capa reproyectada:
            </strong>{" "}
            {layerTargetProjection}
          </p>

          <p>
            <strong>
              Estado:
            </strong>{" "}
            Reproyección completada
          </p>
        </div>
      )}

      <CoordinateCapture
        point={capturedPoint}
      />

      <MapComponent
        projection={projection}
        layers={layers}
        layerTargetProjection={
          layerTargetProjection
        }
        reprojectedLayer={
          reprojectedLayer
        }
        onLayerProjectionChange={
          setLayerProjection
        }
        onCoordinateCapture={
          setCapturedPoint
        }
      />
    </div>
  );
}

export default App;
