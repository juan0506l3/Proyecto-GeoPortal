export const MUNICIPIOS = [
    "Medellín",
    "Bello",
    "Itagüí",
    "Envigado",
    "Sabaneta",
    "La Estrella",
    "Caldas",
    "Copacabana",
    "Girardota",
    "Barbosa",
  ] as const;
  
  function claveTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  
  const MUNICIPIO_POR_CLAVE = new Map<string, string>([
    ...MUNICIPIOS.map((m) => [claveTexto(m), m] as [string, string]),
    ["estrella", "La Estrella"],
  ]);
  
  export function normalizarMunicipio(
    valor: string | null | undefined
  ): string | null {
    if (!valor || !valor.trim()) return null;
  

    const principal = valor.replace(/\s*[,(–-].*$/, "");
  
    return (
      MUNICIPIO_POR_CLAVE.get(claveTexto(principal)) ??
      valor.trim().replace(/\s+/g, " ")
    );
  }
  
  export function normalizarUrl(
    valor: string | null | undefined
  ): string | null {
    const texto = (valor ?? "").trim();
  
    if (!texto) return null;
  
    const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto)
      ? texto
      : `https://${texto}`;
  
    try {
      const url = new URL(conEsquema);
  
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      if (!url.hostname.includes(".")) return null;
      if (url.username || url.password) return null;
  
      return url.href;
    } catch {
      return null;
    }
  }
  

  export function etiquetaEnlace(url: string): string {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
  
      if (host.endsWith("instagram.com")) return "Ver en Instagram";
      if (host.endsWith("facebook.com") || host === "fb.com") {
        return "Ver en Facebook";
      }
      if (host.endsWith("tiktok.com")) return "Ver en TikTok";
    } catch {
      
    }
  
    return "Ver página del evento";
  }
  
  export function escapeHtml(valor: unknown): string {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }