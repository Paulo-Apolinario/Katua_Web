import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { hasCoordinates, mapPin } from "../maps/mapPin";
import HeadquartersStatus from "../maps/HeadquartersStatus";
import { origin, title } from "./routePlanning";
export default function RoutePlanningMap({
  collections,
  base,
  selectedId,
  onSelect,
  geometry,
  startPoint,
  endPoint,
}) {
  const root = useRef(null),
    map = useRef(null),
    group = useRef(null),
    markers = useRef(new Map()),
    hq = useRef(null);
  const [tileError, setTileError] = useState(false);
  const latest = useRef(onSelect);
  useEffect(() => {
    latest.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    const m = L.map(root.current, {
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
    }).setView([-3.73, -38.52], 11);
    map.current = m;
    group.current = L.layerGroup().addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    })
      .addTo(m)
      .on("tileerror", () => setTileError(true));
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(root.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    group.current.clearLayers();
    markers.current.clear();
    hq.current = null;
    const bounds = [],
      sequence = [];
    if (hasCoordinates(base)) {
      const xy = [Number(base.latitude), Number(base.longitude)];
      bounds.push(xy);
      sequence.push(xy);
      const text = document.createElement("strong");
      text.textContent = "Sede: " + base.name;
      hq.current = L.marker(xy, {
        icon: mapPin("BASE"),
        title: "Sede: " + base.name,
        alt: "Sede: " + base.name,
        zIndexOffset: 1000,
      })
        .addTo(group.current)
        .bindPopup(text);
    }
    collections.forEach((c, index) => {
      const p = origin(c);
      if (!hasCoordinates(p)) return;
      const xy = [Number(p.latitude), Number(p.longitude)];
      bounds.push(xy);
      sequence.push(xy);
      const text = document.createElement("strong");
      text.textContent = `${index + 1}. ${title(c)}`;
      const marker = L.marker(xy, {
        icon: mapPin(c.bin ? "PEV" : "GENERATOR"),
        title: text.textContent,
        alt: text.textContent,
      })
        .addTo(group.current)
        .bindPopup(text)
        .bindTooltip(String(index + 1), {
          permanent: true,
          direction: "top",
          offset: [0, -40],
        })
        .on("click", () => latest.current(c.id));
      markers.current.set(c.id, marker);
    });
    if (
      !geometry &&
      collections.every((c) => hasCoordinates(origin(c))) &&
      sequence.length > 1
    )
      L.polyline(sequence, {
        color: "#245b89",
        weight: 3,
        dashArray: "6 8",
      }).addTo(group.current);
    if (geometry?.coordinates)
      L.polyline(
        geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        { color: "#047857", weight: 5 },
      ).addTo(group.current);
    for (const [point, label] of [
      [startPoint, "Saída"],
      [endPoint, "Destino final"],
    ])
      if (hasCoordinates(point)) {
        const xy = [Number(point.latitude), Number(point.longitude)];
        bounds.push(xy);
        L.marker(xy, { icon: mapPin("BASE"), title: label, alt: label })
          .addTo(group.current)
          .bindTooltip(label);
      }
    if (bounds.length)
      map.current.fitBounds(bounds, { padding: [45, 50], maxZoom: 15 });
  }, [collections, base, geometry, startPoint, endPoint]);
  useEffect(() => {
    const marker = markers.current.get(selectedId);
    if (marker) {
      map.current.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  }, [selectedId, collections]);
  return (
    <section className="card p-3">
      <h2>Mapa do planejamento</h2>
      <HeadquartersStatus
        base={base}
        onLocate={() => {
          if (hq.current) {
            map.current.setView(hq.current.getLatLng(), 16);
            hq.current.openPopup();
          }
        }}
      />
      {tileError && (
        <p role="status" className="small text-warning">
          Mapa-base indisponível. Confira as paradas na lista e tente novamente
          com conexão.
        </p>
      )}
      <div
        ref={root}
        className="route-planning-map"
        role="region"
        aria-label="Mapa das paradas da rota"
      />
      <p className="small text-muted mt-2 mb-0">
        {geometry
          ? "Percurso por ruas calculado para a sequência atual. Estimativas sem trânsito ao vivo."
          : "Pinos numerados seguem a ordem da lista. Linha pontilhada é apenas uma ligação visual; use o cálculo por ruas para obter o percurso."}{" "}
        O mapa-base exige conexão.
      </p>
    </section>
  );
}
