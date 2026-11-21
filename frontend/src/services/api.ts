const API_URL = import.meta.env.VITE_API_URL;

export interface HealthResponse {
  status: string;
  message: string;
}

export async function comprobarConexionAPI(): Promise<HealthResponse> {
  if (!API_URL) {
    throw new Error("Falta configurar la variable VITE_API_URL.");
  }

  const response = await fetch(`${API_URL}/api/health`, {
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!response.ok) {
    throw new Error(`Error del backend: HTTP ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export async function obtenerInnerJoinMunicipios(): Promise<unknown> {
  if (!API_URL) {
    throw new Error("Falta configurar la variable VITE_API_URL.");
  }

  const response = await fetch(
    `${API_URL}/api/inner-join/municipios-con-conteo`,
    {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    }
  );

  const resultado = await response.json();

  if (!response.ok) {
    throw new Error(
      resultado?.error ??
        `Error ejecutando el inner join: HTTP ${response.status}`
    );
  }

  return resultado;
}

export async function ejecutarClip(
  input: unknown,
  mask: unknown
): Promise<unknown> {
  if (!API_URL) {
    throw new Error("Falta configurar la variable VITE_API_URL.");
  }

  const response = await fetch(`${API_URL}/api/clip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ input, mask }),
  });

  const resultado = await response.json();

  if (!response.ok) {
    throw new Error(
      resultado?.error ?? `Error ejecutando Clip: HTTP ${response.status}`
    );
  }

  return resultado;
}

/* ───────────── Asistente de IA (chat) ───────────── */

export interface ChatMensaje {
  role: "user" | "assistant";
  content: string;
}

export interface ChatEvento {
  id: string;
  nombre: string;
  municipio: string | null;
  categoria: string;
  subcategoria: string | null;
  tipo: string | null;
  direccion: string | null;
  estado: "permanente" | "proximo" | "en_curso";
  fecha_inicio: string | null;
  fecha_fin: string | null;
  lng: number;
  lat: number;
}

export interface ChatRespuesta {
  reply: string;
  events: ChatEvento[];
}

export interface ChatCatalogo {
  categorias: { id: string; label: string; subcategorias: string[] }[];
}

export async function enviarMensajeChat(
  messages: ChatMensaje[],
  catalogo: ChatCatalogo
): Promise<ChatRespuesta> {
  if (!API_URL) {
    throw new Error("Falta configurar la variable VITE_API_URL.");
  }

  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ messages, catalogo }),
    signal: AbortSignal.timeout(60000),
  });

  const resultado = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      resultado?.error ?? `Error del asistente: HTTP ${response.status}`
    );
  }

  return resultado as ChatRespuesta;
}
