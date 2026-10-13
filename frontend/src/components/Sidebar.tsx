import { useState } from "react";
import CoordinateCapture from "./CoordinateCapture";
import EventForm from "./EventForm";
import GeoJSONUploader from "./GeoJSONUploader";
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
}: SidebarProps) {
  const [colapsado, setColapsado] = useState(false);

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

        {isAdmin && (
          <EventForm coordinates={selectedPoint} />
        )}

        <GeoJSONUploader onFileLoaded={onFileLoaded} />

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
