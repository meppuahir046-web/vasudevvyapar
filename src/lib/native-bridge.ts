/**
 * Bridge to the Android WebView wrapper.
 *
 * The Android app injects `window.AndroidBridge` (see android/ integration files).
 * When it is absent (normal browsers) everything falls back to standard web APIs.
 */

export type AndroidBridge = {
  /** Save a base64 file into the device Downloads folder. */
  saveFile?: (base64: string, filename: string, mime: string) => void;
  /** Share a base64 file through the Android share sheet (or WhatsApp when target === "whatsapp"). */
  shareFile?: (
    base64: string,
    filename: string,
    mime: string,
    message: string,
    target: string,
    phone: string,
  ) => void;
  /** Print a base64 PDF using Android PrintManager. */
  printFile?: (base64: string, filename: string) => void;
  /** Open a WhatsApp chat (text only). */
  openWhatsApp?: (phone: string, message: string) => void;
};

export function androidBridge(): AndroidBridge | undefined {
  if (typeof window === "undefined") return undefined;
  const b = (window as unknown as { AndroidBridge?: AndroidBridge }).AndroidBridge;
  return b && typeof b === "object" ? b : undefined;
}

export function isAndroidApp(): boolean {
  return !!androidBridge();
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export const MIME = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;
