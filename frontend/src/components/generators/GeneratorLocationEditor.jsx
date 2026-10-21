import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { hasCoordinates, mapPin } from "../maps/mapPin";

export default function GeneratorLocationEditor({ latitude, longitude, onChange, disabled }) {
  const root = useRef(null), map = useRef(null), marker = useRef(null);
  const latest = useRef({ onChange, disabled });
  const [tileError, setTileError] = useState(false);
  useEffect(() => { latest.current = { onChange, disabled }; }, [onChange, disabled]);
  useEffect(() => {
    const m = L.map(root.current, { scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false })
      .setView([-3.7319, -38.5267], 12);
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 })
      .addTo(m).on("tileerror", () => setTileError(true));
    m.on("click", ({ latlng }) => {
      if (!latest.current.disabled) latest.current.onChange(latlng.lat.toFixed(6), latlng.lng.toFixed(6));
    });
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(root.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; marker.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    if (marker.current) { marker.current.remove(); marker.current = null; }
    if (!hasCoordinates({ latitude, longitude })) return;
    const xy = [Number(latitude), Number(longitude)];
    const pin = L.marker(xy, { icon: mapPin(), draggable: !disabled, title: "Localização do gerador", alt: "Localização do gerador" }).addTo(map.current);
    pin.on("dragend", () => {
      const p = pin.getLatLng();
      if (!latest.current.disabled) latest.current.onChange(p.lat.toFixed(6), p.lng.toFixed(6));
    });
    marker.current = pin;
    if (!map.current.getBounds().contains(xy) || map.current.getZoom() < 15) map.current.setView(xy, 16);
  }, [latitude, longitude, disabled]);
  return <>
    <p className="small text-muted">Clique no endereço exato no mapa ou arraste o pino. Também é possível preencher as coordenadas abaixo. O ponto será gravado ao salvar as alterações do cadastro.</p>
    <div ref={root} className="generator-location-map" role="region" aria-label="Selecionar localização do gerador" />
    {tileError && <p role="status" className="small text-warning mt-2">Mapa-base indisponível. Tente novamente com conexão ou preencha as coordenadas conhecidas.</p>}
  </>;
}
