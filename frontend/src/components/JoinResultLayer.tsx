import { useState } from "react";
import "./GeoJSONUploader.css";

interface JoinResultLayerProps {
  onFileLoaded: (data: unknown, fileName: string) => void;
}

function JoinResultLayer({ onFileLoaded }: JoinResultLayerProps) {
  const [cargando, setCargando] = useState(false);

  const handleClick = async () => {
    setCargando(true);

    try {
      const response = await fetch("/data/municipios-con-conteo.geojson");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      onFileLoaded(data, "inner-join-eventos-por-municipio.geojson");
    } catch (error) {
      console.error("Error al cargar el resultado del inner join:", error);
      alert("No se pudo cargar el resultado del inner join.");
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