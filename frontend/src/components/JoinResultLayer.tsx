import { useState } from "react";
import { obtenerInnerJoinMunicipios } from "../services/api";
import "./GeoJSONUploader.css";

interface JoinResultLayerProps {
  onFileLoaded: (data: unknown, fileName: string) => void;
}

function JoinResultLayer({ onFileLoaded }: JoinResultLayerProps) {
  const [cargando, setCargando] = useState(false);

  const handleClick = async () => {
    setCargando(true);

    try {
      // El inner join lo ejecuta GDAL en el backend
      const data = await obtenerInnerJoinMunicipios();

      onFileLoaded(data, "inner-join-eventos-por-municipio.geojson");
    } catch (error) {
      console.error("Error al cargar el resultado del inner join:", error);
      alert(
        "No se pudo ejecutar el inner join. Revisa que el backend esté encendido."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="uploader">
      <button
        type="button"
        className="uploader__button"
        style={{ border: "none" }}
        onClick={handleClick}
        disabled={cargando}
      >
        {cargando ? "Cargando..." : "Ver inner join GDAL (eventos por municipio)"}
      </button>
    </section>
  );
}

export default JoinResultLayer;