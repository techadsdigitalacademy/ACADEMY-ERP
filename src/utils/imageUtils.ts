/**
 * Image processing for Supabase Storage uploads.
 *
 * Everything bound for Storage is resized and re-encoded here first. A phone
 * camera's original JPEG is several megabytes, and every view of it is billed
 * egress, so nothing is uploaded at its source resolution.
 */

/** Longest edge kept for a payment slip -- ample to read a receipt. */
const SLIP_MAX_EDGE = 1600;

/**
 * Encode a canvas, preferring WebP.
 *
 * `toBlob` does not fail on an unsupported type, it silently falls back to PNG,
 * and a PNG of a photograph is several times larger than the JPEG it replaced.
 * So the encoded type is checked rather than assumed, and anything that is not
 * WebP is re-encoded as JPEG.
 */
export const encodeCanvasImage = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') {
          resolve(webp);
          return;
        }
        canvas.toBlob(
          (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('Failed to encode processed image'))),
          'image/jpeg',
          quality
        );
      },
      'image/webp',
      quality
    );
  });

/**
 * Extension matching a blob's real type, for the Storage object name.
 *
 * The encoder picks the format at runtime, so callers cannot hardcode `.jpg`
 * without risking a name that contradicts the bytes.
 */
export const extensionForBlob = (blob: Blob): string => {
  const subtype = (blob.type.split('/')[1] || '').toLowerCase();
  if (subtype === 'jpeg') return 'jpg';
  return subtype || 'bin';
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please upload a valid image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data'));
      img.onload = () => resolve(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return canvas;
};

/**
 * Processes an uploaded image file for profile avatar frame rendering:
 * 1. Resizes & center-crops any photo (landscape, portrait, irregular aspect ratios) into a 300x300 square canvas.
 * 2. Compresses the output into a lightweight, high-quality WebP (or JPEG) Blob for Storage upload.
 * 3. Prevents upload failures, memory crashes, and invisible images.
 */
export const processAvatarFile = async (file: File): Promise<Blob> => {
  const img = await loadImage(file);

  const size = 300; // 300x300 square avatar
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d')!;

  // Center-crop (Aspect Fill / Object Cover logic)
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  return encodeCanvasImage(canvas, 0.88);
};

/**
 * Resize and re-encode a payment slip before it is uploaded.
 *
 * Non-images pass through untouched -- the refund modal also accepts PDFs,
 * which cannot go through a canvas. The original is also kept when re-encoding
 * would make it bigger, which happens with small, already-optimised images.
 */
export const compressSlipFile = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith('image/')) return file;

  const img = await loadImage(file);
  const scale = Math.min(1, SLIP_MAX_EDGE / Math.max(img.width, img.height));

  const canvas = createCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

  const compressed = await encodeCanvasImage(canvas, 0.82);
  return compressed.size < file.size ? compressed : file;
};
