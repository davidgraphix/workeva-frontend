import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges class names, letting a caller's utility win over a component default. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Asks the browser for the device's position.
 *
 * The coordinates go straight to the API, which decides whether they fall inside
 * a permitted work location. This function makes no such judgement - the client
 * is never the authority on whether someone is at the office.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

export class LocationError extends Error {
  constructor(
    message: string,
    readonly kind: "denied" | "unavailable" | "timeout" | "unsupported",
  ) {
    super(message);
    this.name = "LocationError";
  }
}

export function requestLocation(timeoutMs = 15_000): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        new LocationError(
          "This browser can't share your location. Try a different browser, or ask your administrator to turn off location checks.",
          "unsupported",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        }),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new LocationError(
                "Workeva needs your location to confirm you're at work. Allow location access in your browser settings and try again.",
                "denied",
              ),
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new LocationError(
                "We couldn't work out where you are. Move somewhere with a clearer signal and try again.",
                "unavailable",
              ),
            );
            break;
          default:
            reject(
              new LocationError(
                "Finding your location took too long. Check your signal and try again.",
                "timeout",
              ),
            );
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** Triggers a browser download for a blob the API returned. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
