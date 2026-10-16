
import express from "express";
import cors from "cors";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const app = express();
const execFileAsync = promisify(execFile);

const GDAL_PATH =
  "C:\\Program Files\\QGIS 4.2.2\\bin\\ogr2ogr.exe";

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "GeoPortal API funcionando",
  });
});

function contienePoligono(data: any): boolean {
  if (!data || typeof data !== "object") return false;

  if (
    data.type === "Polygon" ||
    data.type === "MultiPolygon"
  ) {
    return true;
  }

  if (data.type === "Feature") {
    return contienePoligono(data.geometry);
  }

  if (data.type === "FeatureCollection") {
    return Array.isArray(data.features) &&
      data.features.some((feature: unknown) =>
        contienePoligono(feature)
      );
  }

  return false;
}

app.post("/api/clip", async (req, res) => {
  const { input, mask } = req.body ?? {};

  if (!input || !mask) {
    res.status(400).json({
      error: "Debes proporcionar las capas GeoJSON input y mask.",
    });
    return;
  }

  if (!contienePoligono(mask)) {
    res.status(400).json({
      error: "La máscara debe contener geometrías Polygon o MultiPolygon.",
    });
    return;
  }

  let directorioTemporal: string | undefined;

  try {
    directorioTemporal = await mkdtemp(
      path.join(tmpdir(), "geoportal-clip-")
    );

    const archivoEntrada = path.join(
      directorioTemporal,
      "entrada.geojson"
    );
    const archivoMascara = path.join(
      directorioTemporal,
      "mascara.geojson"
    );
    const archivoSalida = path.join(
      directorioTemporal,
      "resultado.geojson"
    );

    await Promise.all([
      writeFile(
        archivoEntrada,
        JSON.stringify(input),
        "utf8"
      ),
      writeFile(
        archivoMascara,
        JSON.stringify(mask),
        "utf8"
      ),
    ]);

    await execFileAsync(
      GDAL_PATH,
      [
        "-f",
        "GeoJSON",
        archivoSalida,
        archivoEntrada,
        "-clipsrc",
        archivoMascara,
      ],
      {
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const contenido = await readFile(
      archivoSalida,
      "utf8"
    );

    res.json(JSON.parse(contenido));
  } catch (error) {
    console.error("Error ejecutando GDAL Clip:", error);

    res.status(500).json({
      error: "No se pudo ejecutar Clip con GDAL.",
      detalle:
        error instanceof Error
          ? error.message
          : "Error desconocido",
    });
  } finally {
    if (directorioTemporal) {
      await rm(directorioTemporal, {
        recursive: true,
        force: true,
      }).catch((error) => {
        console.error(
          "No se pudieron eliminar los archivos temporales:",
          error
        );
      });
    }
  }
});

export default app;
