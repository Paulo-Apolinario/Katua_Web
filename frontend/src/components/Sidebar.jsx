import {
    House,
    ChevronRight,
    Settings,
    ChartLine,
    Box,
    Users,
    Route,
    Truck,
    MapPinned,
    Archive,
    Recycle,
    Command,
    Search,
    X
} from "lucide-react";

import  MenuSearch  from "./modal/MenuSearch";
import { NavLink,useLocation } from "react-router";

const Sidebar = ({active, setting, setActive }) => {
     const location = useLocation();

     const isWasteSectionActive = 
        location.pathname.startsWith('/waste-list') || 
        location.pathname.startsWith('/create-waste') ||
        location.pathname.startsWith('/edit-waste');

     const isZoneSectionActive = 
        location.pathname.startsWith('/zone-list') || 
        location.pathname.startsWith('/create-zone') ||
        location.pathname.startsWith('/edit-zone');

     const isVehicleSectionActive = 
        location.pathname.startsWith('/vehicle-list') || 
        location.pathname.startsWith('/create-vehicle') ||  
        location.pathname.startsWith('/edit-vehicle') ||
        location.pathname.startsWith('/document-list') || 
        location.pathname.startsWith('/create-document') ||
        location.pathname.startsWith('/edit-document') ||
        location.pathname.startsWith('/maintenance-list') ||
        location.pathname.startsWith('/create-maintenance')||
        location.pathname.startsWith('/edit-maintenance');

    const isBinSectionActive = 
        location.pathname.startsWith('/bin-list') || 
        location.pathname.startsWith('/create-bin') ||
        location.pathname.startsWith('/edit-bin');
    
    const isRouteSectionActive =
        location.pathname.startsWith('/route-list') ||
        location.pathname.startsWith('/create-route') ||
        location.pathname.startsWith('/edit-route') ||
        location.pathname.startsWith('/mtr-online');

    const isStaffSectionActive = 
        location.pathname.startsWith('/staff-list') ||
        location.pathname.startsWith('/create-staff') ||
        location.pathname.startsWith('/edit-staff') ||
        location.pathname.startsWith('/assign-list') || 
        location.pathname.startsWith('/create-assign') || 
        location.pathname.startsWith('/edit-assign') ||
        location.pathname.startsWith('/attendance-list')||
        location.pathname.startsWith('/create-attendance')||
        location.pathname.startsWith('/edit-attendance') ||
        location.pathname.startsWith('/staff-document-list')||
        location.pathname.startsWith('/create-staff-document') ||
        location.pathname.startsWith('/edit-staff-document');

    const isWasteTypeSectionActive = 
        location.pathname.startsWith('/waste-type-list') || 
        location.pathname.startsWith('/create-type') ||
        location.pathname.startsWith('/edit-waste-type');

    const isReportsectionActive = 
        location.pathname.startsWith('/waste-collection-reports') || 
        location.pathname.startsWith('/waste-type-reports')|| 
        location.pathname.startsWith('/vehicle-reports') ||
        location.pathname.startsWith('/staff-reports');

    const isSettingSectionActive = 
        location.pathname.startsWith('/system-alerts') ||
        location.pathname.startsWith('/settings') ||
        location.pathname.startsWith('/smtp-config');

    return (
        <>
          <MenuSearch />
           <div className={`back-drop ${active ? '' : 'close'}`} onClick={() => setActive(true)}></div>
            <div className={`sidebar tablet-sidebar py-3 ${active ? '' : 'close'}`}>
                <div className="logo-wrap">
                    <div className="logo-a">
                        <img src={setting.logo ? `${import.meta.env.VITE_API_BASE_URL}/uploads/logo/${setting.logo}` : null} className="logo" alt="" />
                    </div>
                    <button className="sidebar-close border-0 bg-transparent" onClick={() => setActive(true)}>
                       <X size={30} />
                    </button>
                </div>
                <div className="search-bar d-flex justify-content-between" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
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
                    <li className="nav-item">
                        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <div className="icon-wrap"><House /></div>
                            <span className="text">Painel Geral</span>
                        </NavLink>
                    </li>
                    <li className="nav-item">
                        <a href="#" className={`nav-link ${isWasteSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#waste">
                            <div className="icon-wrap"><Recycle /></div>
                            <span className="text">Coleta de Resíduo</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="waste">
                            <li>
                                <NavLink to="/waste-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Lista de Resíduos</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/create-waste" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Criar Resíduo</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <a href="" className={`nav-link ${isBinSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#bin">
                            <div className="icon-wrap"><Archive /></div>
                            <span className="text">Gestão de Lixeiras</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="bin">
                            <li>
                                <NavLink to="/bin-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Lista de Lixeiras</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/create-bin" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Criar Lixeira</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <a href="" className={`nav-link ${isZoneSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#zone">
                            <div className="icon-wrap"><MapPinned /></div>
                            <span className="text">Zona & Area</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="zone">
                            <li>
                                <NavLink to="/zone-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Lista de zonas</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/create-zone" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Criar Zona</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <a href="" className={`nav-link ${isVehicleSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#vehicle">
                            <div className="icon-wrap"><Truck /></div>
                            <span className="text">Gestão de Veiculos</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="vehicle">
                            <li>
                                <NavLink to="/vehicle-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Lista de Veículos</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/create-vehicle" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Criar Veículo</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/document-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Documentos do veículo</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/maintenance-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Log de manutenção</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <a href="" className={`nav-link ${isRouteSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#route">
                            <div className="icon-wrap"><Route /></div>
                            <span className="text">Gestão de Rotas</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="route">
                            <li>
                                <NavLink to="/route-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Lista de rotas</span>
                                </NavLink>
                            </li>
                            <li>
                             <NavLink to="/mtr-online" className={({ isActive }) => (isActive ? "active" : "")}>
                              <span className="dot-wrap">
                               <span className="dot"></span>
                                </span>
                                      <span className="submenu-text">MTR Online</span>
                                      </NavLink>
                               </li>
                            <li>
                                <NavLink to="/create-route" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Criar Rota</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <a href="" className={`nav-link ${isStaffSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#driver">
                            <div className="icon-wrap"><Users /></div>
                            <span className="text">Motorista e Equipe</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="driver">
                            <li>
                                <NavLink to="/staff-list"  className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Lista de equipes</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/create-staff"  className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Criar equipe</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/assign-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Atribuir à rota</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/attendance-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Presença da equipe</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/staff-document-list" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Documentos pessoal</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <a href="" className={`nav-link ${isWasteTypeSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#material">
                            <i className="bi bi-folder2-open icon"></i>
                            <div className="icon-wrap"> <Box /></div>
                            <span className="text">Tipo de Resíduos</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="material">
                            <li>
                                <NavLink to="/waste-type-list"  className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Lista de tipos de resíduos</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/create-type"  className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Criar tipo de resíduo</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item">
                        <a href="" className={`nav-link ${isReportsectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#reports">
                            <div className="icon-wrap"><ChartLine /></div>
                            <span className="text">Relatórios e Análises</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="reports">
                            <li>
                                <NavLink to="/waste-collection-reports" className={({ isActive }) => isActive ? 'active' : ''} >
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Relatórios de coleta de resíduos</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/waste-type-reports" className={({ isActive }) => isActive ? 'active' : ''} >
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Relatórios de tipos de resíduos</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/staff-reports" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Relatórios de equipe</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/vehicle-reports" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Relatórios de veículos</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                    <li className="nav-item"> 
                        <a href="" className={`nav-link ${isSettingSectionActive ? 'active' : ''}`} data-bs-toggle="collapse" data-bs-target="#system">
                            <i className="bi bi-folder2-open icon"></i>
                            <div className="icon-wrap"><Settings /></div>
                            <span className="text">Configurações do Sistema</span>
                            <ChevronRight className="ms-auto arrow align-middle" />
                        </a>
                        <ul className="submenu collapse transition" id="system">
                            <li>
                                <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Configurações da empresa</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/smtp-config" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Configuração SMTP</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/system-alerts" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="dot-wrap">
                                        <span className="dot"></span>
                                    </span>
                                    <span className="submenu-text">Alertas do Sistema</span>
                                </NavLink>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
        </>
    )
}

export default Sidebar;