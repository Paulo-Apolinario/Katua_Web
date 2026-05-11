import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  House,
  ChevronRight,
  CirclePlus,
  Pencil,
  Search,
} from "lucide-react";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import { getAllDrivers } from "../../services/driverService";
import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.drivers)) return response.drivers;
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
  if (status === "AVAILABLE") return "status status-success";
  if (status === "ON_ROUTE") return "status status-warning";
  return "status status-danger";
};

const StaffList = () => {
  const [staffs, setStaffs] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const loadDrivers = async () => {
    try {
      setLoading(true);

      const response = await getAllDrivers();
      const drivers = getArray(response);

      const dataWithSn = drivers.map((item, index) => ({
        ...item,
        sn: index + 1,
      }));

      setStaffs(dataWithSn);
    } catch (error) {
      toast.error(error?.error || error?.message || "Erro ao carregar motoristas.");
      console.error("Fetch drivers error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const filteredData = staffs.filter((item) => {
    const term = search.toLowerCase();

    return (
      item.name?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.phone?.toLowerCase().includes(term) ||
      item.cpf?.toLowerCase().includes(term) ||
      item.cnh?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term)
    );
  });

  const columns = [
    { key: "sn", label: "SN" },
    {
      key: "name",
      label: "Motorista",
      render: (value) => value || "N/A",
    },
    {
      key: "email",
      label: "Email",
      render: (value) => value || "N/A",
    },
    {
      key: "phone",
      label: "Telefone",
      render: (value) => value || "N/A",
    },
    {
      key: "cpf",
      label: "CPF",
      render: (value) => value || "N/A",
    },
    {
      key: "cnh",
      label: "CNH",
      render: (value, row) => {
        const category = row.cnhCategory ? ` • ${row.cnhCategory}` : "";
        return value ? `${value}${category}` : "N/A";
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <span className={getStatusClass(value)}>{getStatusLabel(value)}</span>
      ),
    },
  ];

  return (
    <>
      <HeadTags title="Lista de Motoristas" />
      <TopProgressBar loading={loading} />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Lista de Motoristas</h3>

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
                    Lista de Motoristas
                  </li>
                </ol>
              </nav>
            </div>

            <Link to="/create-staff" className="primary-btn btn-sm">
              <CirclePlus /> Criar Motorista
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
                  placeholder="Buscar por nome, email, CPF ou CNH..."
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
                    to={`/edit-staff/${row.id}`}
                    className="action-button edit"
                  >
                    <Pencil />
                  </Link>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffList;