import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Text from "ol/style/Text";
import type { FeatureLike } from "ol/Feature";

const POLYGON_COLORS = [
  "#1e88e5",
  "#fb8c00",
  "#8e24aa",
  "#00897b",
  "#d81b60",
  "#6d4c41",
];

function hexToRgba(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isPolygon(feature: FeatureLike): boolean {
  const type = feature.getGeometry()?.getType();
  return type === "Polygon" || type === "MultiPolygon";
}

export function createPolygonStyle(layerIndex: number) {
  const color = POLYGON_COLORS[layerIndex % POLYGON_COLORS.length];

  const fill = new Fill({ color: hexToRgba(color, 0.2) });
  const stroke = new Stroke({ color, width: 2 });

  return (feature: FeatureLike) => {
    const properties = feature.getProperties();
    const baseLabel = properties["nombre"] ?? properties["municipio"];
    const total = properties["total_eventos"];
    const label =
      baseLabel && total !== undefined ? `${baseLabel} (${total})` : baseLabel;

    return new Style({
      fill,
      stroke,
      text: label
        ? new Text({
            text: String(label),
            font: "600 12px sans-serif",
            fill: new Fill({ color: "#1a1a1a" }),
            stroke: new Stroke({ color: "#ffffff", width: 3 }),
            overflow: true,
          })
        : undefined,
    });
  };
}