export interface LayerProjectionInfo {
    code: string;
    rawName?: string;
    source: "declarado" | "supuesto";
  }
  

  function normalizeCrsName(rawName: string): string {
    const urnMatch = rawName.match(/EPSG::?(\d+)/i);
    if (urnMatch) {
      return `EPSG:${urnMatch[1]}`;
    }
  
    if (/CRS84/i.test(rawName)) {
      return "EPSG:4326";
    }
  
    return rawName;
  }
  
  /**
   * Recibe un objeto GeoJSON ya parseado (FeatureCollection) y devuelve
   * en qué sistema de referencia está.
   */
  export function detectLayerProjection(geojson: unknown): LayerProjectionInfo {
    const rawName = (geojson as { crs?: { properties?: { name?: string } } })
      ?.crs?.properties?.name;
  
    if (!rawName) {
      return { code: "EPSG:4326", source: "supuesto" };
    }
  
    return {
      code: normalizeCrsName(rawName),
      rawName,
      source: "declarado",
    };
  }