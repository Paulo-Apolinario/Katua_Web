// Portais oficiais conferidos em 19/10/2026. A escolha do sistema é do responsável pela operação.
export const MTR_PORTALS = [
  { id: 'NACIONAL', name: 'SINIR — MTR Nacional', region: 'Nacional', url: 'https://mtr.sinir.gov.br/', help: 'https://sinir.gov.br/sistemas/mtr/', note: 'Acesso pelo Gov.br. Confira o vínculo do usuário com a unidade.' },

];

// A escolha do documento fiscal depende da operação e do cadastro da cooperativa.
export const FISCAL_PORTALS = [
  { id: 'NFA_CE', name: 'Mercadorias — Nota Fiscal Avulsa do Ceará', scope: 'Fortaleza e interior do Ceará', url: 'https://www.sefaz.ce.gov.br/nota-fiscal-avulsa/', action: 'Acessar solicitação de NFA', note: 'Serviço da Sefaz-CE. Confira com a contabilidade se a operação e o cadastro permitem nota avulsa. Para NF-e própria, utilize o emissor da cooperativa.' },
  { id: 'NFSE_FORTALEZA', name: 'Serviços — NFS-e de Fortaleza', scope: 'Inscrição municipal em Fortaleza', url: 'https://iss.fortaleza.ce.gov.br/', action: 'Acessar emissão em Fortaleza', note: 'Acesso ao ISS Fortaleza. Confirme o serviço, o cadastro municipal e o sistema aplicável à cooperativa.' },
  { id: 'NFSE_NACIONAL', name: 'Serviços — Emissor Nacional de NFS-e', scope: 'Conforme habilitação do contribuinte e do município', url: 'https://www.nfse.gov.br/EmissorNacional', action: 'Acessar Emissor Nacional', note: 'Para cooperativas do interior, confirme com a prefeitura se a emissão ocorre aqui ou no sistema municipal. Não utilize o portal de Fortaleza para outro município por presunção.' },
];

export const ROUTE_LABELS = { PENDING: 'Pendente', SCHEDULED: 'Agendada', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
export const COLLECTION_LABELS = { PENDING: 'Pendente', IN_PROGRESS: 'Em andamento', COLLECTED: 'Finalizada em campo', RECEIVED: 'Recebida', SORTING: 'Em triagem', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
const pending = new Set(['PENDING', 'IN_PROGRESS']);
export const displayValue = value => value === null || value === undefined || value === '' ? 'Não informado' : String(value);
export function dateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function formatMtrDate(value) {
  const key = dateKey(value);
  return key ? key.split('-').reverse().join('/') : 'Não informada';
}
export function routeTeam(route, collection) {
  // Após execução, nunca substituir vínculo histórico ausente pela equipe atual da rota.
  const fallback = collection && pending.has(collection.status);
  return {
    driver: collection ? collection.driver || (fallback && !collection.driverId ? route.driver : null) : route.driver,
    vehicle: collection ? collection.vehicle || (fallback && !collection.vehicleId ? route.vehicle : null) : route.vehicle,
  };
}
export function collectionMaterials(collection) {
  if (!Array.isArray(collection?.materials)) return [];
  return collection.materials.filter(item => item && typeof item === 'object').map(item => {
    const quantity = item.quantity ?? item.quantityKg;
    const number = quantity === null || quantity === undefined || quantity === '' ? NaN : Number(quantity);
    return { name: item.name || item.nameSnapshot || 'Material sem descrição', quantity: Number.isFinite(number) && number > 0 ? number.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : 'Não informada', unit: item.unit || (item.quantityKg !== undefined ? 'KG' : 'Não informada') };
  });
}
export function buildMtrPreparation(route, collection, portal) {
  const team = routeTeam(route, collection);
  const generator = collection?.generator;
  const weight = Number(collection?.totalWeightKg);
  const address = generator?.address || [generator?.street, generator?.number, generator?.neighborhood, generator?.city, generator?.state, generator?.zipCode].filter(Boolean).join(', ');
  const missing = [
    !generator?.name && !generator?.companyName && 'Identificação do gerador',
    !address && 'Endereço do gerador',
    !team.driver?.name && 'Motorista',
    !team.vehicle?.plate && 'Placa do veículo',
    !collectionMaterials(collection).length && 'Descrição dos resíduos',
    'CPF/CNPJ e unidade do gerador no portal',
    'Transportador e destinador: identificação, cadastro e licenças aplicáveis',
    'Código do resíduo, classificação, estado físico, acondicionamento, quantidade e unidade exigidos no portal',
    'Tecnologia de destinação e data de transporte',
  ].filter(Boolean);
  const rows = [
    ['Documento', 'FICHA DE APOIO — NÃO É UM MTR OFICIAL'],
    ['Portal escolhido', portal?.name], ['Acesso oficial', portal?.url],
    ['Cooperativa no KATUÁ', route.cooperative?.name],
    ['Rota', route.name], ['ID da rota', route.id], ['Data programada da rota', formatMtrDate(route.scheduledDate)],
    ['Status da rota', ROUTE_LABELS[route.status] || 'Não informado'],
    ['ID da coleta', collection?.id], ['Status da coleta', COLLECTION_LABELS[collection?.status] || 'Não informado'],
    ['Gerador', generator?.companyName || generator?.name], ['Endereço do gerador', address],
    ['Motorista vinculado à coleta', team.driver?.name], ['Placa vinculada à coleta', team.vehicle?.plate],
    ['Peso registrado na coleta (kg)', Number.isFinite(weight) && weight > 0 ? weight.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : 'Não informado / não aferido'],
    ['Emissão oficial', 'Não consultada pelo KATUÁ'],
  ];
  const materials = collectionMaterials(collection);
  return {
    rows, materials, missing,
    text: rows.map(([name, value]) => `${name}: ${displayValue(value)}`).join('\n') + '\n\nRESÍDUOS REGISTRADOS NA COLETA\n' + (materials.length ? materials.map(item => `${item.name}: ${item.quantity} ${item.unit}`).join('\n') : 'Sem materiais informados.') + '\n\nCONFERIR NO PORTAL OFICIAL\n' + missing.map(item => `- ${item}`).join('\n') + '\n\nFicha de consulta do KATUÁ. Não comprova emissão, recebimento ou destinação. A cooperativa não é automaticamente o transportador ou o destinador. Não usar o peso registrado como estimativa automática da próxima carga.\n',
  };
}
