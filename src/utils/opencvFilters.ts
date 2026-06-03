import { Point } from '@/types';

// Helper to sort points in order: Top-Left, Top-Right, Bottom-Right, Bottom-Left
export function orderPoints(pts: Point[]): [Point, Point, Point, Point] {
  if (pts.length !== 4) {
    throw new Error('Must provide exactly 4 points to sort');
  }

  // Sort by x coordinate
  const sortedByX = [...pts].sort((a, b) => a.x - b.x);
  
  // Left points are the first two, right points are the last two
  const leftPoints = sortedByX.slice(0, 2);
  const rightPoints = sortedByX.slice(2, 4);

  // Among left points, top-left is the one with smaller y, bottom-left has larger y
  const [tl, bl] = leftPoints.sort((a, b) => a.y - b.y);
  
  // Among right points, top-right has smaller y, bottom-right has larger y
  const [tr, br] = rightPoints.sort((a, b) => a.y - b.y);

  return [tl, tr, br, bl];
}

// Check distance between two points
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Detects the 4 corner points of a document in an image.
 * Uses Canny edge detection and contour approximation.
 */
export function detectDocumentCorners(cv: any, srcCanvas: HTMLCanvasElement): [Point, Point, Point, Point] {
  const width = srcCanvas.width;
  const height = srcCanvas.height;

  // Default points in case edge detection fails (10% border inset)
  const defaultPoints: [Point, Point, Point, Point] = [
    { x: width * 0.1, y: height * 0.1 },
    { x: width * 0.9, y: height * 0.1 },
    { x: width * 0.9, y: height * 0.9 },
    { x: width * 0.1, y: height * 0.9 }
  ];

  let src = cv.imread(srcCanvas);
  let gray = new cv.Mat();
  let blurred = new cv.Mat();
  let edged = new cv.Mat();
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();

  try {
    // 1. Grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 2. Gaussian Blur to reduce noise
    const ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0, 0);

    // 3. Canny Edge Detection
    cv.Canny(blurred, edged, 75, 200, 3, false);

    // 4. Find Contours
    cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // 5. Sort contours by area to only inspect the top ones and avoid processing thousands of tiny noisy shapes
    const contourList = [];
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      contourList.push({ area, contour });
    }

    // Sort descending by area
    contourList.sort((a, b) => b.area - a.area);

    let maxArea = 0;
    let approx = new cv.Mat();
    let docContour: any = null;

    // Only process the top 15 largest contours
    const searchLimit = Math.min(contourList.length, 15);
    for (let i = 0; i < searchLimit; ++i) {
      const { area, contour } = contourList[i];

      // We only consider contours larger than 5% of the total image area
      if (area > (width * height * 0.05)) {
        const peri = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);

        // If the approximated contour has 4 points and is larger than previous, save it
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          if (docContour) docContour.delete();
          docContour = approx.clone();
        }
      }
    }

    // Crucial: Clean up ALL contours in the temporary list!
    for (let i = 0; i < contourList.length; ++i) {
      contourList[i].contour.delete();
    }

    if (docContour) {
      // Extract the 4 points
      const points: Point[] = [];
      for (let i = 0; i < 4; i++) {
        points.push({
          x: docContour.data32S[i * 2],
          y: docContour.data32S[i * 2 + 1]
        });
      }
      docContour.delete();
      approx.delete();
      
      // Return ordered points: [TL, TR, BR, BL]
      return orderPoints(points);
    } else {
      // If approx was allocated but no contour met requirements, delete it to prevent leak
      approx.delete();
    }
  } catch (error) {
    console.error('Error in corner detection, falling back to default:', error);
  } finally {
    // Crucial memory cleanups!
    src.delete();
    gray.delete();
    blurred.delete();
    edged.delete();
    contours.delete();
    hierarchy.delete();
  }

  return defaultPoints;
}

/**
 * Warps the document perspective using 4 selected corner points.
 */
export function warpPerspective(
  cv: any,
  srcCanvas: HTMLCanvasElement,
  corners: [Point, Point, Point, Point]
): HTMLCanvasElement {
  const src = cv.imread(srcCanvas);

  const [tl, tr, br, bl] = corners;

  // Calculate widths and heights to find the max dimensions of the warped image
  const widthA = distance(br, bl);
  const widthB = distance(tr, tl);
  const maxWidth = Math.max(widthA, widthB);

  const heightA = distance(tr, br);
  const heightB = distance(tl, bl);
  const maxHeight = Math.max(heightA, heightB);

  // Create destination Mat
  const dst = new cv.Mat();
  
  // Set up source coordinates from corners
  const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y
  ]);

  // Set up destination coordinates to warp to
  const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    maxWidth - 1, 0,
    maxWidth - 1, maxHeight - 1,
    0, maxHeight - 1
  ]);

  // Perspective transform matrix
  const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
  const dsize = new cv.Size(maxWidth, maxHeight);

  try {
    // Warp the image
    cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // Write back to a new canvas
    const destCanvas = document.createElement('canvas');
    destCanvas.width = maxWidth;
    destCanvas.height = maxHeight;
    cv.imshow(destCanvas, dst);
    
    return destCanvas;
  } finally {
    // Crucial memory cleanups!
    src.delete();
    dst.delete();
    srcCoords.delete();
    dstCoords.delete();
    M.delete();
  }
}
