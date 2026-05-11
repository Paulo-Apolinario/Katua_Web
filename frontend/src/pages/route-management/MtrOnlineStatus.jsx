// frontend/src/pages/route-management/MtrOnlineStatus.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { House, ChevronRight, MapPin, Calendar, Plus } from "lucide-react";
import HeadTags from "../../components/HeadTags";
import { toast } from "react-hot-toast";

const MtrOnlineStatus = () => {
  const navigate = useNavigate();

  // ✅ filtros (por enquanto tudo client-side)
  const [filters, setFilters] = useState({
    company_id: "",
    vehicle_id: "",
    driver_id: "",
    q: "",
    finished: "",
    status: "",
    start_date: "",
    end_date: "",
  });

  // ✅ paginação client-side
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ✅ abre/fecha formulário MTR Online (CRIAR)
  const [showMtrForm, setShowMtrForm] = useState(false);

  // ✅ estado do formulário (controlado)
  const [mtrForm, setMtrForm] = useState({
    responsavel: "",
    cargo: "",
    docType: "PF", // PF | PJ | Email
    usuario: "",
    senha: "",
    codigoUnidade: "",
    residuosMTR: "1", // 1 | 2 | 3
  });

  // ✅ mock de dados (substituir por API depois)
  const mockData = useMemo(
    () => [
      {
        id: 208,
        name: "2ª ROTA TARDE",
        start_date: "2024-05-02",
        end_date: "2024-05-04",
        total_customers: 0,
        emitted: 0,
        pending: 0,
        company_name: "Empresa A",
        vehicle_name: "ABC-1234",
        driver_name: "Motorista 01",
        status: "pending",
        finished: false,
      },
      {
        id: 207,
        name: "1ª ROTA MANHÃ",
        start_date: "2024-05-02",
        end_date: "2024-05-04",
        total_customers: 0,
        emitted: 0,
        pending: 0,
        company_name: "Empresa A",
        vehicle_name: "XYZ-9876",
        driver_name: "Motorista 02",
        status: "emitted",
        finished: true,
      },
    ],
    []
  );

  // ✅ opções de selects (mock)
  const companies = useMemo(() => ["Empresa A", "Empresa B"], []);
  const vehicles = useMemo(() => ["ABC-1234", "XYZ-9876"], []);
  const drivers = useMemo(() => ["Motorista 01", "Motorista 02"], []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      company_id: "",
      vehicle_id: "",
      driver_id: "",
      q: "",
      finished: "",
      status: "",
      start_date: "",
      end_date: "",
    });
    setCurrentPage(1);
    setRowsPerPage(10);
  };

  const formatBR = (isoDate) => {
    if (!isoDate) return "-";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  };

  const calcPercent = (emitted, pending) => {
    const total = (emitted || 0) + (pending || 0);
    if (total <= 0) return 0;
    return Math.round(((emitted || 0) / total) * 100);
  };

  // ✅ filtro client-side
  const filteredData = useMemo(() => {
    const q = (filters.q || "").trim().toLowerCase();

    return mockData.filter((item) => {
      if (filters.company_id && item.company_name !== filters.company_id) return false;
      if (filters.vehicle_id && item.vehicle_name !== filters.vehicle_id) return false;
      if (filters.driver_id && item.driver_name !== filters.driver_id) return false;

      if (filters.finished !== "") {
        const wantFinished = filters.finished === "1";
        if (item.finished !== wantFinished) return false;
      }

      if (filters.status && item.status !== filters.status) return false;

      if (filters.start_date && item.start_date < filters.start_date) return false;
      if (filters.end_date && item.end_date > filters.end_date) return false;

      if (q) {
        const haystack = `${item.id} ${item.name} ${item.company_name} ${item.vehicle_name} ${item.driver_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [filters, mockData]);

  // ✅ paginação client-side
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  }, [filteredData.length, rowsPerPage]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, rowsPerPage]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // ✅ Form handlers
  const handleMtrFormChange = (e) => {
    const { name, value } = e.target;
    setMtrForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveMTR = () => {
    // 🔥 aqui você vai ligar na API depois
    // Ex: await mtrService.save(mtrForm)
    console.log("Salvar MTR Online:", mtrForm);

    toast.success("Dados MTR Online salvos (mock).");
    setShowMtrForm(false);
  };

  const cancelForm = () => {
    setShowMtrForm(false);
    setMtrForm({
      responsavel: "",
      cargo: "",
      docType: "PF",
      usuario: "",
      senha: "",
      codigoUnidade: "",
      residuosMTR: "1",
    });
  };

  const openCreateMtr = () => {
    setShowMtrForm(true);
    // opcional: rolar até o form
    setTimeout(() => {
      const el = document.getElementById("MTROnlinE");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <>
      <HeadTags title="MTR Online" />

      <div className="page-header mb-30 px-2">
        <div className="page-title mb-3">
          <h3 className="fs-30">Status dos roteiros / MTR Online</h3>
        </div>

        <div className="page-tool d-flex justify-content-between align-items-center">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pb-0 mb-0">
                <li className="breadcrumb-item">
                  <Link to="/" className="d-flex align-items-center gap-8">
                    <House /> Dashboard
                  </Link>
                </li>
                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>
                <li className="breadcrumb-item">
                  <Link to="/route-list">Gestão de Rotas</Link>
                </li>
                <li className="breadcrumb-item">
                  <ChevronRight />
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  MTR Online
                </li>
              </ol>
            </nav>
          </div>

          {/* ✅ BOTÃO TROCAD0: no lugar de "Voltar para rotas" */}
          <button type="button" className="btn-sm primary-btn border-0" onClick={openCreateMtr}>
            <Plus size={16} />
            MTR Online
          </button>
        </div>
      </div>

      <div className="row justify-content-center mb-4">
        <div className="col-lg-12 col-xl-11">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-3">Filtros</h3>

            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label">Empresa</label>
                <select className="form-select" name="company_id" value={filters.company_id} onChange={handleFilterChange}>
                  <option value="">Todas</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Veículo</label>
                <select className="form-select" name="vehicle_id" value={filters.vehicle_id} onChange={handleFilterChange}>
                  <option value="">Todos</option>
                  {vehicles.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Motorista</label>
                <select className="form-select" name="driver_id" value={filters.driver_id} onChange={handleFilterChange}>
                  <option value="">Todos</option>
                  {drivers.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Pesquisar</label>
                <input
                  className="form-control"
                  name="q"
                  value={filters.q}
                  onChange={handleFilterChange}
                  placeholder="MTR, ID ou descrição"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Rotas finalizadas</label>
                <select className="form-select" name="finished" value={filters.finished} onChange={handleFilterChange}>
                  <option value="">Todas</option>
                  <option value="1">Sim</option>
                  <option value="0">Não</option>
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Status atual</label>
                <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="emitted">Emitido</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="finished">Finalizado</option>
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Data de Início</label>
                <input type="date" className="form-control" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
              </div>

              <div className="col-md-3">
                <label className="form-label">Data de Término</label>
                <input type="date" className="form-control" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
              </div>

              <div className="col-12 d-flex gap-10 mt-2">
                <button className="btn-md primary-btn border-0" type="button">
                  FILTRAR
                </button>
                <button className="btn-md outline-btn" type="button" onClick={clearFilters}>
                  Limpar
                </button>
              </div>
            </div>

            <hr className="my-4" />

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-10">
              <h3 className="fw-600 fs-18 mb-0">Roteiros</h3>
              <div className="d-flex align-items-center gap-10">
                <span className="text-muted">Resultados por página:</span>
                <select
                  className="form-select show-perpage"
                  style={{ width: 90 }}
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              {currentItems.length === 0 ? (
                <div className="text-center text-muted py-4">Nenhum roteiro encontrado.</div>
              ) : (
                currentItems.map((r) => {
                  const percent = calcPercent(r.emitted, r.pending);

                  return (
                    <div
                      key={r.id}
                      className="d-flex justify-content-between align-items-center p-3 mb-3"
                      style={{
                        background: "#fff",
                        borderRadius: 8,
                        boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.08)",
                      }}
                    >
                      <div className="d-flex align-items-center gap-12">
                        <MapPin size={42} />
                        <div>
                          <div className="fw-700">
                            Rota: {r.id} - {r.name}
                          </div>
                          <div className="text-muted">
                            Data de Início: {formatBR(r.start_date)} | Data de Término: {formatBR(r.end_date)}
                          </div>
                          <div className="text-muted">Total de Clientes: {r.total_customers}</div>
                          <div className="text-muted small">
                            <span className="me-2">Empresa: {r.company_name}</span> |{" "}
                            <span className="mx-2">Veículo: {r.vehicle_name}</span> |{" "}
                            <span className="ms-2">Motorista: {r.driver_name}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ minWidth: 260 }}>
                        <div className="d-flex justify-content-center gap-12">
                          <span style={{ color: "#28a745", fontWeight: 700 }}>Emitido: {r.emitted}</span>
                          <span style={{ color: "#FFA500", fontWeight: 700 }}>Pendente: {r.pending}</span>
                        </div>

                        <div className="progress mt-2" style={{ height: 6 }}>
                          <div className="progress-bar" role="progressbar" style={{ width: `${percent}%` }} />
                        </div>

                        <div className="text-center text-muted small mt-1">{percent}% emitido</div>
                      </div>

                      <Link
                        to="/mtr-online"
                        className="d-flex justify-content-center align-items-center"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: "#6A1B9A",
                          color: "#fff",
                          textDecoration: "none",
                        }}
                        title="Calendário/detalhes"
                      >
                        <Calendar size={18} />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>

            {/* Paginação */}
            <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-10">
              <div className="text-muted">
                Mostrando {(currentPage - 1) * rowsPerPage + (filteredData.length ? 1 : 0)} -{" "}
                {Math.min(currentPage * rowsPerPage, filteredData.length)} de {filteredData.length}
              </div>

              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => goToPage(currentPage - 1)}>
                      Anterior
                    </button>
                  </li>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                      <button className="page-link" onClick={() => goToPage(i + 1)}>
                        {i + 1}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => goToPage(currentPage + 1)}>
                      Próximo
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

            {/* ✅ FORM MTR ONLINE (aparece ao clicar no botão "MTRonline") */}
            {showMtrForm && (
              <>
                <hr className="my-4" />

                <div className="tab-content" id="MTROnlinE">
                  <h3 className="fw-700 mb-3">MTR Online</h3>

                  <div className="form-group mb-3">
                    <label className="form-label" htmlFor="responsavel">
                      Responsável MTR Online:
                    </label>
                    <input
                      type="text"
                      id="responsavel"
                      name="responsavel"
                      className="form-control"
                      placeholder="Nome do responsável"
                      value={mtrForm.responsavel}
                      onChange={handleMtrFormChange}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label" htmlFor="cargo">
                      Cargo:
                    </label>
                    <input
                      type="text"
                      id="cargo"
                      name="cargo"
                      className="form-control"
                      placeholder="Cargo do responsável"
                      value={mtrForm.cargo}
                      onChange={handleMtrFormChange}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">Tipo de Documento:</label>
                    <div className="d-flex gap-20 flex-wrap">
                      <label className="d-flex align-items-center gap-8">
                        <input
                          type="radio"
                          name="docType"
                          value="PF"
                          checked={mtrForm.docType === "PF"}
                          onChange={handleMtrFormChange}
                        />
                        Pessoa Física
                      </label>

                      <label className="d-flex align-items-center gap-8">
                        <input
                          type="radio"
                          name="docType"
                          value="PJ"
                          checked={mtrForm.docType === "PJ"}
                          onChange={handleMtrFormChange}
                        />
                        Pessoa Jurídica
                      </label>

                      <label className="d-flex align-items-center gap-8">
                        <input
                          type="radio"
                          name="docType"
                          value="Email"
                          checked={mtrForm.docType === "Email"}
                          onChange={handleMtrFormChange}
                        />
                        Email
                      </label>
                    </div>
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label" htmlFor="usuario">
                      Usuário:
                    </label>
                    <input
                      type="text"
                      id="usuario"
                      name="usuario"
                      className="form-control"
                      placeholder="Usuário para acesso"
                      value={mtrForm.usuario}
                      onChange={handleMtrFormChange}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label" htmlFor="senha">
                      Senha MTR Online:
                    </label>
                    <input
                      type="password"
                      id="senha"
                      name="senha"
                      className="form-control"
                      placeholder="Senha"
                      value={mtrForm.senha}
                      onChange={handleMtrFormChange}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label" htmlFor="codigoUnidade">
                      Código da Unidade:
                    </label>
                    <input
                      type="text"
                      id="codigoUnidade"
                      name="codigoUnidade"
                      className="form-control"
                      placeholder="Digite o código da unidade"
                      value={mtrForm.codigoUnidade}
                      onChange={handleMtrFormChange}
                    />
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label" htmlFor="residuosMTR">
                      Resíduos Impressos no MTR:
                    </label>
                    <select
                      id="residuosMTR"
                      name="residuosMTR"
                      className="form-control"
                      value={mtrForm.residuosMTR}
                      onChange={handleMtrFormChange}
                    >
                      <option value="1">1 - Resíduo do Contrato e da Coleta</option>
                      <option value="2">2 - Resíduos do Contrato</option>
                      <option value="3">3 - Última Coleta</option>
                    </select>
                  </div>

                  <div className="d-flex gap-10 flex-wrap">
                    <button className="btn-md primary-btn border-0" type="button" onClick={saveMTR}>
                      Salvar Dados MTR
                    </button>

                    <button className="btn-md outline-btn" type="button" onClick={cancelForm}>
                      Cancelar
                    </button>

                    <button className="btn-md outline-btn" type="button" onClick={() => navigate(-1)}>
                      Voltar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MtrOnlineStatus;