import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import HeadTags from "../../components/HeadTags";
import { num } from "../../components/reports/reportModel";
const metrics = [
  ["CO₂ estimado", "co2Kg", "kg CO2e"],
  ["Água estimada", "waterLiters", "L"],
  ["Energia estimada", "energyKwh", "kWh"],
  ["Árvores equivalentes", "treesEquivalent", ""],
];
export default function EnvironmentalImpact() {
  const [generatorId, setGeneratorId] = useState(""),
    [generators, setGenerators] = useState([]),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0);
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
    let active = true;
    const controller = new AbortController();
    setBusy(true);
    setData(null);
    setError("");
    apiRequest(
      "/environmental-impact" +
        (generatorId ? "?" + new URLSearchParams({ generatorId }) : ""),
      { signal: controller.signal },
    )
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active)
          setError(
            e.error || e.message || "Não foi possível consultar o impacto.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [generatorId, refresh]);
  return (
    <>
      <HeadTags title="Impacto ambiental" />
      <ManagementHeader
        title="Impacto ambiental"
        description="Resultado acumulado de todo o material coletado pela cooperativa, com estimativa automática de referência."
        actions={
          <Link className="btn btn-outline-success" to="/analytics-dashboard">
            Indicadores da cooperativa
          </Link>
        }
      />
      <div className="card p-4 mb-4">
        <div className="row g-3 align-items-end">
          <label className="col-md-8">
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
          <div className="col-md-4">
            <button
              className="btn btn-success"
              disabled={busy}
              onClick={() => setRefresh((v) => v + 1)}
            >
              {busy ? "Calculando…" : "Atualizar impacto"}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="row g-3 mb-4">
            {[
              ["Coletas solicitadas", data.requests],
              ["Aguardando atendimento / análise", data.pendingRequests],
              ["Coletas concluídas em campo", data.collections],
              ["Material coletado", `${num(data.totalMassKg)} kg`],
              ...metrics.map(([name, key, unit]) => [
                name,
                `${num(data[key])} ${unit}`.trim(),
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
          <div className="card p-4">
            <h2 className="fs-20">Estimativa automática</h2>
            <p>
              Base de referência do sistema aplicada ao peso coletado. Nenhuma
              configuração da cooperativa é necessária para exibir este resumo.
            </p>
            <p className="text-muted small">
              Inclui geradores, PEVs, pessoas físicas e coletas extras
              registradas. Cada coleta é considerada uma única vez. Solicitações
              pendentes não geram impacto realizado.
            </p>
            <p className="text-muted small">
              Indicadores aproximados, sem comprovação de reciclagem, emissões
              evitadas ou crédito ambiental.
            </p>
          </div>
        </>
      )}
    </>
  );
}
