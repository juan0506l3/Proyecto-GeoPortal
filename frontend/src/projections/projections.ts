import proj4 from "proj4";
import { register } from "ol/proj/proj4";

proj4.defs(
  "EPSG:4326",
  "+proj=longlat +datum=WGS84 +no_defs"
);

proj4.defs(
  "EPSG:3857",
  "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs"
);

proj4.defs(
  "EPSG:9377",
  "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);

register(proj4);

export const SUPPORTED_PROJECTIONS = [
  {
    code: "EPSG:4326",
    name: "WGS 84",
    type: "Geográfico",
  },
  {
    code: "EPSG:3857",
    name: "Web Mercator",
    type: "Proyectado",
  },
  {
    code: "EPSG:9377",
    name: "MAGNA-SIRGAS / Origen-Nacional",
    type: "Proyectado",
  },
];

export function getProjectionLabel(code: string): string {
  const found = SUPPORTED_PROJECTIONS.find(
    (p) => p.code === code
  );

  return found
    ? `${found.code} · ${found.name}`
    : code;
}

export function isGeographic(code: string): boolean {
  return (
    SUPPORTED_PROJECTIONS.find(
      (p) => p.code === code
    )?.type === "Geográfico"
  );
}
