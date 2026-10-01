import { supabase } from "../lib/supabaseClient";
import { normalizarMunicipio } from "./eventoUtils";

export interface EventoRow {
  id: string;
  nombre: string;
  municipio: string | null;
  categoria: string;
  tipo: string | null;
  direccion: string | null;
  lng: number;
  lat: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;    
  flyer_path: string | null;
  flyer_url: string | null;    
}


export interface NuevoEvento {
  nombre: string;
  municipio: string | null;
  tipo: string | null;
  categoria: string;
  direccion: string | null;
  flyer_url: string | null;
  lng: number;
  lat: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export function esEventoDinamico(
  row: Pick<EventoRow, "fecha_inicio" | "fecha_fin">
): boolean {
  return Boolean(row.fecha_inicio && row.fecha_fin);
}

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
        municipio: normalizarMunicipio(row.municipio),
        categoria: row.categoria,
        tipo: row.tipo,
        direccion: row.direccion,
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        flyer_path: row.flyer_path,
        flyer_url: row.flyer_url,
        dinamico: esEventoDinamico(row),
      },
      geometry: { type: "Point", coordinates: [row.lng, row.lat] },
    })),
  };
}

export async function crearEvento(
  evento: NuevoEvento,
  flyer?: File | null
) {

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


  if (!flyer) {
    return {
      data: eventoCreado,
      error: null,
    };
  }

  
  const nombreArchivo = flyer.name;
  const extension =
    nombreArchivo.includes(".")
      ? nombreArchivo.split(".").pop()?.toLowerCase() ?? "jpg"
      : "jpg";


  const flyerPath = `${eventoCreado.id}.${extension}`;

  
  const { error: errorUpload } = await supabase.storage
    .from("eventos-flyers")
    .upload(flyerPath, flyer, {
      cacheControl: "3600",
      upsert: false,
      contentType: flyer.type,
    });

  if (errorUpload) {
    console.error("Error subiendo flyer:", errorUpload);

  
    await supabase
      .from("eventos")
      .delete()
      .eq("id", eventoCreado.id);

    return {
      data: null,
      error: errorUpload,
    };
  }

  
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