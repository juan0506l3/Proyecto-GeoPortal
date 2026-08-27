import { useState } from "react";
import MapComponent from "./components/Map";
import ProjectionSelector from "./components/ProjectionSelector";
import LayerSrsInfo from "./components/LayerSrsInfo";
import CoordinateCapture from "./components/CoordinateCapture"; 
import type { LayerProjectionInfo } from "./projections/detectLayerProjection"; 
import type { CapturedPoint } from "./projections/types"; 

function App() {
  const [projection, setProjection] = useState("EPSG:3857");

  const [layerProjection, setLayerProjection] =
    useState<LayerProjectionInfo | null>(null);

  const [capturedPoint, setCapturedPoint] = useState<CapturedPoint | null>(
    null
  );

  return (
    <div>
      <h1>GeoPortal</h1>

      <ProjectionSelector
        projection={projection}
        onChange={setProjection}
      />

      <p>
        <strong>SRE actual:</strong> {projection}
      </p>

      <LayerSrsInfo info={layerProjection} />

      <CoordinateCapture point={capturedPoint} />

      <MapComponent
        projection={projection}
        onLayerProjectionChange={setLayerProjection}
        onCoordinateCapture={setCapturedPoint} // 🆕
      />
    </div>
  );
}

export default App;