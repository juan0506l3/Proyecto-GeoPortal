import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { enviarMensajeChat } from "../services/api";
import type { ChatEvento, ChatMensaje } from "../services/api";
import {
  EVENT_CATEGORIES,
  EVENT_SUBCATEGORIES,
  getCategoryColor,
} from "../projections/eventCategories";

import "./ChatAssistant.css";

/* ───────────── Tipos ───────────── */

interface MensajeChat {
  id: number;
  role: "user" | "assistant";
  content: string;
  events?: ChatEvento[];
  esError?: boolean;
  esBienvenida?: boolean;
}

interface ChatAssistantProps {
  onGoToEvent: (evento: ChatEvento) => void;
}

const BIENVENIDA: MensajeChat = {
  id: 0,
  role: "assistant",
  esBienvenida: true,
  content:
    "¡Hola! Soy el asistente del GeoPortal. Te ayudo a encontrar conciertos, partidos y planes en Medellín y el Valle de Aburrá, y a usar el mapa. ¿Qué te gustaría hacer?",
};

const SUGERENCIAS = [
  "¿Dónde hay conciertos de rock?",
  "¿Qué hay en vivo ahora?",
  "Planes en familia",
  "Eventos de fútbol",
  "¿Cómo cargo una capa?",
];

// Se envía a la IA para que conozca las categorías y subcategorías reales
const CATALOGO = {
  categorias: EVENT_CATEGORIES.map((categoria) => ({
    id: categoria.id,
    label: categoria.label,
    subcategorias: EVENT_SUBCATEGORIES[categoria.id] ?? [],
  })),
};

/* ───────────── Utilidades de texto ───────────── */

// **negrita** dentro de una línea
function renderInline(texto: string, clave: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((trozo, indice) => {
    if (trozo.startsWith("**") && trozo.endsWith("**") && trozo.length > 4) {
      return <strong key={`${clave}-${indice}`}>{trozo.slice(2, -2)}</strong>;
    }

    return trozo;
  });
}

// Párrafos y listas con guion (sin HTML crudo: React escapa todo el texto)
function renderTexto(texto: string): ReactNode {
  const bloques: ReactNode[] = [];
  let lista: string[] = [];

  const cerrarLista = () => {
    if (lista.length === 0) return;

    const items = lista;
    lista = [];

    bloques.push(
      <ul key={`ul-${bloques.length}`} className="chat__list">
        {items.map((item, indice) => (
          <li key={indice}>{renderInline(item, `li-${bloques.length}-${indice}`)}</li>
        ))}
      </ul>
    );
  };

  texto.split("\n").forEach((linea, indice) => {
    const limpia = linea.trim();
    const viñeta = /^[-*•]\s+(.*)$/.exec(limpia);

    if (viñeta) {
      lista.push(viñeta[1]);
      return;
    }

    cerrarLista();

    if (limpia) {
      bloques.push(
        <p key={`p-${indice}`} className="chat__paragraph">
          {renderInline(limpia, `p-${indice}`)}
        </p>
      );
    }
  });

  cerrarLista();

  return bloques;
}

function formatoFechaCorta(iso: string | null): string {
  if (!iso) return "";

  return new Date(iso).toLocaleString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatoHora(iso: string | null): string {
  if (!iso) return "";

  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function etiquetaEstado(evento: ChatEvento): { texto: string; clase: string } {
  if (evento.estado === "en_curso") {
    return { texto: "En vivo ahora", clase: "chat-card__state--live" };
  }

  if (evento.estado === "proximo") {
    return { texto: "Próximamente", clase: "chat-card__state--next" };
  }

  return { texto: "Lugar fijo", clase: "chat-card__state--venue" };
}

function detalleFecha(evento: ChatEvento): string {
  if (evento.estado === "proximo") {
    return `Empieza ${formatoFechaCorta(evento.fecha_inicio)}`;
  }

  if (evento.estado === "en_curso") {
    return `Hasta las ${formatoHora(evento.fecha_fin)}`;
  }

  return "Abierto siempre";
}

/* ───────────── Iconos ───────────── */

function IconoChat() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M7 5h18a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H15.5L9 27.5V22H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z"
        fill="#ffffff"
      />
      <path
        d="M11.5 14.2c1.2 1.7 2.7 2.5 4.5 2.5s3.3-.8 4.5-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconoCerrar() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconoEnviar() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M3 10 17 3l-4.5 14-3-5.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconoReiniciar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5V5h-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5S12.5 9.2 12.5 6A4.5 4.5 0 0 0 8 1.5zm0 6.2A1.7 1.7 0 1 1 8 4.3a1.7 1.7 0 0 1 0 3.4z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ───────────── Componente ───────────── */

function ChatAssistant({ onGoToEvent }: ChatAssistantProps) {
  // El chat se dibuja dentro del contenedor del mapa (esquina inferior derecha)
  const [anfitrion, setAnfitrion] = useState<Element | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([BIENVENIDA]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  const siguienteId = useRef(1);
  const finRef = useRef<HTMLDivElement | null>(null);
  const ultimoRef = useRef<HTMLDivElement | null>(null);
  const campoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAnfitrion(document.querySelector(".map-wrapper"));
  }, []);

  // Globo "¿Te ayudo?" unos segundos, solo la primera vez de la sesión
  useEffect(() => {
    let yaVisto = false;

    try {
      yaVisto = sessionStorage.getItem("geoportal-chat-aviso") === "1";
      sessionStorage.setItem("geoportal-chat-aviso", "1");
    } catch {
      /* sin almacenamiento: se muestra igual */
    }

    if (yaVisto) return;

    const mostrar = window.setTimeout(() => setMostrarAviso(true), 1500);
    const ocultar = window.setTimeout(() => setMostrarAviso(false), 9000);

    return () => {
      window.clearTimeout(mostrar);
      window.clearTimeout(ocultar);
    };
  }, []);

  useEffect(() => {
    if (abierto) {
      setMostrarAviso(false);
      campoRef.current?.focus();
    }
  }, [abierto]);

  // Respuesta nueva: se muestra desde su inicio; mensaje del usuario: al final
  useEffect(() => {
    const ultimo = mensajes[mensajes.length - 1];

    if (!cargando && ultimo.role === "assistant" && mensajes.length > 1) {
      ultimoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [mensajes, cargando, abierto]);

  useEffect(() => {
    if (!abierto) return;

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    window.addEventListener("keydown", alPulsarTecla);
    return () => window.removeEventListener("keydown", alPulsarTecla);
  }, [abierto]);

  const enviar = useCallback(
    async (contenido: string) => {
      const limpio = contenido.trim();

      if (!limpio || cargando) return;

      const mensajeUsuario: MensajeChat = {
        id: siguienteId.current++,
        role: "user",
        content: limpio,
      };

      // Historial que se manda a la IA (sin la bienvenida ni los errores)
      const historial: ChatMensaje[] = [...mensajes, mensajeUsuario]
        .filter((mensaje) => !mensaje.esBienvenida && !mensaje.esError)
        .map((mensaje) => ({ role: mensaje.role, content: mensaje.content }));

      setMensajes((anteriores) => [...anteriores, mensajeUsuario]);
      setTexto("");
      setCargando(true);

      try {
        const respuesta = await enviarMensajeChat(historial, CATALOGO);

        setMensajes((anteriores) => [
          ...anteriores,
          {
            id: siguienteId.current++,
            role: "assistant",
            content: respuesta.reply,
            events: respuesta.events,
          },
        ]);
      } catch (error) {
        const sinConexion =
          error instanceof TypeError || (error as Error)?.name === "TimeoutError";

        setMensajes((anteriores) => [
          ...anteriores,
          {
            id: siguienteId.current++,
            role: "assistant",
            esError: true,
            content: sinConexion
              ? "No logro conectarme con el servidor en este momento. Inténtalo de nuevo en unos minutos."
              : error instanceof Error
                ? error.message
                : "Ocurrió un error inesperado.",
          },
        ]);
      } finally {
        setCargando(false);
      }
    },
    [cargando, mensajes]
  );

  const alEnviarFormulario = (evento: FormEvent) => {
    evento.preventDefault();
    void enviar(texto);
  };

  const alPulsarEnter = (evento: ReactKeyboardEvent<HTMLInputElement>) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      void enviar(texto);
    }
  };

  const reiniciar = () => {
    setMensajes([BIENVENIDA]);
    setTexto("");
    campoRef.current?.focus();
  };

  const irAlEvento = (evento: ChatEvento) => {
    onGoToEvent(evento);

    // En pantallas angostas el panel taparía el mapa
    if (window.innerWidth < 700) setAbierto(false);
  };

  if (!anfitrion) return null;

  const soloBienvenida = mensajes.length === 1;

  return createPortal(
    <div className="chat">
      {abierto && (
        <section
          className="chat__panel"
          role="dialog"
          aria-label="Asistente del GeoPortal"
        >
          <header className="chat__header">
            <span className="chat__avatar">
              <IconoChat />
            </span>

            <div className="chat__heading">
              <strong>Asistente GeoPortal</strong>
              <span>
                <i className="chat__online" />
                Te ayudo a encontrar eventos
              </span>
            </div>

            <button
              type="button"
              className="chat__icon-button"
              onClick={reiniciar}
              title="Nueva conversación"
              aria-label="Nueva conversación"
            >
              <IconoReiniciar />
            </button>

            <button
              type="button"
              className="chat__icon-button"
              onClick={() => setAbierto(false)}
              title="Cerrar"
              aria-label="Cerrar asistente"
            >
              <IconoCerrar />
            </button>
          </header>

          <div className="chat__messages" aria-live="polite">
            {mensajes.map((mensaje, posicion) => (
              <div
                key={mensaje.id}
                ref={posicion === mensajes.length - 1 ? ultimoRef : undefined}
                className={`chat__row chat__row--${mensaje.role}`}
              >
                <div
                  className={`chat__bubble chat__bubble--${mensaje.role}${
                    mensaje.esError ? " chat__bubble--error" : ""
                  }`}
                >
                  {renderTexto(mensaje.content)}
                </div>

                {mensaje.events && mensaje.events.length > 0 && (
                  <ul className="chat__cards">
                    {mensaje.events.map((evento) => {
                      const estado = etiquetaEstado(evento);

                      return (
                        <li
                          key={evento.id}
                          className="chat-card"
                          style={
                            {
                              "--cat-color": getCategoryColor(evento.categoria),
                            } as CSSProperties
                          }
                        >
                          <div className="chat-card__top">
                            <span className={`chat-card__state ${estado.clase}`}>
                              {estado.texto}
                            </span>
                            <span className="chat-card__date">
                              {detalleFecha(evento)}
                            </span>
                          </div>

                          <strong className="chat-card__name">
                            {evento.nombre}
                          </strong>

                          <span className="chat-card__meta">
                            {[evento.subcategoria, evento.municipio]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>

                          {evento.direccion && (
                            <span className="chat-card__meta">
                              {evento.direccion}
                            </span>
                          )}

                          <button
                            type="button"
                            className="chat-card__go"
                            onClick={() => irAlEvento(evento)}
                          >
                            <IconoPin />
                            Ver en el mapa
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}

            {soloBienvenida && !cargando && (
              <div className="chat__suggestions">
                {SUGERENCIAS.map((sugerencia) => (
                  <button
                    key={sugerencia}
                    type="button"
                    className="chat__chip"
                    onClick={() => void enviar(sugerencia)}
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            )}

            {cargando && (
              <div className="chat__row chat__row--assistant">
                <div className="chat__bubble chat__bubble--assistant chat__typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}

            <div ref={finRef} />
          </div>

          <form className="chat__form" onSubmit={alEnviarFormulario}>
            <input
              ref={campoRef}
              type="text"
              className="chat__input"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={alPulsarEnter}
              placeholder="Pregunta por eventos o por el mapa..."
              maxLength={500}
              disabled={cargando}
              aria-label="Escribe tu mensaje"
            />

            <button
              type="submit"
              className="chat__send"
              disabled={cargando || texto.trim() === ""}
              aria-label="Enviar mensaje"
            >
              <IconoEnviar />
            </button>
          </form>

          <p className="chat__disclaimer">
            Asistente con IA: puede equivocarse. Confirma los datos en el mapa.
          </p>
        </section>
      )}

      {!abierto && mostrarAviso && (
        <div className="chat__hint" role="status">
          ¿Te ayudo a encontrar un plan?
        </div>
      )}

      <button
        type="button"
        className={`chat__launcher${abierto ? " chat__launcher--open" : ""}`}
        onClick={() => setAbierto((valor) => !valor)}
        aria-label={abierto ? "Cerrar asistente" : "Abrir asistente"}
        aria-expanded={abierto}
      >
        {abierto ? <IconoCerrar /> : <IconoChat />}
      </button>
    </div>,
    anfitrion
  );
}

export default ChatAssistant;
