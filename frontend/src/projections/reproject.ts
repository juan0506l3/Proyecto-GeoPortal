import GeoJSON from "ol/format/GeoJSON";
import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

export function reprojectGeoJSON(
  data: unknown,
  sourceProjection: string,
  targetProjection: string
): Feature<Geometry>[] {
  const format = new GeoJSON();

  return format.readFeatures(data, {
    dataProjection: sourceProjection,
    featureProjection: targetProjection,
  });
}

/**
 * Reproyecta un GeoJSON y devuelve un nuevo GeoJSON
 * con las coordenadas transformadas al SRE destino.
 */
export function reprojectGeoJSONData(
  data: unknown,
  sourceProjection: string,
  targetProjection: string
): unknown {
  const format = new GeoJSON();

  const features = format.readFeatures(data, {
    dataProjection: sourceProjection,
    featureProjection: targetProjection,
  });

  return format.writeFeaturesObject(features, {
    featureProjection: targetProjection,
    dataProjection: targetProjection,
  });
}
