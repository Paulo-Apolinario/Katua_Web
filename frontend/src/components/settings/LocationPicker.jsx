import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export default function LocationPicker({ latitude, longitude, onChange }) {
  const root = useRef(null),
    map = useRef(null),
    marker = useRef(null),
    latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const m = L.map(root.current, { scrollWheelZoom: false }).setView(
      [-5.2, -39.5],
      6,
    );
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(m);
    m.on("click", (e) => latest.current(e.latlng.lat, e.latlng.lng));
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
    if (
      latitude != null &&
      longitude != null &&
      Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude))
    ) {
      marker.current = L.circleMarker([latitude, longitude], {
        radius: 9,
        color: "#176944",
        fillOpacity: 0.8,
      }).addTo(map.current);
      map.current.setView([latitude, longitude], 14);
    }
  }, [latitude, longitude]);
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
