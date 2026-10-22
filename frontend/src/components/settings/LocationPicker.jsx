import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mapPin, hasCoordinates } from "../maps/mapPin";
export default function LocationPicker({ latitude, longitude, onChange, disabled = false }) {
  const root = useRef(null),
    map = useRef(null),
    marker = useRef(null),
    latest = useRef({ onChange, disabled });
  useEffect(() => {
    latest.current = { onChange, disabled };
  }, [onChange, disabled]);
  useEffect(() => {
    const m = L.map(root.current, { scrollWheelZoom: false }).setView(
      [-5.2, -39.5],
      6,
    );
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(m);
    m.on("click", (e) => { if (!latest.current.disabled) latest.current.onChange(e.latlng.lat, e.latlng.lng); });
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(root.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    if (marker.current) map.current.removeLayer(marker.current);
    if (hasCoordinates({ latitude, longitude })) {
      marker.current = L.marker([Number(latitude), Number(longitude)], {
        icon: mapPin("BASE"), title: "Sede da cooperativa", alt: "Sede da cooperativa", draggable: !disabled,
      }).addTo(map.current);
      marker.current.on("dragend", () => {
        const p = marker.current.getLatLng();
        if (!latest.current.disabled) latest.current.onChange(p.lat, p.lng);
      });
      map.current.setView([latitude, longitude], 14);
    }
  }, [latitude, longitude, disabled]);
  return (
    <div>
      <p className="small text-muted">
        Clique no mapa para posicionar a sede ou preencha as coordenadas abaixo.
        O mapa-base depende de conexão com OpenStreetMap.
      </p>
      <div
        ref={root}
        className="settings-map"
        aria-label="Localização da sede da cooperativa"
      />
    </div>
  );
}
