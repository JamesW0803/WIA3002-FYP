const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const loadHTMLImage = (blobURL) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = blobURL;
  });

export async function compressImage(file, opts = {}) {
  const {
    maxWidth = 1600, // max display dimension
    maxHeight = 1600,
    maxSizeKB = 450, // soft cap; we reduce quality down to minQuality to approach this
    initialQuality = 0.82,
    minQuality = 0.58,
    preferType = "image/webp", // will fall back to JPEG if unsupported
  } = opts;

  if (!file || !file.type?.startsWith("image/")) {
    return { file, wasCompressed: false, width: null, height: null };
  }

  // Heuristic: skip tiny files
  if (file.size / 1024 <= Math.min(220, maxSizeKB)) {
    return { file, wasCompressed: false, width: null, height: null };
  }

  // Load and honor EXIF orientation if possible
  let imgBitmap = null;
  let imgEl = null;
  try {
    if (window.createImageBitmap) {
      imgBitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    }
  } catch {
    imgBitmap = null;
  }

  let srcW, srcH;
  if (imgBitmap) {
    srcW = imgBitmap.width;
    srcH = imgBitmap.height;
  } else {
    // Fallback path
    const blobURL = URL.createObjectURL(file);
    try {
      imgEl = await loadHTMLImage(blobURL);
      srcW = imgEl.naturalWidth || imgEl.width;
      srcH = imgEl.naturalHeight || imgEl.height;
    } finally {
      URL.revokeObjectURL(blobURL);
    }
  }

  if (!srcW || !srcH) {
    return { file, wasCompressed: false, width: null, height: null };
  }

  // Compute target dimensions
  const scale = Math.min(1, maxWidth / srcW, maxHeight / srcH);
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  // If we aren't scaling down at all, we'll still try re-encoding to a more efficient format
  const canvas =
    "OffscreenCanvas" in window
      ? new OffscreenCanvas(dstW, dstH)
      : (() => {
          const c = document.createElement("canvas");
          c.width = dstW;
          c.height = dstH;
          return c;
        })();

  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.clearRect(0, 0, dstW, dstH);

  if (imgBitmap) {
    ctx.drawImage(imgBitmap, 0, 0, dstW, dstH);
    imgBitmap.close?.();
  } else {
    ctx.drawImage(imgEl, 0, 0, dstW, dstH);
  }

  // Try WebP first, then JPEG
  let outType = preferType;
  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, outType, quality);

  if (!blob) {
    outType = "image/jpeg";
    blob = await canvasToBlob(canvas, outType, quality);
  }

  // Reduce quality until under target or minQuality reached
  if (blob) {
    while (blob.size / 1024 > maxSizeKB && quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.08);
      const next = await canvasToBlob(canvas, outType, quality);
      if (!next) break;
      blob = next;
    }
  }

  // If somehow worse than original and we didn't scale, keep original
  if (!blob || (blob.size >= file.size && scale === 1)) {
    return { file, wasCompressed: false, width: dstW, height: dstH };
  }

  // Build a neat filename with the correct extension
  const base = (file.name || "image").replace(/\.[^.]+$/, "");
  const ext = outType === "image/webp" ? "webp" : "jpg";
  const newName = `${base}.${ext}`;

  const compressedFile = new File([blob], newName, {
    type: outType,
    lastModified: Date.now(),
  });
  return {
    file: compressedFile,
    wasCompressed: true,
    width: dstW,
    height: dstH,
  };
}
