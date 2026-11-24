// photo.js: shrinks a picture the adult chooses to a small square JPEG (as a data URL) before it is sent.
// The server only accepts a JPEG data URL of about 45 KB or less (see validate_card in backend/utils/validators.py),
// so the photo is cropped to the centre square, scaled to 256 px and saved at the best quality that still fits.

const SIZE = 256;
const MAX_CHARS = 55000;                       // a little under the server's 60,000 limit
const MAX_FILE_BYTES = 15 * 1024 * 1024;       // refuse huge originals before decoding them

export async function shrinkPhoto(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Choose a picture file (JPG, PNG or WebP).");
  if (file.size > MAX_FILE_BYTES) throw new Error("That picture is very large. Choose one under 15 MB.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);    // also applies the phone's rotation
  } catch {
    throw new Error("That file could not be opened as a picture.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";                   // JPEG has no transparency; avoid black patches from PNGs
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  for (let quality = 0.85; quality >= 0.3; quality -= 0.1) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error("That picture is too detailed to shrink. Try a simpler one.");
}
