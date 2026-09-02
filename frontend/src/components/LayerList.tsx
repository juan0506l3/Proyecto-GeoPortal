import type { GeoJSONLayer } from "../projections/layers";
import "./LayerList.css";

interface LayerListProps {
  layers: GeoJSONLayer[];
  onVisibilityChange: (id: string, visible: boolean) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}

function LayerList({
  layers,
  onVisibilityChange,
  onDelete,
  onDownload,
}: LayerListProps) {
  return (
    <section className="layer-list">
      <h3 className="layer-list__title">Capas cargadas</h3>

      {layers.length === 0 ? (
        <p className="layer-list__empty">No hay capas cargadas.</p>
      ) : (
        layers.map((layer) => (
          <div key={layer.id} className="layer-card">
            <div className="layer-card__header">
              <span className="layer-card__name" title={layer.name}>
                {layer.name}
              </span>

              <div className="layer-card__actions">
                <button
                  type="button"
                  className="layer-card__icon-btn"
                  title={layer.visible ? "Ocultar capa" : "Mostrar capa"}
                  onClick={() =>
                    onVisibilityChange(layer.id, !layer.visible)
                  }
                >
                  {layer.visible ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className="layer-card__icon-btn layer-card__icon-btn--danger"
                  title="Eliminar capa"
                  onClick={() => onDelete(layer.id)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="layer-card__crs">
              CRS original:{" "}
              <strong>
                {layer.projection.code}
                {layer.projection.source === "supuesto"
                  ? " (supuesto por estándar GeoJSON)"
                  : ""}
              </strong>
            </div>

            <div className="layer-card__transform-row">
              <span className="layer-card__transform-badge">
                ORIGEN: {layer.projection.code}
              </span>

              <span className="layer-card__transform-arrow">&#8644;</span>

              <span className="layer-card__transform-badge layer-card__transform-badge--dest">
                Vista del mapa
              </span>
            </div>

            <button
              type="button"
              className="layer-card__download"
              onClick={() => onDownload(layer.id)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Descargar GeoJSON
            </button>
          </div>
        ))
      )}
    </section>
  );
}

export default LayerList;