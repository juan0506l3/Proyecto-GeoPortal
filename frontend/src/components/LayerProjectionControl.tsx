import "./ProjectionControls.css";

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
    <div className="reproject-panel">
      <h3 className="reproject-panel__title">Reproyección de capa</h3>

      <p className="reproject-panel__current">
        <strong>SRE de la capa:</strong> {layerProjection}
      </p>

      <label htmlFor="target-projection" className="projection-control__label">
        SRE destino:
      </label>

      <select
        id="target-projection"
        className="projection-control__select"
        value={targetProjection}
        onChange={(event) => onTargetProjectionChange(event.target.value)}
      >
        <option value="EPSG:4326">EPSG:4326 - WGS 84</option>
        <option value="EPSG:3857">EPSG:3857 - Web Mercator</option>
        <option value="EPSG:9377">EPSG:9377</option>
      </select>

      <button className="reproject-panel__button" onClick={onReproject}>
        Reproyectar capa
      </button>
    </div>
  );
}

export default LayerProjectionControl;