import { CollectionBadge } from "./WorkspaceParts";
export default function FieldOperationBadge({ collection }) {
  if(collection?.attendanceOutcome === "NOT_COLLECTED") return <span className="badge text-bg-secondary">Sem coleta no dia</span>;
  if (
    collection?.status === "PENDING" &&
    collection.route?.status === "IN_PROGRESS"
  )
    return (
      <>
        <span className="badge text-bg-primary">Em campo</span>
        <small className="d-block text-muted mt-1">
          Aguardando atendimento neste ponto
        </small>
      </>
    );
  if (collection?.status === "IN_PROGRESS")
    return <span className="badge text-bg-primary">Em atendimento</span>;
  return <CollectionBadge status={collection?.status} />;
}
