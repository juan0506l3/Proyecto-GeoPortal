interface ProjectionSelectorProps {
  projection: string;
  onChange: (projection: string) => void;
}

function ProjectionSelector({
  projection,
  onChange,
}: ProjectionSelectorProps) {
  return (
    <div>
      <label htmlFor="projection">
        Sistema de coordenadas:
      </label>

      <select
        id="projection"
        value={projection}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="EPSG:3857">
          EPSG:3857 - Web Mercator
        </option>

        <option value="EPSG:4326">
          EPSG:4326 - WGS 84
        </option>
      </select>
    </div>
  );
}

export default ProjectionSelector;