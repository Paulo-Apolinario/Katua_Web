import { useEffect, useState, useRef } from "react";
import {
  listTeams,
  assignTeam,
  allocateMaterials,
} from "../../services/teamService";
const num = (v) =>
  Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export default function CollectionTeam({ collection: c, onChange, onBusy }) {
  const [teams, setTeams] = useState([]),
    [teamId, setTeamId] = useState(c.teamId || ""),
    [values, setValues] = useState({}),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const guard = useRef(false),
    members = c.participants || [],
    materials = c.collectionMaterials || [];
  useEffect(() => {
    let active = true;
    if (c.status === "PENDING" && !c.routeId)
      listTeams()
        .then((t) => {
          if (active) setTeams(t.filter((t) => t.active));
        })
        .catch((e) => {
          if (active) setError(e.error || e.message);
        });
    return () => {
      active = false;
    };
  }, [c.id, c.status, c.routeId]);
  useEffect(() => {
    const v = {};
    for (const p of c.participants || [])
      for (const m of c.collectionMaterials || [])
        v[m.id + ":" + p.collectorId] = String(
          p.allocations?.find((a) => a.materialId === m.id)?.quantity ?? "",
        );
    setValues(v);
    setTeamId(c.teamId || "");
  }, [c]);
  async function save(kind, e) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const r =
        kind === "team"
          ? await assignTeam(c.id, {
              teamId: teamId || null,
              expectedVersion: c.teamVersion || 0,
            })
          : await allocateMaterials(c.id, {
              expectedVersion: c.allocationVersion || 0,
              quantityVersion: c.quantityReviewVersion || 0,
              reason,
              items: materials.flatMap((m) =>
                members.map((p) => ({
                  materialId: m.id,
                  collectorId: p.collectorId,
                  quantity: Number(values[m.id + ":" + p.collectorId]),
                })),
              ),
            });
      onChange(r.collection);
      setReason("");
    } catch (e) {
      setError(e.error || e.message || "Não foi possível registrar a divisão.");
    } finally {
      guard.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  function equal() {
    const v = {};
    for (const m of materials) {
      const total = Math.round(Number(m.quantity) * 1000),
        base = Math.floor(total / members.length),
        rest = total % members.length;
      members.forEach((p, i) => {
        v[m.id + ":" + p.collectorId] = String(
          (base + (i < rest ? 1 : 0)) / 1000,
        );
      });
    }
    setValues(v);
  }
  const canDivide =
    members.length > 1 &&
    ["RECEIVED", "SORTING"].includes(c.status) &&
    c.quantitiesReviewedAt;
  const current =
    c.allocationVersion > 0 &&
    c.allocationQuantityVersion === c.quantityReviewVersion;
  return (
    <section
      className="border rounded p-3 my-3"
      aria-label="Equipe e divisão dos materiais"
    >
      <h3 className="fs-18">Equipe e divisão dos materiais</h3>
      {c.status === "PENDING" && !c.routeId && (
        <form onSubmit={(e) => save("team", e)}>
          <label htmlFor="collection-team">Equipe desta coleta</label>
          <select
            id="collection-team"
            className="form-select my-2"
            value={teamId}
            disabled={busy}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">Coleta individual</option>
            {teams.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name} · {t.memberIds.length} catadores
              </option>
            ))}
          </select>
          <p className="small text-muted">
            O responsável da coleta precisa participar da equipe. Para coletas
            de uma rota, edite a equipe no roteiro.
          </p>
          <button
            className="btn btn-outline-success"
            disabled={busy || teamId === (c.teamId || "")}
          >
            Salvar equipe da coleta
          </button>
        </form>
      )}
      {!members.length ? (
        <p className="text-muted">
          Coleta individual
          {c.routeId
            ? ". Para trabalho conjunto, selecione uma equipe na edição da rota antes de iniciar."
            : "."}
        </p>
      ) : (
        <>
          <p>
            <strong>{c.teamNameSnapshot || "Equipe"}</strong> ·{" "}
            {members.map((p) => p.nameSnapshot).join(" · ")}
          </p>
          <p className={current ? "text-success" : "text-warning"}>
            {current ? "Divisão confirmada" : "Divisão pendente de conferência"}
          </p>
          <p className="small text-muted">
            As parcelas são atribuídas aos cadastros dos catadores. O estoque e
            o peso da coleta continuam únicos. Se a pesagem mudar, confirme a
            divisão novamente.
          </p>
          {canDivide && (
            <form onSubmit={(e) => save("allocation", e)}>
              <button
                className="btn btn-outline-success mb-3"
                type="button"
                onClick={equal}
                disabled={busy}
              >
                Dividir igualmente
              </button>
              {materials.map((m) => (
                <fieldset
                  className="border rounded p-3 mb-3"
                  key={m.id}
                  disabled={busy}
                >
                  <legend className="fs-16">
                    {m.nameSnapshot} · conferido {num(m.quantity)} {m.unit}
                  </legend>
                  {members.map((p) => (
                    <label key={p.collectorId} className="d-block mb-2">
                      {p.nameSnapshot}
                      <input
                        aria-label={`${m.nameSnapshot} · ${p.nameSnapshot}`}
                        className="form-control"
                        type="number"
                        min="0"
                        max={m.quantity}
                        step="0.001"
                        required
                        value={values[m.id + ":" + p.collectorId] ?? ""}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            [m.id + ":" + p.collectorId]: e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                  <p>
                    Distribuído:{" "}
                    {num(
                      members.reduce(
                        (s, p) =>
                          s + Number(values[m.id + ":" + p.collectorId] || 0),
                        0,
                      ),
                    )}{" "}
                    {m.unit}
                  </p>
                </fieldset>
              ))}
              <label htmlFor="allocation-reason">
                Justificativa / critério da divisão
              </label>
              <textarea
                id="allocation-reason"
                className="form-control mb-3"
                value={reason}
                minLength={5}
                maxLength={1000}
                required
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
              />
              <button className="btn btn-success" disabled={busy}>
                {busy ? "Registrando…" : "Confirmar divisão"}
              </button>
            </form>
          )}
          {!canDivide && (
            <>
              <p className="small text-muted">
                A divisão é registrada após o recebimento e a conferência das
                quantidades. O encerramento exige uma divisão válida.
              </p>
              {members.map((p) => (
                <div className="mb-2" key={p.collectorId}>
                  <strong>{p.nameSnapshot}</strong>:{" "}
                  {(p.allocations || [])
                    .map((a) => `${a.name}: ${num(a.quantity)} ${a.unit}`)
                    .join(" · ") || "Aguardando divisão"}
                </div>
              ))}
            </>
          )}
          {!!c.allocationReviews?.length && (
            <details className="mt-3">
              <summary>
                Histórico de divisões ({c.allocationReviews.length})
              </summary>
              {c.allocationReviews.map((h) => (
                <div key={h.id} className="border-bottom py-2">
                  <strong>
                    Versão {h.version} · {h.actorName}
                  </strong>
                  <p>
                    {new Date(h.createdAt).toLocaleString("pt-BR")} · {h.reason}
                  </p>
                  {h.snapshot?.map((p) => (
                    <p key={p.collectorId}>
                      {p.name}:{" "}
                      {p.materials
                        .map((m) => `${m.name}: ${num(m.quantity)} ${m.unit}`)
                        .join(" · ")}
                    </p>
                  ))}
                </div>
              ))}
            </details>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-danger mt-2">
          {error}
        </p>
      )}
    </section>
  );
}
