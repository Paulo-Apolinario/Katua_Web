import { useCallback } from "react";
import { Link } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { useWasteResource } from "../waste-workspace/useWasteResource";
const kg = (v) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    Number(v || 0),
  ) + " kg";
export default function MixedBagLineage({ lot }) {
  const resource = useWasteResource(
    useCallback(
      () =>
        apiRequest(
          `/mixed-bags/lots/${lot.id}/lineage?revision=${lot.version || 0}`,
          { suppressReadNotice: true },
        ),
      [lot.id, lot.version],
    ),
  );
  if (resource.error)
    return (
      <p role="alert" className="alert alert-warning">
        Não foi possível consultar as bags de origem.{" "}
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => resource.refresh()}
        >
          Tentar novamente
        </button>
      </p>
    );
  if (!resource.data?.outputs.length) return null;
  return (
    <section className="card p-4 mb-4">
      <h2 className="h5">Bags que compõem este lote</h2>
      <p className="small text-muted">{resource.data.note}</p>
      {resource.data.outputs.map((o) => (
        <article className="border-top py-2" key={o.id}>
          <Link to={`/mixed-bags/${o.bag.id}`}>{o.bag.code}</Link>
          <strong className="ms-2">{kg(o.quantityKg)}</strong>
          <div>{o.bag.originLabel}</div>
          <small>
            Lançado por {o.event.actorName} ·{" "}
            {new Date(o.createdAt).toLocaleString("pt-BR", {
              timeZone: "America/Fortaleza",
            })}
          </small>
        </article>
      ))}
      {Number(resource.data.otherInputQuantityKg) > 0 && (
        <p className="small">
          Outras entradas de origem do lote:{" "}
          {kg(resource.data.otherInputQuantityKg)}.
        </p>
      )}
    </section>
  );
}
