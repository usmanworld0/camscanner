# Digital Image Processing Explanation

This document explains the digital image processing concepts used in this document scanner project. It covers the full scan pipeline, the data models, the main functions, the computer vision techniques, the filters, OCR, PDF export, and the quality metrics used by the app.

## Project Goal

The app works like a browser-based document scanner. A user uploads or captures a page image, adjusts the document corners, flattens the page, applies enhancement filters, optionally runs OCR, and exports the result as a PDF.

The main goals are:

- Detect or select the document boundary.
- Correct perspective distortion.
- Improve readability with image filters.
- Preserve scan pages in an editable session.
- Extract text using OCR.
- Export processed pages as a PDF.

## High-Level Pipeline

The scanner pipeline is:

1. Image acquisition
2. Image resizing and preparation
3. Corner detection or manual corner selection
4. Perspective correction or fallback crop
5. Image enhancement filters
6. Quality measurement
7. OCR text recognition
8. PDF export
9. Session/history storage

In code, the flow is split across:

- `src/components/UploadZone.tsx`
- `src/app/scanner/page.tsx`
- `src/app/editor/page.tsx`
- `src/utils/opencvFilters.ts`
- `src/utils/imageFilters.ts`
- `src/utils/scanMetrics.ts`
- `src/components/OCRPanel.tsx`
- `src/components/PDFExportButton.tsx`
- `src/store/ScanContext.tsx`
- `src/types/index.ts`

## Image Acquisition

Image acquisition means getting the input image into the app. The app accepts uploaded images or camera captures.

Supported file types are image files such as:

- JPG
- JPEG
- PNG
- WEBP

The upload component reads files using `FileReader` and converts them into base64 data URLs. A data URL stores the image content directly in a string, for example:

```text
data:image/jpeg;base64,...
```

This makes the image easy to store in React state, local storage, canvas, OCR, and PDF export functions.

## Image Resizing

Large camera images can be very expensive to process in the browser. The upload flow resizes images before storing them.

In `UploadZone.tsx`, `resizeImage`:

- Loads the uploaded data URL into an `HTMLImageElement`.
- Creates an offscreen canvas.
- Draws the image at a smaller scale if needed.
- Exports the resized result as JPEG.

Why resizing matters:

- Reduces memory usage.
- Speeds up OpenCV operations.
- Prevents browser freezes.
- Keeps PDF export manageable.

## Pixels, Canvas, And Image Data

Most browser image processing in this project uses `HTMLCanvasElement`.

A canvas lets the app:

- Draw an image.
- Read pixel values using `getImageData`.
- Modify pixel values.
- Write pixels back using `putImageData`.
- Export the result with `toDataURL`.

Pixel data is stored in RGBA order:

```text
[R, G, B, A, R, G, B, A, ...]
```

Each channel is usually an integer from `0` to `255`.

- `R`: red intensity
- `G`: green intensity
- `B`: blue intensity
- `A`: alpha or opacity

The app mainly modifies RGB channels and keeps alpha unchanged.

## Coordinate Systems

The app uses two coordinate systems for document corners.

### Normalized Coordinates

Normalized coordinates store points as values between `0` and `1`.

Example:

```ts
{ x: 0.15, y: 0.15 }
```

This means 15 percent from the left and 15 percent from the top.

Benefits:

- Works across responsive image sizes.
- Does not depend on the displayed pixel size.
- Easy to save in state.

### Absolute Pixel Coordinates

OpenCV and canvas operations need real pixel coordinates.

The editor converts normalized points into absolute pixels:

```ts
x = point.x * imageWidth
y = point.y * imageHeight
```

These absolute points are then used for perspective correction or fallback cropping.

## Data Models

The main data models are in `src/types/index.ts`.

### Point

```ts
export interface Point {
  x: number;
  y: number;
}
```

A `Point` represents a 2D coordinate. The app uses it for document corners.

### ScanMode

```ts
export type ScanMode =
  | 'original'
  | 'grayscale'
  | 'bw'
  | 'enhanced'
  | 'denoise'
  | 'sharpen'
  | 'magic'
  | 'highcontrast';
```

`ScanMode` controls which image filter is applied.

### ScanPage

```ts
export interface ScanPage {
  id: string;
  originalSrc: string;
  croppedSrc: string | null;
  processedSrc: string | null;
  filterMode: ScanMode;
  ocrText: string | null;
  ocrConfidence: number | null;
  points: [Point, Point, Point, Point] | null;
  rotation: number;
  sourceWidth: number | null;
  sourceHeight: number | null;
}
```

A `ScanPage` stores all information for one scanned page.

Important fields:

- `originalSrc`: the uploaded image.
- `croppedSrc`: the flattened or cropped document.
- `processedSrc`: the filtered final image.
- `filterMode`: the selected enhancement filter.
- `points`: four document corners in order: top-left, top-right, bottom-right, bottom-left.
- `ocrText`: extracted text.
- `ocrConfidence`: OCR confidence score.
- `sourceWidth` and `sourceHeight`: original image dimensions.

### ScanSession

```ts
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
```

A `ScanSession` stores saved scan history. It keeps the final processed image instead of every intermediate image to reduce storage size.

## State Management

The scanner state is managed in `src/store/ScanContext.tsx`.

It stores:

- Current pages
- Active page ID
- Saved scan history
- Undo stack
- Redo stack

Important functions:

- `addPage(originalSrc)`: creates a new scan page.
- `updatePage(id, updates)`: updates crop, filter, OCR, or dimensions.
- `removePage(id)`: deletes a page.
- `duplicatePage(id)`: copies a page.
- `movePage(id, direction)`: reorders pages.
- `saveCurrentSession(title)`: saves final pages to history.
- `loadSession(session)`: restores a saved session.
- `clearSession()`: clears all active scan pages.
- `undo()` and `redo()`: restore previous page states.

## Document Boundary Detection

Document boundary detection tries to find the four corners of the paper automatically.

The code is in `src/utils/opencvFilters.ts`, mainly `detectDocumentCorners`.

The process is:

1. Convert the image to grayscale.
2. Apply Gaussian blur.
3. Run Canny edge detection.
4. Find contours.
5. Sort contours by area.
6. Approximate contours into polygons.
7. Pick the largest four-point contour.
8. Order the points as top-left, top-right, bottom-right, bottom-left.

### Grayscale Conversion

Grayscale reduces RGB color into one brightness channel.

Common formula:

```text
gray = 0.299R + 0.587G + 0.114B
```

This keeps human-perceived brightness more accurate than a simple average.

Why grayscale is useful:

- Reduces complexity.
- Makes edge detection easier.
- Removes color information that is not needed for shape detection.

### Gaussian Blur

Gaussian blur smooths small noise before edge detection.

Why it is used:

- Reduces tiny false edges.
- Makes contours cleaner.
- Improves Canny edge detection.

In OpenCV:

```ts
cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0);
```

### Canny Edge Detection

Canny detects strong intensity changes in an image.

It is useful for document scanning because paper borders usually create visible edges.

The steps behind Canny are:

- Noise reduction
- Gradient calculation
- Non-maximum suppression
- Double thresholding
- Edge tracking by hysteresis

In the app:

```ts
cv.Canny(blurred, edged, 75, 200, 3, false);
```

### Contours

A contour is a curve joining continuous boundary points.

The app calls:

```ts
cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
```

Contours help locate large rectangular objects such as pages.

### Polygon Approximation

Contour approximation simplifies a contour into fewer points.

The app uses:

```ts
cv.approxPolyDP(contour, approx, 0.02 * peri, true);
```

If the approximated contour has exactly four points, it may be a document.

## Point Ordering

The perspective transform requires points in this order:

```text
top-left, top-right, bottom-right, bottom-left
```

The `orderPoints` function:

- Sorts points by x coordinate.
- Splits them into left and right groups.
- Sorts each group by y coordinate.
- Returns corners in a consistent order.

This matters because incorrect ordering can flip or twist the final image.

## Manual Crop Overlay

The crop overlay lets users manually adjust the four corners.

The component is `src/components/CropOverlay.tsx`.

It:

- Displays the original image.
- Places draggable handles at each corner.
- Converts pointer positions to normalized coordinates.
- Draws a polygon overlay.
- Shows a dark mask outside the selected document area.

Manual correction is important because automatic detection may fail when:

- The background is similar to the paper.
- The page has shadows.
- The document is partly outside the image.
- The image has clutter.
- Edges are blurry.

## Perspective Correction

Perspective correction transforms a tilted document into a flat rectangle.

The function is `warpPerspective` in `src/utils/opencvFilters.ts`.

It uses four source points:

```text
top-left, top-right, bottom-right, bottom-left
```

And maps them to a rectangular destination:

```text
(0, 0)
(width - 1, 0)
(width - 1, height - 1)
(0, height - 1)
```

OpenCV computes a homography matrix:

```ts
const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
```

Then applies it:

```ts
cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
```

### Homography

A homography is a 3x3 transformation matrix that maps one plane to another.

For document scanning, the paper is treated like a flat plane. A homography can correct the camera angle and make the document appear front-facing.

## Fast Crop Fallback

The editor also has a fallback crop path.

If OpenCV is not ready or a warp operation fails, the app uses a canvas crop based on the bounding rectangle of the selected points.

This is less geometrically accurate than perspective correction, but it is fast and prevents the app from hanging.

The fallback is useful because browser-based OpenCV can be heavy, especially on large mobile photos.

## Downscaled Warp Input

Large images can freeze the browser during synchronous OpenCV operations. To avoid this, the editor creates a smaller temporary canvas for perspective correction when needed.

The concept is:

1. Measure total pixels.
2. If the image is too large, calculate a scale factor.
3. Draw the source image into a smaller canvas.
4. Scale the corner points by the same factor.
5. Run the warp on the smaller canvas.

This keeps the UI responsive while preserving the intended crop shape.

## Image Enhancement Filters

Filters are implemented in `src/utils/imageFilters.ts`.

The main function is:

```ts
applyImageFilter(srcCanvas, mode, cv?)
```

It supports two processing paths:

- OpenCV path when a ready OpenCV object is provided.
- Pure JavaScript canvas fallback when OpenCV is unavailable.

The filter output is exported as a JPEG data URL.

## Filter Modes

The app supports these modes:

| Mode | Label | Purpose |
| --- | --- | --- |
| `original` | Original | Keep the flattened crop unchanged. |
| `grayscale` | Grayscale | Remove color and keep luminance. |
| `bw` | Adaptive Binarization | Make text black and background white using local thresholds. |
| `enhanced` | Contrast Stretch | Improve brightness and contrast. |
| `denoise` | Noise Reduction | Reduce small pixel noise. |
| `sharpen` | Unsharp Mask | Strengthen edges and text strokes. |
| `magic` | Color Normalize | Normalize lighting while keeping color. |
| `highcontrast` | Otsu Threshold | Use global thresholding for strong black-white output. |

## Original Filter

The original mode returns the cropped page without enhancement.

Use it when:

- The photo is already clear.
- Color accuracy matters.
- Filters make the document worse.

## Grayscale Filter

The grayscale filter converts the image into shades of gray.

Pure JavaScript implementation:

```ts
gray = 0.299 * R + 0.587 * G + 0.114 * B
```

Benefits:

- Reduces visual distraction.
- Often improves OCR.
- Makes later thresholding easier.

## Adaptive Binarization

Adaptive binarization converts pixels to either black or white using local brightness.

Unlike a global threshold, adaptive thresholding calculates a threshold for each neighborhood.

This helps with:

- Shadows
- Uneven lighting
- Curved pages
- Faint text

In the pure JavaScript fallback, the app uses an integral image to compute local averages efficiently.

### Integral Image

An integral image stores cumulative sums. It lets the app calculate the sum of any rectangular region quickly.

Without an integral image, local thresholding can be slow because each pixel needs to inspect many neighboring pixels.

With an integral image:

- Region sum lookup is constant time.
- Adaptive thresholding becomes much faster.

## Contrast And Brightness

The app adjusts contrast and brightness with:

```text
newValue = (oldValue - 128) * contrast + 128 + brightness
```

Contrast changes the difference between dark and light pixels.

Brightness shifts all pixels lighter or darker.

Values are clamped to stay between `0` and `255`.

## Sharpening

Sharpening emphasizes edges.

The pure JavaScript path uses a Laplacian-style kernel:

```text
center * 5 - top - bottom - left - right
```

This makes text strokes and borders clearer.

The app blends the sharpened value with the original using a strength factor so the result is not too harsh.

## Denoising

Denoising reduces small visual noise.

The pure JavaScript fallback uses a median filter over a 3x3 neighborhood.

Median filtering:

- Collects neighboring pixel values.
- Sorts them.
- Uses the middle value.

This is good for salt-and-pepper noise because extreme bright or dark pixels are ignored.

## Magic Color / Color Normalize

The JavaScript `magic` filter:

- Increases contrast.
- Increases brightness.
- Boosts saturation.
- Applies light sharpening.

The OpenCV `magic` path is more advanced:

- Converts to grayscale.
- Estimates background using dilation and median blur.
- Divides color channels by the estimated background.
- Merges channels back together.
- Applies contrast correction.

This helps remove uneven lighting while preserving color.

## High Contrast / Otsu Threshold

The high contrast mode aims for strong black text on a white background.

The OpenCV path uses Otsu thresholding:

```ts
cv.threshold(blurred, dst, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
```

Otsu's method automatically chooses a global threshold by separating the image into foreground and background classes.

Use it when:

- Text is dark and background is light.
- The lighting is fairly even.
- You want a very crisp black-white scan.

Avoid it when:

- The page has photos or color diagrams.
- Lighting is uneven.
- Text is faint.

## OCR

OCR means Optical Character Recognition. It converts image text into editable text.

The app uses Tesseract.js in `src/components/OCRPanel.tsx`.

The OCR flow:

1. User clicks "Extract Text".
2. Tesseract loads the English model.
3. The current processed image is analyzed.
4. Extracted text and confidence are returned.
5. The app stores them on the active `ScanPage`.

OCR result fields:

- `ocrText`: recognized text.
- `ocrConfidence`: estimated recognition confidence.

Tips for better OCR:

- Use adaptive binarization for text-heavy pages.
- Use contrast stretch for low-contrast scans.
- Avoid over-sharpening noisy images.
- Crop out background clutter.
- Keep text upright and flat.

## PDF Export

PDF export is implemented in two paths:

- Browser-side export using `jsPDF`.
- Server-side export using `pdf-lib`.

The component is `src/components/PDFExportButton.tsx`.

The API route is `src/app/api/pdf/route.ts`.

### Browser Export

Browser export:

- Converts each page image into a JPEG canvas.
- Creates a `jsPDF` document.
- Adds one PDF page per scan page.
- Matches the PDF page size to the image size.
- Downloads the file.

### Server Export

Server export:

- Sends base64 images to `/api/pdf`.
- Creates a `PDFDocument`.
- Embeds each image.
- Draws each image to a matching page size.
- Returns a PDF response.

## Quality Metrics

Quality metrics are in `src/utils/scanMetrics.ts`.

They help the UI describe the current scan quality.

### Resolution

`formatResolution(page)` returns:

```text
width x height px
```

This tells users how much pixel detail the source image contains.

### Megapixels

`getMegapixels(page)` calculates:

```text
(width * height) / 1,000,000
```

Higher megapixels usually mean more detail, but only if the image is sharp.

### Crop Coverage

`getCropCoverage(points)` estimates what percentage of the image is inside the selected quadrilateral.

It uses the shoelace formula to calculate polygon area.

This helps detect whether the selected crop is too small.

### Skew Angle

`getSkewDegrees(points)` estimates page skew based on the top and bottom edges.

It uses:

```ts
Math.atan2(deltaY, deltaX)
```

The result is converted from radians to degrees.

### Quality Status

`getQualityStatus(page)` returns:

- `Good capture`
- `Usable capture`
- `Low detail`

It considers:

- Megapixels
- Crop coverage

## Important Functions Summary

### Upload And Input

| Function | File | Purpose |
| --- | --- | --- |
| `resizeImage` | `UploadZone.tsx` | Reduces large image dimensions before processing. |
| `processFile` | `UploadZone.tsx` | Reads and prepares one uploaded image. |
| `processFiles` | `UploadZone.tsx` | Handles multiple uploaded images. |

### Detection And Geometry

| Function | File | Purpose |
| --- | --- | --- |
| `detectDocumentCorners` | `opencvFilters.ts` | Finds document boundary automatically. |
| `orderPoints` | `opencvFilters.ts` | Orders corners consistently. |
| `warpPerspective` | `opencvFilters.ts` | Corrects perspective using OpenCV. |
| `cropCanvasToSelection` | `editor/page.tsx` | Fast fallback crop using canvas. |
| `createWarpInput` | `editor/page.tsx` | Downscales large images before OpenCV warp. |

### Filtering

| Function | File | Purpose |
| --- | --- | --- |
| `applyImageFilter` | `imageFilters.ts` | Main filter entry point. |
| `applyOpenCVFilter` | `imageFilters.ts` | OpenCV-based filters. |
| `applyGrayscale` | `imageFilters.ts` | Converts RGB to grayscale. |
| `applyAdaptiveThreshold` | `imageFilters.ts` | Local black-white thresholding. |
| `applyContrastBrightness` | `imageFilters.ts` | Adjusts contrast and brightness. |
| `applyDenoise` | `imageFilters.ts` | Median denoise filter. |
| `applySharpen` | `imageFilters.ts` | Edge sharpening filter. |
| `applyMagicColor` | `imageFilters.ts` | Color normalization fallback. |
| `applyHighContrastBinarization` | `imageFilters.ts` | Simple black-white threshold. |

### State And Sessions

| Function | File | Purpose |
| --- | --- | --- |
| `addPage` | `ScanContext.tsx` | Adds a new scan page. |
| `updatePage` | `ScanContext.tsx` | Updates page processing data. |
| `saveCurrentSession` | `ScanContext.tsx` | Saves final pages to history. |
| `loadSession` | `ScanContext.tsx` | Restores a saved scan. |
| `undo` / `redo` | `ScanContext.tsx` | Restores previous edit states. |

### Export And OCR

| Function | File | Purpose |
| --- | --- | --- |
| `runOCR` | `OCRPanel.tsx` | Runs Tesseract text recognition. |
| `loadImageForPdf` | `PDFExportButton.tsx` | Converts a page image into PDF-ready JPEG data. |
| `preparePdfImages` | `PDFExportButton.tsx` | Prepares all pages for PDF export. |
| `exportClientSide` | `PDFExportButton.tsx` | Generates PDF in the browser. |
| `exportBackendSide` | `PDFExportButton.tsx` | Generates PDF through the API route. |
| `POST` | `api/pdf/route.ts` | Server PDF generation endpoint. |

## Why Fallbacks Are Needed

Browser-based image processing can fail or become slow because:

- Images may be large.
- OpenCV.js may still be loading.
- Some devices have limited memory.
- Canvas operations are synchronous.
- OCR and filters can be CPU-heavy.

The app uses fallbacks to keep the workflow usable:

- Default crop points if detection fails.
- Manual corner adjustment.
- Canvas crop if OpenCV warp is unavailable.
- JavaScript filters if OpenCV filters fail.
- Browser PDF export with server fallback.

## Performance Notes

Important performance choices:

- Resize uploaded images before processing.
- Downscale temporary OpenCV warp inputs.
- Avoid running heavy filters during crop confirmation.
- Store final processed images in history instead of all intermediates.
- Use base64 data URLs for portability.

Potential future improvements:

- Move heavy filters to a Web Worker.
- Use OffscreenCanvas where supported.
- Add background OCR queueing.
- Add page-level compression controls.
- Add a separate high-quality export mode.

## Common DIP Terms Used In This Project

| Term | Meaning |
| --- | --- |
| Pixel | The smallest image unit with color values. |
| RGB | Red, green, and blue color channels. |
| Alpha | Opacity channel. |
| Grayscale | Image represented by brightness only. |
| Thresholding | Converting pixels into classes such as black or white. |
| Adaptive thresholding | Thresholding based on local neighborhoods. |
| Otsu thresholding | Automatic global threshold selection. |
| Blur | Smoothing operation that reduces noise. |
| Gaussian blur | Weighted smoothing based on a Gaussian distribution. |
| Edge detection | Finding strong brightness changes. |
| Canny | A common multi-step edge detection algorithm. |
| Contour | A connected boundary curve. |
| Homography | Matrix that maps one plane perspective to another. |
| Perspective warp | Transforming a tilted image into a flat view. |
| Denoising | Removing unwanted noise. |
| Sharpening | Enhancing edges and details. |
| OCR | Converting image text into editable text. |

## Best Filter Choices

Use these rules of thumb:

- Clean color document: `original` or `magic`
- Text with shadows: `bw`
- Faint printed text: `enhanced` or `sharpen`
- Noisy camera capture: `denoise`
- Black text on white paper: `highcontrast`
- OCR preparation: `bw`, `enhanced`, or `grayscale`

## End-To-End Example

An example page goes through this path:

1. User uploads a photo.
2. `UploadZone` resizes it and stores it as `originalSrc`.
3. `ScannerPage` tries to detect document corners.
4. The user adjusts corners in `CropOverlay`.
5. `EditorPage` locks the crop.
6. OpenCV perspective correction runs if ready, otherwise canvas crop fallback runs.
7. The user applies a filter through `FilterToolbar`.
8. `applyImageFilter` creates `processedSrc`.
9. `OCRPanel` can extract text from `processedSrc`.
10. `PDFExportButton` exports all pages.
11. `ScanContext` can save the session to local history.

## Summary

This project combines practical document-scanning techniques with browser-based image processing:

- OpenCV.js handles document detection and perspective correction.
- Canvas pixel processing provides reliable filter fallbacks.
- React state models each page as a scan object.
- Tesseract.js extracts text from processed images.
- jsPDF and pdf-lib compile final pages into a PDF.

The most important DIP concepts in this app are grayscale conversion, blur, edge detection, contours, perspective transform, thresholding, denoising, sharpening, OCR preparation, and image export.
