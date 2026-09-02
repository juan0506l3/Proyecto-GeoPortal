import shp from "shpjs";
import "./GeoJSONUploader.css";

interface GeoJSONUploaderProps {
  onFileLoaded: (data: unknown, fileName: string) => void;
}

function GeoJSONUploader({ onFileLoaded }: GeoJSONUploaderProps) {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const lowerName = file.name.toLowerCase();

    try {
      if (lowerName.endsWith(".geojson") || lowerName.endsWith(".json")) {
        const text = await file.text();
        const data = JSON.parse(text);

        onFileLoaded(data, file.name);
      } else if (lowerName.endsWith(".zip")) {
        const buffer = await file.arrayBuffer();
        const result = await shp(buffer);

        const data = Array.isArray(result)
          ? {
              type: "FeatureCollection",
              features: result.flatMap(
                (collection) => collection.features ?? []
              ),
            }
          : result;

        onFileLoaded(data, file.name);
      } else {
        alert(
          "Formato no soportado. Usa un archivo .geojson o un .zip con el shapefile (.shp, .dbf, .prj)."
        );
      }
    } catch (error) {
      console.error("Error al leer el archivo:", error);

      alert(
        "No se pudo leer el archivo. Verifica que sea un GeoJSON válido o un .zip de shapefile correcto."
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="uploader">
      <label className="uploader__button">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        Cargar capa (.geojson / .zip)

        <input
          type="file"
          accept=".geojson,.json,application/geo+json,.zip"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </label>
    </section>
  );
}

export default GeoJSONUploader;