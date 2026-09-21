import { useEffect, useRef, useState } from "react";
import type { DragEvent, FormEvent, ChangeEvent } from "react";
import { EVENT_CATEGORIES } from "../projections/eventCategories";
import { crearEvento } from "../projections/eventosSupabase";
import type { NuevoEvento } from "../projections/eventosSupabase";
import "./EventForm.css";

interface EventFormProps {
  // Coordenada capturada al hacer clic en el mapa (siempre en EPSG:4326 / WGS84).
  coordinates: { lng: number; lat: number } | null;
  onEventCreated?: () => void;
}

type Mensaje = { tipo: "ok" | "error"; texto: string };

function EventForm({ coordinates, onEventCreated }: EventFormProps) {
  const [abierto, setAbierto] = useState(true);

  const [nombre, setNombre] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState(EVENT_CATEGORIES[0]?.id ?? "");
  const [lng, setLng] = useState("");
  const [lat, setLat] = useState("");

  const [esDinamico, setEsDinamico] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [flyer, setFlyer] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [arrastrandoFlyer, setArrastrandoFlyer] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const flyerInputRef = useRef<HTMLInputElement | null>(null);

  // Cada vez que capturan un punto nuevo en el mapa, se autocompletan
  // los campos de longitud/latitud (el usuario aún puede editarlos a mano).
  useEffect(() => {
    if (coordinates) {
      setLng(coordinates.lng.toFixed(6));
      setLat(coordinates.lat.toFixed(6));
    }
  }, [coordinates]);

  // Libera la URL temporal utilizada para la vista previa del flyer.
  useEffect(() => {
    return () => {
      if (flyerPreview) {
        URL.revokeObjectURL(flyerPreview);
      }
    };
  }, [flyerPreview]);

  const seleccionarFlyer = (archivo: File | null) => {
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setMensaje({
        tipo: "error",
        texto: "El flyer debe ser una imagen.",
      });
      return;
    }

    if (flyerPreview) {
      URL.revokeObjectURL(flyerPreview);
    }

    const previewUrl = URL.createObjectURL(archivo);

    setFlyer(archivo);
    setFlyerPreview(previewUrl);
    setMensaje(null);
  };

  const handleFlyerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0] ?? null;
    seleccionarFlyer(archivo);
  };

  const handleFlyerDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setArrastrandoFlyer(false);

    const archivo = event.dataTransfer.files?.[0] ?? null;
    seleccionarFlyer(archivo);
  };

  const eliminarFlyer = () => {
    if (flyerPreview) {
      URL.revokeObjectURL(flyerPreview);
    }

    setFlyer(null);
    setFlyerPreview(null);

    if (flyerInputRef.current) {
      flyerInputRef.current.value = "";
    }
  };

  const resetFormulario = () => {
    setNombre("");
    setMunicipio("");
    setTipo("");
    setEsDinamico(false);
    setFechaInicio("");
    setFechaFin("");
    eliminarFlyer();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensaje(null);

    if (!nombre.trim() || !municipio.trim() || !tipo.trim() || !categoria) {
      setMensaje({
        tipo: "error",
        texto: "Completa nombre, municipio, tipo y categoría.",
      });
      return;
    }

    const lngNum = Number(lng);
    const latNum = Number(lat);

    if (Number.isNaN(lngNum) || Number.isNaN(latNum)) {
      setMensaje({
        tipo: "error",
        texto: "Selecciona un punto en el mapa o ingresa coordenadas válidas.",
      });
      return;
    }

    let fechaInicioIso: string | null = null;
    let fechaFinIso: string | null = null;

    if (esDinamico) {
      if (!fechaInicio || !fechaFin) {
        setMensaje({
          tipo: "error",
          texto: "Ingresa la fecha y hora de inicio y de fin del evento.",
        });
        return;
      }

      fechaInicioIso = new Date(fechaInicio).toISOString();
      fechaFinIso = new Date(fechaFin).toISOString();

      if (
        new Date(fechaFinIso).getTime() <
        new Date(fechaInicioIso).getTime()
      ) {
        setMensaje({
          tipo: "error",
          texto: "La fecha de fin no puede ser anterior a la fecha de inicio.",
        });
        return;
      }
    }

    const nuevoEvento: NuevoEvento = {
      nombre: nombre.trim(),
      municipio: municipio.trim(),
      tipo: tipo.trim(),
      categoria,
      lng: lngNum,
      lat: latNum,
      fecha_inicio: fechaInicioIso,
      fecha_fin: fechaFinIso,
    };

    setEnviando(true);

    const { error } = await crearEvento(nuevoEvento);

    setEnviando(false);

    if (error) {
      console.error("Error creando evento:", error);
      setMensaje({
        tipo: "error",
        texto: "No se pudo guardar el evento. Intenta de nuevo.",
      });
      return;
    }

    setMensaje({
      tipo: "ok",
      texto: "Evento creado correctamente.",
    });

    resetFormulario();
    onEventCreated?.();
  };

  return (
    <section className="event-form">
      <button
        type="button"
        className="event-form__toggle"
        onClick={() => setAbierto((prev) => !prev)}
        aria-expanded={abierto}
      >
        <span>Crear nuevo evento</span>

        <span
          className={`event-form__chevron ${
            abierto ? "event-form__chevron--open" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {abierto && (
        <form className="event-form__body" onSubmit={handleSubmit}>
          <label className="event-form__field">
            <span>Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Festival de verano"
              required
            />
          </label>

          <label className="event-form__field">
            <span>Municipio</span>
            <input
              type="text"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              placeholder="Ej. Itagüí"
              required
            />
          </label>

          <label className="event-form__field">
            <span>Tipo</span>
            <input
              type="text"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ej. Concierto, cancha deportiva..."
              required
            />
          </label>

          <label className="event-form__field">
            <span>Categoría</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
            >
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <div className="event-form__coords">
            <label className="event-form__field">
              <span>Longitud</span>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-75.58"
                required
              />
            </label>

            <label className="event-form__field">
              <span>Latitud</span>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="6.17"
                required
              />
            </label>
          </div>

          <p className="event-form__hint">
            Tip: haz clic en el mapa para llenar automáticamente la coordenada.
          </p>

          <div className="event-form__flyer">
            <span className="event-form__flyer-title">
              Flyer del evento
            </span>

            {!flyer ? (
              <div
                className={`event-form__dropzone ${
                  arrastrandoFlyer
                    ? "event-form__dropzone--dragging"
                    : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setArrastrandoFlyer(true);
                }}
                onDragLeave={() => setArrastrandoFlyer(false)}
                onDrop={handleFlyerDrop}
                onClick={() => flyerInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    flyerInputRef.current?.click();
                  }
                }}
              >
                <span className="event-form__dropzone-icon">
                  🖼️
                </span>

                <span className="event-form__dropzone-main">
                  Arrastra el flyer aquí
                </span>

                <span className="event-form__dropzone-secondary">
                  o haz clic para seleccionar una imagen
                </span>

                <span className="event-form__dropzone-format">
                  PNG, JPG, JPEG o WEBP
                </span>

                <input
                  ref={flyerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFlyerChange}
                  hidden
                />
              </div>
            ) : (
              <div className="event-form__flyer-preview">
                {flyerPreview && (
                  <img
                    src={flyerPreview}
                    alt="Vista previa del flyer"
                  />
                )}

                <div className="event-form__flyer-info">
                  <span className="event-form__flyer-name">
                    {flyer.name}
                  </span>

                  <button
                    type="button"
                    className="event-form__flyer-remove"
                    onClick={eliminarFlyer}
                  >
                    Quitar flyer
                  </button>
                </div>
              </div>
            )}
          </div>

          <fieldset className="event-form__tipo-evento">
            <legend>Tipo de evento</legend>

            <label className="event-form__radio">
              <input
                type="radio"
                name="tipoEvento"
                checked={!esDinamico}
                onChange={() => setEsDinamico(false)}
              />
              Estático (sin fecha)
            </label>

            <label className="event-form__radio">
              <input
                type="radio"
                name="tipoEvento"
                checked={esDinamico}
                onChange={() => setEsDinamico(true)}
              />
              Dinámico (con fecha de acción)
            </label>
          </fieldset>

          {esDinamico && (
            <div className="event-form__fechas">
              <label className="event-form__field">
                <span>Fecha y hora de inicio</span>
                <input
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required={esDinamico}
                />
              </label>

              <label className="event-form__field">
                <span>Fecha y hora de fin</span>
                <input
                  type="datetime-local"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required={esDinamico}
                />
              </label>
            </div>
          )}

          {mensaje && (
            <p
              className={`event-form__mensaje event-form__mensaje--${mensaje.tipo}`}
            >
              {mensaje.texto}
            </p>
          )}

          <button
            type="submit"
            className="event-form__submit"
            disabled={enviando}
          >
            {enviando ? "Guardando..." : "Guardar evento"}
          </button>
        </form>
      )}
    </section>
  );
}

export default EventForm;
