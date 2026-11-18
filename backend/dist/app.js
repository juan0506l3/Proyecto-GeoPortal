"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const app = (0, express_1.default)();
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const GDAL_PATH = process.env.OGR2OGR_PATH ??
    "C:\\Program Files\\QGIS 4.2.2\\bin\\ogr2ogr.exe";
// Carpeta con los datos del inner join (backend/data), tanto al correr con
// tsx (src/) como compilado (dist/)
const DATA_DIR = node_path_1.default.resolve(__dirname, "..", "data");
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "50mb" }));
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "GeoPortal API funcionando",
    });
});
function contienePoligono(data) {
    if (!data || typeof data !== "object")
        return false;
    if (data.type === "Polygon" ||
        data.type === "MultiPolygon") {
        return true;
    }
    if (data.type === "Feature") {
        return contienePoligono(data.geometry);
    }
    if (data.type === "FeatureCollection") {
        return Array.isArray(data.features) &&
            data.features.some((feature) => contienePoligono(feature));
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
    let directorioTemporal;
    try {
        directorioTemporal = await (0, promises_1.mkdtemp)(node_path_1.default.join((0, node_os_1.tmpdir)(), "geoportal-clip-"));
        const archivoEntrada = node_path_1.default.join(directorioTemporal, "entrada.geojson");
        const archivoMascara = node_path_1.default.join(directorioTemporal, "mascara.geojson");
        const archivoSalida = node_path_1.default.join(directorioTemporal, "resultado.geojson");
        await Promise.all([
            (0, promises_1.writeFile)(archivoEntrada, JSON.stringify(input), "utf8"),
            (0, promises_1.writeFile)(archivoMascara, JSON.stringify(mask), "utf8"),
        ]);
        await execFileAsync(GDAL_PATH, [
            "-f",
            "GeoJSON",
            archivoSalida,
            archivoEntrada,
            "-clipsrc",
            archivoMascara,
        ], {
            windowsHide: true,
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024,
        });
        const contenido = await (0, promises_1.readFile)(archivoSalida, "utf8");
        res.json(JSON.parse(contenido));
    }
    catch (error) {
        console.error("Error ejecutando GDAL Clip:", error);
        res.status(500).json({
            error: "No se pudo ejecutar Clip con GDAL.",
            detalle: error instanceof Error
                ? error.message
                : "Error desconocido",
        });
    }
    finally {
        if (directorioTemporal) {
            await (0, promises_1.rm)(directorioTemporal, {
                recursive: true,
                force: true,
            }).catch((error) => {
                console.error("No se pudieron eliminar los archivos temporales:", error);
            });
        }
    }
});
/* ───────────── Inner join con GDAL (eventos por municipio) ───────────── */
const SQL_MUNICIPIOS_CON_CONTEO = "SELECT m.nombre, m.codigo_dane, COUNT(e.nombre) AS total_eventos, m.geometry " +
    "FROM municipios m JOIN 'eventos.geojson'.eventos e ON e.municipio = m.municipio " +
    "GROUP BY m.codigo_dane";
const SQL_EVENTOS_CON_MUNICIPIO = "SELECT e.nombre, e.categoria, e.tipo, e.direccion, e.municipio, " +
    "m.codigo_dane, m.departamento, e.geometry " +
    "FROM eventos e JOIN 'municipios.geojson'.municipios m ON e.municipio = m.municipio";
async function ejecutarInnerJoin(archivoOrigen, sql) {
    const directorioTemporal = await (0, promises_1.mkdtemp)(node_path_1.default.join((0, node_os_1.tmpdir)(), "geoportal-join-"));
    try {
        const archivoSalida = node_path_1.default.join(directorioTemporal, "resultado.geojson");
        await execFileAsync(GDAL_PATH, [
            "-f",
            "GeoJSON",
            archivoSalida,
            archivoOrigen,
            "-dialect",
            "SQLITE",
            "-sql",
            sql,
        ], {
            // Las rutas de los .geojson dentro del SQL son relativas a esta carpeta
            cwd: DATA_DIR,
            windowsHide: true,
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024,
        });
        return JSON.parse(await (0, promises_1.readFile)(archivoSalida, "utf8"));
    }
    finally {
        await (0, promises_1.rm)(directorioTemporal, { recursive: true, force: true }).catch((error) => {
            console.error("No se pudieron eliminar los archivos temporales:", error);
        });
    }
}
function rutaInnerJoin(archivoOrigen, sql) {
    return async (_req, res) => {
        try {
            res.json(await ejecutarInnerJoin(archivoOrigen, sql));
        }
        catch (error) {
            console.error("Error ejecutando el inner join con GDAL:", error);
            res.status(500).json({
                error: "No se pudo ejecutar el inner join con GDAL.",
                detalle: error instanceof Error ? error.message : "Error desconocido",
            });
        }
    };
}
// Municipios con el total de eventos (lo que dibuja el botón del Sidebar)
app.get("/api/inner-join/municipios-con-conteo", rutaInnerJoin("municipios.geojson", SQL_MUNICIPIOS_CON_CONTEO));
// Eventos con los datos de su municipio (código DANE y departamento)
app.get("/api/inner-join/eventos-con-municipio", rutaInnerJoin("eventos.geojson", SQL_EVENTOS_CON_MUNICIPIO));
exports.default = app;
