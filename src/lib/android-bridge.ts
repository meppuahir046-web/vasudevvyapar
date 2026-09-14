export type AndroidFilePayload = {
  base64: string;
  fileName: string;
  mimeType: string;
};

/**
 * Contract for the Android WebView JavaScript interface.
 * File data is raw base64 without a data: URL prefix so native code can decode it directly.
 */
export type AndroidBridge = {
  downloadFile?: (base64: string, fileName: string, mimeType: string) => void | boolean;
  shareFile?: (
    base64: string,
    fileName: string,
    mimeType: string,
    title?: string,
    text?: string,
  ) => void | boolean;
  shareWhatsApp?: (
    base64: string,
    fileName: string,
    mimeType: string,
    phoneNumber?: string,
    message?: string,
  ) => void | boolean;
  printFile?: (base64: string, fileName: string, mimeType: string) => void | boolean;
};

declare global {
  interface Window {
    AndroidBridge?: AndroidBridge;
  }
}

function getBridge(): AndroidBridge | null {
  return typeof window !== "undefined" ? window.AndroidBridge ?? null : null;
}

function base64FromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file data"));
        return;
      }
      const separator = result.indexOf(",");
      if (separator < 0) {
        reject(new Error("Unable to convert file data"));
        return;
      }
      resolve(result.slice(separator + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file data"));
    reader.readAsDataURL(blob);
  });
}

export async function blobToAndroidPayload(blob: Blob, fileName: string): Promise<AndroidFilePayload> {
  return { base64: await base64FromBlob(blob), fileName, mimeType: blob.type || "application/octet-stream" };
}

function invoke(
  method: ((...args: string[]) => void | boolean) | undefined,
  args: string[],
): boolean {
  if (!method) return false;
  const result = method(...args);
  if (result === false) throw new Error("Android bridge rejected the file operation");
  return true;
}

export function androidBridgeAvailable(method: keyof AndroidBridge): boolean {
  return Boolean(getBridge()?.[method]);
}

export function sendFileToAndroid(
  action: "downloadFile" | "shareFile" | "shareWhatsApp" | "printFile",
  payload: AndroidFilePayload,
  options: { title?: string; text?: string; phoneNumber?: string } = {},
): boolean {
  const bridge = getBridge();
  if (!bridge) return false;

  if (typeof bridge[action] !== "function") {
    throw new Error(`Android bridge method ${action} is unavailable`);
  }

  const args = [payload.base64, payload.fileName, payload.mimeType];
  if (action === "shareFile") args.push(options.title ?? payload.fileName, options.text ?? "");
  if (action === "shareWhatsApp") args.push(options.phoneNumber ?? "", options.text ?? "");
  return invoke(bridge[action] as ((...args: string[]) => void | boolean) | undefined, args);
}