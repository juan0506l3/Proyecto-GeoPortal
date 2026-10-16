
const API_URL = import.meta.env.VITE_API_URL;

export interface HealthResponse {
  status: string;
  message: string;
}

export async function comprobarConexionAPI(): Promise<HealthResponse> {
  if (!API_URL) {
    throw new Error("Falta configurar la variable VITE_API_URL.");
  }

  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Error del backend: HTTP ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}
