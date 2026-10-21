import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { unitsLabel } from "./reportModel";
const located = (p) =>
  p.latitude != null &&
  p.longitude != null &&
  Number.isFinite(Number(p.latitude)) &&
  Number.isFinite(Number(p.longitude)) &&
  Math.abs(Number(p.latitude)) <= 90 &&
  Math.abs(Number(p.longitude)) <= 180;
function MapCanvas({ points, base, onInspect }) {
  const el = useRef(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const m = L.map(el.current, {
      scrollWheelZoom: false,
      zoomAnimation: false,
    });
    const layer = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(m);
    layer.on("tileerror", () => setError(true));
    const coords = [];
    for (const p of points) {
      const xy = [Number(p.latitude), Number(p.longitude)];
      coords.push(xy);
      const text = document.createElement("div");
      const b = document.createElement("strong");
      b.textContent = p.name;
      text.append(
        b,
        document.createElement("br"),
        document.createTextNode(unitsLabel(p.units)),
      );
      L.circleMarker(xy, {
        radius: 8,
        color: p.kind === "PEV" ? "#b16a16" : "#176944",
        fillOpacity: 0.8,
      })
        .addTo(m)
        .bindPopup(text)
        .on("click", () => onInspect(p));
    }
    if (located(base)) {
      const xy = [Number(base.latitude), Number(base.longitude)];
      coords.push(xy);
      const el = document.createElement("strong");
      el.textContent = "Base: " + base.name;
      L.circleMarker(xy, { radius: 11, color: "#1f4b78", fillOpacity: 0.9 })
        .addTo(m)
        .bindPopup(el);
    }
    m.fitBounds(L.latLngBounds(coords), { padding: [25, 25], maxZoom: 14 });
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      m.remove();
    };
  }, [points, base, onInspect]);
  return (
    <>
      {error && (
        <p className="alert alert-warning">
          Mapa-base indisponível. Consulte os pontos na lista abaixo.
        </p>
      )}
      <div
        ref={el}
        className="report-map"
        aria-label="Mapa dos pontos atendidos"
      />
    </>
  );
}
export default function ReportMap({ points, base, onInspect }) {
  const valid = useMemo(() => points.filter(located), [points]);
  return (
    <section className="card p-4 mt-4">
      <h2>Pontos atendidos no recorte</h2>
      <p>
        {points.length} ponto(s) atendido(s), {valid.length} com coordenadas e{" "}
        {points.length - valid.length} sem localização. O mapa utiliza os
        cadastros da operação, sem calcular trajeto rodoviário.
      </p>
      {valid.length || located(base) ? (
        <MapCanvas points={valid} base={base} onInspect={onInspect} />
      ) : (
        <p>Nenhum ponto com coordenadas válidas para exibir.</p>
      )}
      <div className="table-responsive mt-3">
        <table className="table">
          <caption>
            Resumo dos pontos atendidos, incluindo cadastros sem coordenadas.
          </caption>
          <thead>
            <tr>
              <th>Ponto</th>
              <th>Origem</th>
              <th>Município</th>
              <th>Operações</th>
              <th>Quantidade registrada</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.name}
                  {!located(p) && (
                    <small className="d-block text-muted">
                      Localização pendente
                    </small>
                  )}
                </td>
                <td>{p.kind === "PEV" ? "PEV" : "Gerador"}</td>
                <td>{p.city || "Não informado"}</td>
                <td>{p.count}</td>
                <td>{unitsLabel(p.units)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => onInspect(p)}
                  >
                    Ver coletas do ponto
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
