import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import { Download, FilePlus2, FolderOpen } from "lucide-react";
import HeadTags from "../HeadTags";
import { ManagementHeader } from "../management/ManagementWorkspace";
import {
  ownerKinds,
  ownerLabel,
  loadOwners,
  listOwnerDocuments,
  uploadOwnerDocument,
  downloadOwnerDocument,
} from "../../services/ownerDocumentService";
const initial = {
  title: "",
  documentType: "",
  documentNumber: "",
  issueDate: "",
  expiryDate: "",
  notes: "",
};
const types = {
  generator: [
    "Contrato",
    "CNPJ / CPF",
    "Licença ambiental",
    "Plano de gerenciamento",
    "Alvará",
    "Outros",
  ],
  collector: [
    "CPF / RG",
    "Termo de associação",
    "Comprovante de endereço",
    "Certificado de capacitação",
    "Outros",
  ],
  driver: [
    "CNH",
    "Curso / capacitação",
    "Comprovante de endereço",
    "Contrato",
    "Outros",
  ],
  vehicle: [
    "CRLV",
    "Seguro",
    "Licença / autorização",
    "Vistoria",
    "Comprovante de manutenção",
    "Outros",
  ],
};
const date = (v) =>
  v
    ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })
    : "—";
export default function DocumentVault({ kind }) {
  const config = ownerKinds[kind],
    [params, setParams] = useSearchParams(),
    ownerId =
      params.get(`${kind}Id`) ||
      params.get("ownerId") ||
      params.get("id") ||
      "";
  const [owners, setOwners] = useState([]),
    [documents, setDocuments] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [form, setForm] = useState(initial),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [uploadOpen, setUploadOpen] = useState(false),
    [term, setTerm] = useState("");
  const seq = useRef(0),
    input = useRef(null);
  useEffect(() => {
    let alive = true;
    setOwners([]);
    loadOwners(kind)
      .then((rows) => {
        if (alive) setOwners(rows);
      })
      .catch((e) => {
        if (alive) setError(e.error || e.message);
      });
    return () => {
      alive = false;
    };
  }, [kind]);
  useEffect(() => {
    const request = ++seq.current;
    setDocuments([]);
    setForm(initial);
    setFile(null);
    setUploadOpen(false);
    setError("");
    if (input.current) input.current.value = "";
    if (!ownerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listOwnerDocuments(kind, ownerId)
      .then((r) => {
        if (request === seq.current) setDocuments(r.documents || []);
      })
      .catch((e) => {
        if (request === seq.current) setError(e.error || e.message);
      })
      .finally(() => {
        if (request === seq.current) setLoading(false);
      });
  }, [kind, ownerId]);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    if (!file || !file.size || file.size > 10 * 1024 * 1024) {
      toast.error("Selecione um arquivo de até 10 MB.");
      return;
    }
    if (
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
        file.type,
      )
    ) {
      toast.error("Utilize PDF, JPG, PNG ou WEBP.");
      return;
    }
    if (form.issueDate && form.expiryDate && form.expiryDate < form.issueDate) {
      toast.error("O vencimento não pode ser anterior à emissão.");
      return;
    }
    const body = new FormData();
    body.append("kind", kind);
    body.append("ownerId", ownerId);
    Object.entries(form).forEach(([k, v]) => {
      if (v.trim()) body.append(k, v.trim());
    });
    body.append("file", file);
    setBusy(true);
    try {
      await uploadOwnerDocument(body);
      toast.success("Documento armazenado e vinculado ao cadastro.");
      setForm(initial);
      setFile(null);
      setUploadOpen(false);
      const r = await listOwnerDocuments(kind, ownerId);
      setDocuments(r.documents || []);
    } catch (e) {
      toast.error(e.error || e.message || "Falha ao armazenar documento.");
    } finally {
      setBusy(false);
    }
  }
  const current = owners.find((o) => o.id === ownerId),
    filtered = documents.filter((d) =>
      `${d.title} ${d.documentType} ${d.documentNumber || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(term.toLocaleLowerCase("pt-BR")),
    );
  async function download(d) {
    setBusy(true);
    try {
      await downloadOwnerDocument(d);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <HeadTags title={`Documentos · ${config.title}`} />
      <ManagementHeader
        title={`Documentos · ${config.title}`}
        description="Arquivos vinculados ao cadastro, com identificação, validade e download autenticado."
        actions={
          <>
            <Link className="outline-btn btn-sm" to={config.list}>
              Voltar à lista
            </Link>
            <Link
              className="secondary-btn btn-sm"
              to={`/${kind}-history${ownerId ? `?${kind}Id=${encodeURIComponent(ownerId)}` : ""}`}
            >
              Histórico de coletas
            </Link>
          </>
        }
      />
      {kind === "collector" && ownerId && (
        <Link
          className="outline-btn btn-sm mb-3"
          to={`/collector-profile?id=${encodeURIComponent(ownerId)}`}
        >
          Ficha completa e situação do catador
        </Link>
      )}
      <section className="card p-25 mb-4">
        <label htmlFor="document-owner" className="form-label">
          Selecione o {config.singular}
        </label>
        <select
          id="document-owner"
          className="form-select"
          value={ownerId}
          disabled={busy}
          onChange={(e) =>
            setParams(e.target.value ? { [`${kind}Id`]: e.target.value } : {})
          }
        >
          <option value="">Selecione um cadastro</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {ownerLabel(o)}
            </option>
          ))}
        </select>
        {kind === "vehicle" && (
          <div className="d-flex gap-3 mt-3">
            <Link to="/create-document">Cadastrar documento do veículo</Link>
            <Link to="/vehicle-document-registers">
              Registros documentais anteriores
            </Link>
            <Link to="/maintenance-list">Manutenções</Link>
          </div>
        )}
        <p className="small text-muted mt-2 mb-0">
          Selecione o proprietário para consultar ou anexar documentos.
        </p>
      </section>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {!ownerId ? (
        <div className="card p-25 text-center">
          <FolderOpen className="mx-auto mb-2" />
          <p>Nenhum proprietário selecionado.</p>
        </div>
      ) : loading ? (
        <p role="status">Carregando documentos...</p>
      ) : (
        <>
          <section className="card p-25 mb-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <h3 className="fs-18 mb-0">
                {current ? ownerLabel(current) : "Documentos do cadastro"}
              </h3>
              <button
                className="primary-btn btn-sm"
                disabled={busy || !!error}
                onClick={() => setUploadOpen((v) => !v)}
              >
                <FilePlus2 size={16} />
                {uploadOpen ? "Fechar formulário" : "Anexar documento"}
              </button>
            </div>
            {uploadOpen && (
              <form className="row g-3 mt-2" onSubmit={save}>
                <fieldset disabled={busy} className="row g-3 border-0 m-0 p-0">
                  <div className="col-md-6">
                    <label htmlFor="doc-title" className="form-label">
                      Nome do documento
                    </label>
                    <input
                      id="doc-title"
                      className="form-control"
                      required
                      minLength={2}
                      maxLength={180}
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="doc-type" className="form-label">
                      Tipo de documento
                    </label>
                    <select
                      id="doc-type"
                      className="form-select"
                      required
                      value={form.documentType}
                      onChange={(e) =>
                        setForm({ ...form, documentType: e.target.value })
                      }
                    >
                      <option value="">Selecione o tipo</option>
                      {types[kind].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {[
                    ["documentNumber", "Número / identificação", "text"],
                    ["issueDate", "Emissão (opcional)", "date"],
                    ["expiryDate", "Vencimento (opcional)", "date"],
                  ].map(([k, label, type]) => (
                    <div className="col-md-4" key={k}>
                      <label htmlFor={`doc-${k}`} className="form-label">
                        {label}
                      </label>
                      <input
                        id={`doc-${k}`}
                        className="form-control"
                        type={type}
                        value={form[k]}
                        maxLength={100}
                        onChange={(e) =>
                          setForm({ ...form, [k]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                  <div className="col-12">
                    <label htmlFor="doc-file" className="form-label">
                      Arquivo · PDF, JPG, PNG ou WEBP · até 10 MB
                    </label>
                    <input
                      ref={input}
                      id="doc-file"
                      type="file"
                      className="form-control"
                      required
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="doc-notes" className="form-label">
                      Observações
                    </label>
                    <textarea
                      id="doc-notes"
                      className="form-control"
                      maxLength={2000}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-12">
                    <button className="primary-btn" disabled={busy}>
                      {busy ? "Armazenando..." : "Salvar documento"}
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </section>
          <section className="card p-25">
            <label htmlFor="document-search" className="form-label">
              Pesquisar documentos deste cadastro
            </label>
            <input
              id="document-search"
              className="form-control mb-3"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Identificação</th>
                    <th>Validade</th>
                    <th>Registro</th>
                    <th>Arquivo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const expired =
                      d.expiryDate &&
                      new Date(d.expiryDate).toISOString().slice(0, 10) <
                        new Date().toLocaleDateString("en-CA", {
                          timeZone: "America/Fortaleza",
                        });
                    return (
                      <tr key={`${d.source}:${d.id}`}>
                        <td>
                          <strong>{d.title}</strong>
                          <div className="small text-muted">
                            {d.documentType}
                          </div>
                          {d.notes && (
                            <div
                              className="small"
                              style={{
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {d.notes}
                            </div>
                          )}
                        </td>
                        <td>{d.documentNumber || "—"}</td>
                        <td>
                          {date(d.expiryDate)}
                          {d.expiryDate && (
                            <span
                              className={`badge ms-2 ${expired ? "text-bg-danger" : "text-bg-success"}`}
                            >
                              {expired ? "Vencido" : "Vigente"}
                            </span>
                          )}
                        </td>
                        <td>
                          {date(d.createdAt)}
                          {d.size > 0 && (
                            <div className="small text-muted">
                              {Math.max(1, Math.ceil(d.size / 1024))} KB
                            </div>
                          )}
                        </td>
                        <td>
                          {d.download ? (
                            <button
                              className="outline-btn btn-sm"
                              disabled={busy}
                              onClick={() => download(d)}
                            >
                              <Download size={15} />
                              Baixar anexo
                            </button>
                          ) : (
                            <span className="text-muted">
                              Cadastro sem anexo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <p className="text-muted">
                Nenhum documento encontrado para este cadastro.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
