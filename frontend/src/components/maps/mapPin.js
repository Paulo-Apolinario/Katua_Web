import L from "leaflet";
import "./mapPin.css";

// Only fixed SVG paths and palettes are rendered here; names go in text nodes.
const symbols = {
  GENERATOR: '<path d="M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 8h.01M15 8h.01M9 12h.01M15 12h.01M3 21h18"/>',
  PEV: '<path d="m8 5 4-2 4 2M12 3v5m7 2 3 4-2 4m2-4h-5M6 10l-4 4 2 4m-2-4h5M7 21h10M7 21l2-4m-2 4 2 1m8-1-2-4"/>',
  BASE: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
  DEVICE: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
};
export function mapPin(kind = "GENERATOR") {
  const type = Object.hasOwn(symbols, kind) ? kind : "GENERATOR";
  return L.divIcon({
    className: "katua-map-pin katua-map-pin--" + type.toLowerCase(),
    html: `<svg viewBox="0 0 40 50" aria-hidden="true"><path class="katua-pin-body" d="M20 48C17 43 3 30 3 20a17 17 0 1 1 34 0c0 10-14 23-17 28Z"/><circle cx="20" cy="20" r="12" fill="white"/><g transform="translate(10 10) scale(.8333)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${symbols[type]}</g></svg>`,
    iconSize: [40, 50],
    iconAnchor: [20, 48],
    popupAnchor: [0, -43],
  });
}

export function hasCoordinates(p) {
  return p?.latitude !== "" && p?.longitude !== "" &&
    p?.latitude != null && p?.longitude != null &&
    Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) &&
    Math.abs(Number(p.latitude)) <= 90 && Math.abs(Number(p.longitude)) <= 180;
}
