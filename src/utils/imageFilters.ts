import { ScanMode } from '@/types';

/**
 * Applies a selected filter mode to a source canvas and outputs it as a base64 string.
 */
export function applyImageFilter(
  srcCanvas: HTMLCanvasElement,
  mode: ScanMode
): string {
  const destCanvas = document.createElement('canvas');
  destCanvas.width = srcCanvas.width;
  destCanvas.height = srcCanvas.height;
  const ctx = destCanvas.getContext('2d');
  if (!ctx) return srcCanvas.toDataURL('image/jpeg', 0.9);

  // Draw the original image onto the destination canvas
  ctx.drawImage(srcCanvas, 0, 0);

  if (mode === 'original') {
    return destCanvas.toDataURL('image/jpeg', 0.9);
  }

  const imageData = ctx.getImageData(0, 0, destCanvas.width, destCanvas.height);
  const data = imageData.data;
  const w = destCanvas.width;
  const h = destCanvas.height;

  switch (mode) {
    case 'bw':
      // Adaptive Thresholding (B&W document mode) to remove shadows and keep crisp text
      applyAdaptiveThreshold(data, w, h, 20, 15);
      break;

    case 'enhanced':
      // Sharpen and stretch contrast
      applyContrastBrightness(data, 1.25, 5);
      applySharpen(data, w, h, 0.4);
      break;

    case 'magic':
      // Boost saturation, increase brightness, increase contrast, and sharpen
      applyMagicColor(data, w, h);
      break;

    case 'highcontrast':
      // Heavy binarized filter (Otsu-like fixed high thresholding)
      applyHighContrastBinarization(data);
      break;
  }

  ctx.putImageData(imageData, 0, 0);
  return destCanvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Contrast and Brightness adjustment
 */
function applyContrastBrightness(data: Uint8ClampedArray, contrast: number, brightness: number) {
  for (let i = 0; i < data.length; i += 4) {
    // R, G, B
    for (let c = 0; c < 3; c++) {
      let val = data[i + c];
      // Apply contrast
      val = (val - 128) * contrast + 128;
      // Apply brightness
      val = val + brightness;
      // Clamp values
      data[i + c] = Math.max(0, Math.min(255, val));
    }
  }
}

/**
 * Saturation boost helper (Magic Color)
 */
function applyMagicColor(data: Uint8ClampedArray, w: number, h: number) {
  // First adjust contrast/brightness
  applyContrastBrightness(data, 1.3, 15);

  const saturationBoost = 1.6;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Grayscale luminance
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Interpolate original and grayscale based on saturation boost
    data[i] = Math.max(0, Math.min(255, gray + (r - gray) * saturationBoost));
    data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * saturationBoost));
    data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * saturationBoost));
  }

  // Sharpen
  applySharpen(data, w, h, 0.35);
}

/**
 * High contrast binarization (grayscales first, then hard binarize at a threshold)
 */
function applyHighContrastBinarization(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    const binaryVal = gray > 120 ? 255 : 0;
    data[i] = binaryVal;
    data[i + 1] = binaryVal;
    data[i + 2] = binaryVal;
  }
}

/**
 * Sharpen convolution filter
 */
function applySharpen(data: Uint8ClampedArray, w: number, h: number, strength: number) {
  const original = new Uint8ClampedArray(data);
  const mix = strength;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = original[idx + c];
        const top = original[((y - 1) * w + x) * 4 + c];
        const bottom = original[((y + 1) * w + x) * 4 + c];
        const left = original[(y * w + (x - 1)) * 4 + c];
        const right = original[(y * w + (x + 1)) * 4 + c];

        // Laplacian sharp kernel: center * 5 - (top + bottom + left + right)
        const sharpVal = center * 5 - (top + bottom + left + right);
        const blended = center * (1 - mix) + sharpVal * mix;

        data[idx + c] = Math.max(0, Math.min(255, blended));
      }
    }
  }
}

/**
 * Adaptive Thresholding (using integral image technique for fast local averages)
 */
function applyAdaptiveThreshold(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  cConstant: number
) {
  // Convert image to a grayscale buffer first
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Create Integral Image to compute local sums in O(1) time
  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      sum += gray[idx];
      integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + sum;
    }
  }

  // Perform thresholding
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Define bounding coordinates for the window
      const x1 = Math.max(0, x - radius);
      const x2 = Math.min(width - 1, x + radius);
      const y1 = Math.max(0, y - radius);
      const y2 = Math.min(height - 1, y + radius);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      // Sum from integral image: S = I(x2, y2) - I(x1-1, y2) - I(x2, y1-1) + I(x1-1, y1-1)
      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] -
        integral[y1 * (width + 1) + (x2 + 1)] +
        integral[y1 * (width + 1) + x1];

      const localAverage = sum / count;

      // Threshold: if pixel is darker than local average minus constant, it's black (0), otherwise white (255)
      const thresholdVal = gray[idx] < (localAverage - cConstant) ? 0 : 255;

      const dataIdx = idx * 4;
      data[dataIdx] = thresholdVal;
      data[dataIdx + 1] = thresholdVal;
      data[dataIdx + 2] = thresholdVal;
    }
  }
}
