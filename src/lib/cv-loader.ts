'use client';

let opencvLoadingPromise: Promise<any> | null = null;

const isOpenCVReady = (cv: any) => Boolean(cv && cv.Mat && cv.imread && cv.imshow);

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
    let settled = false;
    let runtimeTimeout: ReturnType<typeof setTimeout> | null = null;
    let runtimePoll: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (runtimeTimeout) clearTimeout(runtimeTimeout);
      if (runtimePoll) clearInterval(runtimePoll);
    };

    const finish = () => {
      if (settled) return true;

      const cv = (window as any).cv;
      if (!isOpenCVReady(cv)) return false;

      settled = true;
      cleanup();
      console.log('OpenCV.js Runtime fully initialized.');
      resolve(cv);
      return true;
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      opencvLoadingPromise = null;
      reject(new Error(message));
    };

    const waitForRuntime = (label: string) => {
      const cv = (window as any).cv;

      if (finish()) return;

      if (cv && typeof cv.then === 'function') {
        cv.then((readyCV: any) => {
          (window as any).cv = readyCV;
          finish();
        }).catch(() => fail(`Failed to initialize OpenCV.js from ${label}`));
      } else if (cv && typeof cv === 'object') {
        const previousRuntimeInitialized = cv.onRuntimeInitialized;
        cv.onRuntimeInitialized = () => {
          if (typeof previousRuntimeInitialized === 'function') {
            previousRuntimeInitialized();
          }
          finish();
        };
      }

      runtimePoll = setInterval(() => {
        finish();
      }, 50);

      runtimeTimeout = setTimeout(() => {
        fail(`Timed out while initializing OpenCV.js from ${label}`);
      }, 15000);
    };

    const script = document.createElement('script');
    script.src = '/opencv.js';
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      console.log('OpenCV.js script injected and loaded from local path.');
      waitForRuntime('local script');
    };

    script.onerror = (err) => {
      console.warn('Failed to load local OpenCV.js script. Trying CDN fallback...', err);
      
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.3/dist/opencv.js';
      fallbackScript.async = true;
      fallbackScript.type = 'text/javascript';

      fallbackScript.onload = () => {
        console.log('OpenCV.js script injected and loaded from CDN fallback.');
        waitForRuntime('CDN fallback');
      };

      fallbackScript.onerror = (cdnErr) => {
        console.error('Failed to load OpenCV.js script from CDN fallback:', cdnErr);
        fail('Failed to load OpenCV.js script from local and CDN');
      };

      document.body.appendChild(fallbackScript);
    };

    document.body.appendChild(script);
  });

  return opencvLoadingPromise;
}
