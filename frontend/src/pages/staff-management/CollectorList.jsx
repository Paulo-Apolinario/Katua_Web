import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ChevronRight,
  Eye,
  House,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import { getAllCollectors } from "../../services/collectorService";
import { getAllCollections } from "../../services/collectionService";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.collectors)) return response.collectors;
  if (Array.isArray(response?.collections)) return response.collections;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getStatusLabel = (status) => {
  const labels = {
    AVAILABLE: "Disponível",
    ON_ROUTE: "Em rota",
    INACTIVE: "Inativo",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  const classes = {
    AVAILABLE: "success",
    ON_ROUTE: "info",
    INACTIVE: "secondary",
  };

  return classes[status] || "secondary";
};

const normalizeMaterials = (materials) => {
  if (!materials) return [];

  if (Array.isArray(materials)) return materials;

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

const calculateMaterialsTotal = (materials) => {
  return normalizeMaterials(materials).reduce((total, item) => {
    return total + Number(item?.quantityKg || 0);
  }, 0);
};

const getCollectorCollections = (collections, collectorId) => {
  return collections.filter((collection) => {
    return (
      collection?.collectorId === collectorId ||
      collection?.collector?.id === collectorId
    );
  });
};

const CollectorList = () => {
  const [collectors, setCollectors] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [collectorsResponse, collectionsResponse] = await Promise.all([
        getAllCollectors(),
        getAllCollections(),
      ]);

      setCollectors(getArray(collectorsResponse));
      setCollections(getArray(collectionsResponse));
    } catch (error) {
      console.error("Erro ao carregar catadores:", error);

      toast.error(
        error?.error ||
          error?.message ||
          "Não foi possível carregar os catadores."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const collectorStats = useMemo(() => {
    const stats = {};

    collectors.forEach((collector) => {
      const collectorCollections = getCollectorCollections(
        collections,
        collector.id
      );

      const completedCollections = collectorCollections.filter(
        (collection) => collection.status === "COMPLETED"
      );

      const totalKg = collectorCollections.reduce((total, collection) => {
        const collectionTotal = Number(collection.totalWeightKg || 0);
        const materialsTotal = calculateMaterialsTotal(collection.materials);

        return total + (collectionTotal > 0 ? collectionTotal : materialsTotal);
      }, 0);

      stats[collector.id] = {
        totalCollections: collectorCollections.length,
        completedCollections: completedCollections.length,
        totalKg,
      };
    });

    return stats;
  }, [collectors, collections]);

  const filteredCollectors = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) return collectors;

    return collectors.filter((collector) => {
      const values = [
        collector.name,
        collector.email,
        collector.phone,
        collector.rg,
        collector.status,
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(term)
      );
    });
  }, [collectors, searchText]);

  return (
    <>
      <HeadTags title="Catadores" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Catadores</h3>
          <p className="text-muted mb-0">
            Gerencie os catadores vinculados à cooperativa.
          </p>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="breadcrumb-wrap">
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to="/">
                    <House /> Painel
                  </Link>
                </li>

                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>

                <li className="breadcrumb-item active">Catadores</li>
              </ol>
            </nav>
          </div>

          <div className="d-flex gap-2">
            <button
              className="secondary-btn btn-sm border-0"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Atualizar
            </button>

            <Link
              to="/create-collector"
              className="primary-btn btn-sm border-0"
            >
              <Plus size={16} />
              Novo Catador
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-20 mb-4">
        <div
          className="d-flex align-items-center gap-2"
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "8px 12px",
          }}
        >
          <Search size={18} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar catador..."
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              background: "transparent",
            }}
          />
        </div>
      </div>

      <div className="card p-25">
        <h4 className="mb-4 fw-600">Lista de Catadores</h4>

        <div className="table-responsive">
          <table className="table nowrap w-100">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Coletas</th>
                <th>Concluídas</th>
                <th>Produção (kg)</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredCollectors.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    {loading ? "Carregando..." : "Nenhum catador encontrado."}
                  </td>
                </tr>
              ) : (
                filteredCollectors.map((collector) => {
                  const stats = collectorStats[collector.id] || {
                    totalCollections: 0,
                    completedCollections: 0,
                    totalKg: 0,
                  };

                  return (
                    <tr key={collector.id}>
                      <td>
                        <strong>{collector.name}</strong>
                      </td>

                      <td>{collector.email || "N/A"}</td>

                      <td>{collector.phone || "N/A"}</td>

                      <td>
                        <span
                          className={`badge text-bg-${getStatusClass(
                            collector.status
                          )}`}
                        >
                          {getStatusLabel(collector.status)}
                        </span>
                      </td>

                      <td>
                        <strong>{stats.totalCollections}</strong>
                      </td>

                      <td>
                        <strong>{stats.completedCollections}</strong>
                      </td>

                      <td>
                        <strong>
                          {stats.totalKg.toLocaleString("pt-BR")} kg
                        </strong>
                      </td>

                      <td>
                        <Link
                          to={`/collector-documents?id=${collector.id}`}
                          className="secondary-btn btn-sm"
                        >
                          <Eye size={16} />
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default CollectorList;