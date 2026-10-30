import { Link } from "react-router";
import { quantity, dateLabel } from "../../utils/collectionWorkspace";
import { getWasteDestinationTypeLabel } from "../../services/collectionWasteDestinationService";
const finalKinds={SALE:'Venda / entrega',DONATION:'Doação',DIRECT_DESTINATION:'Envio direto',DISPOSAL:'Descarte'};
export default function MaterialDestinations({entry,compact=false,showActions=true}) {
  const active=(entry.destinations||[]).filter(d=>d.status!=='CANCELLED');
  if(!active.length)return null;
  return <>
    {compact && <div className="small mt-2">{active.slice(0,2).map(d => {
      const finalNames=d.stockLot?.movements?.map(m=>m.destinationName).filter(Boolean)||[];
      const target=d.type==='STOCK' ? Number(d.stockLot?.availableQuantity)>0 ? `Em estoque: ${quantity(d.stockLot.availableQuantity,entry.unit)}` : finalNames.length ? [...new Set(finalNames)].join(', ') : 'Saída anterior sem destinatário informado' : d.destinationName || (d.type==='REJECT'?'Rejeito — consultar justificativa':'Destinatário não informado');
      return <div key={d.id}><strong>{entry.materialNameSnapshot}</strong> · {getWasteDestinationTypeLabel(d.type)} → {target}</div>;
    })}{active.length>2&&<span>Mais {active.length-2} encaminhamento(s) nos detalhes.</span>}</div>}
    <details className="small mt-3 mb-3" open={!compact}>
    <summary>{Number(entry.remainingQuantity)>0?'Encaminhamentos registrados':'Destinos e acompanhamento do material'}</summary>
    {active.map(d=><div key={d.id} className="border-start ps-2 my-3">
      <strong>{entry.materialNameSnapshot}</strong> · {quantity(d.quantity,entry.unit)} · {getWasteDestinationTypeLabel(d.type)}
      {d.type==='STOCK'?<>
        <div>{d.stockLot?.movements?.length?d.stockLot.movements.map(m=><div key={m.id}>{finalKinds[m.kind]} → {m.destinationName||'Destinatário não informado'} · {quantity(m.quantity,entry.unit)} · {dateLabel(m.movementDate)}</div>):['SOLD','DESTINED','DISCARDED'].includes(d.stockLot?.status)?'Saída anterior registrada; destinatário não informado.':'Material em estoque, aguardando saída.'}</div>
        {Number(d.stockLot?.availableQuantity)>0&&<div>Ainda em estoque: {quantity(d.stockLot.availableQuantity,entry.unit)}</div>}
        {showActions&&(d.stockLotId||d.stockLot?.id)&&<div className="d-flex flex-wrap gap-2 mt-2"><Link className="btn btn-sm btn-outline-success" to={`/waste-stock/lots/${d.stockLotId||d.stockLot?.id}/edit`}>Ver lote e todas as saídas</Link></div>}
      </>:<div>{['TRIAGE','RESERVATION'].includes(d.type)?'Em acompanhamento':'Destino registrado'} → {d.destinationName|| (d.type==='REJECT'?'Rejeito — consultar justificativa':'Destinatário não informado')}</div>}
    </div>)}
    {showActions&&<div className="d-flex flex-wrap align-items-center gap-2 mt-3"><Link className="btn btn-sm btn-outline-secondary" to={`/waste-destinations?entryId=${encodeURIComponent(entry.id)}`}>Ver destinações e documentos</Link></div>}
  </details></>;
}
