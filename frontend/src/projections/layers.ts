import type { LayerProjectionInfo } from "./detectLayerProjection";

export interface GeoJSONLayer {
  id: string;
  name: string;
  data: unknown;
  visible: boolean;
  projection: LayerProjectionInfo;
}