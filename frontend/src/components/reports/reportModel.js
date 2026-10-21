export const REPORTS = {
  overview: {
    path: "analytics-dashboard",
    title: "Painel de Indicadores",
    description:
      "Resultados operacionais, comparativos e qualidade dos dados da cooperativa.",
  },
  collections: {
    path: "waste-collection-reports",
    title: "Relatórios de Coletas",
    description:
      "Acompanhe execução, recebimento e registros de cada operação.",
  },
  waste: {
    path: "waste-type-reports",
    title: "Relatórios de Resíduos",
    description:
      "Consulte materiais por etapa, destinos e posição atual do estoque.",
  },
  staff: {
    path: "staff-reports",
    title: "Relatórios de Equipe",
    description:
      "Atuação dos catadores e participação logística dos motoristas.",
  },
  vehicles: {
    path: "vehicle-reports",
    title: "Relatórios de Veículos",
    description:
      "Operações vinculadas, capacidade, manutenções e alertas documentais.",
  },
};
export const UNITS = {
  KG: "kg",
  TON: "t",
  LITER: "L",
  UNIT: "un",
  CUBIC_METER: "m³",
};
export const STATUSES = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COLLECTED: "Coletada em campo",
  RECEIVED: "Recebida",
  SORTING: "Em triagem",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};
export const BASES = {
  collectedAt: "Execução em campo",
  receivedAt: "Recebimento",
  completedAt: "Conclusão operacional",
  createdAt: "Criação do registro",
  scheduledDate: "Agendamento",
};
export const STAGES = {
  COLLECTED: "Coletado",
  RECEIVED: "Recebido",
  DESTINED: "Destinado",
  STOCK: "Estoque atual",
};
export const num = (v) =>
  v == null
    ? "Não informado"
    : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export const unitsLabel = (u = {}) =>
  Object.keys(u).length
    ? Object.entries(u)
        .map(([k, v]) => num(v) + " " + (UNITS[k] || k))
        .join(" · ")
    : "Sem quantidade registrada";
export const dateLabel = (v) =>
  v
    ? new Date(v).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })
    : "Não informada";
export function civilToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Fortaleza",
  }).format(new Date());
}
export function defaults(kind) {
  const end = civilToday();
  return {
    start: end.slice(0, 7) + "-01",
    end,
    dateBasis: "collectedAt",
    page: "1",
    pageSize: "20",
    sort: "date",
    direction: "desc",
    stage: "COLLECTED",
    role: kind === "staff" ? "COLLECTOR" : "",
    execution: "",
  };
}
export function monthlyGoal(report) {
  const q = report.meta.query;
  const last = new Date(
    Date.UTC(Number(q.start.slice(0, 4)), Number(q.start.slice(5, 7)), 0),
  ).getUTCDate();
  return (
    ![
      "routeId",
      "generatorId",
      "binId",
      "collectorId",
      "driverId",
      "vehicleId",
      "generatorType",
      "origin",
      "city",
      "status",
      "search",
      "unit",
      "materialId",
      "execution",
    ].some((k) => q[k]) &&
    q.dateBasis === "collectedAt" &&
    q.start.endsWith("-01") &&
    q.start.slice(0, 7) === q.end.slice(0, 7) &&
    Number(q.end.slice(8)) === last
  );
}
export function percentChange(current, previous) {
  if (previous === 0)
    return current === 0 ? "Sem variação" : "Sem base anterior";
  return (
    (((current - previous) / previous) * 100).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    }) + "%"
  );
}
export function exportRows(kind, rows) {
  return rows.map((r) => {
    const base = { Identificador: r.id, Nome: r.name, Situacao: r.status };
    if (kind === "collections" || kind === "overview")
      Object.assign(base, {
        Data: dateLabel(r.date),
        Origem: r.origin,
        Municipio: r.city,
        TipoGerador: r.generatorType,
        Catador: r.collector,
        Motorista: r.driver,
        Veiculo: r.vehicle,
        Rota: r.route,
        Materiais: r.materials
          .map(
            (m) =>
              `${m.name}: ${num(m.quantity)} ${UNITS[m.unit] || m.unit}${m.legacy ? " (legado)" : ""}`,
          )
          .join("; "),
      });
    else if (kind === "waste")
      Object.assign(base, {
        Data: dateLabel(r.date),
        Unidade: UNITS[r.unit] || r.unit,
        Quantidade: r.quantity,
        SaldoPendente: r.pendingQuantity ?? "",
        QuantidadeOriginal: r.originalQuantity ?? "",
        Coleta: r.collectionId || "",
        Entrada: r.entryId || "",
        Lote: r.lotCode || "",
        Destinatario: r.destination || "",
        Armazenamento: r.storageLocation || "",
        Etapa: r.stage || "",
      });
    else
      Object.assign(base, {
        Funcao: r.role,
        OperacoesVinculadas: r.count,
        RotasComColetas: r.routes,
        RotasProgramadas: r.assignedRoutes,
        SemQuantidade: r.missingQuantity,
        ...(kind === "vehicles"
          ? {
              CapacidadeKg: r.capacityKg,
              CustoManutencao: r.maintenanceCost,
              ManutencoesSemCusto: r.maintenanceWithoutCost,
              AlertasDocumentais: r.expiringDocuments,
            }
          : {}),
      });
    for (const key of Object.keys(UNITS))
      base["Quantidade_" + UNITS[key]] = r.units?.[key] ?? "";
    return base;
  });
}
export function filterSummary(q, context) {
  const entries = [
    [
      "Período",
      q.stage === "STOCK"
        ? "Posição atual; período não delimita o estoque"
        : q.start + " a " + q.end,
    ],
    [
      "Data de referência",
      q.stage === "STOCK"
        ? "Consulta atual"
        : q.stage === "DESTINED"
          ? "Destinação"
          : BASES[q.dateBasis],
    ],
    ["Etapa", STAGES[q.stage]],
  ];
  for (const [key, label, list, name] of [
    ["routeId", "Rota", "routes", "name"],
    ["generatorId", "Gerador", "generators", "name"],
    ["binId", "PEV", "bins", "name"],
    ["collectorId", "Catador", "collectors", "name"],
    ["driverId", "Motorista", "drivers", "name"],
    ["vehicleId", "Veículo", "vehicles", "plate"],
    ["materialId", "Material", "materials", "name"],
  ])
    if (q[key])
      entries.push([
        label,
        context?.[list]?.find((i) => i.id === q[key])?.[name] || q[key],
      ]);
  for (const [key, label] of [
    ["origin", "Origem"],
    ["city", "Município"],
    ["unit", "Unidade"],
    ["status", "Situação"],
    ["generatorType", "Tipo de gerador"],
    ["role", "Função"],
    ["assetStatus", "Situação cadastral"],
    ["lotStatus", "Situação do lote"],
    ["processingStage", "Processamento"],
    ["execution", "Execução"],
    ["search", "Busca"],
  ])
    if (q[key])
      entries.push([
        label,
        STATUSES[q[key]] ||
          UNITS[q[key]] ||
          {
            GENERATOR: "Gerador",
            PEV: "PEV",
            UNIDENTIFIED: "Não identificada",
            SMALL: "Pequeno",
            LARGE: "Grande",
            COLLECTOR: "Catador",
            DRIVER: "Motorista",
            EXECUTED: "Executadas",
            MISSING_QUANTITY: "Sem quantidade",
          }[q[key]] ||
          q[key],
      ]);
  return entries;
}
