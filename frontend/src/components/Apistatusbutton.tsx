import { useEffect, useRef, useState } from "react";
import { comprobarConexionAPI } from "../services/api";
import "./ApiStatusButton.css";

interface ApiStatusButtonProps {

  onCheck?: () => Promise<boolean>;

  intervalMs?: number;
}

const TIEMPO_MAXIMO_MS = 8000;

async function comprobarApi(): Promise<boolean> {
  let temporizador: number | undefined;

  const limite = new Promise<never>((_, reject) => {
    temporizador = window.setTimeout(
      () => reject(new Error("La API tardó demasiado en responder.")),
      TIEMPO_MAXIMO_MS
    );
  });

  try {
    const respuesta = await Promise.race([comprobarConexionAPI(), limite]);
    return respuesta.status === "ok";
  } catch (error) {
    console.error("Error al conectar con el backend:", error);
    return false;
  } finally {
    window.clearTimeout(temporizador);
  }
}

type Estado = "verificando" | "conectado" | "desconectado" | "comprobando";

function ApiStatusButton({
  onCheck,
  intervalMs = 30000,
}: ApiStatusButtonProps) {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [fallo, setFallo] = useState(false);

  // Siempre usamos la versión más reciente de onCheck sin reiniciar el intervalo
  const checkRef = useRef<() => Promise<boolean>>(comprobarApi);

  useEffect(() => {
    checkRef.current = onCheck ?? comprobarApi;
  }, [onCheck]);

  // Comprobación automática: al cargar y cada cierto tiempo
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

  // Conectada (o aún verificando en silencio): no se muestra nada
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
