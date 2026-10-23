// Escopo explícito: páginas fora destas rotas mantêm o próprio tema.
const generatorRoutes = [
  "generator-list",
  "create-generator",
  "edit-generator",
  "generator-documents",
  "generator-history",
];
const vehicleRoutes = [
  "vehicle-history",
  "vehicle-document-registers",
  "vehicle-list",
  "create-vehicle",
  "edit-vehicle",
  "document-list",
  "create-document",
  "edit-document",
  "maintenance-list",
  "create-maintenance",
  "edit-maintenance",
];
const routeRoutes = [
  "route-list",
  "create-route",
  "edit-route",
  "mtr-online",
  "operational-calendar",
];
const driverRoutes = [
  "staff-list",
  "create-staff",
  "edit-staff",
  "driver-documents",
  "driver-history",
];
const collectorRoutes = [
  "collector-list",
  "create-collector",
  "collector-documents",
  "collector-history",
  "collector-profile",
];
const teamRoutes = [
  "assign-list",
  "create-assign",
  "edit-assign",
  "attendance-list",
  "create-attendance",
  "edit-attendance",
  "staff-document-list",
  "create-staff-document",
  "edit-staff-document",
];
const link = (to, label, paths) => ({ to, label, paths });
const teamLinks = [
  link("/staff-list", "Motoristas", [
    "staff-list",
    "create-staff",
    "edit-staff",
  ]),
  link("/collector-list", "Catadores", ["collector-list", "create-collector"]),
  link("/collector-documents", "Documentos dos catadores", [
    "collector-documents",
  ]),
  link("/driver-documents", "Documentos dos motoristas", ["driver-documents"]),
  link("/driver-history", "Histórico dos motoristas", ["driver-history"]),
  link("/collector-history", "Histórico dos catadores", ["collector-history"]),
  link("/assign-list", "Rotas delegadas", [
    "assign-list",
    "create-assign",
    "edit-assign",
  ]),
];
const modules = [
  {
    id: "settings",
    label: "Configurações do sistema",
    paths: [
      "settings",
      "smtp-config",
      "system-alerts",
      "account-security",
      "operational-preferences",
      "settings-history",
    ],
    description: "Preferências da cooperativa e segurança da conta.",
    links: [],
  },
  {
    id: "reports",
    label: "Relatórios e Análises",
    paths: [
      "",
      "analytics-dashboard",
      "waste-collection-reports",
      "waste-type-reports",
      "staff-reports",
      "vehicle-reports",
    ],
    description: "Indicadores e conferência das operações da cooperativa.",
    links: [],
  },
  {
    id: "generators",
    label: "Gestão de geradores",
    paths: generatorRoutes,
    description:
      "Cadastros, localização e acompanhamento dos geradores vinculados à cooperativa.",
    links: [
      link("/generator-list", "Geradores cadastrados", [
        "generator-list",
        "edit-generator",
      ]),
      link("/generator-history", "Histórico de coletas", ["generator-history"]),
      link("/create-generator", "Cadastrar gerador", ["create-generator"]),
      link("/generator-documents", "Documentos", ["generator-documents"]),
    ],
  },
  {
    id: "vehicles",
    label: "Gestão de veículos",
    paths: vehicleRoutes,
    description:
      "Organize a frota, os vínculos operacionais, a documentação e as manutenções.",
    links: [
      link("/vehicle-list", "Veículos cadastrados", [
        "vehicle-list",
        "edit-vehicle",
      ]),
      link("/create-vehicle", "Cadastrar veículo", ["create-vehicle"]),
      link("/document-list", "Documentos", [
        "document-list",
        "create-document",
        "edit-document",
      ]),
      link("/vehicle-history", "Histórico de coletas", ["vehicle-history"]),
      link("/maintenance-list", "Manutenções", [
        "maintenance-list",
        "create-maintenance",
        "edit-maintenance",
      ]),
    ],
  },
  {
    id: "routes",
    label: "Gestão de rotas",
    paths: routeRoutes,
    description:
      "Consulte as rotas e organize os dados da operação e da equipe responsável.",
    links: [
      link("/route-list", "Rotas cadastradas", ["route-list", "edit-route"]),
      link("/create-route", "Cadastrar rota", ["create-route"]),
      link("/operational-calendar", "Calendário operacional", [
        "operational-calendar",
      ]),
      link("/mtr-online", "Central ambiental e SINIR", ["mtr-online"]),
    ],
  },
  {
    id: "drivers",
    label: "Gestão de motoristas",
    paths: driverRoutes,
    description:
      "Mantenha os dados dos motoristas e seus vínculos com a operação atualizados.",
    links: teamLinks,
  },
  {
    id: "collectors",
    label: "Gestão de catadores",
    paths: collectorRoutes,
    description:
      "Acompanhe o cadastro, a documentação e o histórico dos catadores da cooperativa.",
    links: teamLinks,
  },
  {
    id: "team",
    label: "Motoristas e catadores",
    paths: teamRoutes,
    description:
      "Consulte os registros e vínculos da equipe com a operação da cooperativa.",
    links: teamLinks,
  },
];
export function managementModule(pathname) {
  const path = pathname.split("/").filter(Boolean)[0] || "";
  const module = modules.find((item) => item.paths.includes(path));
  return module ? { ...module, path } : null;
}
