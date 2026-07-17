import {
  House,
  ChevronRight,
  Settings,
  ChartLine,
  Box,
  Boxes,
  Users,
  Route,
  Truck,
  MapPinned,
  Archive,
  Recycle,
  Command,
  Search,
  X,
  Building2,
  Tags,
  CirclePlus,
} from "lucide-react";

import MenuSearch from "./modal/MenuSearch";
import { NavLink, useLocation } from "react-router";

const Sidebar = ({ active, setActive }) => {
  const location = useLocation();

  const isWasteSectionActive =
    location.pathname.startsWith("/waste-list") ||
    location.pathname.startsWith("/create-waste") ||
    location.pathname.startsWith("/edit-waste") ||
    location.pathname.startsWith("/collection-requests");

  const isZoneSectionActive =
    location.pathname.startsWith("/zone-list") ||
    location.pathname.startsWith("/create-zone") ||
    location.pathname.startsWith("/edit-zone");

  const isGeneratorSectionActive =
    location.pathname.startsWith("/generator-list") ||
    location.pathname.startsWith("/create-generator") ||
    location.pathname.startsWith("/edit-generator") ||
    location.pathname.startsWith("/generator-documents");

  const isVehicleSectionActive =
    location.pathname.startsWith("/vehicle-list") ||
    location.pathname.startsWith("/create-vehicle") ||
    location.pathname.startsWith("/edit-vehicle") ||
    location.pathname.startsWith("/document-list") ||
    location.pathname.startsWith("/create-document") ||
    location.pathname.startsWith("/edit-document") ||
    location.pathname.startsWith("/maintenance-list") ||
    location.pathname.startsWith("/create-maintenance") ||
    location.pathname.startsWith("/edit-maintenance");

  const isBinSectionActive =
    location.pathname.startsWith("/bin-list") ||
    location.pathname.startsWith("/create-bin") ||
    location.pathname.startsWith("/edit-bin");

  const isRouteSectionActive =
    location.pathname.startsWith("/route-list") ||
    location.pathname.startsWith("/create-route") ||
    location.pathname.startsWith("/edit-route") ||
    location.pathname.startsWith("/operational-calendar") ||
    location.pathname.startsWith("/mtr-online");

  const isStaffSectionActive =
    location.pathname.startsWith("/staff-list") ||
    location.pathname.startsWith("/create-staff") ||
    location.pathname.startsWith("/edit-staff") ||
    location.pathname.startsWith("/collector-list") ||
    location.pathname.startsWith("/create-collector") ||
    location.pathname.startsWith("/collector-documents") ||
    location.pathname.startsWith("/assign-list") ||
    location.pathname.startsWith("/create-assign") ||
    location.pathname.startsWith("/edit-assign") ||
    location.pathname.startsWith("/attendance-list") ||
    location.pathname.startsWith("/create-attendance") ||
    location.pathname.startsWith("/edit-attendance") ||
    location.pathname.startsWith("/staff-document-list") ||
    location.pathname.startsWith("/create-staff-document") ||
    location.pathname.startsWith("/edit-staff-document");

  const isWasteStockSectionActive =
    location.pathname.startsWith("/waste-stock") ||
    location.pathname.startsWith("/waste-type-list") ||
    location.pathname.startsWith("/create-type") ||
    location.pathname.startsWith("/edit-waste-type");

  const isReportSectionActive =
    location.pathname.startsWith("/analytics-dashboard") ||
    location.pathname.startsWith("/waste-collection-reports") ||
    location.pathname.startsWith("/waste-type-reports") ||
    location.pathname.startsWith("/vehicle-reports") ||
    location.pathname.startsWith("/staff-reports");

  const isSettingSectionActive =
    location.pathname.startsWith("/system-alerts") ||
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/smtp-config");

  const closeSidebarOnMobile = () => {
    setActive(true);
  };

  return (
    <>
      <MenuSearch />

      <div
        className={`back-drop ${active ? "" : "close"}`}
        onClick={closeSidebarOnMobile}
      />

      <div
        className={`sidebar tablet-sidebar py-3 ${
          active ? "" : "close"
        }`}
      >
        <div className="logo-wrap">
          <div className="logo-a">
            <img
              src="/images/logo-1759318675551-812040927.png"
              className="logo"
              alt="KATUÁ"
              style={{
                width: "150px",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          <button
            type="button"
            className="sidebar-close border-0 bg-transparent"
            onClick={closeSidebarOnMobile}
            aria-label="Fechar menu lateral"
          >
            <X size={30} />
          </button>
        </div>

        <div
          className="search-bar d-flex justify-content-between"
          data-bs-toggle="modal"
          data-bs-target="#staticBackdrop"
        >
          <div className="left-content">
            <Search />
            <span>Procurando...</span>
          </div>

          <div className="right-content">
            <Command />
            <span>k</span>
          </div>
        </div>

        <ul className="nav flex-column mt-4">
          {/* Dashboard */}
          <li className="nav-item">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <div className="icon-wrap">
                <House />
              </div>

              <span className="text">
                Painel Geral
              </span>
            </NavLink>
          </li>

          {/* Waste Collection */}
          <li className="nav-item">
            <a
              href="#waste"
              className={`nav-link ${
                isWasteSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#waste"
              aria-expanded={isWasteSectionActive}
              aria-controls="waste"
            >
              <div className="icon-wrap">
                <Recycle />
              </div>

              <span className="text">
                Coleta de Resíduo
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isWasteSectionActive ? "show" : ""
              }`}
              id="waste"
            >
              <li>
                <NavLink
                  to="/waste-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Lista de Coletas
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/collection-requests"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Coletas Solicitadas
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* PEV */}
          <li className="nav-item">
            <a
              href="#bin"
              className={`nav-link ${
                isBinSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#bin"
              aria-expanded={isBinSectionActive}
              aria-controls="bin"
            >
              <div className="icon-wrap">
                <Archive />
              </div>

              <span className="text">
                Gestão de PEVs
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isBinSectionActive ? "show" : ""
              }`}
              id="bin"
            >
              <li>
                <NavLink
                  to="/bin-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Lista de PEVs
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-bin"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Cadastrar PEV
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Zones */}
          <li className="nav-item">
            <a
              href="#zone"
              className={`nav-link ${
                isZoneSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#zone"
              aria-expanded={isZoneSectionActive}
              aria-controls="zone"
            >
              <div className="icon-wrap">
                <MapPinned />
              </div>

              <span className="text">
                Zona & Área
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isZoneSectionActive ? "show" : ""
              }`}
              id="zone"
            >
              <li>
                <NavLink
                  to="/zone-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Lista de Zonas
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-zone"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Criar Zona
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Generators */}
          <li className="nav-item">
            <a
              href="#generator"
              className={`nav-link ${
                isGeneratorSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#generator"
              aria-expanded={isGeneratorSectionActive}
              aria-controls="generator"
            >
              <div className="icon-wrap">
                <Building2 />
              </div>

              <span className="text">
                Gestão de Geradores
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isGeneratorSectionActive ? "show" : ""
              }`}
              id="generator"
            >
              <li>
                <NavLink
                  to="/generator-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Listar Geradores
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-generator"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Criar Gerador
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/generator-documents"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Documentos do Gerador
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Vehicles */}
          <li className="nav-item">
            <a
              href="#vehicle"
              className={`nav-link ${
                isVehicleSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#vehicle"
              aria-expanded={isVehicleSectionActive}
              aria-controls="vehicle"
            >
              <div className="icon-wrap">
                <Truck />
              </div>

              <span className="text">
                Gestão de Veículos
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isVehicleSectionActive ? "show" : ""
              }`}
              id="vehicle"
            >
              <li>
                <NavLink
                  to="/vehicle-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Lista de Veículos
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-vehicle"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Criar Veículo
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/document-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Documentos do Veículo
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/maintenance-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Log de Manutenção
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Routes */}
          <li className="nav-item">
            <a
              href="#route"
              className={`nav-link ${
                isRouteSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#route"
              aria-expanded={isRouteSectionActive}
              aria-controls="route"
            >
              <div className="icon-wrap">
                <Route />
              </div>

              <span className="text">
                Gestão de Rotas
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isRouteSectionActive ? "show" : ""
              }`}
              id="route"
            >
              <li>
                <NavLink
                  to="/route-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Lista de Rotas
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/mtr-online"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    MTR Online
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/operational-calendar"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Calendário Operacional
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-route"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Criar Rota
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Staff */}
          <li className="nav-item">
            <a
              href="#driver"
              className={`nav-link ${
                isStaffSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#driver"
              aria-expanded={isStaffSectionActive}
              aria-controls="driver"
            >
              <div className="icon-wrap">
                <Users />
              </div>

              <span className="text">
                Motoristas e Catadores
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isStaffSectionActive ? "show" : ""
              }`}
              id="driver"
            >
              <li>
                <NavLink
                  to="/staff-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Listar Motoristas
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-staff"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Adicionar Motorista
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/collector-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Listar Catadores
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-collector"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Adicionar Catador
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/collector-documents"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Documentos dos Catadores
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/assign-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Rotas Delegadas
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Waste Stock and Catalog */}
          <li className="nav-item">
            <a
              href="#waste-stock-menu"
              className={`nav-link ${
                isWasteStockSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#waste-stock-menu"
              aria-expanded={isWasteStockSectionActive}
              aria-controls="waste-stock-menu"
            >
              <div className="icon-wrap">
                <Box />
              </div>

              <span className="text">
                Estoque de Resíduos
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isWasteStockSectionActive ? "show" : ""
              }`}
              id="waste-stock-menu"
            >
              <li>
                <NavLink
                  to="/waste-stock"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Visão do Estoque
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/waste-stock/create"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Adicionar Lote
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/waste-type-list"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Gestão de Resíduos
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/create-type"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Cadastrar Tipo de Resíduo
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Reports */}
          <li className="nav-item">
            <a
              href="#reports"
              className={`nav-link ${
                isReportSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#reports"
              aria-expanded={isReportSectionActive}
              aria-controls="reports"
            >
              <div className="icon-wrap">
                <ChartLine />
              </div>

              <span className="text">
                Relatórios e Análises
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isReportSectionActive ? "show" : ""
              }`}
              id="reports"
            >
              <li>
                <NavLink
                  to="/analytics-dashboard"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Dashboard Analytics
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/waste-collection-reports"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Relatórios de Coletas
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/waste-type-reports"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Relatórios de Resíduos
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/staff-reports"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Relatórios de Equipe
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/vehicle-reports"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Relatórios de Veículos
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* Settings */}
          <li className="nav-item">
            <a
              href="#system"
              className={`nav-link ${
                isSettingSectionActive ? "active" : ""
              }`}
              data-bs-toggle="collapse"
              data-bs-target="#system"
              aria-expanded={isSettingSectionActive}
              aria-controls="system"
            >
              <div className="icon-wrap">
                <Settings />
              </div>

              <span className="text">
                Configurações do Sistema
              </span>

              <ChevronRight className="ms-auto arrow align-middle" />
            </a>

            <ul
              className={`submenu collapse transition ${
                isSettingSectionActive ? "show" : ""
              }`}
              id="system"
            >
              <li>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Configurações da Empresa
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/smtp-config"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Configuração SMTP
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/system-alerts"
                  className={({ isActive }) =>
                    isActive ? "active" : ""
                  }
                >
                  <span className="dot-wrap">
                    <span className="dot" />
                  </span>

                  <span className="submenu-text">
                    Alertas do Sistema
                  </span>
                </NavLink>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Sidebar;