import { NavLink } from "react-router";
import { X, FileCheck2 } from "lucide-react";
export default function MunicipalSidebar({ active, setActive }) {
  return (
    <>
      <div
        className={`back-drop ${active ? "" : "close"}`}
        onClick={() => setActive(true)}
      />
      <aside className={`sidebar tablet-sidebar py-3 ${active ? "" : "close"}`}>
        <div className="logo-wrap">
          <img
            src="/images/logo-1759318675551-812040927.png"
            className="logo"
            alt="KATUÁ"
            width="150"
          />
          <button
            className="sidebar-close border-0 bg-transparent"
            aria-label="Fechar menu lateral"
            onClick={() => setActive(true)}
          >
            <X />
          </button>
        </div>
        <div className="p-3">
          <p className="small text-muted">
            GESTÃO MUNICIPAL · ACESSO DESIGNADO
          </p>
          <nav aria-label="Gestão municipal">
            <NavLink
              to="/mtr-online"
              className="btn btn-outline-success w-100"
              onClick={() => setActive(true)}
            >
              <FileCheck2 size={18} className="me-2" />
              Central ambiental e SINIR
            </NavLink>
          </nav>
          <p className="small text-muted mt-3">
            Somente municípios autorizados e documentos compartilhados para sua
            conta.
          </p>
        </div>
      </aside>
    </>
  );
}
