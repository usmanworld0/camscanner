export interface Point {
  x: number;
  y: number;
}

export type ScanMode =
  | 'original'
  | 'grayscale'
  | 'bw'
  | 'enhanced'
  | 'denoise'
  | 'sharpen'
  | 'magic'
  | 'highcontrast';

export interface ScanPage {
  id: string;
  originalSrc: string; // Base64 or object URL of full raw upload
  croppedSrc: string | null;  // Base64 of perspective warped image
  processedSrc: string | null; // Base64 of warped image with filters applied
  filterMode: ScanMode;
  ocrText: string | null;
  ocrConfidence: number | null;
  points: [Point, Point, Point, Point] | null; // Top-Left, Top-Right, Bottom-Right, Bottom-Left
  rotation: number; // 0, 90, 180, 270 degrees
  sourceWidth: number | null;
  sourceHeight: number | null;
}

export interface ScanSession {
  id: string;
  title: string;
  createdAt: string;
  pages: {
    id: string;
    processedSrc: string;
    ocrText: string | null;
    filterMode?: ScanMode;
    sourceWidth?: number | null;
    sourceHeight?: number | null;
  }[];
}
