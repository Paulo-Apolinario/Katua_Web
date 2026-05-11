import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  House,
  ChevronRight,
  CirclePlus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "../../components/DataTable";
import DeleteModal from "../../components/modal/DeleteModal";
import { getAllVehicles, deleteVehicle } from "../../services/vehicleService";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.vehicles)) return response.vehicles;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getStatusLabel = (status) => {
  const labels = {
    ACTIVE: "Ativo",
    MAINTENANCE: "Manutenção",
    INACTIVE: "Inativo",
  };

  return labels[status] || status || "N/A";
};

const getStatusClass = (status) => {
  if (status === "ACTIVE") return "status status-success";
  if (status === "MAINTENANCE") return "status status-warning";
  return "status status-danger";
};

const VehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadVehicles = async () => {
    try {
      setLoading(true);

      const response = await getAllVehicles();
      const list = getArray(response);

      const dataWithSn = list.map((item, index) => ({
        ...item,
        sn: index + 1,
      }));

      setVehicles(dataWithSn);
    } catch (error) {
      toast.error(error?.message || "Erro ao carregar veículos.");
      console.error("Fetch vehicles error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredData = vehicles.filter((item) => {
    const term = search.toLowerCase();

    return (
      item.plate?.toLowerCase().includes(term) ||
      item.model?.toLowerCase().includes(term) ||
      item.brand?.toLowerCase().includes(term) ||
      item.driver?.name?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term)
    );
  });

  const columns = [
    { key: "sn", label: "SN" },
    {
      key: "plate",
      label: "Placa",
      render: (value) => value || "N/A",
    },
    {
      key: "model",
      label: "Modelo",
      render: (value, row) => {
        const brand = row.brand ? `${row.brand} ` : "";
        const year = row.year ? ` • ${row.year}` : "";
        return `${brand}${value || "N/A"}${year}`;
      },
    },
    {
      key: "driverId",
      label: "Motorista",
      render: (value, row) => row.driver?.name || "Não vinculado",
    },
    {
      key: "capacityKg",
      label: "Capacidade (KG)",
      render: (value) => `${Number(value || 0).toFixed(2)} KG`,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className={getStatusClass(value)}>{getStatusLabel(value)}</span>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteVehicle(deleteId);

      setVehicles((prev) =>
        prev
          .filter((item) => item.id !== deleteId)
          .map((item, index) => ({
            ...item,
            sn: index + 1,
          }))
      );

      toast.success("Veículo excluído com sucesso.");
      setDeleteId(null);
    } catch (error) {
      toast.error(error?.message || "Erro ao excluir veículo.");
      console.error("Delete vehicle error:", error);
    }
  };

  return (
    <>
      <HeadTags title="Lista de Veículos" />
      <TopProgressBar loading={loading} />
      <DeleteModal handleDelete={handleDelete} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Lista de Veículos</h3>

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
                    Lista de Veículos
                  </li>
                </ol>
              </nav>
            </div>

            <Link to="/create-vehicle" className="primary-btn btn-sm">
              <CirclePlus /> Criar Veículo
            </Link>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card p-25">
            <div className="filter d-flex justify-content-end mb-3">
              <div className="filter-section search">
                <div className="icon">
                  <Search />
                </div>

                <input
                  className="form-control"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por placa, modelo ou motorista..."
                />
              </div>
            </div>

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
              renderActions={(row) => (
                <div className="actions d-flex align-items-center gap-10">
                  <Link
                    to={`/edit-vehicle/${row.id}`}
                    className="action-button edit"
                  >
                    <Pencil />
                  </Link>

                  <button
                    className="action-button delete"
                    data-bs-toggle="modal"
                    data-bs-target="#deleteModal"
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2 />
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default VehicleList;