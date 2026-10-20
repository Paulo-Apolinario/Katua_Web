import { useEffect, useState } from "react";
import { environmentalService as api } from "../../services/environmentalService";
import { Field, Message, Pagination } from "./EnvironmentalFields";
import { CdfForm, ManifestForm, MunicipalForm } from "./DocumentForms";
import {
  FAMILIES,
  STATUS,
  emptyPayload,
  normalizePayload,
  collectionToDraft,
  downloadDraft,
} from "./environmentalModel";
export default function DocumentEditor({
  id,
  family,
  unit,
  onClose,
  onSaved,
  onDirty,
}) {
  const [record, setRecord] = useState(null),
    [docId, setDocId] = useState(id || ""),
    [loading, setLoading] = useState(!!id),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false);
  const initial = {
    title: FAMILIES[family] + " — " + unit.name,
    referenceYear:
      family === "MUNICIPAL_DECLARATION" ? new Date().getFullYear() - 1 : null,
    payload: emptyPayload(family, unit),
  };
  const [form, setForm] = useState(initial),
    [saved, setSaved] = useState(id ? "" : JSON.stringify(initial)),
    [sourceId, setSourceId] = useState(""),
    [file, setFile] = useState(null),
    [history, setHistory] = useState(null),
    [historyPage, setHistoryPage] = useState(1),
    [historyError, setHistoryError] = useState("");
  const [catalogs, setCatalogs] = useState(null),
    [catalogError, setCatalogError] = useState(""),
    [catalogBusy, setCatalogBusy] = useState(false),
    [preview, setPreview] = useState(null);
  const dirty = JSON.stringify(form) !== saved;
  const activeFamily = record?.family || family;
  const writable = record
    ? record.permissions.write && record.status === "DRAFT"
    : unit.permissions?.write !== false;
  useEffect(() => {
    onDirty(dirty || !!file);
    return () => onDirty(false);
  }, [dirty, file, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .detail(docId)
      .then((d) => {
        if (cancelled) return;
        if (d.unit.id !== unit.id)
          throw Error(
            "O documento pertence a outra unidade. Volte à listagem.",
          );
        setRecord(d);
        const next = {
          title: d.title,
          referenceYear: d.referenceYear,
          payload: normalizePayload(d.family, d.payload),
        };
        setForm(next);
        setSaved(JSON.stringify(next));
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [docId, unit.id]);
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setHistory(null);
    setHistoryError("");
    api
      .history(docId, historyPage)
      .then((r) => {
        if (!cancelled) setHistory(r);
      })
      .catch((e) => {
        if (!cancelled) setHistoryError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [docId, historyPage, record?.version]);
  const patch = (key, value) => {
    setPreview(null);
    setForm((p) => ({ ...p, [key]: value }));
  };
  async function fresh(newId) {
    const d = await api.detail(newId || docId);
    setRecord(d);
    const next = {
      title: d.title,
      referenceYear: d.referenceYear,
      payload: normalizePayload(d.family, d.payload),
    };
    setForm(next);
    setSaved(JSON.stringify(next));
    setConflict(false);
    onSaved();
  }
  async function operation(fn) {
    setPreview(null);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e);
      if (e.code === "VERSION_CONFLICT") setConflict(true);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    await operation(async () => {
      const result = docId
        ? await api.update(docId, { ...form, version: record.version })
        : await api.create({
            ...form,
            family: activeFamily,
            unitId: unit.id,
            sourceCollectionId: sourceId || null,
          });
      if (!docId) setDocId(result.id);
      await fresh(result.id);
      setNotice(
        "Rascunho salvo no KATUÁ. Nenhum documento oficial foi emitido.",
      );
    });
  }
  async function transition(action) {
    await operation(async () => {
      await api.transition(docId, {
        version: record.version,
        action,
        notes: "",
      });
      await fresh();
      setNotice(
        "Etapa interna atualizada. A situação no SINIR não foi alterada.",
      );
    });
  }
  async function importSource() {
    await operation(async () => {
      const source = await api.source(unit.id, sourceId.trim());
      patch("payload", collectionToDraft(source, form.payload));
      setNotice(source.warning);
    });
  }
  async function loadCatalogs() {
    setCatalogBusy(true);
    setCatalogError("");
    setCatalogs(null);
    try {
      const names = [
        "residues",
        "units",
        "classes",
        "physicalStates",
        "packaging",
        "treatments",
        "reverseSystems",
      ];
      const rows = await Promise.all(
        names.map(async (name) => [
          name,
          (await api.sinirCatalog(unit.id, name)).items,
        ]),
      );
      setCatalogs(Object.fromEntries(rows));
    } catch (e) {
      setCatalogError(e);
    } finally {
      setCatalogBusy(false);
    }
  }
  async function prepare() {
    await operation(async () => {
      setPreview(await api.sinirPreview(docId, record.version));
    });
  }
  if (loading)
    return (
      <div className="card p-4" role="status">
        Consultando documento...
      </div>
    );
  if (id && !record)
    return (
      <>
        <Message error={error} />
        <button className="btn btn-outline-secondary" onClick={onClose}>
          Voltar à lista
        </button>
      </>
    );
  return (
    <article className="env-editor">
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
        <div>
          <h2>{FAMILIES[activeFamily]}</h2>
          <span className="badge text-bg-secondary">
            {STATUS[record?.status] || "Novo rascunho"}
          </span>
          {dirty && (
            <span className="ms-2 small text-warning-emphasis">
              Alterações não salvas
            </span>
          )}
        </div>
        <button className="btn btn-outline-secondary" onClick={onClose}>
          Voltar à lista
        </button>
      </div>
      <div className="env-notice mb-3">
        <strong>Preparação interna · sem confirmação oficial</strong>
        <p className="mb-0">
          A emissão integrada depende da habilitação da API oficial. Revisar ou
          exportar este rascunho não gera MTR, CDF, nota fiscal ou comprovante
          de entrega municipal.
        </p>
      </div>
      <Message error={error} />
      {notice && (
        <div role="status" className="alert alert-success">
          {notice}
        </div>
      )}
      {conflict && (
        <button
          className="btn btn-outline-danger mb-3"
          onClick={() => {
            if (
              window.confirm(
                "Recarregar a versão do servidor e descartar suas alterações locais?",
              )
            )
              operation(() => fresh());
          }}
        >
          Recarregar versão do servidor
        </button>
      )}
      <form onSubmit={save}>
        <fieldset
          disabled={busy || !writable || conflict}
          className="env-fieldset"
        >
          <section className="card p-4 mb-3">
            <div className="env-grid">
              <Field
                label="Título do documento"
                value={form.title}
                maxLength={180}
                onChange={(v) => patch("title", v)}
              />
              {activeFamily === "MUNICIPAL_DECLARATION" && (
                <Field
                  label="Ano de referência"
                  type="number"
                  value={form.referenceYear}
                  onChange={(v) => patch("referenceYear", v)}
                  help="Ano a que os dados se referem; não é o ano de envio."
                />
              )}
            </div>
          </section>
          {!docId &&
            activeFamily.startsWith("MTR") &&
            unit.kind === "COOPERATIVE" && (
              <section className="card p-4 mb-3">
                <h3>Dados de uma coleta da organização</h3>
                <p className="small text-muted">
                  Opcional. Informe o identificador da coleta para preencher
                  dados existentes; códigos e participantes oficiais exigem
                  conferência.
                </p>
                <div className="d-flex gap-2 align-items-end flex-wrap">
                  <Field
                    label="Identificador da coleta de origem"
                    value={sourceId}
                    onChange={setSourceId}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    disabled={!sourceId.trim()}
                    onClick={importSource}
                  >
                    Importar dados da coleta
                  </button>
                </div>
              </section>
            )}
        </fieldset>
        {activeFamily !== "MUNICIPAL_DECLARATION" && writable && (
          <section className="card p-4 mb-3">
            <h2>Catálogos oficiais do SINIR</h2>
            <p>
              Consulte os códigos oficiais para preencher os campos. Esta ação
              só consulta dados e depende da credencial vinculada à unidade no
              servidor.
            </p>
            <Message error={catalogError} />
            <button
              type="button"
              className="btn btn-outline-success"
              disabled={catalogBusy || busy}
              onClick={loadCatalogs}
            >
              {catalogBusy
                ? "Consultando catálogos..."
                : "Carregar catálogos oficiais"}
            </button>
            {catalogs && (
              <p className="small text-success mt-2 mb-0">
                Catálogos carregados nesta edição. Confira a compatibilidade
                entre resíduo, classe, estado físico e acondicionamento.
              </p>
            )}
          </section>
        )}
        {activeFamily === "MUNICIPAL_DECLARATION" ? (
          <MunicipalForm
            disabled={busy || !writable || conflict}
            value={form.payload}
            onChange={(v) => patch("payload", v)}
            municipal={unit.kind === "MUNICIPAL_AUTHORITY"}
          />
        ) : (
          <fieldset
            disabled={busy || !writable || conflict}
            className="env-fieldset"
          >
            {activeFamily === "CDF" ? (
              <CdfForm
                value={form.payload}
                onChange={(v) => patch("payload", v)}
              />
            ) : (
              <ManifestForm
                unitId={unit.id}
                family={activeFamily}
                catalogs={catalogs}
                value={form.payload}
                onChange={(v) => patch("payload", v)}
              />
            )}
          </fieldset>
        )}
        {writable && (
          <button
            type="submit"
            className="btn btn-success"
            disabled={busy || conflict}
          >
            {busy ? "Salvando..." : "Salvar rascunho"}
          </button>
        )}
      </form>
      {record && (
        <>
          {activeFamily !== "MUNICIPAL_DECLARATION" &&
            record.permissions.write && (
              <section className="card p-4 mt-4">
                <h2>Prévia técnica sem transmissão</h2>
                <p>
                  Gera o modelo de integração a partir da versão salva. Não
                  valida os códigos no SINIR nem emite documento.
                </p>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={busy || dirty || conflict}
                  onClick={prepare}
                >
                  Conferir dados para integração
                </button>
                {dirty && (
                  <p className="small text-muted mt-2">
                    Salve as alterações antes de gerar a prévia.
                  </p>
                )}
                {preview && (
                  <div className="mt-3">
                    <p className="fw-semibold">
                      Versão {preview.documentVersion} — emissão bloqueada
                    </p>
                    {!!preview.issues.length && (
                      <ul>
                        {preview.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    )}
                    <ul className="small text-muted">
                      {preview.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                    <details>
                      <summary>Consultar modelo JSON preparado</summary>
                      <pre className="text-wrap mt-3">
                        {JSON.stringify(preview.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </section>
            )}
          <section className="card p-4 mt-4">
            <h2>Revisão e emissão</h2>
            <p className="text-muted">
              A revisão registra uma conferência interna e não certifica
              autorização ambiental ou transmissão.
            </p>
            {record.issues.length > 0 && (
              <div className="env-notice mb-3">
                <strong>Pendências para revisão</strong>
                <ul className="env-bullets">
                  {record.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {record.status === "APPROVED" &&
              record.reviewedUnitVersion !== record.unit.version && (
                <div className="alert alert-warning">
                  A unidade mudou após a revisão. Reabra e revise o documento
                  novamente.
                </div>
              )}
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn btn-outline-secondary"
                onClick={() => downloadDraft(record)}
              >
                Exportar preparação (JSON)
              </button>
              {record.permissions.write && record.status === "DRAFT" && (
                <button
                  className="btn btn-success"
                  disabled={busy || dirty || !!record.issues.length}
                  onClick={() => transition("REQUEST_REVIEW")}
                >
                  Solicitar revisão interna
                </button>
              )}
              {record.permissions.review && record.status === "IN_REVIEW" && (
                <button
                  className="btn btn-success"
                  disabled={busy || dirty}
                  onClick={() => transition("APPROVE")}
                >
                  Concluir revisão interna
                </button>
              )}
              {record.permissions.write &&
                ["APPROVED", "IN_REVIEW"].includes(record.status) && (
                  <button
                    className="btn btn-outline-secondary"
                    disabled={busy}
                    onClick={() => transition("REOPEN")}
                  >
                    Reabrir rascunho
                  </button>
                )}
              {record.permissions.write && record.status === "DRAFT" && (
                <button
                  className="btn btn-outline-danger"
                  disabled={busy || dirty}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Arquivar este rascunho, preservando o histórico?",
                      )
                    )
                      transition("ARCHIVE");
                  }}
                >
                  Arquivar rascunho
                </button>
              )}
              <button
                className="btn btn-success"
                disabled={true}
                aria-describedby="env-emission-reason"
              >
                {activeFamily === "MUNICIPAL_DECLARATION"
                  ? "Transmitir declaração via API"
                  : "Emitir documento via API"}
              </button>
            </div>
            <p className="small text-muted mt-3 mb-0" id="env-emission-reason">
              {record.integration.reason}
            </p>
          </section>
          <section className="card p-4 mt-4">
            <h2>Evidências e documentos de apoio</h2>
            <p className="small text-muted">
              Arquivos privados, consultados somente por usuários autorizados
              nesta unidade. Nenhum anexo é validado como emissão oficial apenas
              por ser enviado.
            </p>
            {record.attachments.map((a) => (
              <div key={a.id} className="env-row">
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                  <span>
                    {a.filename} · {(a.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => operation(() => api.download(record.id, a))}
                  >
                    Baixar evidência
                  </button>
                </div>
                <small className="text-muted env-hash">
                  SHA-256: {a.sha256}
                </small>
              </div>
            ))}
            {writable && (
              <div className="mt-3">
                <label htmlFor="environmental-file" className="form-label">
                  Adicionar PDF, PNG ou JPEG (até 10 MB)
                </label>
                <input
                  id="environmental-file"
                  type="file"
                  className="form-control"
                  accept="application/pdf,image/png,image/jpeg"
                  disabled={busy || dirty}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f?.size > 10 * 1024 * 1024) {
                      setError("Arquivo excede 10 MB.");
                      e.target.value = "";
                      setFile(null);
                    } else setFile(f);
                  }}
                />
                <button
                  className="btn btn-outline-success mt-2"
                  disabled={!file || busy || dirty}
                  onClick={() =>
                    operation(async () => {
                      await api.upload(record.id, record.version, file);
                      setFile(null);
                      document.getElementById("environmental-file").value = "";
                      await fresh();
                      setNotice("Evidência adicionada.");
                    })
                  }
                >
                  Enviar evidência
                </button>
              </div>
            )}
          </section>
          <section className="card p-4 mt-4">
            <h2>Histórico de preparação</h2>
            <Message error={historyError} />
            {history
              ? history.items.map((e) => (
                  <div className="env-history" key={e.id}>
                    <strong>
                      {{
                        CREATED: "Rascunho criado",
                        UPDATED: "Rascunho atualizado",
                        REQUEST_REVIEW: "Revisão solicitada",
                        APPROVE: "Revisão interna concluída",
                        REOPEN: "Rascunho reaberto",
                        ARCHIVE: "Rascunho arquivado",
                        EVIDENCE_ADDED: "Evidência adicionada",
                      }[e.kind] || e.kind}
                    </strong>
                    <div className="small text-muted">
                      {e.actorName} ·{" "}
                      {new Date(e.createdAt).toLocaleString("pt-BR")} · versão{" "}
                      {e.documentVersion}
                    </div>
                    {e.notes && <p>{e.notes}</p>}
                  </div>
                ))
              : !historyError && <p role="status">Consultando histórico...</p>}
            {history && (
              <Pagination
                page={historyPage}
                total={history.total}
                onChange={setHistoryPage}
              />
            )}
          </section>
        </>
      )}
    </article>
  );
}
