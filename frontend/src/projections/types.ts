export interface CapturedCoordinateEntry {
code: string;
label: string;
x: number;
y: number;
unit: "deg" | "m";
  }
  
export interface CapturedPoint {
    viewProjection: string;
    entries: CapturedCoordinateEntry[];
  }