import { supabase } from "../lib/supabaseClient";

export interface EventoRow {
  id: string;
  nombre: string;
  municipio: string | null;
  categoria: string;
  tipo: string | null;
  direccion: string | null;
  lng: number;
  lat: number;
  fecha_inicio: string | null; // ISO string. null => evento estático
  fecha_fin: string | null;    // ISO string. null => evento estático
}

// Datos que envía el formulario para crear un evento nuevo.
export interface NuevoEvento {
  nombre: string;
  municipio: string | null;
  tipo: string | null;
  categoria: string;
  lng: number;
  lat: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

/** Un evento es "dinámico" si trae ambas fechas; si no, es estático. */
export function esEventoDinamico(
  row: Pick<EventoRow, "fecha_inicio" | "fecha_fin">
): boolean {
  return Boolean(row.fecha_inicio && row.fecha_fin);
}

/**
 * Un evento estático siempre está vigente.
 * Un evento dinámico solo está vigente entre fecha_inicio y fecha_fin (inclusive).
 */
export function esEventoVigente(
  row: Pick<EventoRow, "fecha_inicio" | "fecha_fin">,
  ahora: Date = new Date()
): boolean {
  if (!esEventoDinamico(row)) return true;

  const inicio = new Date(row.fecha_inicio as string).getTime();
  const fin = new Date(row.fecha_fin as string).getTime();
  const now = ahora.getTime();

  return now >= inicio && now <= fin;
}

/** Filtra una lista de eventos dejando solo los que están vigentes ahora. */
export function filtrarEventosVigentes(
  rows: EventoRow[],
  ahora: Date = new Date()
): EventoRow[] {
  return rows.filter((row) => esEventoVigente(row, ahora));
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
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        dinamico: esEventoDinamico(row),
      },
      geometry: { type: "Point", coordinates: [row.lng, row.lat] },
    })),
  };
}

/** Inserta un evento nuevo (estático o dinámico) en la tabla "eventos". */
export async function crearEvento(evento: NuevoEvento) {
  return supabase.from("eventos").insert([evento]).select().single();
}