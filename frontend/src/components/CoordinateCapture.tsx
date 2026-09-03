import { useState } from "react";
import type { CapturedPoint } from "../projections/types";
import "./InfoPanels.css";

interface CoordinateCaptureProps {
  point: CapturedPoint | null;
}

function CoordinateCapture({ point }: CoordinateCaptureProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copy = (code: string, text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 1200);
      })
      .catch(() => {
      });
  };

  return (
    <section className="info-panel">
      <h2 className="info-panel__title">Captura de coordenadas</h2>

      {!point ? (
        <p className="info-panel__muted">
          Haz clic en cualquier punto del mapa para capturar sus coordenadas.
        </p>
      ) : (
        <ul className="coord-list">
          {point.entries.map((entry) => {
            const decimals = entry.unit === "deg" ? 6 : 2;
            const text = `${entry.x.toFixed(decimals)}, ${entry.y.toFixed(decimals)}`;

            return (
              <li key={entry.code} className="coord-list__item">
                <div className="coord-list__meta">
                  <span className="info-panel__badge info-panel__badge--sm">
                    {entry.code}
                  </span>
                  <span className="coord-list__name">
                    {entry.layerName}
                  </span>
                </div>

                <div className="coord-list__value">
                  <code>{text}</code>
                  <button
                    type="button"
                    className="coord-list__copy"
                    onClick={() => copy(entry.code, text)}
                    title="Copiar coordenadas"
                  >
                    {copiedCode === entry.code ? "✓" : "Copiar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default CoordinateCapture;