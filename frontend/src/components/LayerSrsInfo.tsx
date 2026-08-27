import type { LayerProjectionInfo } from "../projections/detectLayerProjection";
import { getProjectionLabel } from "../projections/projections";
import "./InfoPanels.css";

interface LayerSrsInfoProps {
  info: LayerProjectionInfo | null;
}

function LayerSrsInfo({ info }: LayerSrsInfoProps) {
  return (
    <section className="info-panel">
      <h2 className="info-panel__title">SRE de la capa</h2>

      {!info ? (
        <p className="info-panel__muted">Cargando capa…</p>
      ) : (
        <>
          <span className="info-panel__badge">{info.code}</span>
          <p className="info-panel__label">{getProjectionLabel(info.code)}</p>
          <p className="info-panel__muted">
            {info.source === "declarado"
              ? `Declarado en el archivo (crs.properties.name = "${info.rawName}")`
              : 'El archivo no trae bloque "crs"; según la especificación GeoJSON (RFC 7946) se asume WGS84 (EPSG:4326).'}
          </p>
        </>
      )}
    </section>
  );
}

export default LayerSrsInfo;