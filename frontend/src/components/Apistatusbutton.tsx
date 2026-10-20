import { useEffect, useRef, useState } from "react";
import "./ApiStatusButton.css";

interface ApiStatusButtonProps {
  onCheck?: () => Promise<boolean>;

  intervalMs?: number;
}

const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function comprobarApi(): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);

  try {
    const respuesta = await fetch(`${API_URL}/api/health`, {
      signal: controller.signal,
    });

    if (!respuesta.ok) return false;

    const datos = await respuesta.json();
    return datos?.status === "ok";
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

type Estado = "verificando" | "conectado" | "desconectado" | "comprobando";

function ApiStatusButton({
  onCheck,
  intervalMs = 30000,
}: ApiStatusButtonProps) {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [fallo, setFallo] = useState(false);


  const checkRef = useRef<() => Promise<boolean>>(comprobarApi);

  useEffect(() => {
    checkRef.current = onCheck ?? comprobarApi;
  }, [onCheck]);


  useEffect(() => {
    let activo = true;

    const verificar = async () => {
      const ok = await checkRef.current();

      if (!activo) return;

      setEstado((previo) =>
        previo === "comprobando" ? previo : ok ? "conectado" : "desconectado"
      );
    };

    verificar();
    const id = window.setInterval(verificar, intervalMs);

    return () => {
      activo = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  const handleClick = async () => {
    setEstado("comprobando");

    const ok = await checkRef.current();

    setFallo(!ok);
    setEstado(ok ? "conectado" : "desconectado");
  };

  if (estado === "conectado" || estado === "verificando") return null;

  const comprobando = estado === "comprobando";

  return (
    <button
      type="button"
      className={`api-status ${fallo ? "api-status--error" : ""}`}
      onClick={handleClick}
      disabled={comprobando}
      aria-live="polite"
    >
      {comprobando ? (
        <span className="api-status__spinner" aria-hidden="true" />
      ) : (
        <span className="api-status__dot" aria-hidden="true" />
      )}

      <span>
        {comprobando
          ? "Comprobando..."
          : fallo
            ? "Sin conexión · Reintentar"
            : "Probar conexión API"}
      </span>
    </button>
  );
}

export default ApiStatusButton;
