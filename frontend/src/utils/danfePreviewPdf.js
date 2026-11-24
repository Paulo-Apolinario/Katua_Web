// Visual preparation based on the supplied DANFE. Never an authorized fiscal document.
const units={KG:'KG',TON:'T',LITER:'L',UNIT:'UN',CUBIC_METER:'M3'};
const money=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
export async function buildDanfePreview({cooperative,buyer,lines,total,number,date,transport={},notes='',simulation=true}){
 const {jsPDF}=await import('jspdf'),{default:autoTable}=await import('jspdf-autotable');
 const pdf=new jsPDF({format:'a4'}),notice=simulation?'SIMULAÇÃO - SEM VALIDADE FISCAL':'RASCUNHO - SEM VALIDADE FISCAL';
 const dateText=new Date(date).toLocaleDateString('pt-BR',{timeZone:'America/Fortaleza'});
 function text(v,x,y,size=7,bold=false,max=180,maxLines=30){pdf.setCharSpace(0);pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);const rows=pdf.splitTextToSize(String(v||'Não informado'),max);pdf.text(rows.slice(0,maxLines),x,y);}
 function cell(label,value,x,y,w,h=9){pdf.setDrawColor(35);pdf.setLineWidth(.2);pdf.rect(x,y,w,h);text(label.toUpperCase(),x+1,y+2.5,5,false,w-2);pdf.setFont('helvetica','normal');let size=7;pdf.setFontSize(size);while(pdf.getTextWidth(String(value||'Não informado'))>w-2&&size>5){size-=.5;pdf.setFontSize(size);}text(value,x+1,y+6.3,size,false,w-2,Math.max(1,Math.floor((h-4)/(size*.4))));}
 function section(label,y){text(label.toUpperCase(),10,y,8,true);}
 function frame(){
  pdf.setTextColor(175,25,25);text(notice,10,8,11,true);pdf.setTextColor(0);
  cell('Recebimento demonstrativo',`Produtos da preparação ${number}`,10,12,154,10);cell('Documento de teste',number,164,12,36,10);
  cell('Data de recebimento','____ / ____ / ______',10,22,40,9);cell('Identificação e assinatura do recebedor','Sem efeito fiscal ou comprovação de entrega',50,22,150,9);
  pdf.setLineDashPattern([1,1],0);pdf.line(10,34,200,34);pdf.setLineDashPattern([],0);
  pdf.rect(10,37,79,37);text(cooperative.name,12,42,9,true,74,3);
  text([cooperative.address||[cooperative.street,cooperative.number].filter(Boolean).join(', '),[cooperative.neighborhood,cooperative.city,cooperative.state].filter(Boolean).join(' / '),cooperative.zipCode&&`CEP: ${cooperative.zipCode}`,cooperative.phone,cooperative.email].filter(Boolean).join('\n')||'Endereço não informado',12,54,6,false,74,7);
  pdf.rect(90,37,38,37);text('DANFE',94,43,14,true);text('MODELO VISUAL\nDE TESTE\n1 - Saída\n'+number,92,49,7,true,34);
  pdf.rect(129,37,71,14);text('DOCUMENTO NÃO VÁLIDO',133,45,10,true,63);
  cell('Chave de acesso','NÃO GERADA - DOCUMENTO DE TESTE',129,51,71,11);
  pdf.rect(129,62,71,12);text('Sem consulta de autenticidade.\nNenhuma autorização da SEFAZ.',131,67,7,false,67);
  cell('Natureza da operação','Preparação de venda de materiais recicláveis',10,76,119,10);cell('Protocolo de autorização','NÃO EXISTE - SEM TRANSMISSÃO',129,76,71,10);
  cell('Inscrição estadual','A conferir',10,86,64);cell('Inscrição estadual substituto tributário','A conferir',74,86,55);cell('CNPJ do emitente',cooperative.registrationNumber||'Não informado',129,86,71);
  section('Destinatário / remetente',100);
  cell('Nome / razão social',buyer.name,10,102,125);cell('CNPJ / CPF',buyer.document||'Não informado',135,102,40);cell('Emissão',dateText,175,102,25);
  cell('Endereço',buyer.address||'Não informado',10,111,165);cell('Saída / entrada',dateText,175,111,25);
  cell('Município / bairro / CEP','A conferir no cadastro do destinatário',10,120,125);cell('UF','A conferir',135,120,20);cell('Inscrição estadual','A conferir',155,120,45);
  section('Fatura',134);cell('Condição de pagamento','A definir na operação comercial',10,136,190,9);
  section('Cálculo do imposto - não calculado neste ambiente',150);
  const labels=['Base ICMS','Valor ICMS','Base ICMS ST','Valor ICMS ST','Total dos produtos'];labels.forEach((l,i)=>cell(l,i===4?money(total):'Não calculado',10+i*38,152,38));
  const more=['Frete','Seguro','Desconto','Outras despesas','IPI','Total da preparação'];more.forEach((l,i)=>cell(l,i===5?money(total):'Não calculado',10+i*(190/6),161,190/6));
  section('Transportador / volumes transportados',175);
  cell('Motorista / transportador',transport.driver||'Não informado',10,177,105);cell('Frete por conta','A conferir',115,177,45);cell('Placa do veículo',transport.vehicle||'Não informado',160,177,40);
  cell('Endereço / município / UF','A conferir',10,186,105);cell('Quantidade / espécie de volumes','A conferir',115,186,85);
  ['Quantidade','Espécie','Marca','Numeração','Peso bruto','Peso líquido'].forEach((label,i)=>cell(label,'A conferir',10+i*190/6,195,190/6,9));
  section('Dados dos produtos / serviços',209);
  section('Dados adicionais',259);cell('Informações complementares',notice,10,261,130,25);cell('Reservado ao fisco','Não se aplica - documento de teste',140,261,60,25);
  text(pdf.splitTextToSize('Tributação não calculada. Não substitui NF-e, MTR ou CDF. '+notes,123).slice(0,4).join('\n'),11,272,6,false,127);
  pdf.setTextColor(175,25,25);text(notice,10,292,9,true);pdf.setTextColor(0);
 }
 const head=['Cód.','Descrição do produto / serviço','NCM','O/CST','CFOP','Un.','Quant.','V. unit.','V. total','Base ICMS','Base ICMS ST','V. ICMS ST','V. ICMS','V. IPI','Alíq. ICMS','Alíq. IPI','Tributos aprox.'];
 autoTable(pdf,{startY:211,margin:{left:10,right:10,top:211,bottom:43},head:[head],body:lines.map((l,i)=>[i+1,l.name,l.ncm||'A conferir','--','--',units[l.unit]||l.unit,Number(l.quantity).toLocaleString('pt-BR',{maximumFractionDigits:3}),Number(l.unitPrice).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4}),money(l.total),'--','--','--','--','--','--','--','--']),theme:'grid',rowPageBreak:'avoid',styles:{font:'helvetica',fontSize:5.5,cellPadding:1,lineColor:30,lineWidth:.15,textColor:0,overflow:'linebreak'},headStyles:{fillColor:[245,245,245],textColor:0,fontStyle:'bold'},columnStyles:Object.fromEntries([7,40,13,7,8,7,12,13,14,9,9,9,9,8,7,7,11].map((width,i)=>[i,{cellWidth:width}])),willDrawPage:frame});
 for(let p=1;p<=pdf.getNumberOfPages();p++){pdf.setPage(p);text(`Folha ${p} de ${pdf.getNumberOfPages()}`,166,9,7);}
 return pdf;
}
