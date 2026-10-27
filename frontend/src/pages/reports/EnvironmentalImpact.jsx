import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import HeadTags from "../../components/HeadTags";
import { civilToday, num } from "../../components/reports/reportModel";
export default function EnvironmentalImpact() {
  const today = civilToday(),
    [start, setStart] = useState(today.slice(0, 4) + "-01-01"),
    [end, setEnd] = useState(today),
    [generatorId, setGeneratorId] = useState(""),
    [generators, setGenerators] = useState([]),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    epoch = useRef(0);
  useEffect(() => {
    let active = true;
    const requests = epoch;
    apiRequest("/reports/context")
      .then((r) => {
        if (active) setGenerators(r.data.generators);
      })
      .catch((e) => {
        if (active) setError(e.error || e.message);
      });
    return () => {
      active = false;
      requests.current++;
    };
  }, []);
  async function load(e) {
    e?.preventDefault();
    const n = ++epoch.current;
    setBusy(true);
    setData(null);
    setError("");
    try {
      const r = await apiRequest(
        "/environmental-impact?" +
          new URLSearchParams({
            start,
            end,
            ...(generatorId ? { generatorId } : {}),
          }),
      );
      if (n === epoch.current) setData(r.data);
    } catch (e) {
      if (n === epoch.current) setError(e.error || e.message);
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  }
  function download() {
    const rows = [
      [
        "Gerador",
        "Coletas concluídas",
        "Massa kg",
        "Massa com fator kg",
        "Potencial kg CO2e",
        "Metodologia",
        "Fonte",
        "Versão",
        "Início",
        "Fim",
      ],
      ...data.generators.map((g) => [
        g.name,
        g.collections,
        g.totalMassKg,
        g.coveredMassKg,
        g.co2Kg ?? "",
        data.methodology?.label,
        data.methodology?.source,
        data.methodology?.version,
        data.start,
        data.end,
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
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `impacto-geradores-${data.start}-${data.end}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <HeadTags title="Impacto ambiental dos geradores" />
      <ManagementHeader
        title="Impacto ambiental dos geradores"
        description="Resultados das coletas concluídas e potencial ambiental dos materiais com metodologia cadastrada."
        actions={
          <Link className="btn btn-outline-success" to="/analytics-dashboard">
            Metodologia e indicadores
          </Link>
        }
      />
      <form className="card p-4 mb-4" onSubmit={load}>
        <div className="row g-3">
          <label className="col-md-3">
            De
            <input
              className="form-control"
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="col-md-3">
            Até
            <input
              className="form-control"
              type="date"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label className="col-md-6">
            Gerador
            <select
              className="form-select"
              value={generatorId}
              onChange={(e) => setGeneratorId(e.target.value)}
            >
              <option value="">Todos os geradores da cooperativa</option>
              {generators.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.companyName || g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="small text-muted mt-3">
          Até 366 dias. Base: data da conclusão operacional, com unidades de
          massa convertidas de t para kg. Litros, unidades e m³ permanecem
          separados.
        </p>
        <button className="btn btn-success align-self-start" disabled={busy}>
          {busy ? "Calculando…" : "Consultar impacto"}
        </button>
      </form>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {!data && !busy && (
        <div className="card p-4">
          Selecione o período e consulte os resultados consolidados.
        </div>
      )}
      {data && (
        <>
          <div className="row g-3 mb-4">
            {[
              ["Coletas concluídas", data.collections],
              ["Massa consolidada", `${num(data.totalMassKg)} kg`],
              [
                "Potencial estimado",
                data.co2Kg == null
                  ? "Sem fator aplicável"
                  : `${num(data.co2Kg)} kg CO2e`,
              ],
              ["Cobertura dos fatores", `${num(data.coveragePercent)}%`],
            ].map(([label, value]) => (
              <div className="col-sm-6 col-xl-3" key={label}>
                <div className="card p-4 h-100">
                  <span className="text-muted">{label}</span>
                  <strong className="fs-22 mt-2">{value}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="card p-4 mb-4">
            <h2 className="fs-20">Metodologia e abrangência</h2>
            <p>
              {data.methodology?.label ||
                "Metodologia ambiental ainda não configurada."}
            </p>
            <p>
              Fonte: {data.methodology?.source || "Não cadastrada"} · versão{" "}
              {data.methodology?.version || "não cadastrada"}
            </p>
            <p>
              Massa com fator: {num(data.coveredMassKg)} de{" "}
              {num(data.totalMassKg)} kg.
            </p>
            <p className="text-muted">
              {data.description} Coleta concluída pode conter rejeitos e outras
              destinações; massa coletada não é comprovação de reciclagem. A
              divisão entre catadores não multiplica o impacto do gerador.
            </p>
          </div>
          <div className="card p-4">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <h2 className="fs-20">Resultados por gerador</h2>
              <button
                className="btn btn-outline-success"
                onClick={download}
                disabled={!data.generators.length}
              >
                Baixar CSV
              </button>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Gerador</th>
                    <th>Coletas</th>
                    <th>Massa (kg)</th>
                    <th>Massa com fator (kg)</th>
                    <th>Potencial (kg CO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.generators.map((g) => (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td>{g.collections}</td>
                      <td>{num(g.totalMassKg)}</td>
                      <td>{num(g.coveredMassKg)}</td>
                      <td>
                        {g.co2Kg == null ? "Sem fator aplicável" : num(g.co2Kg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.generators.length && (
              <p>Nenhuma coleta concluída no período selecionado.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
