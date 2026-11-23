import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminWorkspace from "../../components/platform/AdminWorkspace";
import { recentPeriod } from "../../services/participationAnalytics";
import { accessLabels, roleLabels, monitoringDate, activeTime, systemsUsed, monitoringRequest, exportMonitoring } from "../../services/monitoringAnalytics";
import "./participationAnalytics.css";
import "./usageMonitoring.css";
const defaults = () => { const { start, end } = recentPeriod(30); return { start, end, search: "", city: "", status: "", activity: "", inactiveDays: "" }; };
export function MonitoringAdministrator() {
  return <AdminWorkspace><UsageMonitoring /></AdminWorkspace>;
}
export default function UsageMonitoring() {
  const { admin } = useAdminAuth();
  return admin?.id ? <Monitoring key={admin.id} global={admin.role === "ADMIN"} /> : null;
}
function Monitoring({ global }) {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ({ ...defaults(), ...Object.fromEntries(params), page: params.get("page") || "1", pageSize: "20" }), [params]);
  const [draft, setDraft] = useState(filters), [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [revision, setRevision] = useState(0), [exporting, setExporting] = useState(false), [exportError, setExportError] = useState("");
  const detail = !!filters.cooperativeId;
  useEffect(() => setDraft(filters), [filters]);
  useEffect(() => {
    const c = new AbortController(); setLoading(true); setData(null); setError(""); setExportError("");
    monitoringRequest(filters, c.signal).then(result => { if (!c.signal.aborted) setData(result); })
      .catch(e => { if (!c.signal.aborted) setError(e.message); }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [filters, revision]);
  const change = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const navigate = next => setParams(new URLSearchParams(next));
  const pagination = detail ? data?.accountPagination : data?.pagination, rows = detail ? data?.accounts || [] : data?.items || [];
  async function download(format) {
    if (exporting) return; setExporting(true); setExportError("");
    try { const report = await monitoringRequest({ ...filters, page: "1" }, undefined, true); await exportMonitoring(report, detail, format); }
    catch (e) { setExportError(e.message); } finally { setExporting(false); }
  }
  return <div className="participation-analytics usage-monitoring container-fluid py-4">
    {!global && <Link to="/analytics/participation">← Voltar ao Analytics</Link>}
    <header><span className="pa-eyebrow">ANALYTICS · ACOMPANHAMENTO</span><h1>Uso e adesão</h1><p>{global ? "Acompanhe a habilitação e os sinais de uso das cooperativas cadastradas." : "Acompanhe o acesso e a utilização da sua cooperativa e das contas vinculadas."}</p></header>
    <form className="pa-panel pa-filters" onSubmit={e => { e.preventDefault(); const next = { ...draft, page: "1" }; delete next.cooperativeId; navigate(next); }}>
      <div className="pa-heading"><h2>Período e filtros</h2><div className="pa-shortcuts">{[7,30,60].map(days => <button key={days} type="button" onClick={() => { const { start,end } = recentPeriod(days); setDraft(d => ({ ...d,start,end })); }}>Últimos {days} dias</button>)}</div></div>
      <div className="um-filters">
        <label>Data inicial<input type="date" required value={draft.start} onChange={e => change("start",e.target.value)} /></label>
        <label>Data final<input type="date" required value={draft.end} onChange={e => change("end",e.target.value)} /></label>
        <label>Buscar cooperativa<input value={draft.search} maxLength={120} onChange={e => change("search",e.target.value)} placeholder="Nome, documento ou município" /></label>
        <label>Município<input value={draft.city} maxLength={120} onChange={e => change("city",e.target.value)} /></label>
        <label>Situação<select value={draft.status} onChange={e => change("status",e.target.value)}><option value="">Todas</option>{Object.entries(accessLabels).map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>
        <label>Medição no período<select value={draft.activity} onChange={e => change("activity",e.target.value)}><option value="">Todas</option><option value="MEASURED">Com sinal de uso</option><option value="NO_SIGNAL">Sem sinal de uso</option></select></label>
        <label>Última atividade observada<select value={draft.inactiveDays} onChange={e => change("inactiveDays",e.target.value)}><option value="">Qualquer data / desconhecida</option>{[7,30,60].map(n => <option key={n} value={n}>Há mais de {n} dias</option>)}</select></label>
      </div><p className="small">O filtro “há mais de X dias” considera apenas cooperativas com atividade conhecida; registros sem medição não são classificados como inativos.</p>
      <button className="pa-primary" disabled={loading} type="submit">Aplicar filtros</button>
    </form>
    {loading && <p role="status">Carregando acompanhamento...</p>}
    {error && <div className="pa-panel pa-error" role="alert">{error}<button onClick={() => setRevision(v => v+1)}>Tentar novamente</button></div>}
    {data && <>
      <section className="pa-kpis" aria-label="Resumo de uso e adesão">{[[data.summary.cooperatives,"Cooperativas na seleção"],[data.summary.enabled,"Com acesso habilitado"],[data.summary.measured,"Com sinal no período"],[activeTime(data.summary.seconds),"Tempo ativo estimado das contas"]].map(([value,label]) => <article className="pa-panel" key={label}><strong>{value}</strong><h2>{label}</h2></article>)}</section>
      <p>{data.scope === "ALL" ? "Visão administrativa das cooperativas." : "Dados restritos à cooperativa logada."} Atualizado em {monitoringDate(data.meta.generatedAt)} · Horário de Fortaleza.</p>
      <section className="pa-panel">
        <div className="pa-heading"><h2>{detail ? `Contas vinculadas${data.items[0] ? " · " + data.items[0].name : ""}` : "Acompanhamento das cooperativas"}</h2><div className="d-flex gap-2 flex-wrap">
          {detail && <button onClick={() => { const next = { ...filters, page: "1" }; delete next.cooperativeId; navigate(next); }}>Voltar às cooperativas</button>}
          <button disabled={loading || exporting || !pagination?.total} onClick={() => void download("xlsx")}>{exporting ? "Exportando..." : "Exportar Excel"}</button>
          <button disabled={loading || exporting || !pagination?.total} onClick={() => void download("pdf")}>Baixar PDF</button>
          <button disabled={loading || exporting} onClick={() => setRevision(v => v+1)}>Atualizar</button>
        </div></div>
        {exportError && <p role="alert" className="pa-error">{exportError}</p>}
        <p className="small">Exportação inclui todos os registros da seleção, até 10.000. Login e atividade são históricos; tempo, dias, sistemas e operações respeitam o período.</p>
        <div className="pa-table-wrap" tabIndex={0} role="region" aria-label="Tabela de acompanhamento com rolagem horizontal"><table>
          <caption className="visually-hidden">Uso e acesso no período de {filters.start} a {filters.end}</caption>
          <thead><tr>{[detail?"Conta / perfil":"Cooperativa / município","Situação","Cadastro","Habilitação","Sistemas no período","Validade contratual",...(detail?["Primeiro login observado"]:[]),"Último login","Última atividade","Tempo ativo estimado","Dias com sinal",...(!detail?["Operações no período","Detalhes"]:[])].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <th scope="row"><strong>{row.name}</strong><br /><small>{detail ? roleLabels[row.role] || row.role : [row.city,row.state].filter(Boolean).join(" / ") || "Município não informado"}</small>{!detail && <><br /><small>{row.document || "Documento não informado"}</small></>}</th>
            <td><span className={`um-status um-${row.access_status}`}>{accessLabels[row.access_status]}</span></td>
            <td>{monitoringDate(row.registered_at)}</td><td>{monitoringDate(row.enabled_at)}</td><td>{systemsUsed(row)}</td><td>Não configurada</td>
            {detail && <td>{monitoringDate(row.first_login)}</td>}
            <td>{monitoringDate(row.last_login)}</td><td>{monitoringDate(row.last_activity)}</td><td>{activeTime(row.seconds)}{!row.days && <><br /><small>Sem medição no período</small></>}</td><td>{row.days}</td>
            {!detail && <><td><small>{row.accounts} conta(s), {row.measured_accounts} com sinal<br />{row.collections} coleta(s) criada(s)<br />{row.receipts} recebimento(s)<br />{row.triages} triagem(ns) de bags<br />{row.dispatches} saída(s) de estoque</small></td><td><button onClick={() => navigate({ ...filters, cooperativeId: row.id, page: "1" })}>Ver contas</button></td></>}
          </tr>)}</tbody>
        </table></div>
        {!rows.length && <p role="status">Nenhum registro encontrado para esta seleção.</p>}
        <div className="pa-pagination"><span>{pagination?.total || 0} registro(s) · Página {filters.page} de {pagination?.totalPages || 1}</span><button disabled={Number(filters.page)<=1 || exporting} onClick={() => navigate({ ...filters,page:String(Number(filters.page)-1) })}>Anterior</button><button disabled={Number(filters.page)>=(pagination?.totalPages || 1) || exporting} onClick={() => navigate({ ...filters,page:String(Number(filters.page)+1) })}>Próxima</button></div>
      </section>
      <section className="pa-panel"><h2>Como interpretar</h2><p>{data.method}</p><p>{data.limitations}</p><p>O registro de login começou com esta atualização. “Não registrado” não significa que a conta nunca tenha sido utilizada. Cadastro e habilitação são datas distintas.</p></section>
    </>}
  </div>;
}
