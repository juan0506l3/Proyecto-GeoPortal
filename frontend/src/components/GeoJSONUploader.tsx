interface GeoJSONUploaderProps {
  onFileLoaded: (data: unknown, fileName: string) => void;
}

function GeoJSONUploader({
  onFileLoaded,
}: GeoJSONUploaderProps) {
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".geojson")) {
      alert("Por favor selecciona un archivo GeoJSON.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(
          reader.result as string
        );

        onFileLoaded(data, file.name);
      } catch (error) {
        console.error(
          "Error al leer el GeoJSON:",
          error
        );

        alert(
          "El archivo no contiene un GeoJSON válido."
        );
      }
    };

    reader.onerror = () => {
      alert("No se pudo leer el archivo.");
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <h3>Cargar capa GeoJSON</h3>

      <input
        type="file"
        accept=".geojson,application/geo+json"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default GeoJSONUploader;