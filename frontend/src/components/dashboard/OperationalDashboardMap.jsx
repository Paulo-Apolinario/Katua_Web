import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, House, LocateFixed, Recycle } from "lucide-react";
import { hasCoordinates as located, mapPin } from "../maps/mapPin";
import HeadquartersStatus from "../maps/HeadquartersStatus";
const edit = (p) =>
  p.kind === "PEV" ? "/edit-bin/" + p.id : "/edit-generator/" + p.id + (!located(p) ? "?localizacao=1&origem=painel" : "");
export default function OperationalDashboardMap({ points, base, truncated }) {
  const root = useRef(null),
    wrapper = useRef(null),
    map = useRef(null),
    markers = useRef(new Map()),
    layer = useRef(null),
    own = useRef(null),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [city, setCity] = useState(""),
    [tileError, setTileError] = useState(false),
    [gpsError, setGpsError] = useState(""),
    [locating, setLocating] = useState(false),
    [page, setPage] = useState(1);
  const requestId = useRef(0);
  const pending = useRef(false),
    alive = useRef(true);
  const filtered = useMemo(
      () =>
        points.filter(
          (p) =>
            (!type || p.kind === type) &&
            (!city || p.city === city) &&
            [p.name, p.city]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(search.toLocaleLowerCase("pt-BR")),
        ),
      [points, type, city, search],
    ),
    valid = useMemo(() => filtered.filter(located), [filtered]);
  useEffect(() => {
    const m = L.map(root.current, {
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
    }).setView([-14, -51], 4);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    })
      .addTo(m)
      .on("tileerror", () => setTileError(true));
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(root.current);
    alive.current = true;
    return () => {
      alive.current = false;
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers();
    markers.current.clear();
    const bounds = [];
    const add = (p, kind, title) => {
      const xy = [Number(p.latitude), Number(p.longitude)],
        content = document.createElement("div"),
        heading = document.createElement("strong");
      heading.textContent = title || p.name;
      content.append(heading);
      if (p.kind) {
        content.append(
          document.createElement("br"),
          document.createTextNode(
            (p.kind === "PEV" ? "PEV" : "Gerador") + " · " + p.city,
          ),
        );
        const a = document.createElement("a");
        a.href = edit(p);
        a.textContent = "Abrir cadastro";
        a.style.display = "block";
        content.append(a);
      }
      const marker = L.marker(xy, {
        icon: mapPin(kind),
        title: title || p.name,
        alt: title || p.name,
        riseOnHover: true,
        zIndexOffset: kind === "BASE" ? 1000 : 0,
      })
        .addTo(layer.current)
        .bindPopup(content);
      if (kind === "BASE") marker.bindTooltip("Sede da cooperativa", { permanent: true, direction: "top", offset: [0, -40], className: "katua-hq-tooltip" });
      markers.current.set((p.kind || "BASE") + p.id, marker);
      bounds.push(xy);
    };
    for (const p of valid) add(p, p.kind);
    if (located(base)) add(base, "BASE", "Sede: " + base.name);
    if (bounds.length)
      map.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
  }, [valid, base]);
  function fit() {
    const bounds = valid.map((p) => [Number(p.latitude), Number(p.longitude)]);
    if (located(base))
      bounds.push([Number(base.latitude), Number(base.longitude)]);
    if (bounds.length)
      map.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
  }
  function locate() {
    setGpsError("");
    if (pending.current) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setGpsError("A localização exige HTTPS e permissão do navegador.");
      return;
    }
    const request = ++requestId.current;
    pending.current = true;
    setLocating(true);
    if (own.current) {
      own.current.remove();
      own.current = null;
    }
    const timer = setTimeout(() => {
      if (!alive.current || !pending.current || request !== requestId.current)
        return;
      pending.current = false;
      setLocating(false);
      setGpsError("O aparelho não respondeu a tempo. Tente novamente.");
    }, 18000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer);
        if (!alive.current || !pending.current || request !== requestId.current)
          return;
        pending.current = false;
        setLocating(false);
        if (!located(p.coords)) {
          setGpsError("O aparelho retornou coordenadas inválidas.");
          return;
        }
        const xy = [p.coords.latitude, p.coords.longitude];
        own.current = L.marker(xy, { icon: mapPin("DEVICE"), title: "Sua posição nesta leitura", alt: "Sua posição nesta leitura" })
          .addTo(map.current)
          .bindPopup(
            "Sua posição nesta leitura · precisão aproximada " +
              Math.round(p.coords.accuracy) +
              " m",
          );
        map.current.setView(xy, 15);
      },
      (e) => {
        clearTimeout(timer);
        if (!alive.current || !pending.current || request !== requestId.current)
          return;
        pending.current = false;
        setLocating(false);
        setGpsError(
          e.code === 1
            ? "Permissão negada. Libere a localização deste site no navegador."
            : "Não foi possível obter a posição do aparelho. Confira o GPS e tente novamente.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }
  return (
    <section className="card p-4">
      <div className="d-flex justify-content-between flex-wrap gap-2">
        <div>
          <h2>Mapa operacional</h2>
          <p>Geradores, PEVs e sede com coordenadas cadastradas.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-start">
          <button className="btn btn-outline-success btn-sm" onClick={fit}>
            Enquadrar pontos
          </button>
          <button
            className="btn btn-outline-success btn-sm"
            disabled={locating}
            onClick={locate}
          >
            {locating ? "Localizando..." : "Minha posição"}
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() =>
              wrapper.current
                .requestFullscreen?.()
                .catch(() =>
                  setGpsError("Tela cheia indisponível neste navegador."),
                )
            }
          >
            Ampliar mapa
          </button>
        </div>
      </div>
      <div className="dashboard-filter-grid mb-3">
        <label>
          Buscar ponto
          <input
            className="form-control"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Tipo de ponto
          <select
            aria-label="Tipo de ponto"
            className="form-select"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Geradores e PEVs</option>
            <option value="GENERATOR">Geradores</option>
            <option value="PEV">PEVs</option>
          </select>
        </label>
        <label>
          Município do ponto
          <select
            aria-label="Município do ponto"
            className="form-select"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {[...new Set(points.map((p) => p.city))].sort().map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="small">
        {valid.length} ponto(s) com localização ·{" "}
        {filtered.length - valid.length} sem coordenadas neste recorte. A sede é
        apresentada separadamente.
      </p>
      {truncated && (
        <p role="status" className="alert alert-warning">
          Mapa limitado aos primeiros 1.000 cadastros de cada tipo. Consulte os
          cadastros completos nos respectivos módulos.
        </p>
      )}
      {gpsError && (
        <p role="status" className="alert alert-warning">
          {gpsError}
        </p>
      )}
      {tileError && (
        <p role="status" className="alert alert-warning">
          Mapa-base indisponível. Os pontos continuam acessíveis pela lista.
        </p>
      )}
      <HeadquartersStatus base={base} onLocate={() => {
        const marker = markers.current.get("BASE" + base.id);
        if (marker) { map.current.setView(marker.getLatLng(), 16); marker.openPopup(); }
      }} />
      <div className="dashboard-map-wrapper" ref={wrapper}>
        <div
          className="dashboard-live-map"
          ref={root}
          aria-label="Mapa de geradores, PEVs e sede"
        />
      </div>
      <div className="katua-map-legend" aria-label="Legenda do mapa">
        <span style={{ color: "#176944" }}><Building2 aria-hidden="true" /> Gerador</span>
        <span style={{ color: "#a65d0d" }}><Recycle aria-hidden="true" /> PEV</span>
        <span style={{ color: "#245b89" }}><House aria-hidden="true" /> Sede</span>
        <span style={{ color: "#7845a1" }}><LocateFixed aria-hidden="true" /> Sua posição nesta leitura</span>
      </div>
      <p className="small">Não representa rastreamento da equipe nem trajeto rodoviário.</p>
      <div className="table-responsive">
        <table className="table">
          <caption>
            Pontos do mapa, inclusive cadastros sem coordenadas.
          </caption>
          <thead>
            <tr>
              <th>Ponto</th>
              <th>Tipo e município</th>
              <th>Localização</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((page - 1) * 10, page * 10).map((p) => (
              <tr key={p.kind + p.id}>
                <td>
                  {p.name}
                  {p.needsPickup && (
                    <small className="d-block text-warning">
                      Retirada solicitada
                    </small>
                  )}
                </td>
                <td>
                  {p.kind === "PEV" ? "PEV" : "Gerador"} · {p.city}
                </td>
                <td>
                  {located(p) ? (
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => {
                        const m = markers.current.get(p.kind + p.id);
                        if (m) {
                          map.current.setView(m.getLatLng(), 16);
                          m.openPopup();
                        }
                      }}
                    >
                      Localizar no mapa
                    </button>
                  ) : (
                    "Sem coordenadas"
                  )}
                </td>
                <td>
                  <Link className="btn btn-sm btn-outline-success align-self-center" to={edit(p)}>
                    {located(p) ? "Abrir cadastro" : "Completar localização"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p>Nenhum ponto encontrado para esses filtros.</p>}
      </div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>
          Página {page} de {Math.max(1, Math.ceil(filtered.length / 10))}
        </span>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page * 10 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </section>
  );
}
