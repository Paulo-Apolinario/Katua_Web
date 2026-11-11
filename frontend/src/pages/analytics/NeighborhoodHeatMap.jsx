import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { heatColor } from "../../services/participationAnalytics";
import "leaflet/dist/leaflet.css";
export default function NeighborhoodHeatMap({ items, metric }) {
  const el = useRef(null),
    [tileError, setTileError] = useState(false);
  const valid = useMemo(
    () =>
      items.filter(
        (row) =>
          row.neighborhood_key !== "__unknown__" &&
          row.located > 0 &&
          row.latitude != null &&
          row.longitude != null &&
          row[metric] > 0,
      ),
    [items, metric],
  );
  useEffect(() => {
    if (!valid.length) return;
    setTileError(false);
    const map = L.map(el.current, {
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
      .addTo(map)
      .on("tileerror", () => setTileError(true));
    const max = Math.max(...valid.map((row) => Number(row[metric])));
    valid.forEach((row) => {
      const text = document.createElement("span");
      text.textContent = `${row.neighborhood} · ${row.city}/${row.state} · ${row[metric]} recebimento(s)`;
      L.circleMarker([Number(row.latitude), Number(row.longitude)], {
        radius: 12 + 26 * Math.sqrt(row[metric] / max),
        color: heatColor(row[metric], max),
        fillColor: heatColor(row[metric], max),
        fillOpacity: 0.65,
        weight: 1,
      })
        .addTo(map)
        .bindTooltip(text);
    });
    map.fitBounds(
      L.latLngBounds(
        valid.map((row) => [Number(row.latitude), Number(row.longitude)]),
      ),
      { padding: [45, 45], maxZoom: 13 },
    );
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [valid, metric]);
  if (!valid.length)
    return (
      <p className="pa-notice">
        Sem bairros com coordenadas válidas para esta seleção. Os recebimentos
        continuam disponíveis na tabela.
      </p>
    );
  return (
    <>
      {tileError && (
        <p>
          Mapa-base indisponível. Os círculos e a tabela continuam mostrando os
          dados disponíveis.
        </p>
      )}
      <div
        ref={el}
        className="pa-heat-map"
        aria-label="Mapa de calor dos recebimentos por bairro"
      />
      <p className="pa-heat-legend">
        <span style={{ background: "#c2dfaa" }}>Menor concentração</span>
        <span style={{ background: "#edbd65" }}>Intermediária</span>
        <span style={{ background: "#d96b45" }}>Maior concentração</span>
      </p>
    </>
  );
}
