import { useState } from "react";
import MapComponent from "./components/Map";
import ProjectionSelector from "./components/ProjectionSelector";
import LayerSrsInfo from "./components/LayerSrsInfo";
import CoordinateCapture from "./components/CoordinateCapture";
import type { LayerProjectionInfo } from "./projections/detectLayerProjection";
import type { CapturedPoint } from "./projections/types";
import LayerProjectionControl from "./components/LayerProjectionControl";
import { reprojectGeoJSONData } from "./projections/reproject";

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
