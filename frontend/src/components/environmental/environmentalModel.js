export const FAMILIES = {
  MTR_REGULAR: "MTR regular",
  MTR_LR_ORIGIN: "MTR LR — Origem",
  MTR_LR_PROCESS: "MTR LR — Processo",
  CDF: "Certificado de destinação final",
  MUNICIPAL_DECLARATION: "Apoio à declaração municipal",
};
export const STATUS = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão interna",
  APPROVED: "Revisado internamente",
  ARCHIVED: "Arquivado",
};
export const ROLES = {
  GENERATOR: "Gerador",
  TRANSPORTER: "Transportador",
  TEMPORARY_STORAGE: "Armazenador temporário",
  DESTINATION: "Destinador",
  LR_OPERATOR: "Operador de logística reversa",
  LR_MANAGER: "Entidade gestora LR",
  FINAL_RECYCLER: "Reciclador final",
};
export const UNITS = { KG: "kg", TON: "t", LITER: "L", CUBIC_METER: "m³" };
export const emptyMaterial = () => ({
  name: "",
  ibamaCode: "",
  officialMeasureCode: "",
  pev: {
    identification: "",
    postalCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    municipalityCode: "",
    state: "",
  },
  quantity: null,
  unit: "KG",
  physicalStateCode: "",
  classificationCode: "",
  packagingCode: "",
  treatmentCode: "",
});
export const emptyParty = () => ({
  name: "",
  taxId: "",
  officialUnitCode: "",
  municipalityCode: "",
  address: "",
});
export function emptyPayload(family, unit = {}) {
  if (family === "MUNICIPAL_DECLARATION")
    return {
      diagnosis: {
        coverage: "OPERATIONAL_ONLY",
        wasteRows: [],
        selectiveTargetTon: null,
        recyclingTargetTon: null,
        targetYear: null,
        notes: "",
      },
      costs: {
        sharedServices: "",
        participatingMunicipalities: "",
        cleaningCost: null,
        selectiveCost: null,
        disposalCost: null,
        source: "",
      },
      areas: {
        masterPlan: "UNKNOWN",
        zoning: "UNKNOWN",
        description: "",
        evidence: "",
      },
      income: { initiatives: "", organizations: "", source: "" },
      liabilities: {
        exists: "UNKNOWN",
        description: "",
        locations: "",
        evidence: "",
      },
      delivery: {
        responsibleName: unit.responsibleName || "",
        position: unit.responsiblePosition || "",
        appointmentReference: unit.appointmentReference || "",
        coverageNotes: "",
        reviewNotes: "",
      },
    };
  if (family === "CDF")
    return {
      manifestNumbers: [],
      generators: [],
      periodStart: "",
      periodEnd: "",
      treatmentDescription: "",
      technicalResponsible: "",
      technicalRegistration: "",
      notes: "",
    };
  return {
    origin: {
      ...emptyParty(),
      name: unit.name || "",
      taxId: unit.taxId || "",
      officialUnitCode: unit.officialUnitCode || "",
      municipalityCode: unit.municipalityCode || "",
      address: unit.address || "",
    },
    hasTemporaryStorage: false,
    temporaryStorage: emptyParty(),
    reverseSystemCode: "",
    processGroups: [],
    carrier: emptyParty(),
    recipient: emptyParty(),
    vehiclePlate: "",
    driverName: "",
    departureDate: "",
    materials: [],
    originManifestNumbers: [],
    invoiceNumber: "",
    invoiceAccessKey: "",
    notes: "",
  };
}
export function unitPayload(unit) {
  return Object.fromEntries(
    [
      "municipalityCode",
      "name",
      "taxId",
      "officialUnitCode",
      "address",
      "responsibleName",
      "responsiblePosition",
      "appointmentReference",
      "operationalRoles",
      "environment",
      "shareWithMunicipality",
    ].map((k) => [
      k,
      unit[k] ??
        (k === "operationalRoles"
          ? []
          : k === "shareWithMunicipality"
            ? false
            : ""),
    ]),
  );
}
export function collectionToDraft(source, payload) {
  const origin = source.origin || {};
  const mapped = (source.materials || []).map((m) => {
    if (!Object.hasOwn(UNITS, m.unit))
      throw Error(
        "Unidade de material não reconhecida. Confira a coleta antes de importar.",
      );
    const quantity = Number(m.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw Error("Quantidade inválida na coleta de origem.");
    return {
      ...emptyMaterial(),
      name: m.name || "",
      quantity,
      unit: m.unit,
      ...(origin.binId
        ? {
            pev: {
              ...emptyMaterial().pev,
              identification: origin.binId,
              postalCode: (origin.zipCode || "").replace(/\D/g, ""),
              street: origin.street || "",
              number: origin.number || "",
              neighborhood: origin.neighborhood || "",
              state: origin.state || "",
            },
          }
        : {}),
    };
  });
  return {
    ...payload,
    origin: {
      ...payload.origin,
      name: origin.companyName || origin.name || origin.binId || "",
      taxId: "",
      officialUnitCode: "",
      municipalityCode: "",
      address:
        origin.address ||
        [
          origin.street,
          origin.number,
          origin.neighborhood,
          origin.city,
          origin.state,
        ]
          .filter(Boolean)
          .join(", "),
    },
    driverName: source.driverName || "",
    vehiclePlate: source.vehiclePlate || "",
    materials: mapped,
  };
}
export function downloadDraft(doc) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          kind: "KATUA_PREPARATION_ONLY",
          officialConfirmed: false,
          exportedAt: new Date().toISOString(),
          document: doc,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `katua-preparacao-${doc.id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const choices = (object) =>
  Object.entries(object).map(([value, label]) => ({ value, label }));

export function normalizePayload(family, payload, unit = {}) {
  const result = { ...emptyPayload(family, unit), ...payload };
  if (family.startsWith("MTR_")) {
    const normalizeMaterial = (m) => ({
      ...emptyMaterial(),
      ...m,
      pev: { ...emptyMaterial().pev, ...m.pev },
    });
    result.materials = (result.materials || []).map(normalizeMaterial);
    result.processGroups = (result.processGroups || []).map((g) => ({
      ...g,
      materials: (g.materials || []).map(normalizeMaterial),
    }));
  }
  return result;
}
