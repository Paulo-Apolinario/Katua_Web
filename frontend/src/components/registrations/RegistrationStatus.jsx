import { Link } from "react-router";
import { missingRegistrationFields } from "../../utils/registrationSummary";
const labels = {
  documentNumber: "CPF/CNPJ",
  cpf: "CPF",
  email: "e-mail",
  phone: "telefone",
  address: "endereço",
};
export default function RegistrationStatus({ kind, record, to }) {
  const missing = missingRegistrationFields(kind, record);
  const hasAccess =
    record.hasOnlineAccess ?? Boolean(record.userId || record.accessReleased);
  return (
    <div className="mt-2">
      <span
        className={`badge ${missing.length ? "text-bg-warning" : "text-bg-success"}`}
      >
        {missing.length ? "Cadastro a completar" : "Dados básicos completos"}
      </span>
      {missing.length > 0 && (
        <small className="d-block text-muted mt-1">
          Faltam: {missing.map((field) => labels[field] || field).join(", ")}.
        </small>
      )}
      <small className="d-block text-muted">
        {hasAccess
          ? "Conta de acesso ativada"
          : record.accessActivationPending ? "Aguardando definição da senha" : "Cadastro operacional · acesso não ativado"}
      </small>
      {missing.length > 0 && to && (
        <Link to={to} className="d-inline-block mt-1">
          Completar cadastro
        </Link>
      )}
    </div>
  );
}
