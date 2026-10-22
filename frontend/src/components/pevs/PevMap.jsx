import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { address, hasPosition, title } from "./pevUtils";
import { useHeadquarters } from "../maps/useHeadquarters";
import HeadquartersStatus from "../maps/HeadquartersStatus";
import { hasCoordinates, mapPin } from "../maps/mapPin";
const CENTER = [-3.7319, -38.5267];
const pin = (color) =>
  L.divIcon({
    className: "pev-map-icon",
    html: `<span style="background:${color}"></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  });
export default function PevMap({
  items = [],
  latitude,
  longitude,
  onPick,
  label = "Mapa de PEVs",
}) {
  const container = useRef(null),
    map = useRef(null),
    layer = useRef(null),
    callback = useRef(onPick);
  callback.current = onPick;
  const headquarters = useHeadquarters(!onPick);
  const baseMarker = useRef(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    const m = L.map(container.current, {
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView(CENTER, 12);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(m);
    tiles.on("tileerror", () => setTileError(true));
    m.on("click", (e) =>
      callback.current?.({
        latitude: e.latlng.lat.toFixed(6),
        longitude: e.latlng.lng.toFixed(6),
      }),
    );
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      m.stop();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    const m = map.current,
      g = layer.current;
    g.clearLayers();
    const editing = !!onPick;
    const points = editing
      ? hasPosition({ latitude, longitude })
        ? [
            {
              id: "selected",
              latitude,
              longitude,
              name: "Localização selecionada",
            },
          ]
        : []
      : items.filter(hasPosition);
    for (const b of points) {
      const marker = L.marker([Number(b.latitude), Number(b.longitude)], {
        icon: pin(
          editing
            ? "#126b48"
            : b.status !== "active"
              ? "#66766c"
              : b.needsPickup
                ? "#be7313"
                : "#126b48",
        ),
        draggable: editing,
        title: title(b),
        alt: title(b),
      }).addTo(g);
      const popup = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = title(b);
      popup.append(strong);
      popup.append(document.createElement("br"));
      const text = document.createElement("span");
      text.textContent = editing
        ? "Arraste o marcador para ajustar."
        : address(b);
      popup.append(text);
      if (!editing) {
        popup.append(document.createElement("br"));
        const a = document.createElement("a");
        a.href = `/bin-list/${encodeURIComponent(b.id)}`;
        a.textContent = "Abrir ficha do PEV";
        popup.append(a);
      }
      marker.bindPopup(popup);
      if (editing)
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          callback.current?.({
            latitude: p.lat.toFixed(6),
            longitude: p.lng.toFixed(6),
          });
        });
    }
    const bounds = points.map((b) => [Number(b.latitude), Number(b.longitude)]);
    baseMarker.current = null;
    if (!editing && hasCoordinates(headquarters.base)) {
      const b = headquarters.base;
      const xy = [Number(b.latitude), Number(b.longitude)];
      const text = document.createElement("strong"); text.textContent = "Sede: " + b.name;
      baseMarker.current = L.marker(xy, { icon: mapPin("BASE"), title: "Sede: " + b.name, alt: "Sede: " + b.name, zIndexOffset: 1000 }).addTo(g).bindPopup(text)
        .bindTooltip("Sede da cooperativa", { permanent: true, direction: "top", offset: [0, -40], className: "katua-hq-tooltip" });
      bounds.push(xy);
    }
    if (bounds.length === 1) m.setView(bounds[0], 15);
    else if (bounds.length > 1) m.fitBounds(bounds, { padding: [40, 45], maxZoom: 15 });
    else m.setView(CENTER, 12);
  }, [items, latitude, longitude, onPick, headquarters.base]);
  return (
    <div className="pev-map-wrap">
      {!onPick && <HeadquartersStatus {...headquarters} onLocate={() => {
        if (baseMarker.current) { map.current.setView(baseMarker.current.getLatLng(), 16); baseMarker.current.openPopup(); }
      }} />}
      <div
        ref={container}
        className="pev-map"
        role="region"
        aria-label={label}
      />
      {tileError && (
        <p className="small text-muted mt-2" role="status">
          O mapa-base está indisponível. As coordenadas e os marcadores
          continuam disponíveis; tente novamente com conexão.
        </p>
      )}
    </div>
  );
}
