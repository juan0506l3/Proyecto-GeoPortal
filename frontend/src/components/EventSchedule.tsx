import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";
import "./EventSchedule.css";

export interface Horario {
  inicio: string | null; // ISO (UTC) o null si aún no es válido
  fin: string | null;
}

interface EventScheduleProps {
  onChange: (horario: Horario) => void;
}

type Duracion = "1" | "2" | "3" | "4" | "6" | "dia" | "varios";
type ModoReloj = "hora" | "minuto";

const DURACIONES: { id: Duracion; label: string }[] = [
  { id: "1", label: "1 hora" },
  { id: "2", label: "2 horas" },
  { id: "3", label: "3 horas" },
  { id: "4", label: "4 horas" },
  { id: "6", label: "6 horas" },
  { id: "dia", label: "Todo el día" },
  { id: "varios", label: "Varios días" },
];

/* ───────────── Utilidades de fecha ───────────── */

const pad = (n: number) => String(n).padStart(2, "0");

const formatearFecha = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

// Convierte "12112026" en "12/11/2026" mientras se escribe
const enmascarar = (valor: string) => {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

// "dd/mm/aaaa" -> Date (o null si no existe ese día)
const leerFecha = (texto: string, h = 0, m = 0): Date | null => {
  const r = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!r) return null;

  const dia = Number(r[1]);
  const mes = Number(r[2]);
  const anio = Number(r[3]);

  const fecha = new Date(anio, mes - 1, dia, h, m);

  const existe =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia;

  return existe ? fecha : null;
};

const a24h = (hora: number, pm: boolean) => (hora % 12) + (pm ? 12 : 0);

const sumarDias = (d: Date, dias: number) => {
  const copia = new Date(d);
  copia.setDate(copia.getDate() + dias);
  return copia;
};

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const formatoHora = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
});

/* ───────────── Reloj circular ───────────── */

const CENTRO = 100;
const RADIO_NUMEROS = 70;
const RADIO_BOLA = 17;

const punto = (grados: number, radio: number) => {
  const rad = (grados * Math.PI) / 180;
  return {
    x: CENTRO + radio * Math.sin(rad),
    y: CENTRO - radio * Math.cos(rad),
  };
};

interface RelojProps {
  modo: ModoReloj;
  hora: number;
  minuto: number;
  onHora: (h: number) => void;
  onMinuto: (m: number) => void;
  onSoltar: () => void;
}

function Reloj({ modo, hora, minuto, onHora, onMinuto, onSoltar }: RelojProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastrando = useRef(false);

  const esHora = modo === "hora";

  // Al abrirse (o cambiar a minutos) el reloj recibe el foco para usar flechas
  useEffect(() => {
    svgRef.current?.focus({ preventScroll: true });
  }, [modo]);

  const valores = Array.from({ length: 12 }, (_, i) => (esHora ? i + 1 : i * 5));
  const seleccionado = esHora ? hora : minuto;

  const gradosDe = (v: number) => (esHora ? (v % 12) * 30 : v * 6);
  const etiqueta = (v: number) => (esHora ? String(v) : pad(v));

  const extremo = punto(gradosDe(seleccionado), RADIO_NUMEROS);

  // Calcula la hora/minuto según dónde está el dedo o el mouse
  const elegirDesdePuntero = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const caja = svg.getBoundingClientRect();
    const dx = e.clientX - (caja.left + caja.width / 2);
    const dy = e.clientY - (caja.top + caja.height / 2);

    const grados = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const paso = Math.round(grados / 30) % 12;

    if (esHora) onHora(paso === 0 ? 12 : paso);
    else onMinuto(paso * 5);
  };

  const alPresionar = (e: PointerEvent<SVGSVGElement>) => {
    arrastrando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    elegirDesdePuntero(e);
  };

  const alMover = (e: PointerEvent<SVGSVGElement>) => {
    if (arrastrando.current) elegirDesdePuntero(e);
  };

  const alSoltar = () => {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    onSoltar();
  };

  // Accesible con teclado: flechas para mover, Enter para confirmar
  const alTeclear = (e: KeyboardEvent<SVGSVGElement>) => {
    const sube = e.key === "ArrowRight" || e.key === "ArrowUp";
    const baja = e.key === "ArrowLeft" || e.key === "ArrowDown";

    if (e.key === "Enter") {
      e.preventDefault();
      onSoltar();
      return;
    }

    if (!sube && !baja) return;
    e.preventDefault();

    const delta = sube ? 1 : -1;

    if (esHora) onHora(((hora - 1 + delta + 12) % 12) + 1);
    else onMinuto((minuto + delta * 5 + 60) % 60);
  };

  return (
    <div className="event-schedule__dial-wrap">
      <svg
        ref={svgRef}
        className="event-schedule__dial"
        viewBox="0 0 200 200"
        role="group"
        tabIndex={0}
        aria-label={esHora ? "Elegir la hora" : "Elegir los minutos"}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={() => {
          arrastrando.current = false;
        }}
        onKeyDown={alTeclear}
      >
        <circle
          className="event-schedule__dial-face"
          cx={CENTRO}
          cy={CENTRO}
          r={96}
        />

        <line
          className="event-schedule__dial-hand"
          x1={CENTRO}
          y1={CENTRO}
          x2={extremo.x}
          y2={extremo.y}
        />

        <circle
          className="event-schedule__dial-pivot"
          cx={CENTRO}
          cy={CENTRO}
          r={3.5}
        />

        {valores.map((v) => {
          const p = punto(gradosDe(v), RADIO_NUMEROS);

          return (
            <text
              key={v}
              className="event-schedule__dial-num"
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {etiqueta(v)}
            </text>
          );
        })}

        {/* La bola que marca la selección */}
        <circle
          className="event-schedule__dial-ball"
          cx={extremo.x}
          cy={extremo.y}
          r={RADIO_BOLA}
        />

        <text
          className="event-schedule__dial-ball-num"
          x={extremo.x}
          y={extremo.y}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {etiqueta(seleccionado)}
        </text>
      </svg>
    </div>
  );
}

/* ───────────── Componente principal ───────────── */

function EventSchedule({ onChange }: EventScheduleProps) {
  const [fechaTxt, setFechaTxt] = useState(() => formatearFecha(new Date()));
  const [hora, setHora] = useState(6);
  const [minuto, setMinuto] = useState(0);
  const [pm, setPm] = useState(true);
  const [duracion, setDuracion] = useState<Duracion>("3");
  const [finTxt, setFinTxt] = useState("");

  const [relojAbierto, setRelojAbierto] = useState(false);
  const [modo, setModo] = useState<ModoReloj>("hora");

  const { inicio, fin } = useMemo(() => {
    const dia = leerFecha(fechaTxt);
    if (!dia) return { inicio: null, fin: null };

    if (duracion === "dia") {
      return {
        inicio: leerFecha(fechaTxt, 0, 0),
        fin: leerFecha(fechaTxt, 23, 59),
      };
    }

    const ini = leerFecha(fechaTxt, a24h(hora, pm), minuto);
    if (!ini) return { inicio: null, fin: null };

    if (duracion === "varios") {
      const ultimo = leerFecha(finTxt, 23, 59);
      if (!ultimo || ultimo < dia) return { inicio: ini, fin: null };
      return { inicio: ini, fin: ultimo };
    }

    return {
      inicio: ini,
      fin: new Date(ini.getTime() + Number(duracion) * 3_600_000),
    };
  }, [fechaTxt, hora, minuto, pm, duracion, finTxt]);

  const inicioIso = inicio ? inicio.toISOString() : null;
  const finIso = fin ? fin.toISOString() : null;

  useEffect(() => {
    onChange({ inicio: inicioIso, fin: finIso });
  }, [inicioIso, finIso, onChange]);

  const elegirDuracion = (id: Duracion) => {
    setDuracion(id);

    // Al pasar a "Varios días" proponemos el día siguiente como último día
    if (id === "varios") {
      const dia = leerFecha(fechaTxt);
      const ultimo = leerFecha(finTxt);

      if (dia && (!ultimo || ultimo <= dia)) {
        setFinTxt(formatearFecha(sumarDias(dia, 1)));
      }
    }
  };

  const abrirReloj = (nuevoModo: ModoReloj) => {
    if (relojAbierto && modo === nuevoModo) {
      setRelojAbierto(false);
      return;
    }
    setModo(nuevoModo);
    setRelojAbierto(true);
  };

  const alSoltarReloj = () => {
    if (modo === "hora") setModo("minuto");
    else setRelojAbierto(false);
  };

  const escribirFecha =
    (setter: (valor: string) => void) => (e: ChangeEvent<HTMLInputElement>) =>
      setter(enmascarar(e.target.value));

  /* Mensajes de error */
  const fechaCompleta = fechaTxt.length === 10;
  const finCompleto = finTxt.length === 10;

  let error: string | null = null;

  if (fechaCompleta && !leerFecha(fechaTxt)) {
    error = "Esa fecha no existe. Usa el formato dd/mm/aaaa.";
  } else if (duracion === "varios" && finCompleto) {
    const dia = leerFecha(fechaTxt);
    const ultimo = leerFecha(finTxt);

    if (!ultimo) error = "El último día no existe. Usa el formato dd/mm/aaaa.";
    else if (dia && ultimo < dia)
      error = "El último día no puede ser anterior al día de inicio.";
  }

  const mismoDia =
    inicio && fin && formatearFecha(inicio) === formatearFecha(fin);

  return (
    <div className="event-schedule">
      <span className="event-schedule__title">Cuándo es el evento</span>

      {/* 1. Fecha escrita a mano */}
      <label className="event-schedule__group">
        <span className="event-schedule__label">Fecha</span>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          className={`event-schedule__input ${
            fechaCompleta && !leerFecha(fechaTxt)
              ? "event-schedule__input--error"
              : ""
          }`}
          value={fechaTxt}
          onChange={escribirFecha(setFechaTxt)}
          onFocus={(e) => e.target.select()}
          required
        />
      </label>

      {/* 2. Hora con reloj circular (no aplica si dura todo el día) */}
      {duracion !== "dia" && (
        <div className="event-schedule__group">
          <span className="event-schedule__label">Hora</span>

          <div className="event-schedule__time">
            <div className="event-schedule__digits">
              <button
                type="button"
                className={`event-schedule__digit ${
                  relojAbierto && modo === "hora"
                    ? "event-schedule__digit--active"
                    : ""
                }`}
                onClick={() => abrirReloj("hora")}
                aria-label="Cambiar la hora"
              >
                {hora}
              </button>

              <span className="event-schedule__colon">:</span>

              <button
                type="button"
                className={`event-schedule__digit ${
                  relojAbierto && modo === "minuto"
                    ? "event-schedule__digit--active"
                    : ""
                }`}
                onClick={() => abrirReloj("minuto")}
                aria-label="Cambiar los minutos"
              >
                {pad(minuto)}
              </button>
            </div>

            <div className="event-schedule__ampm">
              <button
                type="button"
                className={!pm ? "event-schedule__ampm--active" : ""}
                onClick={() => setPm(false)}
              >
                a. m.
              </button>

              <button
                type="button"
                className={pm ? "event-schedule__ampm--active" : ""}
                onClick={() => setPm(true)}
              >
                p. m.
              </button>
            </div>
          </div>

          {relojAbierto && (
            <Reloj
              modo={modo}
              hora={hora}
              minuto={minuto}
              onHora={setHora}
              onMinuto={setMinuto}
              onSoltar={alSoltarReloj}
            />
          )}
        </div>
      )}

      {/* 3. Duración */}
      <label className="event-schedule__group">
        <span className="event-schedule__label">Duración</span>

        <select
          className="event-schedule__select"
          value={duracion}
          onChange={(e) => elegirDuracion(e.target.value as Duracion)}
        >
          {DURACIONES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      {duracion === "varios" && (
        <label className="event-schedule__group">
          <span className="event-schedule__label">Último día del evento</span>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            className={`event-schedule__input ${
              finCompleto && !leerFecha(finTxt)
                ? "event-schedule__input--error"
                : ""
            }`}
            value={finTxt}
            onChange={escribirFecha(setFinTxt)}
            onFocus={(e) => e.target.select()}
            required
          />
        </label>
      )}

      {/* Resumen en una sola línea */}
      {error ? (
        <p className="event-schedule__error">{error}</p>
      ) : (
        inicio &&
        fin && (
          <p className="event-schedule__summary">
            {duracion === "dia" ? (
              <>
                {formatoFecha.format(inicio)} · <strong>todo el día</strong>
              </>
            ) : (
              <>
                {formatoFecha.format(inicio)} ·{" "}
                <strong>{formatoHora.format(inicio)}</strong>
                {" → "}
                {duracion === "varios" ? (
                  formatoFecha.format(fin)
                ) : (
                  <>
                    {!mismoDia && `${formatoFecha.format(fin)} · `}
                    <strong>{formatoHora.format(fin)}</strong>
                  </>
                )}
              </>
            )}
          </p>
        )
      )}
    </div>
  );
}

export default EventSchedule;
