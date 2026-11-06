import { Field } from "./WastePage";
import {
  MATERIAL_OPTIONS,
  emptyProfile,
} from "../../utils/materialIdentification";
export default function MaterialProfileForm({ value, onChange }) {
  const form = { ...emptyProfile, ...value };
  const setForm = (update) => onChange(update(form));
  const field = (name, label, options) => (
    <Field
      key={name}
      {...{ name, label, form, setForm }}
      options={options}
      maxLength={
        name === "composition" ||
        name === "contaminants" ||
        name.endsWith("Evidence") ||
        name === "classificationDocument"
          ? 1000
          : 200
      }
    />
  );
  const opts = (items) =>
    Object.entries(items).map(([value, label]) => ({ value, label }));
  return (
    <section className="mt-4 border-top pt-4">
      <h2 className="fs-18">Material e composição</h2>
      <p className="small text-muted">
        O nome comercial é preservado. Cor, formato e categoria não comprovam
        composição ou periculosidade.
      </p>
      <div className="row g-3">
        {field("materialCode", "Material padronizado", MATERIAL_OPTIONS)}
        {field(
          "identification",
          "Situação da identificação",
          opts({
            UNKNOWN: "Ainda não identificada",
            DECLARED: "Declarada",
            VERIFIED: "Conferida com evidência",
          }),
        )}
        {field("presentation", "Apresentação (latinha, panela, cadeira…) ")}
        {field("color", "Cor / característica comercial")}
        {field("composition", "Composição conhecida / observações")}
        {field("identificationEvidence", "Evidência da identificação")}
        {field("sourceProcess", "Origem / processo gerador")}
        {field("contaminants", "Condições e contaminantes conhecidos")}
        {field("responsible", "Responsável técnico informado")}
      </div>
      <details className="mt-3">
        <summary>Classificação técnica e códigos (opcional)</summary>
        <p className="small text-muted mt-2">
          A classificação não é deduzida pelo material. Cadastre a documentação
          correspondente; registros antigos não são convertidos automaticamente.
        </p>
        <div className="row g-3">
          {field(
            "standardEdition",
            "Edição da ABNT NBR 10004",
            opts({
              "": "Não informada",
              2004: "2004 — histórico",
              2024: "2024 — partes 1 e 2",
            }),
          )}
          {field(
            "hazardClass",
            "Classe técnica",
            opts({
              "": "Não informada",
              ...(form.standardEdition === "2024"
                ? {
                    CLASS_1: "Classe 1 — Perigoso",
                    CLASS_2: "Classe 2 — Não perigoso",
                  }
                : form.standardEdition === "2004"
                  ? {
                      CLASS_I: "Classe I — Perigoso",
                      CLASS_II_A: "Classe II A — Não inerte",
                      CLASS_II_B: "Classe II B — Inerte",
                    }
                  : {}),
            }),
          )}
          {field(
            "classificationStatus",
            "Documentação da classificação",
            opts({
              PENDING: "Pendente / não documentada",
              DOCUMENTED: "Documentada",
            }),
          )}
          {field("classificationDocument", "Documento / laudo de suporte")}
          {field("codeSystem", "Lista de origem do código (LGR, IBAMA…) ")}
          {field("codeVersion", "Versão da lista")}
          {field("technicalCode", "Código técnico")}
        </div>
      </details>
    </section>
  );
}
