import { useEffect, useMemo, useState } from "react";
import "./EventSchedule.css";

export interface Horario {
  inicio: string | null; // ISO (UTC) o null si aún no es válido
  fin: string | null;
}

interface EventScheduleProps {
  onChange: (horario: Horario) => void;
}

type Duracion = "1" | "2" | "3" | "4" | "6" | "dia" | "varios";

const DURACIONES: { id: Duracion; label: string }[] = [
  { id: "1", label: "1 h" },
  { id: "2", label: "2 h" },
  { id: "3", label: "3 h" },
  { id: "4", label: "4 h" },
  { id: "6", label: "6 h" },
  { id: "dia", label: "Todo el día" },
  { id: "varios", label: "Varios días" },
];

// Horas de uso frecuente (hora 1-12, minutos, pm)
const HORAS_RAPIDAS = [
  { hora: 8, minuto: 0, pm: false },
  { hora: 12, minuto: 0, pm: true },
  { hora: 3, minuto: 0, pm: true },
  { hora: 6, minuto: 0, pm: true },
  { hora: 8, minuto: 0, pm: true },
];

const HORAS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);

const pad = (n: number) => String(n).padStart(2, "0");

const aFechaInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const desdeFechaInput = (valor: string, h = 0, m = 0) => {
  const [y, mo, d] = valor.split("-").map(Number);
  return new Date(y, mo - 1, d, h, m);
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

const etiquetaHora = (hora: number, minuto: number, pm: boolean) =>
  `${hora}:${pad(minuto)} ${pm ? "p. m." : "a. m."}`;

function EventSchedule({ onChange }: EventScheduleProps) {
  const hoy = new Date();

  const [fecha, setFecha] = useState(aFechaInput(hoy));
  const [hora, setHora] = useState(6);
  const [minuto, setMinuto] = useState(0);
  const [pm, setPm] = useState(true);
  const [duracion, setDuracion] = useState<Duracion>("3");
  const [fechaFin, setFechaFin] = useState(aFechaInput(sumarDias(hoy, 1)));

  const { inicio, fin } = useMemo(() => {
    if (!fecha) return { inicio: null, fin: null };

    if (duracion === "dia") {
      return {
        inicio: desdeFechaInput(fecha, 0, 0),
        fin: desdeFechaInput(fecha, 23, 59),
      };
    }

    const ini = desdeFechaInput(fecha, a24h(hora, pm), minuto);

    if (duracion === "varios") {
      if (!fechaFin || fechaFin < fecha) return { inicio: ini, fin: null };
      return { inicio: ini, fin: desdeFechaInput(fechaFin, 23, 59) };
    }

    return {
      inicio: ini,
      fin: new Date(ini.getTime() + Number(duracion) * 3_600_000),
    };
  }, [fecha, hora, minuto, pm, duracion, fechaFin]);

  const inicioIso = inicio ? inicio.toISOString() : null;
  const finIso = fin ? fin.toISOString() : null;

  useEffect(() => {
    onChange({ inicio: inicioIso, fin: finIso });
  }, [inicioIso, finIso, onChange]);

  const hoyStr = aFechaInput(hoy);
  const mananaStr = aFechaInput(sumarDias(hoy, 1));
  const diasHastaSabado = (6 - hoy.getDay() + 7) % 7 || 7;
  const sabadoStr = aFechaInput(sumarDias(hoy, diasHastaSabado));

  const cambiarFecha = (valor: string) => {
    setFecha(valor);
    if (valor && fechaFin < valor) setFechaFin(valor);
  };

  const elegirDuracion = (id: Duracion) => {
    setDuracion(id);
    if (id === "varios" && fecha && fechaFin <= fecha) {
      setFechaFin(aFechaInput(sumarDias(desdeFechaInput(fecha), 1)));
    }
  };

  const rangoInvalido = duracion === "varios" && fecha && !fin;
  const mismoDia = inicio && fin && aFechaInput(inicio) === aFechaInput(fin);

  return (
    <div className="event-schedule">
      <span className="event-schedule__title">Cuándo es el evento</span>

      {/* 1. Día */}
      <div className="event-schedule__group">
        <span className="event-schedule__label">Día</span>

        <div className="event-schedule__chips">
          {[
            { label: "Hoy", valor: hoyStr },
            { label: "Mañana", valor: mananaStr },
            { label: "Sábado", valor: sabadoStr },
          ].map((atajo) => (
            <button
              key={atajo.label}
              type="button"
              className={`event-schedule__chip ${
                fecha === atajo.valor ? "event-schedule__chip--active" : ""
              }`}
              onClick={() => cambiarFecha(atajo.valor)}
            >
              {atajo.label}
            </button>
          ))}
        </div>

        <input
          type="date"
          className="event-schedule__input"
          value={fecha}
          onChange={(e) => cambiarFecha(e.target.value)}
          required
        />
      </div>

      {/* 2. Hora de inicio (no aplica si dura todo el día) */}
      {duracion !== "dia" && (
        <div className="event-schedule__group">
          <span className="event-schedule__label">Hora de inicio</span>

          <div className="event-schedule__chips">
            {HORAS_RAPIDAS.map((r) => {
              const activo =
                r.hora === hora && r.minuto === minuto && r.pm === pm;

              return (
                <button
                  key={`${r.hora}-${r.pm}`}
                  type="button"
                  className={`event-schedule__chip ${
                    activo ? "event-schedule__chip--active" : ""
                  }`}
                  onClick={() => {
                    setHora(r.hora);
                    setMinuto(r.minuto);
                    setPm(r.pm);
                  }}
                >
                  {etiquetaHora(r.hora, r.minuto, r.pm)}
                </button>
              );
            })}
          </div>

          <div className="event-schedule__time">
            <select
              className="event-schedule__select"
              value={hora}
              onChange={(e) => setHora(Number(e.target.value))}
              aria-label="Hora"
            >
              {HORAS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <span className="event-schedule__colon">:</span>

            <select
              className="event-schedule__select"
              value={minuto}
              onChange={(e) => setMinuto(Number(e.target.value))}
              aria-label="Minutos"
            >
              {MINUTOS.map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>

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
        </div>
      )}

      {/* 3. Duración */}
      <div className="event-schedule__group">
        <span className="event-schedule__label">Duración</span>

        <div className="event-schedule__chips">
          {DURACIONES.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`event-schedule__chip ${
                duracion === d.id ? "event-schedule__chip--active" : ""
              }`}
              onClick={() => elegirDuracion(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {duracion === "varios" && (
          <label className="event-schedule__end-date">
            <span>Último día del evento</span>
            <input
              type="date"
              className="event-schedule__input"
              value={fechaFin}
              min={fecha}
              onChange={(e) => setFechaFin(e.target.value)}
              required
            />
          </label>
        )}
      </div>

      {/* Resumen */}
      {rangoInvalido ? (
        <p className="event-schedule__error">
          El último día no puede ser anterior al día de inicio.
        </p>
      ) : (
        inicio &&
        fin && (
          <div className="event-schedule__summary">
            {duracion === "dia" ? (
              <span>
                <strong>Todo el día</strong> · {formatoFecha.format(inicio)}
              </span>
            ) : (
              <>
                <span>
                  <strong>Inicia:</strong> {formatoFecha.format(inicio)} ·{" "}
                  {formatoHora.format(inicio)}
                </span>
                <span>
                  <strong>Termina:</strong>{" "}
                  {mismoDia ? "" : `${formatoFecha.format(fin)} · `}
                  {formatoHora.format(fin)}
                </span>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default EventSchedule;
