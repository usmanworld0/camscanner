import { Point, ScanMode, ScanPage } from '@/types';

export const scanModeLabels: Record<ScanMode, string> = {
  original: 'Original',
  grayscale: 'Grayscale',
  bw: 'Adaptive Binarization',
  enhanced: 'Contrast Stretch',
  denoise: 'Noise Reduction',
  sharpen: 'Unsharp Mask',
  magic: 'Color Normalize',
  highcontrast: 'Otsu Threshold',
};

export const scanModeDescriptions: Record<ScanMode, string> = {
  original: 'Raw warped page without enhancement.',
  grayscale: 'Luminance conversion for neutral documents.',
  bw: 'Local thresholding for text-heavy pages.',
  enhanced: 'Contrast and brightness correction.',
  denoise: 'Median smoothing before recognition.',
  sharpen: 'Edge enhancement for faint strokes.',
  magic: 'Lighting normalization with color retained.',
  highcontrast: 'Global threshold for dark printed text.',
};

export function formatResolution(page: ScanPage): string {
  if (!page.sourceWidth || !page.sourceHeight) return 'Not measured';
  return `${Math.round(page.sourceWidth)} x ${Math.round(page.sourceHeight)} px`;
}

export function getMegapixels(page: ScanPage): string {
  if (!page.sourceWidth || !page.sourceHeight) return '-';
  return `${((page.sourceWidth * page.sourceHeight) / 1_000_000).toFixed(2)} MP`;
}

export function getCropCoverage(points: [Point, Point, Point, Point] | null): number | null {
  if (!points) return null;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.max(0, Math.min(100, Math.abs(area / 2) * 100));
}

export function getSkewDegrees(points: [Point, Point, Point, Point] | null): number | null {
  if (!points) return null;
  const [tl, tr, br, bl] = points;
  const topAngle = Math.atan2(tr.y - tl.y, tr.x - tl.x);
  const bottomAngle = Math.atan2(br.y - bl.y, br.x - bl.x);
  return ((topAngle + bottomAngle) / 2) * (180 / Math.PI);
}

export function getQualityStatus(page: ScanPage): { label: string; tone: 'good' | 'warn' | 'bad' } {
  const coverage = getCropCoverage(page.points);
  const megapixels = page.sourceWidth && page.sourceHeight
    ? (page.sourceWidth * page.sourceHeight) / 1_000_000
    : 0;

  if (megapixels >= 1.2 && coverage !== null && coverage >= 45) {
    return { label: 'Good capture', tone: 'good' };
  }

  if (megapixels >= 0.6 || (coverage !== null && coverage >= 30)) {
    return { label: 'Usable capture', tone: 'warn' };
  }

  return { label: 'Low detail', tone: 'bad' };
}
