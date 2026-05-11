import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Building2,
  FileText,
  MapPinned,
  PackageCheck,
  Recycle,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserRound,
  Weight,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import generatorService from "../../services/generatorService";
import { getAllCollections } from "../../services/collectionService";

const getTypeLabel = (type) => {
  if (type === "LARGE") return "Grande Gerador";
  return "Pequeno Gerador";
};

const getAccessStatusLabel = (status) => {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "INACTIVE":
      return "Inativo";
    case "BLOCKED":
      return "Bloqueado";
    case "PENDING_ACTIVATION":
    default:
      return "Pendente";
  }
};

const getCollectionStatusLabel = (status) => {
  const labels = {
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status || "N/A";
};

const getCollectionStatusClass = (status) => {
  const classes = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELLED: "danger",
  };

  return classes[status] || "secondary";
};

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const normalizeMaterials = (materials) => {
  if (!materials) return [];

  if (Array.isArray(materials)) {
    return materials;
  }

  if (typeof materials === "string") {
    try {
      const parsed = JSON.parse(materials);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const formatMaterialText = (materials) => {
  const items = normalizeMaterials(materials);

  if (items.length === 0) {
    return "Materiais não informados";
  }

  return items
    .map((item) => {
      const type = item?.type || "Material";
      const quantity = Number(item?.quantityKg || 0);

      if (quantity > 0) {
        return `${type} (${quantity.toLocaleString("pt-BR")} kg)`;
      }

      return type;
    })
    .join(", ");
};

const calculateMaterialsTotal = (materials) => {
  return normalizeMaterials(materials).reduce((total, item) => {
    return total + Number(item?.quantityKg || 0);
  }, 0);
};

const getResponsibleName = (collection) => {
  return (
    collection?.collector?.name ||
    collection?.driver?.name ||
    "Responsável não informado"
  );
};

const getRouteName = (collection) => {
  return collection?.route?.name || "Sem rota vinculada";
};

const getVehicleName = (collection) => {
  if (!collection?.vehicle) return "Sem veículo";

  const plate = collection.vehicle.plate || "";
  const model = collection.vehicle.model || "";

  return [plate, model].filter(Boolean).join(" - ") || "Sem veículo";
};

const getGeneratorCollections = (collections, generatorId) => {
  return collections.filter((collection) => {
    return (
      collection?.generatorId === generatorId ||
      collection?.generator?.id === generatorId ||
      collection?.schedule?.generator?.id === generatorId
    );
  });
};

const GeneratorDocuments = () => {
  const [searchParams] = useSearchParams();
  const selectedGeneratorId = searchParams.get("generatorId");

  const [generators, setGenerators] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [generatorsData, collectionsResponse] = await Promise.all([
        generatorService.list(),
        getAllCollections(),
      ]);

      setGenerators(Array.isArray(generatorsData) ? generatorsData : []);
      setCollections(getArray(collectionsResponse));
    } catch (error) {
      console.error("Erro ao carregar dados do gerador:", error);
      toast.error(
        error?.message ||
          error?.error ||
          "Não foi possível carregar os dados dos geradores."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredGenerators = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    let items = generators;

    if (selectedGeneratorId) {
      items = items.filter((item) => item.id === selectedGeneratorId);
    }

    if (!term) return items;

    return items.filter((generator) => {
      const values = [
        generator.name,
        generator.companyName,
        generator.email,
        generator.phone,
        generator.city,
        generator.state,
        generator.type,
        generator.accessStatus,
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(term)
      );
    });
  }, [generators, searchText, selectedGeneratorId]);

  const generatorStats = useMemo(() => {
    const stats = {};

    generators.forEach((generator) => {
      const generatorCollections = getGeneratorCollections(
        collections,
        generator.id
      );

      const completedCollections = generatorCollections.filter(
        (collection) => collection.status === "COMPLETED"
      );

      const totalKg = generatorCollections.reduce((total, collection) => {
        const collectionTotal = Number(collection.totalWeightKg || 0);
        const materialsTotal = calculateMaterialsTotal(collection.materials);

        return total + (collectionTotal > 0 ? collectionTotal : materialsTotal);
      }, 0);

      stats[generator.id] = {
        totalCollections: generatorCollections.length,
        completedCollections: completedCollections.length,
        totalKg,
      };
    });

    return stats;
  }, [generators, collections]);

  return (
    <>
      <HeadTags title="Documentos do Gerador" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
            <div>
              <h3 className="fs-30">Documentos do Gerador</h3>
              <p className="mb-0 text-muted">
                Histórico cadastral, documental e operacional dos geradores
                vinculados à cooperativa.
              </p>
            </div>

            <Link to="/generator-list" className="secondary-btn btn-sm">
              <ArrowLeft />
              Voltar
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-25 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <h4 className="mb-0 fw-600">Geradores</h4>

          <div
            className="d-flex align-items-center gap-2"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "8px 12px",
              minWidth: "280px",
            }}
          >
            <Search size={18} />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar gerador..."
              style={{
                border: "none",
                outline: "none",
                width: "100%",
                background: "transparent",
              }}
            />
          </div>
        </div>

        <div className="row g-4">
          {filteredGenerators.length === 0 ? (
            <div className="col-12">
              <p className="text-muted mb-0">
                {loading
                  ? "Carregando geradores..."
                  : "Nenhum gerador encontrado."}
              </p>
            </div>
          ) : (
            filteredGenerators.map((generator) => {
              const currentCollections = getGeneratorCollections(
                collections,
                generator.id
              );

              const stats = generatorStats[generator.id] || {
                totalCollections: 0,
                completedCollections: 0,
                totalKg: 0,
              };

              return (
                <div className="col-12" key={generator.id}>
                  <div className="card p-20 h-100 border">
                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "#ecfdf5",
                          }}
                        >
                          <Building2 size={22} />
                        </div>

                        <div>
                          <h5 className="mb-1">
                            {generator.companyName ||
                              generator.name ||
                              "Sem nome"}
                          </h5>
                          <p className="mb-0 text-muted small">
                            {getTypeLabel(generator.type)}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={`/edit-generator/${generator.id}`}
                        className="secondary-btn btn-sm"
                      >
                        Ver cadastro do gerador
                      </Link>
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <p className="mb-1">
                          <strong>E-mail:</strong> {generator.email || "N/A"}
                        </p>
                        <p className="mb-1">
                          <strong>Telefone:</strong> {generator.phone || "N/A"}
                        </p>
                        <p className="mb-0">
                          <strong>Cidade:</strong> {generator.city || "N/A"}
                          {generator.state ? `/${generator.state}` : ""}
                        </p>
                      </div>

                      <div className="col-md-4">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          {generator.accessReleased ? (
                            <span className="badge text-bg-success">
                              <ShieldCheck size={14} className="me-1" />
                              Acesso liberado
                            </span>
                          ) : (
                            <span className="badge text-bg-warning">
                              <ShieldAlert size={14} className="me-1" />
                              Acesso pendente
                            </span>
                          )}

                          <span className="badge text-bg-light">
                            {getAccessStatusLabel(generator.accessStatus)}
                          </span>
                        </div>

                        <p className="text-muted small mb-0">
                          Registro operacional vinculado às coletas executadas
                          pela cooperativa.
                        </p>
                      </div>

                      <div className="col-md-4">
                        <div className="row g-2">
                          <div className="col-4">
                            <div className="p-2 rounded bg-light h-100">
                              <PackageCheck size={18} />
                              <p className="mb-0 small text-muted">Coletas</p>
                              <strong>{stats.totalCollections}</strong>
                            </div>
                          </div>

                          <div className="col-4">
                            <div className="p-2 rounded bg-light h-100">
                              <Recycle size={18} />
                              <p className="mb-0 small text-muted">
                                Concluídas
                              </p>
                              <strong>{stats.completedCollections}</strong>
                            </div>
                          </div>

                          <div className="col-4">
                            <div className="p-2 rounded bg-light h-100">
                              <Weight size={18} />
                              <p className="mb-0 small text-muted">Kg</p>
                              <strong>
                                {stats.totalKg.toLocaleString("pt-BR")}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-3 rounded mb-4"
                      style={{
                        background: "#f9fafb",
                        border: "1px dashed #d1d5db",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FileText size={18} />
                        <strong>Documentos</strong>
                      </div>

                      <p className="text-muted small mb-0">
                        Esta área está preparada para anexos futuros como CNPJ,
                        alvarás, comprovantes, contratos e termos de adesão do
                        gerador.
                      </p>
                    </div>

                    <div>
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                        <div>
                          <h5 className="mb-1">Histórico de coletas</h5>
                          <p className="text-muted small mb-0">
                            Coletas vinculadas a este gerador, incluindo
                            responsável, rota, veículo, materiais e quantidade.
                          </p>
                        </div>
                      </div>

                      {currentCollections.length === 0 ? (
                        <div className="alert alert-light border mb-0">
                          Nenhuma coleta registrada para este gerador até o
                          momento.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table nowrap w-100 mb-0">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Status</th>
                                <th>Responsável</th>
                                <th>Motorista</th>
                                <th>Rota</th>
                                <th>Veículo</th>
                                <th>Materiais</th>
                                <th>Quantidade</th>
                              </tr>
                            </thead>

                            <tbody>
                              {currentCollections.map((collection) => {
                                const total =
                                  Number(collection.totalWeightKg || 0) ||
                                  calculateMaterialsTotal(
                                    collection.materials
                                  );

                                return (
                                  <tr key={collection.id}>
                                    <td>
                                      {collection.collectedAt
                                        ? moment(collection.collectedAt).format(
                                            "DD/MM/YYYY"
                                          )
                                        : collection.createdAt
                                        ? moment(collection.createdAt).format(
                                            "DD/MM/YYYY"
                                          )
                                        : "Sem data"}
                                    </td>

                                    <td>
                                      <span
                                        className={`badge text-bg-${getCollectionStatusClass(
                                          collection.status
                                        )}`}
                                      >
                                        {getCollectionStatusLabel(
                                          collection.status
                                        )}
                                      </span>
                                    </td>

                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <UserRound size={16} />
                                        {getResponsibleName(collection)}
                                      </div>
                                    </td>

                                    <td>
                                      {collection?.driver?.name ||
                                        "Sem motorista"}
                                    </td>

                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <Route size={16} />
                                        {getRouteName(collection)}
                                      </div>
                                    </td>

                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <Truck size={16} />
                                        {getVehicleName(collection)}
                                      </div>
                                    </td>

                                    <td>{formatMaterialText(collection.materials)}</td>

                                    <td>
                                      <strong>
                                        {total.toLocaleString("pt-BR")} kg
                                      </strong>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {generator.latitude && generator.longitude && (
                      <div className="mt-3 text-muted small d-flex align-items-center gap-2">
                        <MapPinned size={16} />
                        Localização registrada: {generator.latitude},{" "}
                        {generator.longitude}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default GeneratorDocuments;