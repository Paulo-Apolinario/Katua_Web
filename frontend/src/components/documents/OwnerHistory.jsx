import NeighborhoodFilter from "../generators/NeighborhoodFilter";
import {
  normalizeSearchText,
  matchesNeighborhood,
} from "../../utils/generatorNeighborhood";
import "./ownerHistory.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import { ManagementHeader } from "../management/ManagementWorkspace";
import HeadTags from "../HeadTags";
import {
  ownerKinds,
  ownerLabel,
  loadOwners,
} from "../../services/ownerDocumentService";
import {
  getAllCollections,
  getCollectionById,
} from "../../services/collectionService";
import {
  COLLECTION_STAGES,
  generatorName,
  dateLabel,
  inPeriod,
  materials,
  quantity,
} from "../../utils/collectionWorkspace";
import {
  collectionEvents,
  downloadCollectionPdf,
} from "../../utils/collectionPdf";
import { useAdminAuth } from "../../context/AdminAuthContext";
export default function OwnerHistory({ kind }) {
  const config = ownerKinds[kind],
    [params, setParams] = useSearchParams(),
    { admin } = useAdminAuth(),
    selected = useMemo(
      () => [...new Set(params.getAll(`${kind}Id`))],
      [params, kind],
    );
  const neighborhood = kind === "generator" ? params.get("bairro") || "" : "";
  const [owners, setOwners] = useState([]),
    [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [detail, setDetail] = useState(null),
    [busy, setBusy] = useState(false);
  const guard = useRef({ id: 0 });
  useEffect(() => {
    let alive = true;
    const requestGuard = guard.current;
    setLoading(true);
    setError("");
    setRows([]);
    setDetail(null);
    Promise.all([loadOwners(kind), getAllCollections()])
      .then(([owners, r]) => {
        if (!Array.isArray(r.collections))
          throw Error("Resposta de coletas inválida.");
        if (alive) {
          setOwners(owners);
          setRows(r.collections);
        }
      })
      .catch((e) => {
        if (alive) setError(e.error || e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      requestGuard.id++;
    };
  }, [kind]);
  useEffect(() => {
    setPage(1);
    setDetail(null);
    guard.current.id++;
  }, [params, start, end, status]);
  const visibleOwners = owners.filter(
    (owner) =>
      (kind !== "generator" || matchesNeighborhood(owner, neighborhood)) &&
      [
        ownerLabel(owner),
        owner.name,
        owner.companyName,
        owner.neighborhood,
        owner.city,
      ].some((value) =>
        normalizeSearchText(value).includes(normalizeSearchText(search)),
      ),
  );
  const effectiveSelection =
    kind === "generator" && neighborhood
      ? selected.filter((id) =>
          owners.some(
            (owner) =>
              owner.id === id && matchesNeighborhood(owner, neighborhood),
          ),
        )
      : selected;
  const outsideNeighborhood = selected.length - effectiveSelection.length;
  function setSelection(ids) {
    const next = new URLSearchParams(params);
    next.delete(`${kind}Id`);
    [...new Set(ids)].forEach((id) => next.append(`${kind}Id`, id));
    setParams(next);
  }
  function setNeighborhood(value) {
    const next = new URLSearchParams(params);
    if (value) next.set("bairro", value);
    else next.delete("bairro");
    setParams(next, { replace: true });
  }
  const filtered = rows
      .filter(
        (c) =>
          ((kind === "collector" &&
            c.participants?.some((p) =>
              effectiveSelection.includes(p.collectorId),
            )) ||
            effectiveSelection.includes(
              c[`${kind}Id`] ||
                c[kind]?.id ||
                (kind === "generator"
                  ? c.schedule?.generatorId || c.schedule?.generator?.id
                  : ""),
            )) &&
          (!status || c.status === status) &&
          inPeriod(c.collectedAt || c.createdAt, start, end),
      )
      .sort(
        (a, b) =>
          +new Date(b.collectedAt || b.createdAt) -
          +new Date(a.collectedAt || a.createdAt),
      ),
    pages = Math.max(1, Math.ceil(filtered.length / 15));
  function toggle(id) {
    const next = new URLSearchParams(params);
    next.delete(`${kind}Id`);
    (selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]
    ).forEach((v) => next.append(`${kind}Id`, v));
    setParams(next);
  }
  async function open(id, pdf = false) {
    const request = ++guard.current.id;
    setBusy(true);
    try {
      const r = await getCollectionById(id),
        c = r.collection || r.data;
      if (!c?.id) throw Error("Detalhes da coleta indisponíveis.");
      if (request !== guard.current.id) return;
      if (pdf)
        downloadCollectionPdf(c, {
          cooperativeName: admin?.cooperative?.name || admin?.displayName,
        });
      else setDetail(c);
    } catch (e) {
      if (request === guard.current.id) toast.error(e.error || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <HeadTags title={`Histórico · ${config.title}`} />
      <ManagementHeader
        title={`Histórico de coletas · ${config.title}`}
        description="Selecione um ou mais cadastros para consultar as coletas e baixar os registros em PDF."
        actions={
          <Link
            className="secondary-btn btn-sm"
            to={kind === "vehicle" ? "/document-list" : `/${kind}-documents`}
          >
            Documentos
          </Link>
        }
      />
      <section className="card p-25 mb-4">
        <div className="row g-3 mb-3">
          <div className={kind === "generator" ? "col-md-6" : "col-12"}>
            <label htmlFor="history-search" className="form-label">
              Pesquisar {config.title.toLowerCase()}
            </label>
            <input
              id="history-search"
              type="search"
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pelo nome do cadastro"
            />
          </div>
          {kind === "generator" && (
            <div className="col-md-6">
              <NeighborhoodFilter
                id="history-neighborhood"
                generators={owners}
                value={neighborhood}
                onChange={setNeighborhood}
              />
            </div>
          )}
        </div>
        <div className="owner-history-picker-toolbar">
          <span className="small text-muted">
            {visibleOwners.length} cadastro(s) encontrado(s)
          </span>
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="secondary-btn btn-sm"
              disabled={
                loading ||
                !visibleOwners.length ||
                visibleOwners.every((o) => selected.includes(o.id))
              }
              onClick={() =>
                setSelection([...selected, ...visibleOwners.map((o) => o.id)])
              }
            >
              Selecionar resultados
            </button>
            <button
              type="button"
              className="secondary-btn btn-sm"
              disabled={!selected.length}
              onClick={() => setSelection([])}
            >
              Limpar seleção
            </button>
            {kind === "generator" && (
              <button
                type="button"
                className="secondary-btn btn-sm"
                disabled={!search && !neighborhood}
                onClick={() => {
                  setSearch("");
                  setNeighborhood("");
                }}
              >
                Limpar pesquisa e bairro
              </button>
            )}
          </div>
        </div>
        <fieldset className="owner-history-picker">
          <legend className="visually-hidden">
            Selecione os cadastros para consultar
          </legend>
          {visibleOwners.map((owner) => (
            <label
              key={owner.id}
              className={`owner-history-option ${selected.includes(owner.id) ? "is-selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(owner.id)}
                onChange={() => toggle(owner.id)}
                aria-label={`Selecionar ${ownerLabel(owner)}`}
              />
              <span>
                <strong>{ownerLabel(owner)}</strong>
                {kind === "generator" && (
                  <small>
                    {[
                      owner.neighborhood || "Bairro não informado",
                      owner.city,
                      owner.state,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                )}
              </span>
            </label>
          ))}
          {!visibleOwners.length && (
            <p className="owner-history-picker-empty">
              {loading
                ? "Carregando cadastros…"
                : "Nenhum cadastro corresponde à pesquisa e aos filtros."}
            </p>
          )}
        </fieldset>
        <p className="small text-muted mt-3" role="status">
          {selected.length} cadastro(s) selecionado(s)
          {neighborhood
            ? ` · ${effectiveSelection.length} no bairro filtrado`
            : ""}
          .{" "}
          {selected.length
            ? "O histórico considera a seleção e os filtros abaixo."
            : "Selecione ao menos um para consultar o histórico."}
        </p>
        {outsideNeighborhood > 0 && (
          <p className="alert alert-info small">
            {outsideNeighborhood} selecionado(s) fora do bairro filtrado. A
            seleção foi preservada; esses cadastros não entram no histórico
            enquanto o filtro estiver aplicado.
          </p>
        )}
        {selected.length > 0 && (
          <div
            className="owner-history-selected"
            aria-label="Cadastros selecionados"
          >
            {selected.map((id) => {
              const owner = owners.find((o) => o.id === id);
              const outside =
                kind === "generator" &&
                neighborhood &&
                !matchesNeighborhood(owner, neighborhood);
              return (
                <button
                  key={id}
                  type="button"
                  className={`owner-history-chip ${outside ? "is-outside" : ""}`}
                  onClick={() => toggle(id)}
                  aria-label={`Remover ${owner ? ownerLabel(owner) : "cadastro indisponível"} da seleção${outside ? " (fora do bairro)" : ""}`}
                >
                  {owner ? ownerLabel(owner) : "Cadastro indisponível"}
                  {outside && <small>Fora do bairro</small>}
                  <span aria-hidden="true">×</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="row g-3 mt-2">
          <div className="col-md-4">
            <label htmlFor="history-start" className="form-label">
              De
            </label>
            <input
              id="history-start"
              type="date"
              className="form-control"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="history-end" className="form-label">
              Até
            </label>
            <input
              id="history-end"
              type="date"
              className="form-control"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="history-status" className="form-label">
              Status
            </label>
            <select
              id="history-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {Object.entries(COLLECTION_STAGES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando cadastros e coletas...</p>
      ) : !selected.length ? (
        <p className="card p-25">
          Selecione um cadastro para consultar o histórico.
        </p>
      ) : !effectiveSelection.length ? (
        <p className="card p-25">
          Nenhum cadastro selecionado pertence ao bairro filtrado. Selecione um
          resultado ou limpe o filtro de bairro.
        </p>
      ) : (
        <section className="card p-25">
          <p>
            {filtered.length} coleta(s) encontrada(s)
            {neighborhood ? ` no bairro pesquisado: ${neighborhood}` : ""}.
          </p>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Coleta / origem</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Materiais registrados</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 15, page * 15).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{generatorName(c)}</strong>
                      <div className="small text-muted">{c.id}</div>
                    </td>
                    <td>{dateLabel(c.collectedAt || c.createdAt, true)}</td>
                    <td>{COLLECTION_STAGES[c.status] || c.status}</td>
                    <td>
                      {materials(c).map((m, i) => (
                        <div key={i}>
                          {m.name}: {quantity(m.value, m.unit)}
                        </div>
                      ))}
                    </td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="outline-btn btn-sm"
                          disabled={busy}
                          onClick={() => open(c.id)}
                        >
                          Ver ações
                        </button>
                        <button
                          className="primary-btn btn-sm"
                          disabled={busy}
                          onClick={() => open(c.id, true)}
                        >
                          Baixar coleta em PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <p>Nenhuma coleta no período para os cadastros selecionados.</p>
          )}
          <div className="d-flex gap-3 align-items-center">
            <button
              className="outline-btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {pages}
            </span>
            <button
              className="outline-btn btn-sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </section>
      )}
      {detail && (
        <section className="card p-25 mt-4">
          <h3 className="fs-18">Ações registradas · {detail.id}</h3>
          <p>Datas e responsáveis registrados na coleta.</p>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Data</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {collectionEvents(detail).map((event) => (
                  <tr key={event[0]}>
                    <td>{event[0]}</td>
                    <td>{dateLabel(event[1], true)}</td>
                    <td>
                      <button
                        className="outline-btn btn-sm"
                        onClick={() =>
                          downloadCollectionPdf(detail, {
                            event,
                            cooperativeName:
                              admin?.cooperative?.name || admin?.displayName,
                          })
                        }
                      >
                        Baixar ação em PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
