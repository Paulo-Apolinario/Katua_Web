import RegistrationPdfExport from "../../components/registrations/RegistrationPdfExport";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ChevronRight,
  Eye,
  House,
  Plus,
  Pencil,
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

const CATEGORY_LABELS = { FOUNDER: "Fundador", EFFECTIVE: "Efetivo", BENEFICIARY: "Beneficiado", CONTRIBUTOR: "Contribuinte" };

const getStatusLabel = (status) => {
  const labels = {
    AVAILABLE: "Ativo",
    ON_ROUTE: "Ativo",
    INACTIVE: "Inativo",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  const classes = {
    AVAILABLE: "success",
    ON_ROUTE: "success",
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
      collection?.participants?.some((p) => p.collectorId === collectorId) ||
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
          "Não foi possível carregar os catadores.",
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
        collector.id,
      );

      const completedCollections = collectorCollections.filter(
        (collection) => collection.status === "COMPLETED",
      );

      const totalKg = collectorCollections.reduce((total, collection) => {
        if (collection.status === "CANCELLED") return total;
        if (collection.participants?.length) {
          if (
            !collection.allocationVersion ||
            collection.allocationQuantityVersion !==
              collection.quantityReviewVersion
          )
            return total;
          const own = collection.participants.find(
            (p) => p.collectorId === collector.id,
          );
          return (
            total +
            (own?.allocations || []).reduce(
              (s, m) =>
                s +
                Number(m.quantity) *
                  (m.unit === "TON" ? 1000 : m.unit === "KG" ? 1 : 0),
              0,
            )
          );
        }
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
        getStatusLabel(collector.status),
        collector.registrationNumber,
        CATEGORY_LABELS[collector.membershipCategory],
      ];

      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [collectors, searchText]);

  return (
    <>
      <HeadTags title="Catadores" />
      <TopProgressBar loading={loading} />

      <ManagementHeader
        title="Catadores"
        description="Gerencie os catadores vinculados à cooperativa."
        actions={
          <>
            <RegistrationPdfExport kind="collectors" />
            <Link to="/collector-teams" className="secondary-btn btn-sm">
              Equipes de catadores
            </Link>
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
          </>
        }
      />

      <div className="card p-20 mb-4">
        <div className="management-search">
          <Search size={18} />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar catador..."

            aria-label="Buscar catador..."
          />
        </div>
      </div>

      <div className="card p-25">
        <h4 className="mb-4 fw-600">Lista de Catadores</h4>

        <div className="table-responsive">
          <table className="table nowrap w-100 collector-table">
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
                        {collector.registrationNumber && <div className="small text-muted">Inscrição: {collector.registrationNumber}</div>}
                        {collector.membershipCategory && <div className="small text-muted">{CATEGORY_LABELS[collector.membershipCategory]}</div>}
                      </td>

                      <td>{collector.email || "N/A"}</td>

                      <td>{collector.phone || "N/A"}</td>

                      <td>
                        <span
                          className={`badge text-bg-${getStatusClass(
                            collector.status,
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
                        <div className="collector-row-actions">
                        <Link to={`/edit-collector/${collector.id}`} className="secondary-btn btn-sm"><Pencil size={16} />Editar cadastro</Link>
                        <Link
                          to={`/collector-documents?collectorId=${collector.id}`}
                          className="secondary-btn btn-sm"
                        >
                          <Eye size={16} />
                          Documentos
                        </Link>
                        <Link
                          to={`/collector-history?collectorId=${collector.id}`}
                          className="secondary-btn btn-sm"
                        >
                          Histórico
                        </Link>
                        </div>
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
