'use client';

let opencvLoadingPromise: Promise<any> | null = null;

export function loadOpenCV(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV.js can only be loaded in the browser'));
  }

  // If already loaded, return window.cv
  if ((window as any).cv && (window as any).cv.Mat) {
    return Promise.resolve((window as any).cv);
  }

  if (opencvLoadingPromise) {
    return opencvLoadingPromise;
  }

  opencvLoadingPromise = new Promise((resolve, reject) => {
    // Set up standard onRuntimeInitialized callback
    (window as any).Module = {
      onRuntimeInitialized: () => {
        console.log('OpenCV.js Runtime fully initialized.');
        resolve((window as any).cv);
      },
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0/dist/opencv.js';
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      console.log('OpenCV.js script injected and loaded.');
      // Sometimes OpenCV initializes immediately, check if it's already there
      if ((window as any).cv && (window as any).cv.Mat) {
        resolve((window as any).cv);
      }
    };

    script.onerror = (err) => {
      console.error('Failed to load OpenCV.js script:', err);
      opencvLoadingPromise = null;
      reject(new Error('Failed to load OpenCV.js script'));
    };

    document.body.appendChild(script);
  });

  return opencvLoadingPromise;
}
