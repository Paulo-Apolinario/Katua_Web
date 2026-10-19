import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { House, ChevronRight, ExternalLink, RefreshCw, Download, Copy, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import HeadTags from '../../components/HeadTags';
import RouteAssignmentSummary from '../../components/RouteAssignmentSummary';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getAllRoutes, getRouteById } from '../../services/routeService';
import { MTR_PORTALS, ROUTE_LABELS, COLLECTION_LABELS, buildMtrPreparation, dateKey, formatMtrDate, displayValue } from '../../utils/mtrPreparation';

const initialFilters = { q: '', status: '', driverId: '', vehicleId: '', start: '', end: '' };
const errorMessage = error => error?.error || error?.message || 'Não foi possível consultar as rotas. Tente novamente.';

export default function MtrOnlineStatus() {
  const { admin } = useAdminAuth();
  const accountId = admin?.id;
  const [routeData, setRouteData] = useState({ accountId: null, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [portalId, setPortalId] = useState('');
  const [selection, setSelection] = useState(null);
  const [collectionId, setCollectionId] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef(0);
  const routes = useMemo(() => routeData.accountId === accountId ? routeData.items : [], [routeData, accountId]);
  const selected = selection?.accountId === accountId ? selection.route : null;

  useEffect(() => {
    let ignore = false;
    setLoading(true); setError(''); setRouteData({ accountId, items: [] });
    setSelection(null); setCollectionId(''); setDetailError(''); setDetailLoading(false); detailRequest.current++;
    setPage(1);
    if (!accountId) { setLoading(false); return; }
    getAllRoutes().then(response => {
      if (!Array.isArray(response?.routes)) throw new Error('Resposta de rotas inválida. Atualize e tente novamente.');
      if (!ignore) setRouteData({ accountId, items: response.routes });
    }).catch(err => { if (!ignore) setError(errorMessage(err)); }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [accountId, reload]);

  const portal = MTR_PORTALS.find(item => item.id === portalId);
  const collection = selected?.collections?.find(item => item.id === collectionId);
  const preparation = selected && collection ? buildMtrPreparation(selected, collection, portal) : null;
  const canExport = preparation && portal && collection.status !== 'CANCELLED' && selected.status !== 'CANCELLED' && !detailLoading;
  const drivers = [...new Map(routes.filter(item => item.driver).map(item => [item.driver.id, item.driver])).values()];
  const vehicles = [...new Map(routes.filter(item => item.vehicle).map(item => [item.vehicle.id, item.vehicle])).values()];
  const invalidDates = !!(filters.start && filters.end && filters.start > filters.end);
  const filtered = useMemo(() => routes.filter(route => {
    if (invalidDates) return false;
    const q = filters.q.trim().toLocaleLowerCase('pt-BR');
    if (q && ![route.name, route.id, route.driver?.name, route.vehicle?.plate, route.cooperative?.name].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(q)) return false;
    if (filters.status && route.status !== filters.status) return false;
    if (filters.driverId && route.driverId !== filters.driverId) return false;
    if (filters.vehicleId && route.vehicleId !== filters.vehicleId) return false;
    const date = dateKey(route.scheduledDate);
    if ((filters.start || filters.end) && !date) return false;
    return (!filters.start || date >= filters.start) && (!filters.end || date <= filters.end);
  }), [routes, filters, invalidDates]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const items = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function changeFilter(event) { setFilters(prev => ({ ...prev, [event.target.name]: event.target.value })); setPage(1); }
  async function openRoute(id) {
    const request = ++detailRequest.current;
    setDetailLoading(true); setSelection(null); setCollectionId(''); setDetailError('');
    try {
      const response = await getRouteById(id);
      if (!response?.route || !Array.isArray(response.route.collections)) throw new Error('Detalhes da rota indisponíveis. Tente novamente.');
      if (request === detailRequest.current) {
        setSelection({ accountId, route: response.route });
        const heading = document.getElementById('mtr-ficha');
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) { if (request === detailRequest.current) setDetailError(errorMessage(err)); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  }
  function downloadPreparation() {
    if (!canExport) return;
    const url = URL.createObjectURL(new Blob([preparation.text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ficha-apoio-mtr-${collection.id.replace(/[^a-zA-Z0-9_-]/g, '')}.txt`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyPreparation() {
    if (!canExport) return;
    try { await navigator.clipboard.writeText(preparation.text); toast.success('Ficha copiada. Emita o MTR no portal oficial.'); }
    catch { toast.error('Não foi possível copiar. Use Baixar ficha de apoio.'); }
  }

  return <>
    <HeadTags title="MTR Online" />
    <div className="page-header mb-4">
      <h1 className="fs-30">MTR Online</h1>
      <p>Consulte os dados da operação e acesse o sistema oficial para emitir o Manifesto de Transporte de Resíduos.</p>
      <nav aria-label="Caminho da página"><ol className="breadcrumb">
        <li className="breadcrumb-item"><Link to="/"><House size={16} /> Painel Geral</Link></li>
        <li className="breadcrumb-item"><Link to="/route-list">Gestão de Rotas</Link></li>
        <li className="breadcrumb-item active">MTR Online</li>
      </ol></nav>
    </div>

    <section className="card p-4 mb-4" aria-labelledby="mtr-portais">
      <h2 className="fs-20" id="mtr-portais">Gerar MTR no portal oficial</h2>
      <p>Escolha o sistema aplicável à operação. O KATUÁ abre o portal em outra aba; o cadastro, a emissão e a numeração são realizados pelo órgão responsável.</p>
      <div className="row g-3 align-items-end">
        <div className="col-lg-6"><label htmlFor="mtr-portal" className="form-label">Sistema de emissão</label>
          <select id="mtr-portal" className="form-select" value={portalId} onChange={e => setPortalId(e.target.value)}>
            <option value="">Selecione o portal</option>{MTR_PORTALS.map(item => <option key={item.id} value={item.id}>{item.name} — {item.region}</option>)}
          </select>
        </div>
        <div className="col-lg-6 d-flex gap-2 flex-wrap">{portal ? <>
          <a className="btn btn-success" href={portal.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {portal.id === 'ES' ? 'Acessar emissão e orientações MTR-ES' : 'Acessar emissão de MTR'}</a>
          <a className="btn btn-outline-secondary" href={portal.help} target="_blank" rel="noopener noreferrer">Orientações do órgão</a>
        </> : <span className="text-muted">Selecione um portal para abrir a emissão.</span>}</div>
      </div>
      {portal && <p className="small mt-3 mb-1">{portal.note}</p>}
      <p className="small mt-3 mb-0">Para outros estados ou operações entre estados, <a href="https://sinir.gov.br/sistemas/mtr/" target="_blank" rel="noopener noreferrer">consulte as orientações oficiais do SINIR</a> e confirme o sistema com o responsável ambiental. Entre com suas credenciais somente no portal oficial.</p>
    </section>

    <section className="card p-4 mb-4" aria-labelledby="mtr-rotas">
      <div className="d-flex justify-content-between gap-3 flex-wrap mb-3"><div><h2 className="fs-20" id="mtr-rotas">Rotas da cooperativa</h2><p className="small mb-0">Selecione uma rota e uma coleta para preparar os dados de apoio.</p></div>
        <button className="btn btn-outline-success" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} /> Atualizar rotas</button>
      </div>
      <div className="row g-3 mb-3">
        <div className="col-md-6 col-xl-4"><label className="form-label" htmlFor="mtr-q">Pesquisar rota, motorista ou placa</label><input className="form-control" id="mtr-q" name="q" value={filters.q} onChange={changeFilter} placeholder="Digite para pesquisar" /></div>
        <div className="col-md-6 col-xl-4"><label className="form-label" htmlFor="mtr-status">Status da rota</label><select className="form-select" id="mtr-status" name="status" value={filters.status} onChange={changeFilter}><option value="">Todos</option>{Object.entries(ROUTE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="col-md-6 col-xl-4"><label className="form-label" htmlFor="mtr-driver">Motorista da rota</label><select className="form-select" id="mtr-driver" name="driverId" value={filters.driverId} onChange={changeFilter}><option value="">Todos</option>{drivers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="col-md-6 col-xl-4"><label className="form-label" htmlFor="mtr-vehicle">Veículo da rota</label><select className="form-select" id="mtr-vehicle" name="vehicleId" value={filters.vehicleId} onChange={changeFilter}><option value="">Todos</option>{vehicles.map(item => <option key={item.id} value={item.id}>{item.plate}</option>)}</select></div>
        <div className="col-md-6 col-xl-4"><label className="form-label" htmlFor="mtr-start">Data programada — de</label><input className="form-control" id="mtr-start" name="start" type="date" value={filters.start} onChange={changeFilter} /></div>
        <div className="col-md-6 col-xl-4"><label className="form-label" htmlFor="mtr-end">Data programada — até</label><input className="form-control" id="mtr-end" name="end" type="date" value={filters.end} onChange={changeFilter} /></div>
      </div>
      <button className="btn btn-outline-secondary mb-3" onClick={() => { setFilters(initialFilters); setPage(1); }}>Limpar filtros</button>
      {(filters.start || filters.end) && <p className="small text-muted">O período considera a data programada da rota. Rotas sem data ficam fora deste filtro.</p>}
      {invalidDates && <p className="text-danger" role="alert">A data inicial deve ser anterior ou igual à data final.</p>}
      {loading ? <p role="status">Carregando rotas...</p> : error ? <p className="text-danger" role="alert">{error}</p> : <>
        <p className="small text-muted">{filtered.length} rota(s) encontrada(s). A emissão de MTR não é consultada nesta lista.</p>
        {!items.length && <p className="text-center py-4">{routes.length ? 'Nenhuma rota corresponde aos filtros.' : 'Nenhuma rota cadastrada. Cadastre uma rota em Gestão de Rotas.'}</p>}
        {items.map(route => <article className="border rounded p-3 mb-3" key={route.id}>
          <div className="d-flex justify-content-between flex-wrap gap-3"><div><h3 className="fs-18">{route.name}</h3><div className="small">{ROUTE_LABELS[route.status] || 'Status não informado'} · Data programada: {formatMtrDate(route.scheduledDate)}</div><RouteAssignmentSummary route={route} /></div>
            <div className="d-flex gap-2 align-items-center flex-wrap"><Link className="btn btn-outline-secondary" to={`/edit-route/${route.id}`}>Ver rota <ChevronRight size={16} /></Link><button className="btn btn-success" disabled={detailLoading} onClick={() => openRoute(route.id)}><FileText size={16} /> Preparar dados</button></div>
          </div>
        </article>)}
        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap"><label>Rotas por página <select className="form-select d-inline-block w-auto" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[5, 10, 20, 50].map(n => <option value={n} key={n}>{n}</option>)}</select></label>
          <div className="d-flex align-items-center gap-2"><button className="btn btn-outline-secondary" disabled={currentPage <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {currentPage} de {totalPages}</span><button className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => setPage(value => value + 1)}>Próximo</button></div>
        </div>
      </>}
    </section>

    <section className="card p-4 mb-4" aria-labelledby="mtr-ficha">
      <h2 className="fs-20" id="mtr-ficha" tabIndex={-1}>Ficha de apoio à emissão</h2>
      {detailLoading ? <p role="status">Consultando as coletas da rota...</p> : detailError ? <p className="text-danger" role="alert">{detailError}</p> : selected ? <>
        <h3 className="fs-18">{selected.name}</h3><p>Selecione uma coleta. Os dados abaixo não agrupam geradores diferentes em um único manifesto.</p>
        <label className="form-label" htmlFor="mtr-collection">Coleta da rota</label><select id="mtr-collection" className="form-select mb-3" value={collectionId} onChange={e => setCollectionId(e.target.value)}><option value="">Selecione a coleta</option>{selected.collections.map(item => <option key={item.id} value={item.id}>{item.generator?.companyName || item.generator?.name || 'Gerador não informado'} — {COLLECTION_LABELS[item.status] || 'Status não informado'} — {item.id}</option>)}</select>
        {!selected.collections.length && <p>Nenhuma coleta vinculada a esta rota.</p>}
        {preparation && <>
          <p className="small">Ficha de consulta. A emissão oficial e os campos obrigatórios devem ser conferidos no portal. O KATUÁ não registra nem confirma a emissão do MTR.</p>
          <dl className="row">{preparation.rows.map(([name, value]) => <div className="col-md-6 mb-3" key={name}><dt className="small">{name}</dt><dd className="mb-0 text-break">{displayValue(value)}</dd></div>)}</dl>
          <h3 className="fs-18">Resíduos registrados na coleta</h3>
          {preparation.materials.length ? <div className="table-responsive"><table className="table"><thead><tr><th>Descrição</th><th>Quantidade registrada</th><th>Unidade registrada</th></tr></thead><tbody>{preparation.materials.map((item, i) => <tr key={i}><td>{item.name}</td><td>{item.quantity}</td><td>{item.unit}</td></tr>)}</tbody></table></div> : <p>Sem materiais informados nesta coleta.</p>}
          <h3 className="fs-18">Conferir antes de emitir no portal</h3><ul>{preparation.missing.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="small">Capacidade do veículo, peso registrado, quantidade do resíduo e peso da carga são informações diferentes. Nenhum valor é estimado ou convertido automaticamente.</p>
          {(collection.status === 'CANCELLED' || selected.status === 'CANCELLED') && <p className="text-danger" role="alert">Operação cancelada: a ficha fica disponível apenas para consulta.</p>}
          {!portal && <p>Selecione um sistema de emissão no início da página para exportar a ficha.</p>}
          <div className="d-flex gap-2 flex-wrap"><button className="btn btn-outline-success" disabled={!canExport} onClick={downloadPreparation}><Download size={16} /> Baixar ficha de apoio</button><button className="btn btn-outline-secondary" disabled={!canExport} onClick={copyPreparation}><Copy size={16} /> Copiar ficha</button>{canExport && <a className="btn btn-success" href={portal.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Abrir portal para emitir</a>}</div>
        </>}
      </> : <p>Use Preparar dados em uma rota para consultar as coletas e montar a ficha.</p>}
    </section>
    <section className="card p-4"><h2 className="fs-20">Emissão, recebimento e destinação</h2><p className="mb-0">Após emitir, acompanhe o recebimento, o CDF e a DMR no sistema oficial aplicável. O status da rota ou da coleta no KATUÁ não representa o status do manifesto.</p></section>
  </>;
}
