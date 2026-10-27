import { useCallback, useRef, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { getAllCollectors } from "../../services/collectorService";
import {
  useWasteResource,
  useWasteOperation,
} from "../waste-workspace/useWasteResource";
import { PevState } from "./PevParts";
import { dateLabel } from "../../utils/collectionWorkspace";
const labels = {
  OPEN: "Aguardando análise",
  ASSIGNED: "Retirada vinculada",
  RESOLVED: "Atendimento encerrado",
  DISMISSED: "Encerrado com justificativa",
};
const conditions = {
  FULL: "PEV cheio",
  OVERFLOW: "Transbordando",
  DAMAGED: "Estrutura danificada",
  CONTAMINATED: "Material inadequado",
  OTHER: "Outra situação",
};
const stage = {
  PENDING: "Retirada programada",
  IN_PROGRESS: "Em andamento",
  COLLECTED: "Retirado · aguarda recebimento",
  RECEIVED: "Recebido",
  SORTING: "Em triagem",
  COMPLETED: "Concluído",
  CANCELLED: "Retirada cancelada",
};
export default function PevRequests({ binId }) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [detail, setDetail] = useState(null),
    [notes, setNotes] = useState(""),
    [collectorId, setCollectorId] = useState(""),
    [notice, setNotice] = useState("");
  const op = useWasteOperation(),
    operation = useRef(null),
    load = useCallback(
      () =>
        apiRequest(
          `/pev-requests?page=${page}${binId ? `&binId=${encodeURIComponent(binId)}` : ""}${status ? `&status=${status}` : ""}`,
        ),
      [binId, page, status],
    );
  const resource = useWasteResource(load),
    collectors = useWasteResource(getAllCollectors);
  async function open(id, updatesPage = 1) {
    const result = await op.run(() =>
      apiRequest(`/pev-requests/${encodeURIComponent(id)}?page=${updatesPage}`),
    );
    if (result?.request) {
      setDetail(result.request);
      setCollectorId(result.request.collection?.collectorId || "");
    }
  }
  async function update(kind) {
    if (notes.trim().length < 5) {
      op.setError(
        "Descreva a resposta ou justificativa em pelo menos 5 caracteres.",
      );
      return;
    }
    const payload = {
        expectedVersion: detail.version,
        kind,
        notes: notes.trim(),
        photos: [],
      },
      fingerprint = JSON.stringify({ id: detail.id, ...payload });
    if (operation.current?.fingerprint !== fingerprint)
      operation.current = { id: crypto.randomUUID(), fingerprint };
    const result = await op.run(() =>
      apiRequest(`/pev-requests/${detail.id}/updates`, {
        method: "POST",
        body: { ...payload, operationId: operation.current.id },
      }),
    );
    if (result?.request) {
      setNotes("");
      operation.current = null;
      setNotice("Resposta registrada. O solicitante receberá um aviso no App.");
      await open(detail.id);
      await resource.refresh();
    }
  }
  async function assign() {
    if (!collectorId) {
      op.setError("Selecione o catador responsável.");
      return;
    }
    const result = await op.run(() =>
      apiRequest(`/pev-requests/${detail.id}/collect`, {
        method: "POST",
        body: { collectorId },
      }),
    );
    if (result?.collection) {
      setNotice(
        "Retirada vinculada ao fluxo de coletas. Materiais e peso serão registrados em campo.",
      );
      await open(detail.id);
      await resource.refresh();
    }
  }
  return (
    <section
      id="pev-app-requests"
      className="card p-4 my-4"
      aria-label="Solicitações de PEV pelo App"
    >
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <div className="pev-eyebrow">PARTICIPAÇÃO E ATENDIMENTO</div>
          <h2 className="fs-20 mt-2">Solicitações recebidas pelo App</h2>
          <p className="text-muted small">
            Relatos de PFs e catadores, fotos da situação e encaminhamento à
            coleta. A cooperativa responsável é a dona do PEV cadastrado.
          </p>
        </div>
        <button
          className="btn btn-outline-success"
          disabled={op.busy || resource.loading}
          onClick={() => {
            void resource.refresh();
            if (detail) void open(detail.id);
          }}
        >
          Atualizar pedidos
        </button>
      </div>
      <label
        className="form-label"
        htmlFor={`pev-request-filter-${binId || "all"}`}
      >
        Situação do atendimento
      </label>
      <select
        id={`pev-request-filter-${binId || "all"}`}
        className="form-select mb-3"
        value={status}
        disabled={op.busy}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
          setDetail(null);
        }}
      >
        <option value="">Todas</option>
        {Object.entries(labels).map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      {!!notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {!!op.error && (
        <div className="alert alert-danger" role="alert">
          {op.error}
        </div>
      )}
      <PevState resource={resource}>
        {!resource.data?.requests?.length ? (
          <p className="text-muted">Nenhum pedido nesta seleção.</p>
        ) : (
          <div className="d-grid gap-3">
            {resource.data.requests.map((r) => (
              <article className="border rounded-3 p-3" key={r.id}>
                <div className="d-flex justify-content-between gap-3 flex-wrap">
                  <strong>{r.binName}</strong>
                  <span className="badge text-bg-light">
                    {labels[r.status]}
                  </span>
                </div>
                <p className="small my-2">{r.address}</p>
                <p className="small mb-2">
                  {conditions[r.condition]} · {dateLabel(r.createdAt)} ·{" "}
                  {r.requesterName} (
                  {r.requesterRole === "PF" ? "Pessoa física" : "Catador"})
                </p>
                <p className="mb-2" style={{ whiteSpace: "pre-wrap" }}>
                  {r.notes}
                </p>
                {r.collection && (
                  <p className="small text-success">
                    {stage[r.collection.status] || r.collection.status}
                  </p>
                )}
                <button
                  className="btn btn-sm btn-outline-success"
                  disabled={op.busy}
                  onClick={() => {
                    setNotes("");
                    setNotice("");
                    void open(r.id);
                  }}
                >
                  Ver relato, fotos e tratar pedido
                </button>
              </article>
            ))}
          </div>
        )}
      </PevState>
      <nav
        className="d-flex gap-3 align-items-center mt-3"
        aria-label="Páginas das solicitações"
      >
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={page <= 1 || op.busy || resource.loading}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </button>
        <span className="small">
          Página {page} de{" "}
          {Math.max(1, Math.ceil((resource.data?.total || 0) / 20))}
        </span>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={
            page * 20 >= (resource.data?.total || 0) ||
            op.busy ||
            resource.loading
          }
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </button>
      </nav>
      {detail && (
        <article className="bg-light border rounded-3 p-3 mt-4">
          <div className="d-flex justify-content-between flex-wrap gap-2">
            <h3 className="fs-18">Atendimento · {detail.binName}</h3>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={op.busy}
              onClick={() => setDetail(null)}
            >
              Fechar detalhes
            </button>
          </div>
          <p className="small text-muted text-break">
            Protocolo {detail.id} · {labels[detail.status]}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{detail.notes}</p>
          <div className="d-flex flex-wrap gap-3">
            {detail.photos?.map((src, i) => (
              <a key={i} href={src} download={`pev-${detail.id}-${i + 1}.jpg`}>
                <img
                  src={src}
                  alt={`Situação do PEV, foto ${i + 1}`}
                  style={{
                    width: 220,
                    maxWidth: "100%",
                    height: 180,
                    objectFit: "contain",
                    background: "white",
                    borderRadius: 10,
                  }}
                />
              </a>
            ))}
          </div>
          {!detail.photos?.length && (
            <p className="small text-muted">Relato sem fotos.</p>
          )}
          {detail.collection && (
            <p className="mt-3 small text-success">
              Coleta {detail.collection.id} ·{" "}
              {stage[detail.collection.status] || detail.collection.status} ·{" "}
              {detail.collection.collector?.name || "Responsável a definir"}.
              Recebimento, conferência e destinação continuam na gestão de
              resíduos.
            </p>
          )}
          {["OPEN", "ASSIGNED"].includes(detail.status) && (
            <>
              <label
                className="form-label mt-3"
                htmlFor={`pev-request-collector-${binId || "all"}`}
              >
                Catador para retirada
              </label>
              <select
                id={`pev-request-collector-${binId || "all"}`}
                className="form-select"
                value={collectorId}
                disabled={op.busy}
                onChange={(e) => setCollectorId(e.target.value)}
              >
                <option value="">Selecione</option>
                {(collectors.data?.collectors || [])
                  .filter(
                    (c) =>
                      c.status === "AVAILABLE" ||
                      c.id === detail.collection?.collectorId,
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {collectors.error && (
                <p className="text-danger small">
                  Não foi possível carregar catadores. Atualize a página.
                </p>
              )}
              <button
                className="btn btn-success mt-2"
                disabled={op.busy || !collectorId}
                onClick={() => void assign()}
              >
                Vincular retirada ao catador
              </button>
              <label
                className="form-label d-block mt-4"
                htmlFor={`pev-request-response-${binId || "all"}`}
              >
                Resposta / justificativa
              </label>
              <textarea
                id={`pev-request-response-${binId || "all"}`}
                className="form-control"
                rows={3}
                maxLength={1500}
                value={notes}
                disabled={op.busy}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button
                  className="btn btn-success"
                  disabled={op.busy}
                  onClick={() => void update("REVIEW")}
                >
                  Registrar resposta
                </button>
                <button
                  className="btn btn-outline-success"
                  disabled={op.busy}
                  onClick={() => void update("RESOLVE")}
                >
                  Encerrar atendimento
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={op.busy}
                  onClick={() => void update("DISMISS")}
                >
                  Encerrar sem retirada
                </button>
              </div>
              <p className="small text-muted mt-2">
                Encerrar o relato não cancela uma coleta vinculada e não altera
                pesos ou estoque. Pedidos duplicados podem ser encerrados com
                justificativa.
              </p>
            </>
          )}
          <h4 className="fs-16 mt-4">Complementações e fotos</h4>
          {detail.updates?.map((u) => (
            <div className="border-top pt-3 mt-3" key={u.id}>
              <strong className="small">
                {u.actorName} · {dateLabel(u.createdAt)}
              </strong>
              <p style={{ whiteSpace: "pre-wrap" }}>{u.notes}</p>
              <div className="d-flex flex-wrap gap-2">
                {u.photos?.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Complementação, foto ${i + 1}`}
                    style={{
                      maxWidth: "100%",
                      width: 220,
                      height: 180,
                      objectFit: "contain",
                      borderRadius: 10,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          {detail.updatesTotal > 5 && (
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={detail.updatesPage <= 1 || op.busy}
                onClick={() => void open(detail.id, detail.updatesPage - 1)}
              >
                Mais recentes
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={
                  detail.updatesPage * 5 >= detail.updatesTotal || op.busy
                }
                onClick={() => void open(detail.id, detail.updatesPage + 1)}
              >
                Anteriores
              </button>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
