import { Search, Link as LucideLink } from "lucide-react";
import { useNavigate } from "react-router";
import { useMemo, useState } from "react";

const MENU_LINKS = [
  { name: "Painel", path: "/" },
  { name: "Veículos", path: "/vehicle-list" },
  { name: "Cadastrar veículo", path: "/create-vehicle" },
  { name: "Equipe operacional", path: "/staff-list" },
  { name: "Cadastrar equipe", path: "/create-staff" },
  { name: "Rotas", path: "/route-list" },
  { name: "Criar rota", path: "/create-route" },
  { name: "Coletas", path: "/waste-list" },
  { name: "Nova coleta", path: "/create-waste" },
  { name: "Configurações", path: "/settings" },
];

const MenuSearch = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const menuItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return MENU_LINKS;

    return MENU_LINKS.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.path.toLowerCase().includes(term)
      );
    });
  }, [search]);

  const redirect = (url) => {
    navigate(url);
  };

  return (
    <div
      className="modal fade menu-search"
      id="staticBackdrop"
      data-bs-keyboard="false"
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex align-items-center">
              <Search />

              <input
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder="Buscar no menu..."
              />
            </div>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body py-4">
            {menuItems.map((item, key) => (
              <div
                key={key}
                className="item px-4 d-flex align-items-center justify-content-between"
              >
                <div className="left-content">
                  <h5 className="fw-semibold">{item.name}</h5>
                  <span>{item.path}</span>
                </div>

                <button
                  type="button"
                  className="redirect-btn"
                  onClick={() => redirect(item.path)}
                  data-bs-dismiss="modal"
                >
                  visitar link <LucideLink />
                </button>
              </div>
            ))}

            {menuItems.length === 0 && (
              <h3 className="text-muted small px-2 text-center">
                Nenhum resultado encontrado.
              </h3>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuSearch;