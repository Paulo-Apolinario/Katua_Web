import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import AdminWorkspace from "../../components/platform/AdminWorkspace";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { apiRequest } from "../../services/apiClient";
import "../analytics/participationAnalytics.css";
const fresh = () => ({ cooperativeName: "", registrationNumber: "", displayName: "", email: "", phone: "", city: "", state: "CE", address: "", password: "", confirmPassword: "" });
export default function AdminCooperatives() {
  const { admin } = useAdminAuth();
  return <AdminWorkspace>{admin?.id && <Cooperatives key={admin.id} />}</AdminWorkspace>;
}
function Cooperatives() {
  const [params, setParams] = useSearchParams();
  useEffect(() => { if (params.get("new") === "1") setForm(current => current || fresh()); }, [params]);
  const [form, setForm] = useState(null), [data, setData] = useState(null), [q, setQ] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const guard = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setData(null);
    apiRequest("/platform/cooperatives?" + new URLSearchParams({ q: search, page: String(page) }), { signal: controller.signal, suppressReadNotice: true })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, page, revision]);
  async function save(e) {
    e.preventDefault(); if (guard.current) return;
    if (form.password !== form.confirmPassword) { setError("As senhas não coincidem."); return; }
    guard.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await apiRequest("/platform/cooperatives", { method: "POST", body: { ...form, email: form.email.trim().toLowerCase(), state: form.state.trim().toUpperCase() }, suppressReadNotice: true });
      if (!result.cooperative?.id) throw Error("Cadastro não confirmado. Consulte a lista antes de repetir.");
      setForm(null); setParams({}, { replace: true }); setPage(1); setSearch(""); setQ(""); setRevision(v => v + 1);
      setNotice("Cooperativa cadastrada. O responsável pode entrar com o e-mail e a senha inicial definidos. Nenhum e-mail foi enviado.");
    } catch (e) {
      setError(e.message || "Confirmação indisponível. Consulte a lista antes de repetir.");
      setForm(current => current ? { ...current, password: "", confirmPassword: "" } : current);
      setRevision(v => v + 1);
    } finally { guard.current = false; setBusy(false); }
  }
  const field = (key, label, props = {}) => <label>{label}<input className="form-control" value={form[key]} onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))} {...props} /></label>;
  return <div className="participation-analytics container-fluid py-4"><header><span className="pa-eyebrow">ADMINISTRAÇÃO</span><h1>Cooperativas</h1><p>Cadastre o acesso inicial e acompanhe as cooperativas da plataforma.</p></header>
    <button className="pa-primary mb-3" disabled={busy || !!form} onClick={() => { setForm(fresh()); setError(""); setNotice(""); }}>Adicionar cooperativa</button>
    {error && <p role="alert" className="pa-panel pa-error">{error}</p>}{notice && <p role="status" className="pa-panel">{notice}</p>}
    {form && <form className="pa-panel" onSubmit={save}><fieldset disabled={busy}><legend>Cadastro inicial da cooperativa</legend><div className="row g-3">
      <div className="col-md-6">{field("cooperativeName", "Nome da cooperativa *", { required: true, minLength: 3, maxLength: 150 })}</div>
      <div className="col-md-6">{field("registrationNumber", "Documento / CNPJ *", { required: true, minLength: 11, maxLength: 30 })}</div>
      <div className="col-md-6">{field("displayName", "Nome do responsável *", { required: true, minLength: 3, maxLength: 150 })}</div>
      <div className="col-md-6">{field("email", "E-mail de acesso da cooperativa *", { required: true, type: "email", maxLength: 255, autoComplete: "off" })}</div>
      <div className="col-md-6">{field("phone", "Telefone *", { required: true, type: "tel", minLength: 8, maxLength: 30 })}</div>
      <div className="col-md-4">{field("city", "Município (opcional)", { maxLength: 120 })}</div>
      <div className="col-md-2">{field("state", "UF", { maxLength: 2 })}</div>
      <div className="col-12">{field("address", "Endereço (opcional)", { maxLength: 500 })}</div>
      <div className="col-md-6">{field("password", "Senha inicial da cooperativa *", { required: true, type: "password", minLength: 8, maxLength: 256, autoComplete: "new-password" })}</div>
      <div className="col-md-6">{field("confirmPassword", "Confirmar senha inicial *", { required: true, type: "password", minLength: 8, maxLength: 256, autoComplete: "new-password" })}</div>
    </div><p className="small mt-3">O novo acesso terá perfil Cooperativa, com dados próprios. A senha não será exibida na listagem nem enviada por e-mail.</p><div className="d-flex gap-2 flex-wrap"><button className="pa-primary" type="submit">{busy ? "Salvando..." : "Cadastrar cooperativa"}</button><button type="button" onClick={() => { setForm(null); setParams({}, { replace: true }); }}>Cancelar</button></div></fieldset></form>}
    <form className="pa-panel d-flex gap-2 align-items-end flex-wrap" onSubmit={e => { e.preventDefault(); setError(""); setSearch(q); setPage(1); setRevision(v => v + 1); }}><label>Buscar cooperativa<input value={q} maxLength={120} onChange={e => setQ(e.target.value)} placeholder="Nome, documento ou e-mail" /></label><button disabled={loading || busy}>Buscar</button></form>
    {loading && <p role="status">Carregando cooperativas...</p>}
    {data && <section className="pa-panel"><div className="pa-table-wrap"><table><thead><tr>{["Cooperativa","Responsável / acesso","Município","Situação","Acompanhamento"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map(item => <tr key={item.id}><th scope="row">{item.name}<br /><small>{item.registrationNumber}</small></th><td>{item.user.displayName}<br />{item.email}<br />{item.phone}</td><td>{[item.city,item.state].filter(Boolean).join(" / ") || "Não informado"}</td><td>{!item.user.isActive || item.user.accountStatus !== "ACTIVE" ? "Bloqueado / inativo" : item.user.credentialsReady ? "Habilitado" : "Aguardando ativação"}</td><td><Link to={`/analytics/monitoring?cooperativeId=${encodeURIComponent(item.id)}`}>Ver Analytics detalhado</Link></td></tr>)}</tbody></table></div>{!data.items.length && <p>Nenhuma cooperativa encontrada.</p>}<div className="pa-pagination"><span>{data.pagination.total} registro(s) · Página {page} de {data.pagination.totalPages}</span><button disabled={busy || page <= 1} onClick={() => setPage(v => v - 1)}>Anterior</button><button disabled={busy || page >= data.pagination.totalPages} onClick={() => setPage(v => v + 1)}>Próxima</button></div></section>}
  </div>;
}
