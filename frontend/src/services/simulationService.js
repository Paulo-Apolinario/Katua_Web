import { apiRequest } from "./apiClient";
export const simulationNotice = "SIMULAÇÃO — SEM VALIDADE FISCAL OU AMBIENTAL";
export const simulationApi = {
  get: id => apiRequest(id ? `/simulation/workspaces/${encodeURIComponent(id)}` : "/simulation/context", { suppressReadNotice: true }),
  enable: (id, enabled) => apiRequest(`/simulation/workspaces/${encodeURIComponent(id)}/enable`, { method: "POST", body: { enabled }, suppressReadNotice: true }),
  preview: (id, body) => apiRequest(`/simulation/workspaces/${encodeURIComponent(id)}/preview`, { method: "POST", body, suppressReadNotice: true }),
  act: (id, body) => apiRequest(`/simulation/workspaces/${encodeURIComponent(id)}/actions`, { method: "POST", body, suppressReadNotice: true }),
};
export const simUnits = { KG:"kg",TON:"t",LITER:"L",UNIT:"un",CUBIC_METER:"m³" };
export const simMoney = v => Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export const simQuantity = (v,u) => `${Number(v).toLocaleString("pt-BR",{maximumFractionDigits:3})} ${simUnits[u] || u}`;
export const simDocumentLabels = { NFE:"NF-e simulada", MTR:"MTR simulado", CDF:"CDF simulado" };
export const simEventLabels = { ENABLED:"Simulação habilitada",DISABLED:"Simulação desabilitada",ADD_BUYER:"Comprador demonstrativo cadastrado",CREATE_SALE:"Rascunho da venda criado",ISSUE_DOCUMENT:"Documento simulado gerado",CHECK_DOCUMENT:"Resultado demonstrativo consultado",CANCEL_NFE:"NF-e simulada cancelada",DISPATCH:"Saída simulada confirmada",RECEIVE:"Recebimento simulado confirmado",PAYMENT:"Pagamento demonstrativo registrado" };
export const simStatus = { APPROVED:"Confirmado pelo simulador",REJECTED:"Rejeição simulada",UNCERTAIN:"Resultado a consultar",CANCELLED:"Cancelado no simulador",DRAFT:"Rascunho",EXPEDITED:"Saída simulada confirmada",RECEIVED:"Recebimento simulado confirmado" };
export async function downloadSimulationDocument(cooperative,sale,document) {
  const {jsPDF}=await import("jspdf"),{default:autoTable}=await import("jspdf-autotable");
  const pdf=new jsPDF(),width=pdf.internal.pageSize.getWidth();
  function footer(){pdf.setFontSize(9);pdf.setTextColor(150,30,30);pdf.text(simulationNotice,10,pdf.internal.pageSize.getHeight()-12);pdf.setTextColor(0);}
  pdf.setFontSize(12);pdf.setTextColor(150,30,30);pdf.text("SIMULAÇÃO — SEM VALIDADE FISCAL OU AMBIENTAL",10,14);pdf.setTextColor(0);
  pdf.setFontSize(18);pdf.text(simDocumentLabels[document.type],10,27);pdf.setFontSize(10);
  const text=[`Identificador interno: ${document.id}`,`Cooperativa piloto: ${cooperative.name}`,`Venda demonstrativa: ${sale.id}`,`Situação: ${simStatus[document.status]}`,`Data: ${new Date(document.createdAt).toLocaleString("pt-BR",{timeZone:"America/Fortaleza"})} — Fortaleza`, `Comprador/destino demonstrativo: ${document.saleSnapshot.buyer.name}`,`Endereço informado para teste: ${document.saleSnapshot.buyer.address || "Não informado"}`,`Motorista de teste: ${sale.transport.driver} | Veículo de teste: ${sale.transport.vehicle}`];
  let y=37;for(const line of text){const lines=pdf.splitTextToSize(line,width-20);pdf.text(lines,10,y);y+=lines.length*5;}
  const fiscal=document.type==="NFE",lines=document.saleSnapshot.lines;
  autoTable(pdf,{startY:y+3,head:[fiscal?["Material","Quantidade","Preço de teste","Total de teste"]:["Material","Quantidade demonstrativa"]],body:lines.map(l=>fiscal?[l.name,simQuantity(l.quantity,l.unit),simMoney(l.unitPrice),simMoney(l.total)]:[l.name,simQuantity(l.quantity,l.unit)]),margin:{bottom:22},styles:{fontSize:9},didDrawPage:footer});
  y=pdf.lastAutoTable.finalY+10;
  if(fiscal){pdf.text(`Valor da venda simulada: ${simMoney(document.saleSnapshot.total)}`,10,y);y+=8;}
  if(y>240){pdf.addPage();y=20;}
  pdf.setFontSize(10);pdf.text(sale.allocations.length?"Lotes utilizados na saída simulada":"Prévia dos lotes — saída ainda não confirmada",10,y);
  autoTable(pdf,{startY:y+4,head:[["Lote demonstrativo","Retirada simulada","Saldo após retirada"]],body:(sale.allocations.length?sale.allocations:sale.preview).map(a=>[a.lotCode,simQuantity(a.quantity,a.unit),simQuantity(a.after,a.unit)]),styles:{fontSize:9},margin:{bottom:22},didDrawPage:footer});
  y=pdf.lastAutoTable.finalY+8;if(y>235){pdf.addPage();y=20;}
  pdf.setFontSize(9);pdf.text(pdf.splitTextToSize("Documento produzido somente pelo simulador do KATUÁ. Não possui chave fiscal, protocolo oficial, assinatura ou autorização da SEFAZ/SINIR. Tributação não calculada. Não comprova transporte, destinação ou pagamento reais.",190),10,y);
  for(let p=1;p<=pdf.getNumberOfPages();p++){pdf.setPage(p);footer();pdf.setFontSize(8);pdf.setTextColor(150,30,30);pdf.text("DOCUMENTO DEMONSTRATIVO",10,7);pdf.setTextColor(0);}
  pdf.save(`${document.id}-SEM-VALIDADE.pdf`);
}
