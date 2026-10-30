import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDocument, generatorTypeLabel } from "./generatorDocument";

export const registrationTitles = { collectors: "Catadores", generators: "Geradores", drivers: "Motoristas" };
const labels = {
  FOUNDER: "Fundador", EFFECTIVE: "Efetivo", BENEFICIARY: "Beneficiado", CONTRIBUTOR: "Contribuinte",
  FEMALE: "Feminino", MALE: "Masculino", INTERSEX: "Intersexo", NOT_INFORMED: "Prefere não informar",
  CIS_WOMAN: "Mulher cisgênero", CIS_MAN: "Homem cisgênero", TRANS_WOMAN: "Mulher transgênero", TRANS_MAN: "Homem transgênero", NON_BINARY: "Não binário", OTHER: "Outro",
  ATE_1_SM: "Até 1 salário mínimo", "1_A_2_SM": "De 1 a 2 salários mínimos", "2_A_3_SM": "De 2 a 3 salários mínimos", ACIMA_3_SM: "Acima de 3 salários mínimos", NAO_INFORMADO: "Prefere não informar",
  AVAILABLE: "Disponível", ON_ROUTE: "Em rota", INACTIVE: "Inativo", ACTIVE: "Ativo", PENDING_ACTIVATION: "Pendente de ativação", BLOCKED: "Bloqueado",
};
const text = value => value === undefined || value === null || value === "" ? "Não informado" : Array.from(String(value)).filter(char => char.charCodeAt(0) >= 32 || char === "\n" || char === "\t").join("");
const translated = value => labels[value] || text(value);
export function pdfDate(value, withTime = false) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Não informado";
  if (!withTime && /^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10).split("-").reverse().join("/");
  return date.toLocaleString("pt-BR", { timeZone: "America/Fortaleza", ...(withTime ? { dateStyle: "short", timeStyle: "medium" } : { dateStyle: "short" }) });
}
const address = r => [r.street, r.number, r.neighborhood, r.city, r.state, r.zipCode].filter(Boolean).join(", ") || r.address;
export function registrationSections(kind, r) {
  const identity = [["Nome / responsável", r.name], ["E-mail", r.email], ["Telefone", r.phone]];
  let sections;
  if (kind === "collectors") sections = [
    ["Identificação", [...identity, ["Nome social", r.socialName], ["CPF", formatDocument(r.cpf)], ["RG", r.rg], ["Data de nascimento", pdfDate(r.birthDate)], ["Sexo", translated(r.sex)], ["Gênero", translated(r.gender)], ["Endereço", r.address]]],
    ["Dados cooperativos", [["Data de Filiação", pdfDate(r.associationDate)], ["Número de Inscrição", r.registrationNumber], ["Categoria", translated(r.membershipCategory)], ["Autônomo", r.isAutonomous === true ? "Sim" : r.isAutonomous === false ? "Não" : null], ["Status", ["AVAILABLE", "ON_ROUTE"].includes(r.status) ? "Ativo" : translated(r.status)]]],
    ["Perfil socioeconômico", [["Faixa de renda", translated(r.incomeRange)], ["Benefícios sociais", r.socialBenefits], ["Doenças ocupacionais", r.occupationalDiseases], ["Observações", r.socioeconomicNotes]]],
  ];
  else if (kind === "generators") sections = [
    ["Identificação", [...identity, ["Empresa / razão social", r.companyName], ["Classificação", generatorTypeLabel(r)], ["CPF/CNPJ", formatDocument(r.documentNumber)]]],
    ["Endereço e localização", [["Endereço", address(r)], ...(r.address && r.address.trim() !== address(r)?.trim() ? [["Complemento / referência", r.address]] : []), ["Latitude", r.latitude], ["Longitude", r.longitude]]],
    ["Acesso", [["Acesso liberado", r.accessReleased === true ? "Sim" : "Não"], ["Status de acesso", translated(r.accessStatus)]]],
  ];
  else if (kind === "drivers") sections = [
    ["Identificação", [...identity, ["CPF", formatDocument(r.cpf)], ["CNH", r.cnh], ["Categoria da CNH", r.cnhCategory]]],
    ["Situação e observações", [["Status", translated(r.status)], ["Observações", r.notes]]],
  ];
  else throw new Error("Tipo de cadastro inválido.");
  sections.push(["Registro no sistema", [["Identificador", r.id], ["Cadastrado em", pdfDate(r.createdAt, true)], ["Atualizado em", pdfDate(r.updatedAt, true)]]]);
  return sections.map(([title, rows]) => [title, rows.map(([label, value]) => [label, text(value)])]);
}

export function buildRegistrationPdf(kind, records, { cooperative, issuedBy, generatedAt = new Date() } = {}) {
  if (!registrationTitles[kind] || !Array.isArray(records) || !records.length) throw new Error("Não há cadastros para exportar.");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: `Cadastros de ${registrationTitles[kind]}`, author: text(cooperative?.name), creator: "Katuá" });
  const sorted = [...records].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR") || String(a.id).localeCompare(String(b.id)));
  sorted.forEach((record, index) => {
    if (index) doc.addPage();
    const rows = [
      [{ content: `Ficha cadastral · ${registrationTitles[kind]}`, colSpan: 2, styles: { fontSize: 14, fontStyle: "bold", textColor: [17, 90, 65] } }],
      ["Cooperativa", text(cooperative?.name)], ["CNPJ da cooperativa", text(formatDocument(cooperative?.registrationNumber))],
      ["Emissão (horário do Ceará)", pdfDate(generatedAt, true)], ["Emitido por", text(issuedBy)],
      ["Abrangência", `${sorted.length} cadastro(s) · ficha ${index + 1} de ${sorted.length}`],
    ];
    for (const [title, fields] of registrationSections(kind, record)) {
      rows.push([{ content: title, colSpan: 2, styles: { fillColor: [231, 242, 236], textColor: [17, 90, 65], fontStyle: "bold" } }], ...fields);
    }
    autoTable(doc, { startY: 23, body: rows, theme: "grid", margin: { left: 16, right: 16, top: 23, bottom: 20 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, overflow: "linebreak", valign: "top", lineColor: [219, 229, 222], textColor: [30, 45, 40] },
      columnStyles: { 0: { cellWidth: 49, fontStyle: "bold" }, 1: { cellWidth: 129 } }, rowPageBreak: "avoid" });
  });
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(17, 90, 65);
    doc.text(`KATUÁ · CADASTROS DE ${registrationTitles[kind].toLocaleUpperCase("pt-BR")}`, 16, 14);
    doc.setDrawColor(17, 90, 65).line(16, 17, 194, 17);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(95, 105, 100);
    doc.text("Ficha de cadastro · dados registrados na cooperativa", 16, 286);
    doc.text(`${page} / ${total}`, 194, 286, { align: "right" });
  }
  return doc;
}
export function registrationFilename(kind, records) {
  const suffix = records.length === 1 ? String(records[0].id).replace(/[^a-zA-Z0-9_-]/g, "") : "todos";
  const names = { collectors: "catadores", generators: "geradores", drivers: "motoristas" };
  return `katua-cadastros-${names[kind]}-${suffix}.pdf`;
}
