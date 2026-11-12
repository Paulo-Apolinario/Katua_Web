import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { useWasteResource } from "../../components/waste-workspace/useWasteResource";
import { DistributionPie, HeatTiles } from "../../components/charts/DataCharts";
const today = () =>
  new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const before = (end, days) =>
  new Date(new Date(end + "T12:00:00Z").getTime() - (days - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
const kg = (v) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    Number(v || 0),
  ) + " kg";
const pct = (v) =>
  v === null
    ? "Sem base"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v) +
      "%";
const date = (d) => d.split("-").reverse().join("/");
const buckets = {
  ALL: "Todas as bags",
  PENDING: "Com saldo a triar",
  SORTED: "Com material separado",
  REJECTED: "Com rejeitos",
  COMPLETED: "Concluídas",
};
function Pager({ value, set }) {
  return (
    <div className="d-flex align-items-center gap-2 my-3">
      <button
        className="btn btn-outline-secondary btn-sm"
        disabled={value.page <= 1}
        onClick={() => set(value.page - 1)}
      >
        Anterior
      </button>
      <span>
        {value.page} / {value.totalPages} · {value.total} registro(s)
      </span>
      <button
        className="btn btn-outline-secondary btn-sm"
        disabled={value.page >= value.totalPages}
        onClick={() => set(value.page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
export default function BagProgress() {
  const initial = {
    start: before(today(), 30),
    end: today(),
    participantId: "",
    bucket: "ALL",
    itemId: "",
    page: 1,
    eventPage: 1,
  };
  const [query, setQuery] = useState(initial),
    [draft, setDraft] = useState(initial);
  const bagSection = useRef(null),
    eventSection = useRef(null);
  const resource = useWasteResource(
    useCallback(
      () =>
        apiRequest("/mixed-bags/report?" + new URLSearchParams(query), {
          suppressReadNotice: true,
        }),
      [query],
    ),
  );
  const d = resource.data;
  const focus = useRef(null);
  useEffect(() => {
    const pending = focus.current;
    if (pending && d && d !== pending.previous && !resource.loading) {
      (pending.target === "bags"
        ? bagSection
        : eventSection
      ).current?.scrollIntoView({ behavior: "smooth", block: "start" });
      focus.current = null;
    }
  }, [d, resource.loading]);
  const detail = (bucket) => {
    focus.current = { target: "bags", previous: d };
    setQuery((q) => ({ ...q, bucket, page: 1 }));
  };
  const material = (item) => {
    setQuery((q) => ({ ...q, itemId: item.key, eventPage: 1 }));
    focus.current = { target: "events", previous: d };
  };
  const apply = (start, end) => {
    const q = { ...initial, start, end, participantId: draft.participantId };
    setDraft(q);
    setQuery(q);
  };
  return (
    <section className="mt-4" aria-label="Acompanhamento da triagem">
      <div className="card p-4 mb-3">
        <h2 className="h4">Acompanhamento da triagem</h2>
        <p>
          Consulte o saldo das bags recebidas e a produção registrada, sem somar
          as duas etapas.
        </p>
        <form
          className="row g-3"
          onSubmit={(e) => {
            e.preventDefault();
            apply(draft.start, draft.end);
          }}
        >
          <div className="col-md-3">
            <label className="form-label" htmlFor="bag-report-start">
              De
            </label>
            <input
              id="bag-report-start"
              className="form-control"
              type="date"
              required
              max={today()}
              value={draft.start}
              onChange={(e) =>
                setDraft((f) => ({ ...f, start: e.target.value }))
              }
            />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="bag-report-end">
              Até
            </label>
            <input
              id="bag-report-end"
              className="form-control"
              type="date"
              required
              min={draft.start}
              max={today()}
              value={draft.end}
              onChange={(e) => setDraft((f) => ({ ...f, end: e.target.value }))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="bag-report-person">
              Participante da triagem
            </label>
            <select
              id="bag-report-person"
              className="form-control"
              value={draft.participantId}
              onChange={(e) =>
                setDraft((f) => ({ ...f, participantId: e.target.value }))
              }
            >
              <option value="">Toda a equipe</option>
              {d?.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.status === "INACTIVE" ? " (inativo)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button className="btn btn-success">Aplicar filtros</button>
          </div>
        </form>
        <div className="d-flex flex-wrap gap-2 mt-3">
          {[
            ["Hoje", today()],
            ["7 dias", before(today(), 7)],
            ["30 dias", before(today(), 30)],
            ["Este mês", today().slice(0, 7) + "-01"],
            ["Este ano", today().slice(0, 4) + "-01-01"],
          ].map(([label, start]) => (
            <button
              type="button"
              key={label}
              className="btn btn-sm btn-outline-success"
              onClick={() => apply(start, today())}
            >
              {label}
            </button>
          ))}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => resource.refresh()}
          >
            Atualizar acompanhamento
          </button>
        </div>
      </div>
      {resource.loading && <p role="status">Consultando triagem…</p>}
      {resource.error && (
        <p className="alert alert-danger" role="alert">
          {resource.error}
        </p>
      )}
      {d && (
        <>
          <p className="small text-muted">
            Participante aplicado:{" "}
            {d.people.find((p) => p.id === d.meta.participantId)?.name ||
              "Toda a equipe"}{" "}
            · Período aplicado: {date(d.meta.start)} a {date(d.meta.end)} ·
            Horário de Fortaleza · Atualizado em{" "}
            {new Date(d.meta.generatedAt).toLocaleString("pt-BR", {
              timeZone: "America/Fortaleza",
            })}
            {d.meta.partial ? " · Dia atual parcial" : ""}
          </p>
          <h3 className="h5">Bags recebidas no período — saldo atual</h3>
          <p className="small">
            Os pesos abaixo acompanham essas mesmas bags até agora, inclusive
            triagens realizadas depois da data final. Ao filtrar uma pessoa,
            entram apenas bags com pesagens em que ela participou no período.
            Bags ainda sem equipe não entram nesse filtro.
          </p>
          <div className="row g-3 mb-3">
            {[
              ["Recebido líquido", kg(d.cohort.receivedKg), "ALL"],
              ["Separado em lotes", kg(d.cohort.sortedKg), "SORTED"],
              ["Rejeitos", kg(d.cohort.rejectedKg), "REJECTED"],
              ["Ainda por triar", kg(d.cohort.pendingKg), "PENDING"],
              [
                "Bags concluídas",
                `${d.cohort.completed} de ${d.cohort.bags}`,
                "COMPLETED",
              ],
            ].map(([label, value, bucket]) => (
              <div className="col-sm-6 col-xl" key={label}>
                <button
                  className="card p-3 w-100 text-start h-100"
                  style={{ border: "1px solid #d6e4dc" }}
                  onClick={() => detail(bucket)}
                >
                  <span>{label}</span>
                  <strong className="fs-5">{value}</strong>
                  <small>Ver bags →</small>
                </button>
              </div>
            ))}
          </div>
          <div className="row g-3 mb-4">
            <div className="col-lg-6">
              <div className="card p-4 h-100">
                <h3 className="h5">Rendimento das bags recebidas</h3>
                <p>
                  Separado: {pct(d.cohort.recoveredPercent)} · Rejeitos:{" "}
                  {pct(d.cohort.rejectedPercent)}. O saldo pendente ainda não
                  representa rejeito.
                </p>
                <DistributionPie
                  unit="kg"
                  label="Distribuição do peso líquido das bags"
                  data={[
                    {
                      key: "SORTED",
                      name: "Separado",
                      value: d.cohort.sortedKg,
                    },
                    {
                      key: "REJECTED",
                      name: "Rejeitos",
                      value: d.cohort.rejectedKg,
                    },
                    {
                      key: "PENDING",
                      name: "A triar",
                      value: d.cohort.pendingKg,
                    },
                  ]}
                  onSelect={(r) => detail(r.key)}
                />
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card p-4 h-100">
                <h3 className="h5">Produção realizada no período</h3>
                <p>
                  <strong>{kg(d.production.sortedKg)}</strong> separados ·{" "}
                  {kg(d.production.rejectedKg)} de rejeitos ·{" "}
                  {d.production.operations} pesagens em {d.production.bags}{" "}
                  bags.
                </p>
                <p className="small">
                  Conta pesagens pela data em que foram lançadas, incluindo bags
                  recebidas antes do período. Estes valores não devem ser
                  somados aos cartões de recebimento.
                </p>
                <DistributionPie
                  unit="kg"
                  label="Materiais separados no período"
                  data={d.materials.map((m) => ({
                    key: m.itemId,
                    name: m.name,
                    value: m.quantityKg,
                  }))}
                  onSelect={material}
                />
              </div>
            </div>
          </div>
          <div className="card p-4 mb-4">
            <h3 className="h5">Concentração diária da triagem</h3>
            <HeatTiles
              label="Produção separada por dia"
              unit="kg"
              data={d.series.map((s) => ({
                key: s.date,
                name: date(s.date),
                value: s.sortedKg,
              }))}
            />
          </div>
          <div className="card p-4 mb-4">
            <h3 className="h5">Participação nas pesagens</h3>
            <p className="small">
              Os quilos são da operação coletiva em que cada pessoa participou.
              Uma mesma pesagem pode aparecer para várias pessoas; não some
              essas linhas nem interprete os valores como produção individual.
            </p>
            {d.participants.length ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Participante</th>
                      <th>Pesagens</th>
                      <th>Bags</th>
                      <th>Kg em operações com participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.participants.map((p) => (
                      <tr key={p.id}>
                        <th>
                          <button
                            className="btn btn-link p-0"
                            onClick={() => {
                              const q = {
                                ...initial,
                                start: query.start,
                                end: query.end,
                                participantId: p.id,
                              };
                              setDraft(q);
                              setQuery(q);
                            }}
                          >
                            {p.name}
                          </button>
                        </th>
                        <td>{p.operations}</td>
                        <td>{p.bags}</td>
                        <td>{kg(p.collectiveKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhuma participação registrada nesta seleção.</p>
            )}
          </div>
          <div
            ref={bagSection}
            className="card p-4 mb-4"
            style={{ scrollMarginTop: 80 }}
          >
            <h3 className="h5">Bags recebidas no período</h3>
            <label htmlFor="bag-report-bucket">Detalhar</label>
            <select
              id="bag-report-bucket"
              className="form-control mb-3"
              value={query.bucket}
              onChange={(e) =>
                setQuery((q) => ({ ...q, bucket: e.target.value, page: 1 }))
              }
            >
              {Object.entries(buckets).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {d.bags.items.length ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bag / origem</th>
                      <th>Líquido</th>
                      <th>Separado</th>
                      <th>Rejeitos</th>
                      <th>Por triar</th>
                      <th>Rendimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.bags.items.map((b) => (
                      <tr key={b.id}>
                        <th>
                          <Link to={"/mixed-bags/" + b.id}>{b.code}</Link>
                          <small className="d-block">{b.originLabel}</small>
                        </th>
                        <td>{kg(b.netKg)}</td>
                        <td>{kg(b.sortedKg)}</td>
                        <td>{kg(b.rejectedKg)}</td>
                        <td>{kg(b.remainingKg)}</td>
                        <td>{pct(b.recoveredPercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhuma bag neste detalhe.</p>
            )}
            <Pager
              value={d.bags.pagination}
              set={(page) => setQuery((q) => ({ ...q, page }))}
            />
          </div>
          <div
            ref={eventSection}
            className="card p-4"
            style={{ scrollMarginTop: 80 }}
          >
            <h3 className="h5">Pesagens realizadas no período</h3>
            {query.itemId && (
              <button
                className="btn btn-outline-secondary mb-3"
                onClick={() =>
                  setQuery((q) => ({ ...q, itemId: "", eventPage: 1 }))
                }
              >
                Mostrar todos os materiais
              </button>
            )}
            {d.events.items.length ? (
              d.events.items.map((e) => (
                <article key={e.id} className="border-top py-3">
                  <Link to={"/mixed-bags/" + e.bag.id}>{e.bag.code}</Link> ·{" "}
                  {e.bag.originLabel}
                  <p className="small mb-1">
                    {new Date(e.createdAt).toLocaleString("pt-BR", {
                      timeZone: "America/Fortaleza",
                    })}{" "}
                    · Lançamento: {e.actorName}
                  </p>
                  <p className="small mb-1">
                    Equipe:{" "}
                    {e.participantSnapshot.map((p) => p.name).join(", ") ||
                      "Não informada"}
                  </p>
                  {e.outputs.map((o) => (
                    <p className="mb-1" key={o.id}>
                      {o.materialName} · {kg(o.quantityKg)} ·{" "}
                      <Link to={"/waste-stock/lots/" + o.lotId + "/edit"}>
                        {o.lotCode}
                      </Link>
                    </p>
                  ))}
                  {Number(e.rejectedKg) > 0 && (
                    <p>Rejeitos: {kg(e.rejectedKg)}</p>
                  )}
                </article>
              ))
            ) : (
              <p>Nenhuma pesagem neste detalhe.</p>
            )}
            <Pager
              value={d.events.pagination}
              set={(eventPage) => setQuery((q) => ({ ...q, eventPage }))}
            />
          </div>
        </>
      )}
    </section>
  );
}
