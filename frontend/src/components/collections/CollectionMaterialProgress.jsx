import { Link } from "react-router";
import { collectionEntries, entryDisposition } from "../../utils/materialDisposition";
import { quantity } from "../../utils/collectionWorkspace";
export default function CollectionMaterialProgress({ collection }) {
  const entries = collectionEntries(collection);
  if (!entries.length) return null;
  return <section className="border rounded p-3 my-3" aria-label="Situação dos materiais">
    <h3 className="fs-18">Situação dos materiais</h3>
    <p className="small text-muted">A coleta pode ser concluída quando todo o material estiver encaminhado. Estoque, triagem e reserva continuam em acompanhamento após a conclusão.</p>
    {entries.map(entry => {
      const progress = entryDisposition(entry);
      return <div key={entry.id} className="border-top py-2">
        <strong>{entry.materialNameSnapshot}</strong><span className={`badge ms-2 text-bg-${progress.remaining ? "warning" : progress.followUp ? "info" : "success"}`}>{progress.label}</span>
        <p className="small my-2">Sem encaminhamento: {quantity(progress.remaining, entry.unit)} · Em acompanhamento: {quantity(progress.followUp, entry.unit)} · Etapa final: {quantity(progress.final, entry.unit)}</p>
        <Link className="btn btn-sm btn-outline-success" to={`/waste-destinations?entryId=${encodeURIComponent(entry.id)}`}>Ver encaminhamentos</Link>
      </div>;
    })}
  </section>;
}
