import { documentType, validDocument, formatDocument } from "../../utils/generatorDocument";

export default function GeneratorDocumentField({ value, onChange, type, disabled = false, legacy = false }) {
  const valid = validDocument(value), kind = valid ? documentType(value) : null;
  const classification = type === "LARGE" ? "Grande gerador" : kind === "CPF" ? "Gerador residencial cadastrado" : kind === "CNPJ" ? "Pequeno gerador" : null;
  return <div className="col-md-6">
    <label className="form-label" htmlFor="generator-document">CPF/CNPJ{type === "SMALL" && !legacy ? " *" : ""}</label>
    <input id="generator-document" name="documentNumber" type="text" className="form-control"
      value={value} onChange={event => onChange(formatDocument(event.target.value))} maxLength={18}
      autoComplete="off" spellCheck={false} disabled={disabled} required={type === "SMALL" && !legacy}
      aria-describedby="generator-document-help generator-document-status" placeholder="000.000.000-00 ou 00.000.000/0000-00" />
    <small id="generator-document-help" className="text-muted d-block mt-1">
      {type === "SMALL" ? "CPF: residencial cadastrado. CNPJ: pequeno gerador. Ambos usam o mesmo acesso de gerador." : "Documento opcional. Para grande gerador, informe um CNPJ."}
    </small>
    <div id="generator-document-status" className="small mt-2" role="status" aria-live="polite">
      {value && !valid ? <span className="text-muted">Complete um CPF ou CNPJ válido para identificar o cadastro.</span>
        : type === "LARGE" && kind === "CPF" ? <span className="text-danger">Para grande gerador, informe um CNPJ.</span>
        : classification && kind ? <span className="badge text-bg-success">{kind} · {classification}</span>
        : legacy ? <span className="text-muted">Cadastro anterior sem documento. Informe CPF/CNPJ para classificá-lo; os demais dados podem ser atualizados.</span> : null}
    </div>
  </div>;
}
