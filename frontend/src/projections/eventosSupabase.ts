export interface EventoRow {
    id: string;
    nombre: string;
    municipio: string | null;
    categoria: string;
    tipo: string | null;
    direccion: string | null;
    lng: number;
    lat: number;
  }
  
  export function eventosToGeoJSON(rows: EventoRow[]) {
    return {
      type: "FeatureCollection",
      crs: { type: "name", properties: { name: "EPSG:4326" } },
      features: rows.map((row) => ({
        type: "Feature",
        properties: {
          id: row.id,
          nombre: row.nombre,
          municipio: row.municipio,
          categoria: row.categoria,
          tipo: row.tipo,
          direccion: row.direccion,
        },
        geometry: { type: "Point", coordinates: [row.lng, row.lat] },
      })),
    };
  }