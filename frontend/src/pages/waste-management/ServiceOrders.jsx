import "./ServiceOrders.css";
import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { useWasteResource } from "../../components/waste-workspace/useWasteResource";
import { quantity } from "../../utils/collectionWorkspace";
import CollectionDialog from "../../components/collections/CollectionDialog";
import { documentLabels, stateLabels, internalDocumentSections, internalDate as dateLabel } from "../../utils/internalDocumentPdf";
export default function ServiceOrders() {
  const [params, setParams] = useSearchParams(),
    [draft, setDraft] = useState(params.get('q') || ''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null);
  const orderId = params.get('ordem'),
    tab = params.get('aba') || 'orders',
    page = Number(params.get('page')) || 1;
  const listQuery = new URLSearchParams(params);
  ['ordem', 'aba'].forEach(k => listQuery.delete(k));
  const requestQuery = listQuery.toString();
  const list = useWasteResource(useCallback(() => apiRequest((tab === 'documents' ? '/internal-documents?' : '/service-orders?') + requestQuery), [tab, requestQuery]));
  const detail = useWasteResource(useCallback(() => orderId ? apiRequest('/service-orders/' + encodeURIComponent(orderId)) : Promise.resolve(null), [orderId]));
  function change(values) {
    setParams(old => {
      const n = new URLSearchParams(old);
      for (const [k, v] of Object.entries(values)) {
        if (v) n.set(k, v);else n.delete(k);
      }
      return n;
    });
  }
  async function document(id, download = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiRequest('/internal-documents/' + encodeURIComponent(id));
      if (download) {
        const {
          buildInternalDocumentPdf
        } = await import('../../utils/internalDocumentPdf');
        buildInternalDocumentPdf(data.document).save(data.document.number + '.pdf');
      } else setPreview(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const documents = rows => rows.length ? <div className="d-flex flex-column gap-3">{rows.map(d => <article key={d.id} className="border rounded p-3 d-flex flex-wrap justify-content-between align-items-center gap-3"><div><strong>{documentLabels[d.kind] || d.kind}</strong><div className="small text-break">{d.number} · {dateLabel(d.createdAt, true)}</div><div className="small">{d.orders?.map(o => <Link key={o.serviceOrder.id} className="me-2" to={'/service-orders?ordem=' + o.serviceOrder.id}>{o.serviceOrder.number}</Link>)}</div>{d.kind === 'SERVICE_ORDER' && <small className="text-muted">Versão preservada da programação na emissão.</small>}</div><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-success" disabled={busy} onClick={() => document(d.id)}>Visualizar</button><button className="btn btn-sm btn-outline-success" disabled={busy} onClick={() => document(d.id, true)}>Baixar PDF</button></div></article>)}</div> : <p className="text-muted">Nenhum documento emitido para esta referência. A O.S. de programação é emitida quando a equipe, o motorista e o veículo estão definidos; comprovantes acompanham a execução.</p>;
  const current = detail.data?.current;
  return <div className="p-3 p-md-4"><div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3"><div><p className="small text-success fw-bold mb-1">KATUÁ · COLETA DE RESÍDUO</p><h1 className="fs-24">Ordens de Serviço</h1><p>Programação, execução e documentos internos vinculados ao serviço.</p></div><Link to="/waste-list" className="btn btn-outline-secondary">Consultar coletas</Link></div>
 <div className="d-flex flex-wrap gap-2 mb-3"><button className={'btn ' + (tab === 'orders' ? 'btn-success' : 'btn-outline-secondary')} onClick={() => change({
        aba: null,
        ordem: null,
        page: null,
        kind: null,
        lotId: null
      })}>Ordens de Serviço</button><button className={'btn ' + (tab === 'documents' ? 'btn-success' : 'btn-outline-secondary')} onClick={() => change({
        aba: 'documents',
        ordem: null,
        page: null,
        status: null
      })}>Todos os documentos</button></div>
 <p className="small text-muted">Documentos internos de controle operacional. A coleta pode estar encerrada enquanto seus materiais seguem em estoque ou aguardam destinação.</p>
 <form className="card p-3 mb-3" onSubmit={e => {
      e.preventDefault();
      change({
        q: draft.trim(),
        page: null,
        ordem: null
      });
    }}><div className="row g-3"><div className="col-md-5"><label className="form-label" htmlFor="os-search">{tab === 'orders' ? 'Buscar O.S., coleta, rota, gerador ou equipe' : 'Buscar número do documento, O.S., coleta ou lote'}</label><input id="os-search" className="form-control" value={draft} onChange={e => setDraft(e.target.value)} maxLength={100} /></div><div className="col-md-3"><label className="form-label" htmlFor="os-from">Emissão a partir de</label><input id="os-from" type="date" className="form-control" value={params.get('dateFrom') || ''} onChange={e => change({
            dateFrom: e.target.value,
            page: null
          })} /></div><div className="col-md-3"><label className="form-label" htmlFor="os-to">Emissão até</label><input id="os-to" type="date" className="form-control" value={params.get('dateTo') || ''} onChange={e => change({
            dateTo: e.target.value,
            page: null
          })} /></div>{tab === 'orders' && <div className="col-md-5"><label htmlFor="os-status" className="form-label">Situação atual do serviço</label><select id="os-status" className="form-select" value={params.get('status') || ''} onChange={e => change({
            status: e.target.value,
            page: null
          })}><option value="">Todas</option>{['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COLLECTED', 'RECEIVED', 'SORTING', 'COMPLETED', 'CANCELLED'].map(v => <option key={v} value={v}>{stateLabels[v]}</option>)}</select></div>}{tab === 'documents' && <div className="col-md-5"><label htmlFor="os-kind" className="form-label">Tipo de documento</label><select id="os-kind" className="form-select" value={params.get('kind') || ''} onChange={e => change({
            kind: e.target.value,
            page: null
          })}><option value="">Todos</option>{Object.entries(documentLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>}</div><div className="d-flex flex-wrap gap-2 mt-3"><button className="btn btn-success">Aplicar filtros</button><button type="button" className="btn btn-outline-secondary" onClick={() => {
          setDraft('');
          setParams(tab === 'documents' ? {
            aba: 'documents'
          } : {});
        }}>Limpar filtros</button><button type="button" className="btn btn-outline-secondary" onClick={() => {
          list.refresh();
          detail.refresh();
        }}>Atualizar</button></div>{params.get('collectionId') && <small className="mt-2 text-break">Referência da coleta: {params.get('collectionId')}</small>}{params.get('lotId') && <small className="mt-2 text-break">Referência do lote: {params.get('lotId')}</small>}</form>
 {(error || list.error || detail.error) && <p className="alert alert-danger" role="alert">{error || list.error || detail.error}</p>}
 {orderId && <section className="card p-3 mb-3"><div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h2 className="fs-20 mb-0">{detail.data?.order.number || 'Carregando O.S...'}</h2><button className="btn btn-sm btn-outline-secondary" onClick={() => change({
          ordem: null
        })}>Fechar detalhes</button></div>{current && <><h3 className="fs-18">{current.route?.name || 'Coleta individual'} · situação atual</h3>{current.route && <p>{stateLabels[current.route.status] || current.route.status} · {dateLabel(current.route.date, true)}{current.route.outcome ? ' · ' + (stateLabels[current.route.outcome] || current.route.outcome) : ''}</p>}<div className="d-flex flex-column gap-2 mb-4">{current.collections?.map(c => <article className="border rounded p-3" key={c.id}><div className="d-flex flex-wrap justify-content-between gap-2"><strong>{c.origin}</strong><span>{stateLabels[c.status] || c.status}</span></div><small className="d-block">{c.address}</small><small className="d-block">{c.collector || 'Catador a definir'} · {c.driver || current.route?.driver || 'Motorista a definir'} · {c.vehicle || current.route?.vehicle || 'Veículo a definir'}</small><div className="small">{c.materials?.map(m => m.name + ': ' + quantity(m.quantity, m.unit)).join(' · ')}</div>{c.cancellationReason && <p className="small">Motivo: {c.cancellationReason}</p>}{c.incidents?.map((i, n) => <p className="small mb-1" key={n}>{i.description}{i.resolution ? ' · ' + i.resolution : ''}</p>)}<Link className="btn btn-sm btn-outline-success mt-2" to={'/waste-list?coleta=' + encodeURIComponent(c.id)}>Ver coleta</Link></article>)}</div></>}
 <h3 className="fs-18">Documentos desta O.S.</h3>{detail.loading && !detail.data ? <p role="status">Carregando documentos...</p> : documents(detail.data?.documents || [])}</section>}
 <section className="card p-3">{list.loading && <p role="status">Consultando registros...</p>}{tab === 'orders' ? list.data?.orders?.length ? <div className="table-responsive"><table className="table align-middle service-order-table"><thead><tr><th>O.S. / serviço</th><th>Programação</th><th>Situação</th><th>Documentos</th><th>Ações</th></tr></thead><tbody>{list.data.orders.map(o => <tr key={o.id}><td><strong>{o.number}</strong><div>{o.title}</div><small>{o.sourceType === 'ROUTE' ? `Execução de rota · ${o.points} ponto(s)` : 'Coleta individual'}</small></td><td>{dateLabel(o.scheduledDate, true)}</td><td>{stateLabels[o.status] || o.status}{o.outcome && <small className="d-block">{stateLabels[o.outcome] || o.outcome}</small>}</td><td>{o._count.documents}</td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-success text-nowrap" onClick={() => change({
                    ordem: o.id
                  })}>Ver documentos e pontos</button>{o.documents?.[0] && <button className="btn btn-sm btn-outline-success text-nowrap" disabled={busy} onClick={() => document(o.documents[0].document.id, true)}>Baixar O.S.</button>}</div></td></tr>)}</tbody></table></div> : !list.loading && <p>Nenhuma ordem de serviço corresponde aos filtros.</p> : documents(list.data?.documents || [])}<div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3"><small>{list.data?.pagination.total || 0} registro(s)</small><div className="d-flex align-items-center gap-2"><button className="btn btn-sm btn-outline-secondary" disabled={page <= 1 || list.loading} onClick={() => change({
            page: String(page - 1)
          })}>Anterior</button><span>{page} / {list.data?.pagination.totalPages || 1}</span><button className="btn btn-sm btn-outline-secondary" disabled={page >= (list.data?.pagination.totalPages || 1) || list.loading} onClick={() => change({
            page: String(page + 1)
          })}>Próxima</button></div></div></section>
 {preview && <CollectionDialog title={documentLabels[preview.document.kind] || 'Documento interno'} busy={busy} onClose={() => setPreview(null)}><p className="small">Registro interno · dados preservados na emissão. Não substitui documentos oficiais.</p>{preview.destinationCurrentState && <p className="alert alert-light small">Situação atual do encaminhamento: {stateLabels[preview.destinationCurrentState.status] || preview.destinationCurrentState.status}. Versão atual: {preview.destinationCurrentState.version}. {preview.destinationCurrentState.cancelledReason}</p>}<button className="btn btn-outline-success mb-3" disabled={busy} onClick={() => document(preview.document.id, true)}>Baixar PDF</button>{internalDocumentSections(preview.document).map(([title, rows], i) => <section key={i} className="mb-4"><h3 className="fs-18">{title}</h3><dl>{rows.map(([k, v], n) => <div key={n} className="border-bottom py-2"><dt className="small">{k}</dt><dd className="mb-0 text-break">{v}</dd></div>)}</dl></section>)}</CollectionDialog>}
 </div>;
}
