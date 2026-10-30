import { formatDocument, normalizeDocument, generatorCategory, categoryLabels, generatorTypeLabel } from "../../utils/generatorDocument";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  CirclePlus,
  Eye,
  Pencil,
  Search,
  ShieldCheck,
  ShieldAlert,
  Building2,
} from "lucide-react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import moment from "moment";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import generatorService from "../../services/generatorService";

const getAccessStatusLabel = (status) => {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "INACTIVE":
      return "Inativo";
    case "BLOCKED":
      return "Bloqueado";
    case "PENDING_ACTIVATION":
    default:
      return "Pendente";
  }
};

const getAccessStatusClass = (status) => {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "BLOCKED":
      return "danger";
    case "INACTIVE":
      return "secondary";
    case "PENDING_ACTIVATION":
    default:
      return "warning";
  }
};

const GeneratorList = () => {
  const [generators, setGenerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("");

  const loadGenerators = async () => {
    try {
      setLoading(true);
      const data = await generatorService.list();
      setGenerators(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar geradores:", error);
      toast.error(error?.message || "Não foi possível carregar os geradores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGenerators();
  }, []);

  const filteredGenerators = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    return generators.filter((generator) => {
      if (category && generatorCategory(generator) !== category) return false;
      if (!term) return true;
      const values = [
        generator.name,
        generator.companyName,
        generator.email,
        generator.phone,
        generator.city,
        generator.state,
        generator.type,
        generator.documentNumber,
        generator.documentType,
        formatDocument(generator.documentNumber),
        generatorTypeLabel(generator),
        generator.accessStatus,
      ];

      if (normalizeDocument(term) && generator.documentNumber?.includes(normalizeDocument(term))) return true;
      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [generators, searchText, category]);

  const stats = useMemo(() => {
    const total = generators.length;
    const active = generators.filter(
      (item) => item.accessStatus === "ACTIVE",
    ).length;
    const pending = generators.filter(
      (item) => item.accessStatus === "PENDING_ACTIVATION",
    ).length;
    const released = generators.filter((item) => item.accessReleased).length;

    return {
      total,
      active,
      pending,
      released,
    };
  }, [generators]);

  return (
    <>
      <HeadTags title="Gestão de Geradores" />
      <TopProgressBar loading={loading} />

      <ManagementHeader
        title="Gestão de Geradores"
        description="Gerencie residenciais cadastrados, pequenos e grandes geradores vinculados à cooperativa."
        actions={
          <>
            <Link to="/create-generator" className="primary-btn btn-sm">
              <CirclePlus />
              Novo gerador
            </Link>
          </>
        }
      />

      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card p-25">
            <div className="content">
              <p className="title">Geradores cadastrados</p>
              <h3>{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25">
            <div className="content">
              <p className="title">Acessos ativos</p>
              <h3>{stats.active}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25">
            <div className="content">
              <p className="title">Pendentes</p>
              <h3>{stats.pending}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card p-25">
            <div className="content">
              <p className="title">Acesso liberado</p>
              <h3>{stats.released}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-25">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <h4 className="mb-0 fw-600">Lista de Geradores</h4>

          <div className="d-flex flex-wrap gap-2 align-items-center">
            <label className="small" htmlFor="generator-category">Classificação</label>
            <select className="form-select w-auto" id="generator-category" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          <div className="management-search">
            <Search size={18} />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar gerador..."

              aria-label="Buscar gerador..."
            />
          </div>
          </div>
        </div>

        <SimpleBar forceVisible="x" autoHide>
          <table className="table nowrap w-100">
            <thead>
              <tr>
                <th>Gerador</th>
                <th>Tipo</th>
                <th>Contato</th>
                <th>Cidade/UF</th>
                <th>Acesso</th>
                <th>Cadastro</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredGenerators.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    {loading
                      ? "Carregando geradores..."
                      : "Nenhum gerador encontrado."}
                  </td>
                </tr>
              ) : (
                filteredGenerators.map((generator) => (
                  <tr key={generator.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Building2 size={18} />
                        <div>
                          <strong>
                            {generator.companyName ||
                              generator.name ||
                              "Sem nome"}
                          </strong>
                          <div className="text-muted small">
                            {generator.companyName
                              ? generator.name
                              : generator.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td><div>{generatorTypeLabel(generator)}</div><small className="text-muted">{formatDocument(generator.documentNumber) || "CPF/CNPJ não informado"}</small></td>

                    <td>
                      <div>{generator.email || "N/A"}</div>
                      <div className="text-muted small">
                        {generator.phone || "Sem telefone"}
                      </div>
                    </td>

                    <td>
                      {generator.city || "N/A"}
                      {generator.state ? `/${generator.state}` : ""}
                    </td>

                    <td>
                      <span
                        className={`badge text-bg-${getAccessStatusClass(
                          generator.accessStatus,
                        )}`}
                      >
                        {generator.accessReleased ? (
                          <ShieldCheck size={14} className="me-1" />
                        ) : (
                          <ShieldAlert size={14} className="me-1" />
                        )}
                        {getAccessStatusLabel(generator.accessStatus)}
                      </span>
                    </td>

                    <td>
                      {generator.createdAt
                        ? moment(generator.createdAt).format("DD/MM/YYYY")
                        : "N/A"}
                    </td>

                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <Link
                          to={`/edit-generator/${generator.id}`}
                          className="btn btn-sm btn-outline-primary"
                          title="Editar gerador"
                        >
                          <Pencil size={16} />
                        </Link>

                        <Link
                          to={`/generator-documents?generatorId=${generator.id}`}
                          className="btn btn-sm btn-outline-secondary"
                          title="Documentos do gerador"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          to={`/generator-history?generatorId=${generator.id}`}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          Histórico
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SimpleBar>
      </div>
    </>
  );
};

export default GeneratorList;
