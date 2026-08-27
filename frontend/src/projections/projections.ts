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
];