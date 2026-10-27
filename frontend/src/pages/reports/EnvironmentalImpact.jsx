import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import HeadTags from "../../components/HeadTags";
import { civilToday, num } from "../../components/reports/reportModel";
const metrics = [
  ["CO₂ estimado", "co2Kg", "kg CO2e"],
  ["Água estimada", "waterLiters", "L"],
  ["Energia estimada", "energyKwh", "kWh"],
  ["Árvores equivalentes", "treesEquivalent", ""],
];
const label = (m) =>
  new Date(m + "-15T12:00:00-03:00").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Fortaleza",
  });
export default function EnvironmentalImpact() {
  const [month, setMonth] = useState(civilToday().slice(0, 7)),
    [generatorId, setGeneratorId] = useState(""),
    [generators, setGenerators] = useState([]),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0),
    year = month.slice(0, 4);
  useEffect(() => {
    let active = true;
    apiRequest("/reports/context")
      .then((r) => {
        if (active) setGenerators(r.data.generators);
      })
      .catch((e) => {
        if (active) setError(e.error || e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setBusy(true);
    setData(null);
    setError("");
    apiRequest(
      "/environmental-impact?" +
        new URLSearchParams({ year, ...(generatorId ? { generatorId } : {}) }),
      { signal: controller.signal },
    )
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active)
          setError(
            e.error ||
              e.message ||
              "Não foi possível carregar o impacto mensal.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [year, generatorId, refresh]);
  const selected = data?.monthly.find((m) => m.month === month);
  function download() {
    const rows = [
      [
        "Mês",
        "Coletas realizadas",
        "Massa kg",
        "Conferida kg",
        "Aguardando conferência kg",
        "CO2e kg",
        "Água L",
        "Energia kWh",
        "Árvores",
        "Solicitações",
        "O.C.s",
        "Metodologia",
        "Fonte",
        "Versão",
      ],
      ...data.monthly.map((m) => [
        m.month,
        m.collections,
        m.totalMassKg,
        m.confirmedMassKg,
        m.provisionalMassKg,
        m.co2Kg ?? "",
        m.waterLiters ?? "",
        m.energyKwh ?? "",
        m.treesEquivalent ?? "",
        m.requests,
        m.extraOrders,
        data.methodology?.label,
        data.methodology?.source,
        data.methodology?.version,
      ]),
    ];
    const csv =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map(
              (x) =>
                '"' +
                String(x ?? "")
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `impacto-ambiental-mensal-${data.year}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <HeadTags title="Impacto ambiental mensal" />
      <ManagementHeader
        title="Impacto ambiental mensal"
        description="Resultado geral da cooperativa, registrado por mês de realização da coleta."
        actions={
          <Link className="btn btn-outline-success" to="/analytics-dashboard">
            Metodologia e indicadores
          </Link>
        }
      />
      <div className="card p-4 mb-4">
        <div className="row g-3 align-items-end">
          <label className="col-md-4">
            Mês de referência
            <input
              className="form-control"
              type="month"
              min="2000-01"
              max="2100-12"
              value={month}
              onChange={(e) => {
                if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))
                  setMonth(e.target.value);
              }}
            />
          </label>
          <label className="col-md-5">
            Abrangência
            <select
              className="form-select"
              value={generatorId}
              onChange={(e) => setGeneratorId(e.target.value)}
            >
              <option value="">Geral · todas as origens da cooperativa</option>
              {generators.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.companyName || g.name}
                </option>
              ))}
            </select>
          </label>
          <div className="col-md-3">
            <button
              className="btn btn-success"
              disabled={busy}
              onClick={() => setRefresh((v) => v + 1)}
            >
              {busy ? "Calculando…" : "Atualizar impacto mensal"}
            </button>
          </div>
        </div>
        <p className="small text-muted mt-3 mb-0">
          O geral inclui geradores, pessoas físicas, PEVs e coletas extras. Cada
          coleta aparece uma vez, mesmo com vários catadores. Solicitações e
          O.C.s em análise são acompanhadas separadamente, sem impacto
          antecipado.
        </p>
      </div>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {selected && (
        <>
          <div className="d-flex flex-wrap gap-3 justify-content-between mb-3">
            <h2 className="fs-22 text-capitalize">{label(month)}</h2>
            <strong>
              Acumulado de {year}: {num(data.totalMassKg)} kg ·{" "}
              {data.collections} coletas
            </strong>
          </div>
          <div className="row g-3 mb-4">
            {[
              ["Coletas realizadas", selected.collections],
              ["Massa coletada", `${num(selected.totalMassKg)} kg`],
              ["Massa consolidada", `${num(selected.confirmedMassKg)} kg`],
              [
                "Aguardando conferência",
                `${num(selected.provisionalMassKg)} kg`,
              ],
              ...metrics.map(([name, key, unit]) => [
                name,
                selected[key] == null
                  ? "Não configurado"
                  : `${num(selected[key])} ${unit}`.trim(),
              ]),
            ].map(([name, value]) => (
              <div className="col-sm-6 col-xl-3" key={name}>
                <div className="card p-4 h-100">
                  <span className="text-muted">{name}</span>
                  <strong className="fs-22 mt-2">{value}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="card p-4 mb-4">
            <h2 className="fs-20">Solicitações do mês</h2>
            <p>
              {selected.requests} solicitações registradas ·{" "}
              {selected.pendingRequests} pendentes de atendimento.
            </p>
            <p>
              {selected.extraOrders} O.C.s registradas ·{" "}
              {selected.pendingExtraOrders} em análise.
            </p>
            <p className="small text-muted">
              As contagens são separadas: uma O.C. pode originar um agendamento.
              Materiais previstos não são somados ao peso coletado.
            </p>
          </div>
          <div className="card p-4 mb-4">
            <div className="d-flex flex-wrap gap-2 justify-content-between">
              <h2 className="fs-20">Histórico mensal · {year}</h2>
              <button className="btn btn-outline-success" onClick={download}>
                Baixar CSV mensal
              </button>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Coletas</th>
                    <th>Massa (kg)</th>
                    <th>CO₂ (kg CO2e)</th>
                    <th>Água (L)</th>
                    <th>Energia (kWh)</th>
                    <th>Árvores</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr
                      key={m.month}
                      className={m.month === month ? "table-success" : ""}
                    >
                      <td>
                        <button
                          className="btn btn-sm btn-link text-capitalize"
                          onClick={() => setMonth(m.month)}
                        >
                          {label(m.month)}
                        </button>
                      </td>
                      <td>{m.collections}</td>
                      <td>{num(m.totalMassKg)}</td>
                      {metrics.map(([, k]) => (
                        <td key={k}>
                          {m[k] == null ? "Sem fator" : num(m[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card p-4 mb-4">
            <h2 className="fs-20">Abrangência de {year} por origem</h2>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Origem</th>
                    <th>Coletas</th>
                    <th>Massa (kg)</th>
                    <th>CO₂ estimado (kg CO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.generators.map((g) => (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td>{g.collections}</td>
                      <td>{num(g.totalMassKg)}</td>
                      <td>{g.co2Kg == null ? "Sem fator" : num(g.co2Kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card p-4">
            <h2 className="fs-20">Metodologia e conferência</h2>
            <p>
              {data.methodology?.label ||
                "Metodologia ambiental ainda não configurada."}
            </p>
            <p>
              Fonte: {data.methodology?.source || "Não cadastrada"} · versão{" "}
              {data.methodology?.version || "não cadastrada"}
            </p>
            {metrics.map(([name, key]) => (
              <p key={key}>
                {name}: massa com fator no mês{" "}
                {num(selected.metricCoverage[key] || 0)} kg.
              </p>
            ))}
            <p className="small text-muted">
              {data.basis} {data.description} O histórico reflete as conferências das coletas. Valores estimados não comprovam reciclagem ou crédito
              ambiental.
            </p>
          </div>
        </>
      )}
    </>
  );
}
