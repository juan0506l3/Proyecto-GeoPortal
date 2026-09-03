export interface CapturedCoordinateEntry {
code: string;
label: string;
x: number;
y: number;
unit: "deg" | "m";
layerName: string
  }
  
export interface CapturedPoint {
    viewProjection: string;
    entries: CapturedCoordinateEntry[];
  }