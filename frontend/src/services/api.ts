
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
