import { useEffect, useRef, useState, useId } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import CollectionDialog from "../collections/CollectionDialog";
import { apiRequest, getStoredToken, getStoredUser } from "../../services/apiClient";

const singular = { collectors: "collector", generators: "generator", drivers: "driver" };
const unwrapList = (response, kind) => Array.isArray(response) ? response : response?.[kind];
const titles = { collectors: "catadores", generators: "geradores", drivers: "motoristas" };
export default function RegistrationPdfExport({ kind }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [records, setRecords] = useState([]), [scope, setScope] = useState("one"), [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const active = useRef(true), session = useRef(null), lock = useRef(false);
  const id = useId();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const validSession = () => active.current && session.current && session.current === getStoredToken();
  async function show() {
    if (lock.current) return;
    lock.current = true;
    session.current = getStoredToken();
    setError(""); setRecords([]); setSelected(""); setScope("one"); setOpen(true); setBusy(true);
    try {
      const list = unwrapList(await apiRequest(`/${kind}`), kind);
      if (!validSession()) throw new Error("A sessão mudou. Abra novamente a exportação.");
      if (!Array.isArray(list)) throw new Error("Não foi possível conferir a lista de cadastros.");
      setRecords([...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    } catch (err) { if (active.current) setError(err.message); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  async function download() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError("");
    try {
      if (!validSession()) throw new Error("A sessão mudou. Abra novamente a exportação.");
      const [data, profile, pdf] = await Promise.all([
        apiRequest(scope === "all" ? `/${kind}` : `/${kind}/${encodeURIComponent(selected)}`),
        apiRequest("/auth/me"), import("../../utils/registrationPdf"),
      ]);
      if (!validSession()) throw new Error("A sessão mudou. Abra novamente a exportação.");
      const me = profile.user;
      const list = scope === "all" ? unwrapList(data, kind) : [data?.[singular[kind]] || data];
      if (!Array.isArray(list) || !list.length || list.some(record => !record?.id || !record?.name)) throw new Error("Nenhum cadastro disponível para exportar.");
      if (!me?.cooperative?.id || list.some(record => record.cooperativeId && record.cooperativeId !== me.cooperative.id)) throw new Error("Não foi possível conferir a cooperativa dos cadastros.");
      const doc = pdf.buildRegistrationPdf(kind, list, { cooperative: me.cooperative, issuedBy: me.displayName || me.email || getStoredUser()?.displayName });
      if (!validSession()) throw new Error("A sessão mudou. Abra novamente a exportação.");
      doc.save(pdf.registrationFilename(kind, list));
      toast.success(`PDF gerado com ${list.length} cadastro(s).`);
      setOpen(false);
    } catch (err) { if (active.current) setError(err.message || "Não foi possível gerar o PDF."); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <>
    <button type="button" className="secondary-btn btn-sm" onClick={show} disabled={open}><Download size={16} />Baixar cadastros em PDF</button>
    {open && <CollectionDialog title={`Exportar cadastros de ${titles[kind]}`} busy={busy} onClose={() => setOpen(false)}>
      <p>Escolha um cadastro ou todos os cadastros da cooperativa. O PDF contém os dados cadastrais, sem os arquivos anexados.</p>
      <label htmlFor={`${id}-scope`} className="form-label">O que deseja baixar?</label>
      <select id={`${id}-scope`} className="form-select mb-3" value={scope} onChange={e => setScope(e.target.value)} disabled={busy}>
        <option value="one">Um cadastro específico</option><option value="all">Todos os cadastros da cooperativa</option>
      </select>
      {scope === "one" && <><label htmlFor={`${id}-record`} className="form-label">Selecionar cadastro</label><select id={`${id}-record`} className="form-select mb-3" value={selected} onChange={e => setSelected(e.target.value)} disabled={busy}>
        <option value="">Selecione...</option>{records.map(record => <option key={record.id} value={record.id}>{record.name} · {record.email || record.id}</option>)}
      </select></>}
      {!busy && !records.length && !error && <p role="status">Nenhum cadastro disponível para exportar.</p>}
      {scope === "all" && <p>A lista completa será consultada novamente ao baixar, incluindo registros fora dos filtros e páginas atuais.</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="d-flex flex-wrap justify-content-end gap-2 mt-4"><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="btn btn-success d-inline-flex align-items-center gap-2" onClick={download} disabled={busy || !records.length || (scope === "one" && !selected)}><Download size={16} />{busy ? "Preparando..." : "Baixar PDF"}</button></div>
    </CollectionDialog>}
  </>;
}
