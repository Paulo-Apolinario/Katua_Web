import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  participationRequest,
  participationFilters,
  coverageLabels,
  dateTime,
  number,
  statusLabels,
} from "../../services/participationAnalytics";
import "./participationAnalytics.css";

const units = {
  KG: "kg",
  TON: "t",
  LITER: "L",
  UNIT: "un.",
  CUBIC_METER: "m³",
};
const quantity = (value) =>
  value == null
    ? "Não informado"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
        value,
      );
function ReceiptDetail({ bucket, id, query, close }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const section = useRef(null);
  useEffect(() => {
    section.current?.focus();
    section.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    participationRequest(
      `coverage/${bucket}/${encodeURIComponent(id)}`,
      query,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err.message || "Não foi possível consultar este recebimento.",
          );
      });
    return () => controller.abort();
  }, [bucket, id, query, retry]);
  return (
    <section
      ref={section}
      tabIndex={-1}
      className="pa-panel pa-detail"
      aria-label="Detalhes do recebimento"
    >
      <div className="pa-heading">
        <h2>Detalhes do recebimento</h2>
        <button onClick={close}>Fechar detalhes</button>
      </div>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Tentar abrir recebimento
          </button>
        </div>
      ) : !data ? (
        <p role="status">Carregando recebimento…</p>
      ) : (
        <>
          <h3>{data.item.origin}</h3>
          {["UNATTRIBUTED", "CONFLICT"].includes(bucket) && (
            <p className="pa-notice">
              {bucket === "UNATTRIBUTED"
                ? "O nome informado não representa uma identidade vinculada. Este recebimento não entra na contagem de participantes identificados."
                : "Esta operação tem vínculos que precisam ser conferidos. A origem não foi atribuída a um participante."}
            </p>
          )}
          <dl className="pa-receipt-facts">
            <div>
              <dt>Identificador da coleta</dt>
              <dd>{data.item.id}</dd>
            </div>
            <div>
              <dt>Situação atual</dt>
              <dd>{statusLabels[data.item.status] || "A conferir"}</dd>
            </div>
            <div>
              <dt>Recebido na cooperativa</dt>
              <dd>{dateTime(data.item.received_at)}</dd>
            </div>
            <div>
              <dt>Coletado em campo</dt>
              <dd>{dateTime(data.item.collected_at)}</dd>
            </div>
            <div>
              <dt>Solicitação vinculada criada em</dt>
              <dd>{dateTime(data.item.requested_at)}</dd>
            </div>
            <div>
              <dt>Localidade do cadastro atual</dt>
              <dd>
                {data.item.neighborhood_label || "Bairro não informado"} ·{" "}
                {data.item.city_label || "Município não informado"} /{" "}
                {data.item.state_label || "UF não informada"}
              </dd>
            </div>
            {data.item.extra_order_id && (
              <div>
                <dt>Protocolo da ordem extra</dt>
                <dd>{data.item.extra_order_id}</dd>
              </div>
            )}
          </dl>
          <h3>Materiais registrados</h3>
          <p>
            Quantidades registradas na coleta. As unidades são mantidas
            separadas; litros não são convertidos em quilos.
          </p>
          {data.materials.length ? (
            <ul className="pa-receipt-materials">
              {data.materials.map((material) => (
                <li key={material.id}>
                  <strong>{material.nameSnapshot}</strong>
                  <span>
                    {quantity(material.quantity)}{" "}
                    {units[material.unit] || "Unidade a conferir"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Nenhum material discriminado neste recebimento.
              {Number(data.item.legacy_kg) > 0
                ? ` Peso legado registrado: ${quantity(data.item.legacy_kg)} kg.`
                : " Quantidades não informadas."}
            </p>
          )}
          <Link
            className="pa-attendance-link"
            to={`/waste-list?coleta=${encodeURIComponent(data.item.id)}`}
          >
            Abrir coleta na operação
          </Link>
        </>
      )}
    </section>
  );
}

export default function CoverageReceipts() {
  const { bucket } = useParams();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => participationFilters(params), [params]);
  const page = Math.max(1, Number(params.get("page")) || 1),
    search = params.get("search") || "";
  const query = useMemo(
    () => ({ ...filters, page, pageSize: 20, search }),
    [filters, page, search],
  );
  const [draft, setDraft] = useState(search),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState(null);
  const title = Object.hasOwn(coverageLabels, bucket)
    ? coverageLabels[bucket]
    : null;
  useEffect(() => {
    setDraft(search);
    setSelected(null);
    setData(null);
    setError("");
    if (!title) return;
    const controller = new AbortController();
    participationRequest(`coverage/${bucket}`, query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err.message || "Não foi possível consultar os recebimentos.",
          );
      });
    return () => controller.abort();
  }, [bucket, query, title, retry, search]);
  const update = (values) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) =>
      next.set(key, String(value)),
    );
    setParams(next);
  };
  return (
    <div className="participation-analytics container-fluid py-4">
      <Link to={`/analytics/participation?${new URLSearchParams(filters)}`}>
        ← Voltar ao Analytics
      </Link>
      <header className="mt-3">
        <span className="pa-eyebrow">COBERTURA DOS RECEBIMENTOS</span>
        <h1>{title || "Categoria não encontrada"}</h1>
        <p>
          Recebimentos de {filters.start.split("-").reverse().join("/")} a{" "}
          {filters.end.split("-").reverse().join("/")}, no horário de Fortaleza.
          Todos os perfis, seguindo a seleção geográfica do quadro de cobertura.
        </p>
        <p>
          Município:{" "}
          {filters.city === "__unknown__"
            ? "Não informado"
            : filters.city || "Todos"}{" "}
          /{" "}
          {filters.state === "__unknown__"
            ? "UF não informada"
            : filters.state.toUpperCase() || "Todas as UFs"}{" "}
          · Bairro:{" "}
          {filters.neighborhood === "__unknown__"
            ? "Não informado"
            : filters.neighborhood || "Todos"}
          . A localidade corresponde ao cadastro atual.
        </p>
      </header>
      {!title ? (
        <p role="alert">Esta categoria não está disponível.</p>
      ) : (
        <>
          <form
            className="pa-panel pa-search"
            onSubmit={(event) => {
              event.preventDefault();
              update({ search: draft, page: 1 });
            }}
          >
            <label>
              Buscar origem ou identificador
              <input
                maxLength={120}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nome ou código da coleta"
              />
            </label>
            <button>Buscar recebimentos</button>
            <button
              type="button"
              onClick={() => update({ search: "", page: 1 })}
            >
              Limpar busca
            </button>
          </form>
          {selected && (
            <ReceiptDetail
              key={`${bucket}:${selected}`}
              bucket={bucket}
              id={selected}
              query={query}
              close={() => setSelected(null)}
            />
          )}
          {error ? (
            <div role="alert" className="pa-panel">
              <p>{error}</p>
              <button onClick={() => setRetry((value) => value + 1)}>
                Tentar consultar recebimentos
              </button>
            </div>
          ) : !data ? (
            <p role="status">Consultando recebimentos…</p>
          ) : (
            <section className="pa-panel" aria-label="Lista de recebimentos">
              <div className="pa-heading">
                <h2>{number(data.total)} recebimento(s) encontrado(s)</h2>
                <span>Atualizado em {dateTime(data.meta.generatedAt)}</span>
              </div>
              {data.meta.partial && (
                <p className="pa-notice">
                  Dia atual parcial até a consulta acima.
                </p>
              )}
              {data.items.length ? (
                <div className="pa-receipt-list">
                  {data.items.map((item) => (
                    <article className="pa-receipt-row" key={item.id}>
                      <div>
                        <h3>{item.origin}</h3>
                        <p>
                          Recebido em {dateTime(item.received_at)} ·{" "}
                          {statusLabels[item.status] || "A conferir"}
                        </p>
                        <small>
                          {item.neighborhood_label || "Bairro não informado"} ·{" "}
                          {item.city_label || "Município não informado"} /{" "}
                          {item.state_label || "UF não informada"}
                        </small>
                        <small>Coleta: {item.id}</small>
                        <small>
                          {number(item.material_count)} material(is)
                          discriminado(s)
                        </small>
                      </div>
                      <button
                        aria-label={`Ver recebimento ${item.id}`}
                        onClick={() => setSelected(item.id)}
                      >
                        Ver recebimento
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="pa-empty">
                  Nenhum recebimento encontrado nesta categoria e seleção.
                </p>
              )}
              <div className="pa-pagination">
                <span>
                  Página {page} de {Math.max(1, data.totalPages)}
                </span>
                <button
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  Anterior
                </button>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => update({ page: page + 1 })}
                >
                  Próxima
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
