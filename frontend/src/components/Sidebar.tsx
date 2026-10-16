
import { useState } from "react";
import CoordinateCapture from "./CoordinateCapture";
import EventForm from "./EventForm";
import GeoJSONUploader from "./GeoJSONUploader";
import JoinResultLayer from "./JoinResultLayer";
import EventFilter from "./EventFilter";
import LayerList from "./LayerList";
import ProjectionSelector from "./ProjectionSelector";
import LayerSrsInfo from "./LayerSrsInfo";
import LayerProjectionControl from "./LayerProjectionControl";
import type { CapturedPoint } from "../projections/types";
import type { GeoJSONLayer } from "../projections/layers";
import type { LayerProjectionInfo } from "../projections/detectLayerProjection";
import "./Sidebar.css";

interface SidebarProps {
  capturedPoint: CapturedPoint | null;
  selectedPoint: { lng: number; lat: number } | null;
  isAdmin: boolean;
  onFileLoaded: (data: unknown, fileName: string) => void;
  activeCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  layers: GeoJSONLayer[];
  onLayerVisibilityChange: (id: string, visible: boolean) => void;
  onLayerDelete: (id: string) => void;
  onLayerDownload: (id: string) => void;
  projection: string;
  onProjectionChange: (projection: string) => void;
  layerProjection: LayerProjectionInfo | null;
  targetProjection: string;
  onTargetProjectionChange: (projection: string) => void;
  onReproject: () => void;
  onClip: (inputLayerId: string, maskLayerId: string) => Promise<void>;
}

function Sidebar({
  capturedPoint,
  selectedPoint,
  isAdmin,
  onFileLoaded,
  activeCategories,
  onToggleCategory,
  layers,
  onLayerVisibilityChange,
  onLayerDelete,
  onLayerDownload,
  projection,
  onProjectionChange,
  layerProjection,
  targetProjection,
  onTargetProjectionChange,
  onReproject,
  onClip,
}: SidebarProps) {
  const [colapsado, setColapsado] = useState(false);
  const [capaEntradaId, setCapaEntradaId] = useState("");
  const [capaMascaraId, setCapaMascaraId] = useState("");
  const [procesandoClip, setProcesandoClip] = useState(false);
  const [errorClip, setErrorClip] = useState("");

  const capaEntradaSeleccionada = capaEntradaId || layers[0]?.id || "";
  const capaMascaraSeleccionada =
    capaMascaraId || layers[1]?.id || "";

  const ejecutarClipDesdePanel = async () => {
    if (
      !capaEntradaSeleccionada ||
      !capaMascaraSeleccionada ||
      capaEntradaSeleccionada === capaMascaraSeleccionada
    ) {
      setErrorClip("Selecciona dos capas diferentes.");
      return;
    }

    setProcesandoClip(true);
    setErrorClip("");

    try {
      await onClip(capaEntradaSeleccionada, capaMascaraSeleccionada);
    } catch (error) {
      setErrorClip(
        error instanceof Error
          ? error.message
          : "No se pudo ejecutar Clip."
      );
    } finally {
      setProcesandoClip(false);
    }
  };

  return (
    <aside className={`sidebar${colapsado ? " sidebar--collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar__toggle"
        onClick={() => setColapsado((previo) => !previo)}
        aria-expanded={!colapsado}
        aria-label={colapsado ? "Mostrar panel" : "Ocultar panel"}
        title={colapsado ? "Mostrar panel" : "Ocultar panel"}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M9 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="sidebar__scroll">
        <CoordinateCapture point={capturedPoint} />

        {isAdmin && <EventForm coordinates={selectedPoint} />}

        <GeoJSONUploader onFileLoaded={onFileLoaded} />
        <JoinResultLayer onFileLoaded={onFileLoaded} />

        <EventFilter
          activeCategories={activeCategories}
          onToggleCategory={onToggleCategory}
        />

        <LayerList
          layers={layers}
          onVisibilityChange={onLayerVisibilityChange}
          onDelete={onLayerDelete}
          onDownload={onLayerDownload}
        />

        <section
          style={{
            padding: "14px",
            background: "#ffffff",
            border: "1px solid var(--gp-border)",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>
            Clip (recorte geográfico)
          </h3>

          <label
            htmlFor="clip-entrada"
            style={{ display: "block", marginBottom: "6px" }}
          >
            Capa de entrada
          </label>

          <select
            id="clip-entrada"
            value={capaEntradaSeleccionada}
            onChange={(event) => setCapaEntradaId(event.target.value)}
            disabled={layers.length < 2 || procesandoClip}
            style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
          >
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>

          <label
            htmlFor="clip-mascara"
            style={{ display: "block", marginBottom: "6px" }}
          >
            Polígono de máscara
          </label>

          <select
            id="clip-mascara"
            value={capaMascaraSeleccionada}
            onChange={(event) => setCapaMascaraId(event.target.value)}
            disabled={layers.length < 2 || procesandoClip}
            style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
          >
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={ejecutarClipDesdePanel}
            disabled={layers.length < 2 || procesandoClip}
            style={{
              width: "100%",
              padding: "10px",
              color: "#ffffff",
              background: "var(--gp-primary)",
              border: "none",
              borderRadius: "6px",
              cursor:
                layers.length < 2 || procesandoClip
                  ? "not-allowed"
                  : "pointer",
              opacity: layers.length < 2 || procesandoClip ? 0.6 : 1,
            }}
          >
            {procesandoClip ? "Procesando..." : "Ejecutar Clip"}
          </button>

          {layers.length < 2 && (
            <p style={{ fontSize: "13px", color: "var(--gp-muted)" }}>
              Carga al menos dos capas GeoJSON para comenzar.
            </p>
          )}

          {errorClip && (
            <p role="alert" style={{ color: "var(--gp-danger)", fontSize: "13px" }}>
              {errorClip}
            </p>
          )}
        </section>

        <ProjectionSelector
          projection={projection}
          onChange={onProjectionChange}
        />

        <LayerSrsInfo info={layerProjection} />

        <LayerProjectionControl
          layerProjection={layerProjection?.code ?? "Desconocido"}
          targetProjection={targetProjection}
          onTargetProjectionChange={onTargetProjectionChange}
          onReproject={onReproject}
        />
      </div>
    </aside>
  );
}

export default Sidebar;
