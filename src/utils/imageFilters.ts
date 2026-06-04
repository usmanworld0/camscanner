import { ScanMode } from '@/types';

/**
 * Applies a selected filter mode to a source canvas and outputs it as a base64 string.
 * Supports utilizing OpenCV.js when loaded to achieve high-fidelity enhancement.
 */
export function applyImageFilter(
  srcCanvas: HTMLCanvasElement,
  mode: ScanMode,
  cv?: any
): string {
  // If OpenCV is available, run high-fidelity filters
  if (cv && cv.Mat) {
    try {
      const filteredDataUrl = applyOpenCVFilter(srcCanvas, mode, cv);
      if (filteredDataUrl) return filteredDataUrl;
    } catch (e) {
      console.error("OpenCV filter pipeline failed, falling back to pure JS:", e);
    }
  }

  // Fallback to custom pure JavaScript pixel filters
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
    case 'grayscale':
      applyGrayscale(data);
      break;

    case 'bw':
      // Adaptive Thresholding (B&W document mode) to remove shadows and keep crisp text
      // We use a dynamic radius based on size to avoid breaking strokes on high-resolution scans
      const dynamicRadius = Math.max(15, Math.floor(Math.min(w, h) / 30));
      applyAdaptiveThreshold(data, w, h, dynamicRadius, 8);
      break;

    case 'enhanced':
      // Sharpen and stretch contrast
      applyContrastBrightness(data, 1.25, 5);
      applySharpen(data, w, h, 0.4);
      break;

    case 'denoise':
      applyDenoise(data, w, h);
      applyContrastBrightness(data, 1.08, 3);
      break;

    case 'sharpen':
      applyContrastBrightness(data, 1.12, 2);
      applySharpen(data, w, h, 0.75);
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
 * High-fidelity filters utilizing OpenCV.js
 */
function applyOpenCVFilter(srcCanvas: HTMLCanvasElement, mode: ScanMode, cv: any): string | null {
  let src = cv.imread(srcCanvas);
  let dst = new cv.Mat();

  try {
    switch (mode) {
      case 'original':
        src.delete();
        dst.delete();
        return srcCanvas.toDataURL('image/jpeg', 0.9);

      case 'grayscale': {
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        break;
      }

      case 'bw': {
        // High quality Adaptive Gaussian Thresholding
        let gray = new cv.Mat();
        let blurred = new cv.Mat();
        try {
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          // Small Gaussian Blur to reduce noise
          cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0);
          
          // Compute block size dynamically based on image resolution (must be odd)
          let blockSize = Math.floor(Math.min(src.cols, src.rows) / 20);
          if (blockSize % 2 === 0) blockSize += 1;
          if (blockSize < 3) blockSize = 3;
          
          cv.adaptiveThreshold(
            blurred,
            dst,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            blockSize,
            8 // Constant offset
          );
        } finally {
          gray.delete();
          blurred.delete();
        }
        break;
      }

      case 'denoise': {
        let denoised = new cv.Mat();
        try {
          cv.medianBlur(src, denoised, 3);
          cv.convertScaleAbs(denoised, dst, 1.08, 3);
        } finally {
          denoised.delete();
        }
        break;
      }

      case 'sharpen': {
        let blurred = new cv.Mat();
        try {
          cv.GaussianBlur(src, blurred, new cv.Size(0, 0), 1.1);
          cv.addWeighted(src, 1.8, blurred, -0.8, 0, dst);
        } finally {
          blurred.delete();
        }
        break;
      }

      case 'magic': {
        // Advanced background normalization (replicates professional document scanner filters)
        let gray = new cv.Mat();
        let background = new cv.Mat();
        let backgroundBlurred = new cv.Mat();
        let r = new cv.Mat();
        let g = new cv.Mat();
        let b = new cv.Mat();
        let a = new cv.Mat();
        let r_div = new cv.Mat();
        let g_div = new cv.Mat();
        let b_div = new cv.Mat();
        let channels = new cv.MatVector();
        let merged = new cv.MatVector();
        let rawResult = new cv.Mat();

        try {
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          
          // Large dynamic kernel size for morphological background estimation
          let kernelSize = Math.max(11, Math.floor(Math.min(src.cols, src.rows) / 30));
          if (kernelSize % 2 === 0) kernelSize += 1;
          
          let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize));
          cv.dilate(gray, background, kernel);
          kernel.delete();
          
          // Median blur to smooth out the background model
          cv.medianBlur(background, backgroundBlurred, kernelSize);
          
          // Split channels of original RGBA image
          cv.split(src, channels);
          r = channels.get(0);
          g = channels.get(1);
          b = channels.get(2);
          a = channels.get(3);
          
          // Re-normalize lighting by dividing original pixel values by the background model: (ch / bg) * 255
          cv.divide(r, backgroundBlurred, r_div, 255, cv.CV_8U);
          cv.divide(g, backgroundBlurred, g_div, 255, cv.CV_8U);
          cv.divide(b, backgroundBlurred, b_div, 255, cv.CV_8U);
          
          merged.push_back(r_div);
          merged.push_back(g_div);
          merged.push_back(b_div);
          merged.push_back(a);
          
          cv.merge(merged, rawResult);
          
          // Adjust contrast and slightly lower highlights to enhance text borders
          cv.convertScaleAbs(rawResult, dst, 1.15, -10);
        } finally {
          gray.delete();
          background.delete();
          backgroundBlurred.delete();
          r.delete();
          g.delete();
          b.delete();
          a.delete();
          r_div.delete();
          g_div.delete();
          b_div.delete();
          channels.delete();
          merged.delete();
          rawResult.delete();
        }
        break;
      }

      case 'enhanced': {
        // Unsharp masking (src * 1.5 - blur * 0.5) to sharpen details + contrast stretch
        let blurred = new cv.Mat();
        let sharpened = new cv.Mat();
        try {
          cv.GaussianBlur(src, blurred, new cv.Size(5, 5), 0);
          cv.addWeighted(src, 1.5, blurred, -0.5, 0, sharpened);
          cv.convertScaleAbs(sharpened, dst, 1.15, 5);
        } finally {
          blurred.delete();
          sharpened.delete();
        }
        break;
      }

      case 'highcontrast': {
        // Heavy Binarized using Otsu's optimal global thresholding
        let gray = new cv.Mat();
        let blurred = new cv.Mat();
        try {
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0);
          cv.threshold(blurred, dst, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        } finally {
          gray.delete();
          blurred.delete();
        }
        break;
      }

      default:
        src.delete();
        dst.delete();
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = srcCanvas.width;
    canvas.height = srcCanvas.height;
    cv.imshow(canvas, dst);
    return canvas.toDataURL('image/jpeg', 0.9);

  } finally {
    src.delete();
    dst.delete();
  }
}

/**
 * Grayscale conversion (Pure JS fallback)
 */
function applyGrayscale(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

/**
 * Contrast and Brightness adjustment (Pure JS fallback)
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
 * Small median filter for salt-and-pepper noise reduction (Pure JS fallback)
 */
function applyDenoise(data: Uint8ClampedArray, w: number, h: number) {
  const original = new Uint8ClampedArray(data);
  const values = new Array<number>(9);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        let n = 0;
        for (let yy = -1; yy <= 1; yy++) {
          for (let xx = -1; xx <= 1; xx++) {
            values[n] = original[((y + yy) * w + (x + xx)) * 4 + c];
            n += 1;
          }
        }
        values.sort((a, b) => a - b);
        data[idx + c] = values[4];
      }
    }
  }
}

/**
 * Saturation boost helper (Magic Color - Pure JS fallback)
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
 * High contrast binarization (Pure JS fallback)
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
 * Sharpen convolution filter (Pure JS fallback)
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
 * Adaptive Thresholding (using integral image technique for fast local averages - Pure JS fallback)
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
