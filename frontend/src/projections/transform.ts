import { transform } from "ol/proj";

export function transformCoordinate(
  coordinate: [number, number],
  sourceProjection: string,
  targetProjection: string
): [number, number] {
  return transform(
    coordinate,
    sourceProjection,
    targetProjection
  ) as [number, number];
}