declare module "shpjs" {
    export interface ShpFeatureCollection {
      type: "FeatureCollection";
      features: Array<{
        type: "Feature";
        properties: Record<string, unknown>;
        geometry: {
          type: string;
          coordinates: unknown;
        };
      }>;
      [key: string]: unknown;
    }
  
    export default function shp(
      input: ArrayBuffer | string
    ): Promise<ShpFeatureCollection | ShpFeatureCollection[]>;
  }