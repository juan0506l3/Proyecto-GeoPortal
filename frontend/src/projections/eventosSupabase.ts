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
  flyer_path: string | null;
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
        flyer_path: row.flyer_path,
        dinamico: esEventoDinamico(row),
      },
      geometry: { type: "Point", coordinates: [row.lng, row.lat] },
    })),
  };
}

/**
 * Inserta un evento nuevo y, si se proporciona un flyer,
 * lo sube al bucket privado "eventos-flyers".
 *
 * La ruta del flyer queda guardada en eventos.flyer_path.
 */
export async function crearEvento(
  evento: NuevoEvento,
  flyer?: File | null
) {
  // 1. Crear primero el evento para obtener su ID.
  const { data: eventoCreado, error: errorEvento } = await supabase
    .from("eventos")
    .insert([evento])
    .select()
    .single();

  if (errorEvento || !eventoCreado) {
    return {
      data: null,
      error: errorEvento ?? new Error("No se pudo crear el evento."),
    };
  }

  // Si no hay flyer, terminamos aquí.
  if (!flyer) {
    return {
      data: eventoCreado,
      error: null,
    };
  }

  // 2. Obtener una extensión sencilla para el archivo.
  const nombreArchivo = flyer.name;
  const extension =
    nombreArchivo.includes(".")
      ? nombreArchivo.split(".").pop()?.toLowerCase() ?? "jpg"
      : "jpg";

  // 3. La ruta queda asociada al ID del evento.
  const flyerPath = `${eventoCreado.id}.${extension}`;

  // 4. Subir el flyer al bucket privado.
  const { error: errorUpload } = await supabase.storage
    .from("eventos-flyers")
    .upload(flyerPath, flyer, {
      cacheControl: "3600",
      upsert: false,
      contentType: flyer.type,
    });

  if (errorUpload) {
    console.error("Error subiendo flyer:", errorUpload);

    // Evitamos dejar un evento creado sin su flyer.
    await supabase
      .from("eventos")
      .delete()
      .eq("id", eventoCreado.id);

    return {
      data: null,
      error: errorUpload,
    };
  }

  // 5. Guardar la ruta del flyer en la tabla eventos.
  const { data: eventoActualizado, error: errorUpdate } = await supabase
    .from("eventos")
    .update({
      flyer_path: flyerPath,
    })
    .eq("id", eventoCreado.id)
    .select()
    .single();

  if (errorUpdate || !eventoActualizado) {
    console.error("Error guardando la ruta del flyer:", errorUpdate);

    // Si no pudimos guardar la ruta, eliminamos también el archivo.
    await supabase.storage
      .from("eventos-flyers")
      .remove([flyerPath]);

    await supabase
      .from("eventos")
      .delete()
      .eq("id", eventoCreado.id);

    return {
      data: null,
      error: errorUpdate ?? new Error("No se pudo actualizar el evento."),
    };
  }

  return {
    data: eventoActualizado,
    error: null,
  };
}
