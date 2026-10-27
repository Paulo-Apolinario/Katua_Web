import PevRequests from "../../components/pevs/PevRequests";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getAllBins } from "../../services/binService";
import { useWasteResource } from "../../components/waste-workspace/useWasteResource";
import {
  PevScope,
  PevPage,
  PevState,
  PevBadge,
  PevGuide,
} from "../../components/pevs/PevParts";
import {
  Summary,
  WorkspacePagination,
} from "../../components/collections/WorkspaceParts";
import {
  address,
  title,
  hasPosition,
  accepted,
  capacity,
  filterPevs,
  photoUrl,
  STATES,
} from "../../components/pevs/pevUtils";
import { dateLabel } from "../../utils/collectionWorkspace";
import { downloadCsv } from "../../utils/wasteReports";
import PevMap from "../../components/pevs/PevMap";
const load = async () => {
  const r = await getAllBins();
  if (!Array.isArray(r?.data)) throw Error("Resposta de PEVs inválida.");
  return r.data;
};
const emptyFilters = {
  search: "",
  status: "",
  city: "",
  neighborhood: "",
  material: "",
  pickup: false,
  unmapped: false,
};
export default function BinList() {
  return (
    <PevScope>
      <List />
    </PevScope>
  );
}
function List() {
  const resource = useWasteResource(load),
    [filters, setFilters] = useState(emptyFilters),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [sort, setSort] = useState("priority"),
    [params, setParams] = useSearchParams();
  const mapView = params.get("view") === "map";
  const rows = useMemo(
    () =>
      filterPevs(resource.data || [], filters).sort((a, b) =>
        sort === "name"
          ? title(a).localeCompare(title(b), "pt-BR")
          : sort === "recent"
            ? new Date(b.createdAt) - new Date(a.createdAt)
            : Number(b.needsPickup) - Number(a.needsPickup) ||
              Number(b.openIncidents) - Number(a.openIncidents) ||
              title(a).localeCompare(title(b), "pt-BR"),
      ),
    [resource.data, filters, sort],
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size))),
    visible = rows.slice((current - 1) * size, current * size),
    mapped = useMemo(() => rows.filter(hasPosition), [rows]);
  function filter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  function exported() {
    downloadCsv(
      "katua-pevs-filtrados.csv",
      [
        "ID",
        "Código",
        "Nome",
        "Modalidade",
        "Endereço",
        "Município",
        "Bairro",
        "Regional",
        "Latitude",
        "Longitude",
        "Materiais aceitos",
        "Funcionamento",
        "Precisa de retirada",
        "Capacidade",
        "Unidade",
        "Veículo",
        "Última coleta",
        "Origem da data",
      ],
      rows.map((b) => [
        b.id,
        b.bin_id,
        title(b),
        b.pointKind,
        address(b),
        b.city,
        b.neighborhood,
        b.regional,
        b.latitude,
        b.longitude,
        accepted(b).join(" | "),
        STATES[b.status],
        b.needsPickup ? "Sim" : "Não",
        b.capacityValue,
        b.capacityUnit,
        b.vehicle?.plate,
        b.last_collection_date,
        b.lastCollectionSource,
      ]),
    );
  }
  const values = (key) =>
    [
      ...new Set((resource.data || []).map((b) => b[key]).filter(Boolean)),
    ].sort();
  return (
    <PevPage
      title="Gestão de PEVs"
      description="Acompanhe os pontos de entrega, suas localizações e as prioridades de retirada."
      actions={
        <>
          <button
            className="btn btn-outline-secondary"
            onClick={exported}
            disabled={resource.loading || !!resource.error || !rows.length}
          >
            Exportar filtrados (CSV)
          </button>
          <button
            className="btn btn-outline-success"
            onClick={resource.refresh}
            disabled={resource.loading}
          >
            Atualizar PEVs
          </button>
          <Link className="btn btn-success" to="/create-bin">
            Cadastrar PEV
          </Link>
        </>
      }
    >
      <PevGuide>
        <strong>Rede de pontos, informações para agir.</strong>
        <div className="small mt-1">
          Os indicadores e o mapa acompanham os filtros. “Precisa de retirada” é
          uma informação operacional registrada pela equipe.
        </div>
      </PevGuide>
      <Summary
        cards={[
          ["Pontos encontrados", resource.data ? rows.length : "—"],
          [
            "Ativos",
            resource.data
              ? rows.filter((b) => b.status === "active").length
              : "—",
          ],
          [
            "Precisam de retirada",
            resource.data ? rows.filter((b) => b.needsPickup).length : "—",
          ],
          [
            "Em manutenção",
            resource.data
              ? rows.filter((b) => b.status === "maintenance").length
              : "—",
          ],
        ]}
      />
      <section className="card p-3 mb-4">
        <h2 className="fs-18">Filtros dos pontos</h2>
        <div className="row g-3">
          <div className="col-md-4">
            <label htmlFor="pevs-search" className="form-label">
              Nome, código, endereço ou material
            </label>
            <input
              id="pevs-search"
              type="search"
              className="form-control"
              value={filters.search}
              onChange={(e) => filter("search", e.target.value)}
            />
          </div>
          {[
            [
              "status",
              "Funcionamento",
              Object.entries(STATES).map(([value, label]) => ({
                value,
                label,
              })),
            ],
            [
              "city",
              "Município",
              values("city").map((v) => ({ value: v, label: v })),
            ],
            [
              "neighborhood",
              "Bairro",
              values("neighborhood").map((v) => ({ value: v, label: v })),
            ],
            [
              "material",
              "Material",
              [...new Set((resource.data || []).flatMap(accepted))]
                .sort()
                .map((v) => ({ value: v, label: v })),
            ],
          ].map(([key, label, options]) => (
            <div className="col-md-2" key={key}>
              <label htmlFor={`pevs-${key}`} className="form-label">
                {label}
              </label>
              <select
                id={`pevs-${key}`}
                className="form-select"
                value={filters[key]}
                onChange={(e) => filter(key, e.target.value)}
              >
                <option value="">Todos</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-3 mt-3">
          <label>
            <input
              type="checkbox"
              className="form-check-input me-2"
              checked={filters.pickup}
              onChange={(e) => filter("pickup", e.target.checked)}
            />
            Precisam de retirada
          </label>
          <label>
            <input
              type="checkbox"
              className="form-check-input me-2"
              checked={filters.unmapped}
              onChange={(e) => filter("unmapped", e.target.checked)}
            />
            Sem localização no mapa
          </label>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setFilters(emptyFilters);
              setPage(1);
            }}
          >
            Limpar filtros
          </button>
        </div>
      </section>
      <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
        <div className="d-flex gap-2">
          <button
            className={`btn ${!mapView ? "btn-success" : "btn-outline-secondary"}`}
            aria-pressed={!mapView}
            onClick={() => setParams({})}
          >
            Lista de PEVs
          </button>
          <button
            className={`btn ${mapView ? "btn-success" : "btn-outline-secondary"}`}
            aria-pressed={mapView}
            onClick={() => setParams({ view: "map" })}
          >
            Mapa dos PEVs
          </button>
        </div>
        <label className="d-flex align-items-center gap-2">
          Ordenar
          <select
            className="form-select w-auto"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="priority">Prioridade operacional</option>
            <option value="name">Nome do ponto</option>
            <option value="recent">Mais recentes</option>
          </select>
        </label>
      </div>
      <PevState resource={resource}>
        {mapView ? (
          <section className="card p-3">
            <h2 className="fs-18">Localização dos pontos filtrados</h2>
            <p className="small">
              {mapped.length} com marcador · {rows.length - mapped.length} sem
              localização. Verde: ativo · Laranja: precisa de retirada · Cinza:
              inativo ou em manutenção.
            </p>
            <PevMap items={mapped} />
            {rows.some((b) => !hasPosition(b)) && (
              <div className="mt-3">
                <strong className="small">
                  Pontos com localização pendente
                </strong>
                <div className="d-flex gap-2 flex-wrap mt-2">
                  {rows
                    .filter((b) => !hasPosition(b))
                    .map((b) => (
                      <Link
                        key={b.id}
                        to={`/edit-bin/${encodeURIComponent(b.id)}`}
                      >
                        {title(b)}
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="card p-3">
            <h2 className="fs-18">Pontos cadastrados</h2>
            {!rows.length ? (
              <div className="py-4 text-center">
                <p>
                  {resource.data?.length
                    ? "Nenhum PEV corresponde aos filtros."
                    : "Sua cooperativa ainda não possui PEVs cadastrados."}
                </p>
                <Link to="/create-bin" className="btn btn-outline-success">
                  Cadastrar um ponto
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Ponto / Identificação</th>
                      <th>Localização / Materiais</th>
                      <th>Operação</th>
                      <th>Última coleta</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div className="d-flex gap-3 align-items-center">
                            {b.photo_url && (
                              <img
                                className="pev-photo"
                                src={photoUrl(b.photo_url)}
                                alt={`PEV ${title(b)}`}
                              />
                            )}
                            <div>
                              <strong>{title(b)}</strong>
                              <div className="small text-muted">{b.bin_id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {address(b)}
                          <div className="small text-muted mt-1">
                            {accepted(b).join(" · ") ||
                              "Materiais ainda não informados"}
                          </div>
                          <small>
                            {hasPosition(b)
                              ? "Localização registrada"
                              : "Sem localização no mapa"}
                          </small>
                        </td>
                        <td>
                          <PevBadge bin={b} />
                          <div className="small mt-2">
                            Capacidade: {capacity(b)}
                          </div>
                          <div className="small">
                            {b.vehicle
                              ? `${b.vehicle.plate} · ${b.vehicle.model}`
                              : "Sem veículo de referência"}
                          </div>
                          {b.openIncidents > 0 && (
                            <div className="small text-danger">
                              {b.openIncidents} ocorrência(s) em aberto
                            </div>
                          )}
                        </td>
                        <td>
                          {dateLabel(b.last_collection_date)}
                          {b.lastCollectionSource === "LEGACY" && (
                            <div className="small text-muted">
                              Informação legada, sem coleta vinculada
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                            <Link
                              to={`/bin-list/${encodeURIComponent(b.id)}`}
                              className="btn btn-sm btn-outline-success"
                            >
                              Ver ficha
                            </Link>
                            <Link
                              to={`/edit-bin/${encodeURIComponent(b.id)}`}
                              className="btn btn-sm btn-outline-secondary"
                            >
                              Editar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <WorkspacePagination
              page={current}
              size={size}
              total={rows.length}
              onPage={setPage}
              onSize={(n) => {
                setSize(n);
                setPage(1);
              }}
            />
          </section>
        )}
      </PevState>
      <PevRequests />
    </PevPage>
  );
}
