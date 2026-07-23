import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, House, Package, RefreshCcw, Search, Scale, Users } from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";

import DataTable from "../../components/DataTable";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { apiRequest } from "../../services/apiClient";

const UNIT_LABELS = {
  KG: "kg",
  TON: "t",
  UNIT: "un.",
  LITER: "L",
  CUBIC_METER: "m³",
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.entries)) return response.entries;
  if (Array.isArray(response?.data?.entries)) return response.data.entries;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const normalizeText = (value) => String(value ?? "").trim();

const normalizeSearch = (value) => normalizeText(value).toLocaleLowerCase("pt-BR");

const normalizeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value, maximumFractionDigits = 3) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(normalizeNumber(value));

const formatQuantity = (quantity, unit) => {
  const normalizedUnit = normalizeText(unit).toUpperCase() || "KG";
  return `${formatNumber(quantity)} ${UNIT_LABELS[normalizedUnit] || normalizedUnit.toLowerCase()}`;
};

const formatDate = (value) => {
  if (!value) return "Não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const getMaterialName = (entry) =>
  normalizeText(
    entry?.materialNameSnapshot ||
      entry?.wasteType?.name ||
      entry?.collectionMaterial?.nameSnapshot ||
      entry?.collectionMaterial?.wasteType?.name ||
      entry?.materialName ||
      entry?.wasteName
  ) || "Resíduo não informado";

const getUnit = (entry) =>
  normalizeText(
    entry?.unit ||
      entry?.collectionMaterial?.unit ||
      entry?.wasteType?.defaultUnit ||
      entry?.wasteType?.unit
  ).toUpperCase() || "KG";

const getQuantity = (entry) =>
  normalizeNumber(
    entry?.collectedQuantity ??
      entry?.quantity ??
      entry?.totalQuantity ??
      entry?.collectionMaterial?.quantity ??
      entry?.collectionMaterial?.quantityKg
  );

const getCollection = (entry) =>
  entry?.collection || entry?.collectionMaterial?.collection || {};

const getGeneratorName = (entry) => {
  const collection = getCollection(entry);
  const generator =
    entry?.generator ||
    collection?.generator ||
    collection?.schedule?.generator ||
    {};

  return (
    normalizeText(generator?.companyName) ||
    normalizeText(generator?.tradeName) ||
    normalizeText(generator?.name) ||
    "Não informado"
  );
};

const getCollectorName = (entry) => {
  const collection = getCollection(entry);
  const collector = entry?.collector || collection?.collector || {};

  return (
    normalizeText(collector?.name) ||
    normalizeText(collector?.user?.displayName) ||
    normalizeText(collector?.user?.name) ||
    "Não informado"
  );
};

const getEntryDate = (entry) => {
  const collection = getCollection(entry);

  return (
    entry?.collectedAt ||
    collection?.collectedAt ||
    entry?.createdAt ||
    collection?.createdAt
  );
};

const WasteList = () => {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [generatorFilter, setGeneratorFilter] = useState("");
  const [collectorFilter, setCollectorFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiRequest("/collection-entries", {
        method: "GET",
      });

      setEntries(getArray(response));
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          error?.data?.error ||
          error?.error ||
          error?.message ||
          "Erro ao carregar os resíduos coletados."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const rows = useMemo(
    () =>
      entries
        .map((entry, index) => {
          const collection = getCollection(entry);

          return {
            id: entry?.id || `entry-${index}`,
            sn: index + 1,
            material: getMaterialName(entry),
            quantity: getQuantity(entry),
            unit: getUnit(entry),
            generator: getGeneratorName(entry),
            collector: getCollectorName(entry),
            route:
              normalizeText(entry?.route?.name) ||
              normalizeText(collection?.route?.name) ||
              "Não informada",
            date: getEntryDate(entry),
            status: normalizeText(entry?.status) || "PENDING_DESTINATION",
            collectionStatus: normalizeText(collection?.status),
            raw: entry,
          };
        })
        .filter((row) => row.quantity > 0),
    [entries]
  );

  const summaryByMaterial = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const key = `${row.material}::${row.unit}`;
      const current = map.get(key) || {
        material: row.material,
        unit: row.unit,
        quantity: 0,
      };

      current.quantity += row.quantity;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [rows]);

  const totalByUnit = useMemo(() => {
    const totals = new Map();

    rows.forEach((row) => {
      totals.set(row.unit, (totals.get(row.unit) || 0) + row.quantity);
    });

    return Array.from(totals.entries()).map(([unit, quantity]) => ({
      unit,
      quantity,
    }));
  }, [rows]);

  const materialOptions = useMemo(
    () => [...new Set(rows.map((row) => row.material))].sort(),
    [rows]
  );

  const generatorOptions = useMemo(
    () => [...new Set(rows.map((row) => row.generator))].sort(),
    [rows]
  );

  const collectorOptions = useMemo(
    () => [...new Set(rows.map((row) => row.collector))].sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const term = normalizeSearch(search);

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.material,
          row.generator,
          row.collector,
          row.route,
          formatDate(row.date),
          row.status,
        ].some((value) => normalizeSearch(value).includes(term));

      return (
        matchesSearch &&
        (!materialFilter || row.material === materialFilter) &&
        (!generatorFilter || row.generator === generatorFilter) &&
        (!collectorFilter || row.collector === collectorFilter)
      );
    });
  }, [rows, search, materialFilter, generatorFilter, collectorFilter]);

  const columns = [
    { key: "sn", label: "SN" },
    {
      key: "material",
      label: "Resíduo",
      render: (value) => <strong>{value}</strong>,
    },
    {
      key: "quantity",
      label: "Quantidade",
      render: (value, row) => <strong>{formatQuantity(value, row.unit)}</strong>,
    },
    { key: "generator", label: "Gerador" },
    { key: "collector", label: "Catador" },
    {
      key: "date",
      label: "Data",
      render: (value) => formatDate(value),
    },
    {
      key: "status",
      label: "Situação",
      render: (value) => (
        <span className="badge text-bg-light border">
          {value === "PENDING_DESTINATION"
            ? "Aguardando destinação"
            : value === "PARTIALLY_DESTINED"
              ? "Parcialmente destinado"
              : value === "FULLY_DESTINED"
                ? "Destinado"
                : value}
        </span>
      ),
    },
  ];

  return (
    <>
      <HeadTags title="Resíduos coletados | KATUÁ" />
      <TopProgressBar loading={loading} />

      <main className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bold mb-2">Lista de Resíduos Coletados</h1>

            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="text-decoration-none">
                    <House size={15} className="me-1" />
                    Painel
                  </Link>
                </li>
                <li className="breadcrumb-item active">
                  <ChevronRight size={14} className="me-1" />
                  Resíduos coletados
                </li>
              </ol>
            </nav>
          </div>

          <button
            type="button"
            className="btn btn-outline-success"
            onClick={() => void loadEntries()}
            disabled={loading}
          >
            <RefreshCcw size={17} className="me-2" />
            Atualizar
          </button>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-12 col-md-3">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body d-flex justify-content-between">
                <div>
                  <div className="text-secondary mb-1">Entradas registradas</div>
                  <div className="fs-4 fw-bold">{rows.length}</div>
                </div>
                <Package className="text-success" />
              </div>
            </div>
          </div>

          <div className="col-12 col-md-3">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body d-flex justify-content-between">
                <div>
                  <div className="text-secondary mb-1">Tipos de resíduos</div>
                  <div className="fs-4 fw-bold">{materialOptions.length}</div>
                </div>
                <Scale className="text-success" />
              </div>
            </div>
          </div>

          <div className="col-12 col-md-3">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body d-flex justify-content-between">
                <div>
                  <div className="text-secondary mb-1">Geradores atendidos</div>
                  <div className="fs-4 fw-bold">{generatorOptions.length}</div>
                </div>
                <Users className="text-success" />
              </div>
            </div>
          </div>

          <div className="col-12 col-md-3">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body">
                <div className="text-secondary mb-2">Totais por unidade</div>
                {totalByUnit.length === 0 ? (
                  <span className="text-secondary">Nenhum registro</span>
                ) : (
                  totalByUnit.map((item) => (
                    <div key={item.unit} className="fw-bold">
                      {formatQuantity(item.quantity, item.unit)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-xl-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h2 className="h5 fw-bold mb-4">Visão por tipo de resíduo</h2>

                {summaryByMaterial.map((item) => (
                  <div key={`${item.material}-${item.unit}`} className="mb-3">
                    <div className="d-flex justify-content-between gap-3">
                      <strong>{item.material}</strong>
                      <span>{formatQuantity(item.quantity, item.unit)}</span>
                    </div>
                    <div className="progress mt-2" style={{ height: 6 }}>
                      <div
                        className="progress-bar bg-success"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-8">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-3">
                    <select
                      className="form-select"
                      value={materialFilter}
                      onChange={(event) => setMaterialFilter(event.target.value)}
                    >
                      <option value="">Todos os resíduos</option>
                      {materialOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-3">
                    <select
                      className="form-select"
                      value={generatorFilter}
                      onChange={(event) => setGeneratorFilter(event.target.value)}
                    >
                      <option value="">Todos os geradores</option>
                      {generatorOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-3">
                    <select
                      className="form-select"
                      value={collectorFilter}
                      onChange={(event) => setCollectorFilter(event.target.value)}
                    >
                      <option value="">Todos os catadores</option>
                      {collectorOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <Search size={17} />
                      </span>
                      <input
                        className="form-control"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar..."
                      />
                    </div>
                  </div>
                </div>

                <p className="text-secondary">
                  Exibindo <strong>{filteredRows.length}</strong> entrada(s) de resíduos coletados.
                </p>

                <DataTable
                  columns={columns}
                  data={filteredRows}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default WasteList;
