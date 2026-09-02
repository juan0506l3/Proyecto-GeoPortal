import CoordinateCapture from "./CoordinateCapture";
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
  return (
    <aside className="sidebar">
      <div className="sidebar__scroll">
        <CoordinateCapture point={capturedPoint} />

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