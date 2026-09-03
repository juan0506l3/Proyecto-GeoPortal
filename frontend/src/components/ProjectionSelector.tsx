import "./ProjectionControls.css";

interface ProjectionSelectorProps {
  projection: string;
  onChange: (projection: string) => void;
}

function ProjectionSelector({
  projection,
  onChange,
}: ProjectionSelectorProps) {
  return (
    <div className="projection-control">
      <label htmlFor="projection" className="projection-control__label">
        Sistema de coordenadas:
      </label>

      <select
        id="projection"
        className="projection-control__select"
        value={projection}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="EPSG:3857">EPSG:3857 - Web Mercator</option>
        <option value="EPSG:4326">EPSG:4326 - WGS 84</option>
        <option value="EPSG:4686">EPSG:4686 - MAGNA-SIRGAS (geográfico)</option>
        <option value="EPSG:32618">EPSG:32618 - UTM zona 18N</option>
        <option value="EPSG:3395">EPSG:3395 - Mercator Mundial</option>
      </select>
    </div>
  );
}

export default ProjectionSelector;