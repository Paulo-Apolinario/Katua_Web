import { formatUnits, formatQuantity } from "../../utils/impactAnalysis";
const reasons = {
  MISSING_QUANTITY: "Quantidade ainda não informada ou pesada",
  NON_MASS_UNIT: "Unidade sem conversão técnica para massa",
  NO_COMPATIBLE_FACTOR: "Sem fator compatível para o material ou apresentação",
  IDENTIFICATION_UNKNOWN: "Material ainda não identificado",
  AMBIGUOUS_MATERIAL: "Descrição com materiais conflitantes",
  CONDITIONS_REVIEW: "Condições ou contaminantes precisam de revisão",
  CUSTOM_REQUIREMENTS:
    "Metodologia própria: faltam conferência, fator ou validação",
  DISABLED: "Cálculo desativado na configuração",
};
export default function ReferenceFactors({ data }) {
  return (
    <>
      <div className="mb-3">
        <strong>Por que algumas quantidades não entram no cálculo?</strong>
        {Object.entries(data.factorDiagnostics || {}).map(([reason, units]) => (
          <p key={reason} className="small mb-1">
            {reasons[reason] || reason}: {formatUnits(units)}
          </p>
        ))}
        {!Object.keys(data.factorDiagnostics || {}).length && (
          <p className="small">
            Nenhuma quantidade excluída por falta de correspondência ou unidade.
          </p>
        )}
      </div>
      <details className="mb-3">
        <summary>Consultar a base de fatores incluída</summary>
        <p className="small mt-2">
          EPA WARM v16, dezembro de 2023, cenário dos Estados Unidos: reciclagem
          comparada ao aterro. Não foi calibrado para a cooperativa. CO₂e em kg
          por kg; energia total em kWh equivalentes por kg, incluindo
          combustíveis e eletricidade. Água e árvores não são modeladas nesta
          base.
        </p>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Material de referência</th>
                <th>CO₂e (kg/kg)</th>
                <th>Energia (kWh eq./kg)</th>
              </tr>
            </thead>
            <tbody>
              {data.referenceFactors?.map((f) => (
                <tr key={f.id}>
                  <td>{f.label}</td>
                  <td>{formatQuantity(f.co2PerKg)}</td>
                  <td>{formatQuantity(f.energyPerKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small">
          Papelão genérico usa o cenário de papelão ondulado; papel sem subtipo
          usa papel misto. Latas, lingotes e fios exigem correspondência
          específica. A correspondência para cálculo não altera a classificação
          técnica dos registros.
        </p>
        <a
          href="https://www.epa.gov/system/files/documents/2024-01/warm_management_practices_v16_dec.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Consultar os quadros 1-1 e 7-12 da fonte oficial
        </a>
      </details>
    </>
  );
}
