import DelivererPicker from "../../components/intakes/DelivererPicker";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { apiRequest } from "../../services/apiClient";
import { getAllDrivers } from "../../services/driverService";
import { getAllVehicles } from "../../services/vehicleService";
import { getPlanningSources } from "../../services/routePlanningService";
import { getAllRoutes } from "../../services/routeService";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
const labels = {
  PENDING: "Aguardando coleta",
  IN_PROGRESS: "Em campo",
  COLLECTED: "Aguardando recebimento",
  RECEIVED: "Recebido",
  SORTING: "Em triagem",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};
const units = { KG: "kg", TON: "t", LITER: "L", UNIT: "un", CUBIC_METER: "m³" };
const array = (r) =>
  Array.isArray(r)
    ? r
    : r?.items || r?.routes || r?.drivers || r?.vehicles || [];
export default function MaterialIntakes() {
  const { admin } = useAdminAuth();
  return admin?.id ? <Intakes key={admin.id} /> : null;
}
function Intakes() {
  const navigate = useNavigate();
  const [data, setData] = useState(null),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [form, setForm] = useState(null),
    [delivererEditing, setDelivererEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [resources, setResources] = useState({
      drivers: [],
      vehicles: [],
      collectors: [],
      routes: [],
    });
  const guard = useRef(false),
    load = useCallback(async () => {
      try {
        setData(
          await apiRequest(
            "/material-intakes?" +
              new URLSearchParams({
                page: String(page),
                ...(filter ? { status: filter } : {}),
              }),
          ),
        );
      } catch (e) {
        setError(e.message);
      }
    }, [page, filter]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    Promise.all([
      getAllDrivers(),
      getAllVehicles(),
      getPlanningSources(),
      getAllRoutes(),
    ])
      .then(([dr, ve, so, ro]) => {
        setResources({
          drivers: array(dr),
          vehicles: array(ve),
          collectors: so.collectors || [],
          routes: array(ro).filter((r) =>
            ["SCHEDULED", "IN_PROGRESS"].includes(r.status),
          ),
        });
      })
      .catch(() =>
        setError(
          "Alguns recursos não puderam ser carregados. Você pode registrar uma entrada direta sem equipe.",
        ),
      );
  }, []);
  useEffect(() => setDelivererEditing(false), [form?.operationId]);
  const fresh = (kind) => ({
    operationId: crypto.randomUUID(),
    kind,
    name: "",
    address: "",
    phone: "",
    document: "",
    description: "",
    notes: "",
    driverId: "",
    vehicleId: "",
    collectorId: "",
    routeId: "",
    delivererId: "",
    delivererVersion: undefined,
  });
  async function mutate(fn) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    if (delivererEditing) return;
    void mutate(async () => {
      const {
        operationId,
        kind,
        name,
        address,
        phone,
        document,
        description,
        notes,
        delivererId,
        delivererVersion,
        ...team
      } = form;
      const created = await apiRequest("/material-intakes", {
        method: "POST",
        body: {
          operationId,
          kind,
          ...(kind === "DIRECT" && delivererId
            ? { delivererId, delivererVersion }
            : {}),
          origin: {
            name,
            address,
            phone: phone || undefined,
            document: document || undefined,
            description,
          },
          notes,
          ...(kind === "PICKUP"
            ? Object.fromEntries(Object.entries(team).filter(([, v]) => v))
            : {}),
        },
      });
      if (!created.collection?.id)
        throw Error(
          "Registro não confirmado. Atualize a lista antes de tentar novamente.",
        );
      setForm(null);
      if (created.collection?.id)
        navigate(
          "/waste-list?coleta=" + encodeURIComponent(created.collection.id),
        );
      setNotice(
        kind === "DIRECT"
          ? "Entrada recebida. Registre a separação e pesagem quando estiverem prontas."
          : "Coleta avulsa registrada. Confirme a chegada do material para iniciar a pesagem.",
      );
    });
  }
  const field = (key, label, props = {}) => (
    <label className="d-block">
      {label}
      <input
        className="form-control"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        readOnly={
          !!form.delivererId && ["name", "document", "phone"].includes(key)
        }
        {...props}
      />
    </label>
  );
  return (
    <section className="container-fluid py-4">
      <ManagementHeader
        title="Entradas e coletas avulsas"
        description="Registre entregas na sede e coletas em locais sem cadastro permanente. Depois, separe, pese e encaminhe os materiais pelo fluxo de resíduos."
        actions={
          <>
            <button
              className="btn btn-success"
              disabled={busy || !!form}
              onClick={() => {
                setError("");
                setNotice("");
                setForm(fresh("DIRECT"));
              }}
            >
              Receber material na cooperativa
            </button>
            <button
              className="btn btn-outline-success"
              disabled={busy || !!form}
              onClick={() => {
                setError("");
                setNotice("");
                setForm(fresh("PICKUP"));
              }}
            >
              Adicionar coleta em endereço avulso
            </button>
          </>
        }
      />
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {form && (
        <form className="card p-4 mb-4" onSubmit={save}>
          <fieldset disabled={busy}>
            <h2 className="h5">
              {form.kind === "DIRECT"
                ? "Recebimento direto"
                : "Coleta em endereço avulso"}
            </h2>
            <p>
              {form.kind === "DIRECT"
                ? "Não exige catador cadastrado, motorista ou rota. Não será atribuída produção a um colaborador do sistema."
                : "Informe a origem do material. O cadastro da pessoa ou organização como gerador não é obrigatório."}
            </p>
            {form.kind === "DIRECT" && (
              <DelivererPicker
                onEditingChange={setDelivererEditing}
                selectedId={form.delivererId}
                onSelect={(p) =>
                  setForm((f) => ({
                    ...f,
                    delivererId: p?.id || "",
                    delivererVersion: p?.version,
                    name: p?.name || "",
                    document: p?.cpf || "",
                    phone: p?.phone || "",
                  }))
                }
              />
            )}
            <div className="row g-3">
              <div className="col-md-6">
                {field("name", "Pessoa / órgão / origem (opcional)", {
                  maxLength: 150,
                })}
              </div>
              <div className="col-md-6">
                {field("document", "Documento da origem (opcional)", {
                  maxLength: 30,
                })}
              </div>
              <div className="col-md-6">
                {field("phone", "Contato (opcional)", { maxLength: 30 })}
              </div>
              <div className="col-md-6">
                {field(
                  "address",
                  form.kind === "PICKUP"
                    ? "Endereço da coleta *"
                    : "Endereço da origem (opcional)",
                  {
                    required: form.kind === "PICKUP",
                    minLength: form.kind === "PICKUP" ? 5 : undefined,
                    maxLength: 500,
                  },
                )}
              </div>
              <div className="col-12">
                {field(
                  "description",
                  "Descrição do recebimento / materiais aparentes",
                  {
                    maxLength: 1500,
                    placeholder:
                      "Ex.: 8 sacos de recicláveis misturados, compra de material de autônomo.",
                  },
                )}
              </div>
              <div className="col-12">
                {field("notes", "Observações", { maxLength: 3000 })}
              </div>
              {form.kind === "PICKUP" &&
                [
                  ["routeId", "Rota (opcional)", "routes"],
                  [
                    "collectorId",
                    "Catador responsável (opcional)",
                    "collectors",
                  ],
                  ["driverId", "Motorista (opcional)", "drivers"],
                  ["vehicleId", "Veículo (opcional)", "vehicles"],
                ].map(([key, label, source]) => (
                  <label className="col-md-6" key={key}>
                    {label}
                    <select
                      className="form-select"
                      disabled={key !== "routeId" && !!form.routeId}
                      value={form[key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [key]: e.target.value,
                          ...(key === "routeId"
                            ? { driverId: "", vehicleId: "", collectorId: "" }
                            : {}),
                        })
                      }
                    >
                      <option value="">Sem vínculo</option>
                      {resources[source].map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name || v.plate}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
            </div>
            <p className="small mt-3">
              Ao selecionar uma rota, a equipe e o veículo serão os definidos
              nela. Informe somente dados necessários ao atendimento e apresente
              o aviso de privacidade à pessoa quando houver coleta de dados
              pessoais.
            </p>
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn btn-success"
                type="submit"
                disabled={delivererEditing}
              >
                {busy ? "Salvando..." : "Registrar entrada / coleta"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setForm(null)}
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <button
        className="btn btn-outline-secondary mb-3"
        disabled={busy}
        onClick={() => void load()}
      >
        Atualizar registros
      </button>
      <label className="mb-3 ms-3">
        Situação
        <select
          className="form-select"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas</option>
          {Object.entries(labels).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <div className="card p-3 table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Origem e registro</th>
              <th>Recebimento e situação</th>
              <th>Materiais</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>
                    {c.intakeOrigin?.name || "Origem não identificada"}
                  </strong>
                  <div>
                    {c.intakeKind === "DIRECT"
                      ? "Entrega direta na cooperativa"
                      : "Coleta em endereço avulso"}{" "}
                    · #{c.id.slice(-8).toUpperCase()}
                  </div>
                  <small>
                    {c.intakeOrigin?.address || "Entrega na sede"}
                    <br />
                    {c.intakeOrigin?.description}
                  </small>
                </td>
                <td>
                  {labels[c.status]}
                  <br />
                  {c.receivedAt
                    ? new Date(c.receivedAt).toLocaleString("pt-BR", {
                        timeZone: "America/Fortaleza",
                      })
                    : "Aguardando chegada do material"}
                </td>
                <td>
                  {c.collectionMaterials.length
                    ? c.collectionMaterials.map((m) => (
                        <div key={m.id}>
                          {m.nameSnapshot}: {Number(m.quantity)} {units[m.unit]}
                        </div>
                      ))
                    : "Aguardando separação e pesagem"}
                </td>
                <td>
                  <Link
                    className="btn btn-sm btn-success"
                    to={"/waste-list?coleta=" + encodeURIComponent(c.id)}
                  >
                    {c.status === "COMPLETED"
                      ? "Acompanhar materiais"
                      : c.status === "CANCELLED"
                        ? "Consultar registro"
                        : "Continuar atendimento"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.items.length && (
          <p>Nenhuma entrada avulsa nesta situação.</p>
        )}
        <div className="d-flex gap-3 align-items-center">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>
            {page} / {data?.pagination.totalPages || 1}
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={!data || page >= data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </section>
  );
}
