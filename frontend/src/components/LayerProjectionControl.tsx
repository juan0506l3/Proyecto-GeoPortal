interface LayerProjectionControlProps {
  layerProjection: string;
  targetProjection: string;
  onTargetProjectionChange: (projection: string) => void;
  onReproject: () => void;
}

function LayerProjectionControl({
  layerProjection,
  targetProjection,
  onTargetProjectionChange,
  onReproject,
}: LayerProjectionControlProps) {
  return (
    <div>
      <h3>Reproyección de capa</h3>

      <p>
        <strong>SRE de la capa:</strong>{" "}
        {layerProjection}
      </p>

      <label htmlFor="target-projection">
        SRE destino:
      </label>

      <select
        id="target-projection"
        value={targetProjection}
        onChange={(event) =>
          onTargetProjectionChange(event.target.value)
        }
      >
        <option value="EPSG:4326">
          EPSG:4326 - WGS 84
        </option>

        <option value="EPSG:3857">
          EPSG:3857 - Web Mercator
        </option>

        <option value="EPSG:9377">
          EPSG:9377
        </option>
      </select>

      <button onClick={onReproject}>
        Reproyectar capa
      </button>
    </div>
  );
}

export default LayerProjectionControl;