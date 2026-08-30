import type { GeoJSONLayer } from "../projections/layers";

interface LayerListProps {
  layers: GeoJSONLayer[];
  onVisibilityChange: (
    id: string,
    visible: boolean
  ) => void;
}

function LayerList({
  layers,
  onVisibilityChange,
}: LayerListProps) {
  return (
    <div>
      <h3>Capas cargadas</h3>

      {layers.length === 0 ? (
        <p>No hay capas cargadas.</p>
      ) : (
        layers.map((layer) => (
          <div key={layer.id}>
            <label>
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(event) =>
                  onVisibilityChange(
                    layer.id,
                    event.target.checked
                  )
                }
              />

              {" "}

              <strong>{layer.name}</strong>
            </label>

            <div>
              SRE: {layer.projection.code}
            </div>

            <br />
          </div>
        ))
      )}
    </div>
  );
}

export default LayerList;