import { Link, useLocation } from "react-router";
import { managementModule } from "./managementModules";
import "./managementWorkspace.css";

export function ManagementWorkspace({ children }) {
  const { pathname } = useLocation();
  const module = managementModule(pathname);
  return module ? (
    <div
      className="container-fluid py-4 management-workspace"
      data-management-module={module.id}
    >
      {children}
    </div>
  ) : (
    children
  );
}

export function ManagementHeader({
  title,
  description,
  actions,
  hideNavigation = false,
  eyebrow,
}) {
  const { pathname } = useLocation();
  const module = managementModule(pathname);
  return (
    <>
      <div className="management-eyebrow">
        KATUÁ · {eyebrow || module?.label}
      </div>
      <header className="management-header d-flex justify-content-between align-items-start flex-wrap gap-3 mt-2 mb-4">
        <div className="management-heading">
          <h1 className="h3 fw-bold">{title}</h1>
          <p className="text-muted mb-0">
            {description || module?.description}
          </p>
        </div>
        {actions && (
          <div className="management-header-actions d-flex gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </header>
      {module && !hideNavigation && (
        <nav
          className="management-nav d-flex gap-2 mb-4"
          aria-label={module.label}
        >
          {module.links.map((item) => {
            const active = item.paths.includes(module.path);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`btn btn-sm ${active ? "btn-success" : "btn-outline-secondary"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
