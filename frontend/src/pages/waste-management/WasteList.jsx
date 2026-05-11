import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { House, ChevronRight, Search, Package, Scale, BarChart3, Users } from "lucide-react";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getAllWastes } from "../../services/wasteService";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.collections)) return response.collections;
  return [];
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("pt-BR");
};

const formatKg = (value) => `${Number(value || 0).toFixed(2)} KG`;

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const normalizeText = (value) => String(value || "").toLowerCase().trim();

const getGeneratorName = (collection) => {
  return (
    collection?.generator?.companyName ||
    collection?.generator?.name ||
    collection?.schedule?.generator?.companyName ||
    collection?.schedule?.generator?.name ||
    collection?.schedule?.requestedBy?.displayName ||
    "N/A"
  );
};

const getCollectorName = (collection) => {
  return (
    collection?.collector?.name ||
    collection?.collector?.user?.displayName ||
    collection?.collector?.user?.name ||
    "N/A"
  );
};

const getMaterialName = (material) => {
  return (
    material?.type ||
    material?.materialType ||
    material?.name ||
    material?.material?.name ||
    "Resíduo não informado"
  );
};

const getMaterialQuantity = (material) => {
  return Number(
    material?.quantityKg ??
      material?.weightKg ??
      material?.kg ??
      material?.quantity ??
      0
  );
};

const getCollectionMaterials = (collection) => {
  if (Array.isArray(collection?.materials)) return collection.materials;
  if (Array.isArray(collection?.collectionMaterials)) return collection.collectionMaterials;
  if (Array.isArray(collection?.wastes)) return collection.wastes;

  if (collection?.totalWeightKg) {
    return [
      {
        type: "Resíduo coletado",
        quantityKg: Number(collection.totalWeightKg || 0),
      },
    ];
  }

  return [];
};

const WasteList = () => {
  const [collections, setCollections] = useState([]);
  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [generatorFilter, setGeneratorFilter] = useState("");
  const [collectorFilter, setCollectorFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const loadCollections = async () => {
    try {
      setLoading(true);

      const response = await getAllWastes();
      const data = getArray(response);

      setCollections(data);
    } catch (error) {
      toast.error(
        error?.error ||
          error?.message ||
          "Erro ao carregar resíduos coletados."
      );
      console.error("Fetch collected wastes error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const collectedRows = useMemo(() => {
    const rows = [];

    collections
      .filter((collection) => collection?.status === "COMPLETED")
      .forEach((collection) => {
        const materials = getCollectionMaterials(collection);
        const generatorName = getGeneratorName(collection);
        const collectorName = getCollectorName(collection);
        const collectionDate =
          collection?.collectedAt ||
          collection?.completedAt ||
          collection?.updatedAt ||
          collection?.createdAt;

        materials.forEach((material) => {
          const materialName = getMaterialName(material);
          const quantityKg = getMaterialQuantity(material);

          if (quantityKg <= 0) return;

          rows.push({
            id: `${collection?.id || "collection"}-${materialName}-${rows.length}`,
            collectionId: collection?.id,
            material: materialName,
            quantityKg,
            generator: generatorName,
            collector: collectorName,
            date: collectionDate,
            route: collection?.route?.name || collection?.route?.description || "N/A",
            raw: collection,
          });
        });
      });

    return rows.map((row, index) => ({
      ...row,
      sn: index + 1,
    }));
  }, [collections]);

  const totalKg = useMemo(() => {
    return collectedRows.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);
  }, [collectedRows]);

  const materialSummary = useMemo(() => {
    const map = new Map();

    collectedRows.forEach((item) => {
      const current = map.get(item.material) || {
        material: item.material,
        quantityKg: 0,
        collections: 0,
      };

      current.quantityKg += Number(item.quantityKg || 0);
      current.collections += 1;

      map.set(item.material, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percent: totalKg > 0 ? (item.quantityKg / totalKg) * 100 : 0,
      }))
      .sort((a, b) => b.quantityKg - a.quantityKg);
  }, [collectedRows, totalKg]);

  const materialOptions = useMemo(() => {
    return [...new Set(collectedRows.map((item) => item.material))]
      .filter(Boolean)
      .sort();
  }, [collectedRows]);

  const generatorOptions = useMemo(() => {
    return [...new Set(collectedRows.map((item) => item.generator))]
      .filter(Boolean)
      .sort();
  }, [collectedRows]);

  const collectorOptions = useMemo(() => {
    return [...new Set(collectedRows.map((item) => item.collector))]
      .filter(Boolean)
      .sort();
  }, [collectedRows]);

  const filteredData = useMemo(() => {
    const term = normalizeText(search);

    return collectedRows.filter((item) => {
      const matchesMaterial = !materialFilter || item.material === materialFilter;
      const matchesGenerator = !generatorFilter || item.generator === generatorFilter;
      const matchesCollector = !collectorFilter || item.collector === collectorFilter;

      const matchesSearch =
        !term ||
        normalizeText(item.material).includes(term) ||
        normalizeText(item.generator).includes(term) ||
        normalizeText(item.collector).includes(term) ||
        normalizeText(item.route).includes(term) ||
        normalizeText(formatDate(item.date)).includes(term);

      return matchesMaterial && matchesGenerator && matchesCollector && matchesSearch;
    });
  }, [collectedRows, search, materialFilter, generatorFilter, collectorFilter]);

  const filteredKg = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);
  }, [filteredData]);

  const columns = [
    { key: "sn", label: "SN" },
    {
      key: "material",
      label: "Resíduo",
      render: (value) => <strong>{value}</strong>,
    },
    {
      key: "quantityKg",
      label: "Quantidade",
      render: (value) => formatKg(value),
    },
    {
      key: "percent",
      label: "Percentual",
      render: (value, row) => {
        const percent = totalKg > 0 ? (Number(row.quantityKg || 0) / totalKg) * 100 : 0;

        return (
          <div style={{ minWidth: 120 }}>
            <strong>{formatPercent(percent)}</strong>
            <div
              style={{
                width: "100%",
                height: 6,
                background: "#E5E7EB",
                borderRadius: 999,
                marginTop: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(percent, 100)}%`,
                  height: "100%",
                  background: "#16A34A",
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "generator",
      label: "Gerador",
    },
    {
      key: "collector",
      label: "Catador",
    },
    {
      key: "date",
      label: "Data",
      render: (value) => formatDate(value),
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setMaterialFilter("");
    setGeneratorFilter("");
    setCollectorFilter("");
    setCurrentPage(1);
  };

  return (
    <>
      <HeadTags title="Lista de Resíduos Coletados" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Lista de Resíduos Coletados</h3>

          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
            <div className="breadcrumb-wrap">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb pb-0 mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/" className="d-flex align-items-center gap-8">
                      <House /> Painel
                    </Link>
                  </li>

                  <li className="breadcrumb-item">
                    <ChevronRight />
                  </li>

                  <li className="breadcrumb-item active">
                    Resíduos Coletados
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="mb-1 text-muted">Total coletado</p>
                <h4 className="mb-0">{formatKg(filteredKg || totalKg)}</h4>
              </div>
              <Scale size={34} color="#16A34A" />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="mb-1 text-muted">Tipos de resíduos</p>
                <h4 className="mb-0">{materialSummary.length}</h4>
              </div>
              <Package size={34} color="#16A34A" />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="mb-1 text-muted">Geradores atendidos</p>
                <h4 className="mb-0">{generatorOptions.length}</h4>
              </div>
              <BarChart3 size={34} color="#16A34A" />
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card p-25 h-100">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="mb-1 text-muted">Catadores envolvidos</p>
                <h4 className="mb-0">{collectorOptions.length}</h4>
              </div>
              <Users size={34} color="#16A34A" />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-4">
          <div className="card p-25 h-100">
            <h5 className="mb-3">Visão por tipo de resíduo</h5>

            {materialSummary.length === 0 ? (
              <p className="text-muted mb-0">Nenhum resíduo coletado encontrado.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {materialSummary.slice(0, 6).map((item) => (
                  <div key={item.material}>
                    <div className="d-flex justify-content-between gap-3 mb-1">
                      <strong>{item.material}</strong>
                      <span>{formatKg(item.quantityKg)}</span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <div
                        style={{
                          width: "100%",
                          height: 8,
                          background: "#E5E7EB",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(item.percent, 100)}%`,
                            height: "100%",
                            background: "#16A34A",
                            borderRadius: 999,
                          }}
                        />
                      </div>

                      <small style={{ minWidth: 48, textAlign: "right" }}>
                        {formatPercent(item.percent)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card p-25 h-100">
            <div className="filter row g-3">
              <div className="col-lg-3 col-md-6">
                <select
                  className="form-select"
                  value={materialFilter}
                  onChange={(e) => {
                    setMaterialFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Todos os resíduos</option>
                  {materialOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-3 col-md-6">
                <select
                  className="form-select"
                  value={generatorFilter}
                  onChange={(e) => {
                    setGeneratorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Todos os geradores</option>
                  {generatorOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-3 col-md-6">
                <select
                  className="form-select"
                  value={collectorFilter}
                  onChange={(e) => {
                    setCollectorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Todos os catadores</option>
                  {collectorOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-3 col-md-6">
                <div className="filter-section search w-100">
                  <div className="icon">
                    <Search />
                  </div>

                  <input
                    className="form-control"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar..."
                  />
                </div>
              </div>

              {(materialFilter || generatorFilter || collectorFilter || search) && (
                <div className="col-12">
                  <button className="clear-filter" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-0 text-muted">
                Exibindo <strong>{filteredData.length}</strong> registros de resíduos
                coletados, totalizando <strong>{formatKg(filteredKg)}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="card p-25">
            <DataTable
              data={filteredData}
              columns={columns}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(n) => {
                setRowsPerPage(n);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default WasteList;