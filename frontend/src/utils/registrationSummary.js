import { validDocument } from "./generatorDocument";
export function missingRegistrationFields(kind, record) {
  if (Array.isArray(record.missingRegistrationFields))
    return record.missingRegistrationFields;
  const fields = [];
  if (
    !validDocument(
      (kind === "GENERATOR" ? record.documentNumber : record.cpf) || "",
    )
  )
    fields.push(kind === "GENERATOR" ? "documentNumber" : "cpf");
  if (!record.email) fields.push("email");
  if (!record.phone) fields.push("phone");
  if (!record.address && !(record.street && record.city))
    fields.push("address");
  return fields;
}
