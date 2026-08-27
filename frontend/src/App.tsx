import { useState } from "react";
import MapComponent from "./components/Map";
import ProjectionSelector from "./components/ProjectionSelector";

function App() {
  const [projection, setProjection] = useState("EPSG:3857");

  const [layerProjection, setLayerProjection] =
    useState("Desconocido");

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

      <p>
        <strong>SRE de la capa:</strong> {layerProjection}
      </p>

      <MapComponent
        projection={projection}
        onLayerProjectionChange={setLayerProjection}
      />
    </div>
  );
}

export default App;