import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  participationRequest,
  number,
  dateTime,
  profileLabels,
  heatColor,
  unitLabels,
  materialQuantity,
} from "../../services/participationAnalytics";
import { ParticipantDetail } from "./ParticipationAnalytics";
import NeighborhoodHeatMap from "./NeighborhoodHeatMap";

const roleLabels = {
  COOPERATIVE: "Cooperativa",
  COLLECTOR: "Catador",
  DRIVER: "Motorista",
  GENERATOR_SMALL: "Pequeno gerador",
  GENERATOR_LARGE: "Grande gerador",
};
const titles = {
  generators: "Geradores",
  collectors: "Catadores",
  territory: "Bairros",
  usage: "Uso do sistema",
};
const duration = (seconds) =>
  seconds < 60 ? `${number(seconds)} s` : `${number(seconds / 60)} min`;
export default function AnalyticsDimension({ kind, filters }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState(""),
    [selected, setSelected] = useState(null),
    [metric, setMetric] = useState("receipts"),
    [materialKey, setMaterialKey] = useState("");
  const query = useMemo(
    () =>
      kind === "usage"
        ? { start: filters.start, end: filters.end, page, pageSize: 20 }
        : {
            ...filters,
            page,
            pageSize: 20,
            search,
            ...(kind === "territory" ? { materialKey } : {}),
          },
    [kind, filters, page, search, materialKey],
  );
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setSelected(null);
    participationRequest(kind, query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Não foi possível carregar esta análise.");
      });
    return () => controller.abort();
  }, [kind, query, retry]);
  const total = Number(data?.total ?? data?.summary?.accounts ?? 0),
    pages = Math.max(1, Math.ceil(total / 20));
  return (
    <section
      className="pa-panel pa-dimension"
      aria-label={`Análise de ${titles[kind]}`}
    >
      <h2>{titles[kind]}</h2>
      {kind === "usage" && (
        <p>
          Tempo ativo estimado de cada conta com vínculo organizacional. Apenas
          o período se aplica a esta aba.
        </p>
      )}
      {["generators", "collectors"].includes(kind) && (
        <form
          className="pa-search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(draft);
          }}
        >
          <label>
            Buscar nome nesta aba
            <input
              maxLength={120}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button>Buscar nesta aba</button>
        </form>
      )}
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Tentar carregar esta aba
          </button>
        </div>
      ) : !data ? (
        <p role="status">Carregando análise…</p>
      ) : (
        <>
          <p className="pa-reference">
            Atualizado em {dateTime(data.meta.generatedAt)}
          </p>
          {data.scope && <p>{data.scope}</p>}
          {kind === "generators" && (
            <>
              <div className="pa-facts">
                <div>
                  <strong>{number(data.summary.active)}</strong>Geradores com
                  recebimentos
                </div>
                <div>
                  <strong>{number(data.summary.receipts)}</strong>Recebimentos
                  identificados
                </div>
                <div>
                  <strong>{number(data.summary.open_requests)}</strong>Pedidos
                  em aberto
                </div>
              </div>
              <p>
                Geradores identificados com recebimento ou solicitação no
                período. A primeira participação e a recência do histórico podem
                ser consultadas em cada gerador.
              </p>
              <p>
                {number(data.summary.first_registered)} com primeira
                participação registrada no período;{" "}
                {number(data.summary.returning)} com recebimentos anteriores;{" "}
                {number(data.summary.repeated)} com dois ou mais recebimentos
                neste período. Essas últimas participações podem estar nos dois
                primeiros grupos.
              </p>
              <div className="pa-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Gerador</th>
                      <th>Perfil / bairro</th>
                      <th>Recebimentos</th>
                      <th>Participação no período</th>
                      <th>Última participação</th>
                      <th>Pedidos abertos</th>
                      <th>Histórico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.party_key}>
                        <td>{row.name}</td>
                        <td>
                          {profileLabels[row.profile]}
                          <small>
                            {row.neighborhood || "Bairro não informado"} ·{" "}
                            {row.city || "Município não informado"}
                          </small>
                        </td>
                        <td>{number(row.period_count)}</td>
                        <td>
                          {row.period_count <= 0
                            ? "Somente solicitações"
                            : row.first_at &&
                                new Date(row.first_at) >=
                                  new Date(data.meta.effectiveStart)
                              ? "Primeira participação registrada"
                              : "Retorno de participante"}
                        </td>
                        <td>{dateTime(row.last_at)}</td>
                        <td>{number(row.open_requests)}</td>
                        <td>
                          <button onClick={() => setSelected(row.party_key)}>
                            Ver histórico de {row.name}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selected && (
                <ParticipantDetail
                  key={selected}
                  partyKey={selected}
                  filters={filters}
                  onClose={() => setSelected(null)}
                />
              )}
            </>
          )}
          {kind === "collectors" && (
            <>
              <div className="pa-facts">
                <div>
                  <strong>{number(data.summary.registered)}</strong>Catadores
                  cadastrados
                </div>
                <div>
                  <strong>{number(data.summary.active)}</strong>Com participação
                  registrada
                </div>
                <div>
                  <strong>{number(data.summary.receipts)}</strong>Coletas
                  recebidas distintas
                </div>
              </div>
              <div className="pa-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Catador</th>
                      <th>Participações</th>
                      <th>Datas de recebimento</th>
                      <th>Último recebimento</th>
                      <th>Conta no aplicativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{number(row.receipts)}</td>
                        <td>{number(row.days)}</td>
                        <td>{dateTime(row.last_receipt)}</td>
                        <td>
                          {row.user_id ? "Vinculada" : "Sem conta vinculada"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link className="pa-attendance-link" to="/staff-reports">
                Abrir relatórios da produção da equipe
              </Link>
            </>
          )}
          {kind === "territory" && (
            <>
              <p>{data.mapMethod}</p>
              <label htmlFor="analytics-material">
                Material no mapa e na tabela
              </label>
              <select
                id="analytics-material"
                value={materialKey}
                onChange={(event) => setMaterialKey(event.target.value)}
              >
                <option value="">Todos os materiais</option>
                {(data.materialOptions || []).map((row) => (
                  <option key={row.key} value={row.key}>
                    {row.name} · {unitLabels[row.unit] || "Unidade a conferir"}
                  </option>
                ))}
              </select>
              <p>
                A intensidade mostra o número de recebimentos com o material
                selecionado. Quantidades registradas ficam na tabela, na unidade
                original, e podem aguardar conferência.
              </p>
              <label htmlFor="analytics-map-metric">Intensidade do mapa</label>
              <select
                id="analytics-map-metric"
                value={metric}
                onChange={(event) => setMetric(event.target.value)}
              >
                <option value="receipts">Todos os recebimentos</option>
                <option value="identified_receipts">
                  Recebimentos de origens identificadas
                </option>
                <option value="pev_receipts">Recebimentos em PEVs</option>
              </select>
              <NeighborhoodHeatMap items={data.items} metric={metric} />
              <div className="pa-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bairro / município</th>
                      <th>Recebimentos</th>
                      {materialKey && <th>Quantidade registrada</th>}
                      <th>Origem identificada</th>
                      <th>Participantes únicos</th>
                      <th>Coletas em PEV</th>
                      <th>Com coordenadas</th>
                      <th>Explorar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr
                        key={`${row.city_key}:${row.state_key}:${row.neighborhood_key}`}
                      >
                        <td
                          style={{
                            background: heatColor(
                              row[metric],
                              Math.max(
                                ...data.items.map((item) => item[metric]),
                                1,
                              ),
                            ),
                          }}
                        >
                          {row.neighborhood}
                          <small>
                            {row.city} / {row.state}
                          </small>
                        </td>
                        <td>{number(row.receipts)}</td>
                        {materialKey && (
                          <td>
                            {materialQuantity(row.quantity)}{" "}
                            {unitLabels[row.unit]}
                          </td>
                        )}
                        <td>{number(row.identified_receipts)}</td>
                        <td>{number(row.participants)}</td>
                        <td>{number(row.pev_receipts)}</td>
                        <td>{number(row.located)}</td>
                        <td>
                          <Link
                            to={`/analytics/participation?${new URLSearchParams({ ...filters, tab: "overview", city: row.city_key, state: row.state_key, neighborhood: row.neighborhood_key })}`}
                          >
                            Explorar {row.neighborhood}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {kind === "usage" && (
            <>
              <p className="pa-notice">{data.method}</p>
              <p>
                <strong>
                  Cobertura da medição:{" "}
                  {data.summary.accounts > 0
                    ? `${number((data.summary.measured_accounts / data.summary.accounts) * 100)}%`
                    : "Sem contas vinculadas"}
                  .
                </strong>{" "}
                {number(data.summary.accounts - data.summary.measured_accounts)}{" "}
                conta(s) sem sinal no período. Primeiro sinal disponível para as
                contas atuais:{" "}
                {data.firstObservedDay
                  ? data.firstObservedDay.split("-").reverse().join("/")
                  : "Sem sinal disponível"}
                .
              </p>
              <p>
                {number(data.summary.web_accounts)} conta(s) com sinal do painel
                e {number(data.summary.app_accounts)} com sinal do aplicativo. A
                mesma conta pode aparecer nos dois clientes; esses números não
                indicam instalações ou versões atualizadas.
              </p>
              <details>
                <summary>Cobertura por perfil</summary>
                <ul>
                  {(data.coverageByRole || []).map((row) => (
                    <li key={row.role}>
                      {roleLabels[row.role] || "Outro perfil"}:{" "}
                      {number(row.measured)} de {number(row.accounts)} conta(s)
                      com medição.
                    </li>
                  ))}
                </ul>
              </details>
              <div className="pa-facts">
                <div>
                  <strong>{number(data.summary.accounts)}</strong>Contas
                  vinculadas
                </div>
                <div>
                  <strong>{number(data.summary.measured_accounts)}</strong>Com
                  medição no período
                </div>
                <div>
                  <strong>{duration(data.summary.seconds)}</strong>Tempo ativo
                  estimado
                </div>
              </div>
              <div className="pa-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Perfil</th>
                      <th>Tempo ativo estimado</th>
                      <th>Dias com medição</th>
                      <th>Último sinal ativo</th>
                      <th>Clientes observados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{roleLabels[row.role] || "Outro perfil"}</td>
                        <td>
                          {row.days > 0
                            ? duration(row.seconds)
                            : "Sem medição no período"}
                        </td>
                        <td>
                          {row.days > 0 ? number(row.days) : "Não disponível"}
                        </td>
                        <td>{dateTime(row.last_seen)}</td>
                        <td>
                          {[
                            row.web_used ? "Painel web" : null,
                            row.app_used ? "Aplicativo" : null,
                          ]
                            .filter(Boolean)
                            .join(" / ") || "Sem dados"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Ausência de medição não significa ausência de uso. PF sem
                vínculo persistente com uma cooperativa não recebe tempo
                atribuído a ela.
              </p>
            </>
          )}
          {!data.items.length && (
            <p className="pa-empty">Nenhum registro nesta aba e seleção.</p>
          )}
          {kind !== "territory" && (
            <div className="pa-pagination">
              <span>
                {number(total)} registro(s) · Página {page} de {pages}
              </span>
              <button
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Anterior
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
