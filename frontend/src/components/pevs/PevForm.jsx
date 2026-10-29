import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  createBin,
  getBinById,
  updateBin,
  uploadBinPhoto,
  removeBinPhoto,
} from "../../services/binService";
import { getAllVehicles } from "../../services/vehicleService";
import {
  useWasteResource,
  useWasteOperation,
} from "../waste-workspace/useWasteResource";
import {
  PevScope,
  PevPage,
  PevState,
  PevField,
  PevGuide,
  BackToPevs,
} from "./PevParts";
import {
  DAYS,
  KINDS,
  STATES,
  MATERIALS,
  formPayload,
  photoUrl,
  hasPosition,
  capacity,
} from "./pevUtils";
import PevMap from "./PevMap";
import { locatePevAddress, pevAddressKey } from "./pevGeocoding";
const initial = () => ({
  bin_id: "",
  name: "",
  pointKind: "PEV",
  publicAccess: false,
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "Fortaleza",
  state: "CE",
  regional: "",
  reference: "",
  location: "",
  latitude: "",
  longitude: "",
  acceptedMaterials: [],
  restrictions: "",
  openingHours: [],
  hoursExceptions: "",
  responsibleName: "",
  responsibleContact: "",
  vehicle_id: "",
  capacityValue: "",
  capacityUnit: "KG",
  notes: "",
  status: "active",
  needsPickup: false,
  pickupReason: "",
});
const vehicleLoader = async () => {
  const r = await getAllVehicles();
  if (!Array.isArray(r?.vehicles))
    throw Error("Não foi possível carregar os veículos.");
  return r.vehicles;
};
export default function PevForm({ edit = false }) {
  const { id } = useParams();
  return (
    <PevScope>
      <Form key={edit ? id : "new"} id={edit ? id : null} />
    </PevScope>
  );
}
function Form({ id }) {
  const nav = useNavigate(),
    op = useWasteOperation();
  const [form, setForm] = useState(initial),
    [loaded, setLoaded] = useState(false),
    [photo, setPhoto] = useState(null),
    [preview, setPreview] = useState(""),
    [removePhoto, setRemovePhoto] = useState(false),
    [savedId, setSavedId] = useState(null),
    [cepBusy, setCepBusy] = useState(false),
    [cepError, setCepError] = useState(""),
    [geoBusy, setGeoBusy] = useState(false),
    [locationConfirmed, setLocationConfirmed] = useState(false),
    [allowPending, setAllowPending] = useState(false),
    [locationMessage, setLocationMessage] = useState(
      "Consulte o CEP para sugerir uma posição ou marque a entrada do PEV no mapa.",
    ),
    [locationError, setLocationError] = useState("");
  const fileInput = useRef(null),
    cepRequest = useRef(0),
    geoRequest = useRef(0),
    cepAbort = useRef(null),
    geoAbort = useRef(null),
    formRef = useRef(form);
  formRef.current = form;
  const updateForm = useCallback((updater) => {
    const next =
      typeof updater === "function" ? updater(formRef.current) : updater;
    formRef.current = next;
    setForm(next);
  }, []);
  const loader = useCallback(async () => {
    if (!id) return null;
    const r = await getBinById(id);
    if (!r.data?.id) throw Error("PEV não encontrado.");
    return r.data;
  }, [id]);
  const resource = useWasteResource(loader),
    vehicles = useWasteResource(vehicleLoader);
  useEffect(() => {
    if (!loaded && !resource.loading && !resource.error) {
      if (resource.data) {
        const b = resource.data;
        updateForm({
          ...initial(),
          ...Object.fromEntries(
            Object.keys(initial()).map((k) => [
              k,
              b[k] ??
                (k === "openingHours" || k === "acceptedMaterials"
                  ? []
                  : k === "needsPickup" || k === "publicAccess"
                    ? false
                    : ""),
            ]),
          ),
          capacityValue: b.capacityValue ?? b.capacity_kg ?? "",
          capacityUnit: b.capacityUnit || "KG",
          status: b.status || "active",
          pointKind: b.pointKind || "PEV",
        });
        setLocationConfirmed(hasPosition(b));
        setLocationMessage(
          hasPosition(b)
            ? "Localização já salva. Alterar o endereço ou o marcador exige nova confirmação."
            : "Este PEV está sem marcador. Localize e confirme a entrada para utilizá-lo no cálculo das rotas.",
        );
      }
      setLoaded(true);
    }
  }, [resource, loaded, updateForm]);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  useEffect(
    () => () => {
      cepRequest.current++;
      geoRequest.current++;
      cepAbort.current?.abort();
      geoAbort.current?.abort();
    },
    [],
  );
  const cancelGeo = () => {
    geoRequest.current++;
    geoAbort.current?.abort();
    setGeoBusy(false);
  };
  const cancelCep = () => {
    cepRequest.current++;
    cepAbort.current?.abort();
    setCepBusy(false);
  };
  const set = (key, value) => {
    if (formRef.current[key] === value) return;
    op.setError("");
    if (key === "pointKind" && !["PEV", "ECOPONTO"].includes(value)) {
      updateForm((f) => ({ ...f, [key]: value, publicAccess: false }));
      return;
    }
    if (
      [
        "zipCode",
        "street",
        "number",
        "neighborhood",
        "city",
        "state",
        "location",
      ].includes(key)
    ) {
      cancelGeo();
      if (key !== "number") cancelCep();
      updateForm((f) => ({ ...f, [key]: value, latitude: "", longitude: "" }));
      setLocationConfirmed(false);
      setAllowPending(false);
      setLocationError("");
      setCepError("");
      setLocationMessage(
        "Endereço alterado. Localize novamente e confirme o marcador antes de salvar.",
      );
    } else if (["latitude", "longitude"].includes(key)) {
      cancelGeo();
      cancelCep();
      updateForm((f) => ({ ...f, [key]: value }));
      setLocationConfirmed(false);
      setAllowPending(false);
      setLocationError("");
      setLocationMessage(
        "Coordenadas ajustadas manualmente. Confira a posição no mapa e confirme.",
      );
    } else updateForm((f) => ({ ...f, [key]: value }));
  };
  const pick = (coords) => {
    if (op.busy) return;
    op.setError("");
    cancelGeo();
    cancelCep();
    updateForm((f) => ({ ...f, ...coords }));
    setLocationConfirmed(false);
    setAllowPending(false);
    setLocationError("");
    setLocationMessage(
      hasPosition(coords)
        ? "Marcador ajustado manualmente. Confirme a entrada do PEV no mapa."
        : "Localização removida. Localize novamente ou marque um ponto no mapa.",
    );
  };
  async function locate(snapshot = formRef.current, force = false) {
    if (!force && hasPosition(snapshot)) return;
    const key = pevAddressKey(snapshot),
      request = ++geoRequest.current;
    geoAbort.current?.abort();
    const controller = new AbortController();
    geoAbort.current = controller;
    const timer = setTimeout(() => controller.abort(), 16000);
    setGeoBusy(true);
    setLocationError("");
    setLocationConfirmed(false);
    setAllowPending(false);
    setLocationMessage("Localizando o endereço no mapa…");
    try {
      const coords = await locatePevAddress(snapshot, {
        signal: controller.signal,
      });
      if (
        request !== geoRequest.current ||
        key !== pevAddressKey(formRef.current)
      )
        return;
      updateForm((f) => ({
        ...f,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      setLocationMessage(coords.message);
    } catch (e) {
      if (
        request !== geoRequest.current ||
        key !== pevAddressKey(formRef.current)
      )
        return;
      setLocationError(
        controller.signal.aborted
          ? "A busca de localização excedeu o tempo de espera. Tente novamente ou marque o ponto manualmente no mapa."
          : e.message,
      );
      setLocationMessage(
        "Localização automática indisponível. O endereço permanece preenchido e pode ser ajustado manualmente.",
      );
    } finally {
      clearTimeout(timer);
      if (request === geoRequest.current) setGeoBusy(false);
    }
  }
  const field = (name, label, props = {}) => (
    <PevField
      key={name}
      name={name}
      label={label}
      value={form[name]}
      onChange={(value) => set(name, value)}
      onBlur={
        name === "number"
          ? () => {
              if (
                !cepBusy &&
                !geoBusy &&
                (formRef.current.street.trim() ||
                  formRef.current.location.trim()) &&
                formRef.current.city.trim() &&
                !hasPosition(formRef.current)
              )
                void locate();
            }
          : undefined
      }
      {...props}
    />
  );
  async function lookupCep() {
    const zip = formRef.current.zipCode.replace(/\D/g, "");
    if (zip.length !== 8) {
      setCepError("Informe um CEP com 8 dígitos.");
      return;
    }
    cancelGeo();
    cepAbort.current?.abort();
    const request = ++cepRequest.current,
      controller = new AbortController();
    cepAbort.current = controller;
    const timer = setTimeout(() => controller.abort(), 12000);
    setCepBusy(true);
    setCepError("");
    setLocationError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`, {
        signal: controller.signal,
      });
      if (!response.ok) throw Error("Consulta de CEP indisponível.");
      const data = await response.json();
      if (data.erro || !data.localidade || !data.uf)
        throw Error("CEP não encontrado. Preencha o endereço manualmente.");
      if (
        request !== cepRequest.current ||
        formRef.current.zipCode.replace(/\D/g, "") !== zip
      )
        return;
      // Mudança de número durante a consulta é preservada; outros campos de endereço invalidam a resposta.
      const next = {
        ...formRef.current,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade,
        state: data.uf,
        latitude: "",
        longitude: "",
      };
      updateForm(next);
      setLocationConfirmed(false);
      setAllowPending(false);
      void locate(next, true);
    } catch (e) {
      if (request === cepRequest.current)
        setCepError(
          controller.signal.aborted
            ? "Consulta de CEP demorou além do esperado. Tente novamente."
            : e instanceof TypeError
              ? "Não foi possível consultar o CEP. Confira a conexão ou preencha o endereço manualmente."
              : e.message,
        );
    } finally {
      clearTimeout(timer);
      if (request === cepRequest.current) setCepBusy(false);
    }
  }
  function confirmLocation() {
    if (!hasPosition(formRef.current)) {
      setLocationError("Marque uma posição válida no mapa antes de confirmar.");
      return;
    }
    op.setError("");
    cancelGeo();
    setLocationConfirmed(true);
    setAllowPending(false);
    setLocationError("");
    setLocationMessage(
      "Localização confirmada. As coordenadas serão gravadas ao salvar o PEV.",
    );
  }
  async function submit(e) {
    e.preventDefault();
    if (cepBusy || geoBusy) {
      op.setError(
        "Aguarde a consulta de endereço e localização antes de salvar.",
      );
      return;
    }
    if (hasPosition(form) && !locationConfirmed) {
      op.setError("Confirme a localização no mapa antes de salvar o PEV.");
      return;
    }
    if (!hasPosition(form) && !allowPending) {
      op.setError(
        "Localize e confirme o ponto no mapa. Se a localização ainda não estiver disponível, escolha explicitamente salvar com localização pendente.",
      );
      return;
    }
    if (!form.name.trim()) {
      op.setError("Informe o nome do ponto.");
      return;
    }
    if (!form.location.trim() && (!form.street.trim() || !form.city.trim())) {
      op.setError("Informe rua e município ou a descrição da localização.");
      return;
    }
    let payload;
    try {
      payload = formPayload(form);
    } catch (e) {
      op.setError(e.message);
      return;
    }
    await op.run(async () => {
      let target = id || savedId;
      const r = target
        ? await updateBin(target, payload)
        : await createBin(payload);
      if (!r.data?.id)
        throw Error(
          "Não foi possível confirmar o cadastro. Atualize a lista antes de repetir.",
        );
      target = r.data.id;
      setSavedId(target);
      if (photo) {
        try {
          await uploadBinPhoto(target, photo);
        } catch (e) {
          throw Error(
            `O cadastro foi salvo, mas a foto não foi enviada: ${e.message || "tente novamente"}. Use Salvar novamente para concluir sem duplicar o PEV.`,
          );
        }
      } else if (removePhoto) await removeBinPhoto(target);
      nav(`/bin-list/${encodeURIComponent(target)}`, {
        state: {
          notice: hasPosition(payload)
            ? "PEV salvo. A localização registrada já aparece no mapa."
            : "PEV salvo. Complete a localização para exibir o marcador no mapa.",
        },
      });
      return r;
    });
  }
  function photoChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhoto(null);
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      op.setError("Selecione JPG, PNG ou WEBP com até 5 MB.");
      e.target.value = "";
      return;
    }
    setPhoto(file);
    setRemovePhoto(false);
  }
  function updateDay(day, intervals) {
    updateForm((f) => ({
      ...f,
      openingHours: [
        ...(f.openingHours || []).filter((d) => d.day !== day),
        { day, intervals },
      ].sort((a, b) => a.day - b.day),
    }));
  }
  return (
    <PevPage
      title={id ? "Editar PEV" : "Cadastrar PEV"}
      description="Identifique o ponto, configure o atendimento e marque sua localização no mapa."
      actions={<BackToPevs />}
    >
      <PevGuide>
        <strong>Localização registrada, retirada rastreável.</strong>
        <div className="small mt-1">
          Consulte o CEP, complete o número e confirme a entrada do PEV no mapa.
          O endereço é enviado aos serviços de localização durante a busca. Você
          pode ajustar o pino manualmente; ele só será gravado ao salvar o
          cadastro.
        </div>
      </PevGuide>
      <PevState resource={resource}>
        {loaded && (
          <form onSubmit={submit}>
            {savedId && !id && (
              <div role="status" className="alert alert-info">
                Cadastro já salvo.{" "}
                <Link className="btn btn-sm btn-outline-success align-self-center" to={`/bin-list/${encodeURIComponent(savedId)}`}>
                  Consultar PEV
                </Link>
                . Ao salvar novamente, esse mesmo registro será atualizado.
              </div>
            )}
            <fieldset disabled={op.busy}>
              <section className="card p-4 mb-4">
                <h2 className="fs-18 mb-3">1. Identificação e responsável</h2>
                <div className="row g-3">
                  {field("bin_id", "Código do PEV", {
                    required: true,
                    maxLength: 100,
                  })}
                  {field("name", "Nome do ponto", {
                    required: true,
                    maxLength: 150,
                  })}
                  {field("pointKind", "Modalidade", {
                    options: Object.entries(KINDS).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  })}
                  {field("status", "Funcionamento", {
                    options: Object.entries(STATES).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  })}
                  {field("responsibleName", "Responsável pelo ponto", {
                    maxLength: 150,
                  })}
                  {field("responsibleContact", "Contato do responsável", {
                    maxLength: 100,
                  })}
                </div>
              </section>
              <section className="card p-4 mb-4">
                <h2 className="fs-18 mb-3">
                  2. Endereço e localização no mapa
                </h2>
                <div className="row g-3">
                  {field("zipCode", "CEP", { maxLength: 9 })}
                  <div className="col-md-6 d-flex align-items-end">
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={lookupCep}
                      disabled={cepBusy}
                    >
                      {cepBusy ? "Consultando..." : "Consultar CEP"}
                    </button>
                  </div>
                  {field("street", "Rua / avenida")}
                  {field("number", "Número", { maxLength: 30 })}
                  {field("neighborhood", "Bairro", { maxLength: 100 })}
                  {field("city", "Município", { maxLength: 100 })}
                  {field("state", "UF", { maxLength: 2 })}
                  {field("regional", "Regional de Fortaleza (se aplicável)", {
                    readOnly:
                      form.city.trim().toLocaleLowerCase("pt-BR") !==
                      "fortaleza",
                    maxLength: 100,
                  })}
                  {field("reference", "Ponto de referência")}
                  {field(
                    "location",
                    "Descrição da localização / endereço legado",
                    { maxLength: 500 },
                  )}
                </div>
                {cepError && (
                  <p role="alert" className="text-danger mt-2">
                    {cepError}
                  </p>
                )}
                <p className="small text-muted mt-3">
                  Consultar CEP preenche o endereço e sugere uma posição no
                  mapa. Após informar ou alterar o número, saia do campo para
                  atualizar a busca. A posição por CEP é aproximada: ajuste o
                  marcador para a entrada do imóvel e confirme.
                </p>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={() => void locate(formRef.current, true)}
                    disabled={geoBusy || cepBusy}
                  >
                    {geoBusy
                      ? "Localizando no mapa…"
                      : "Localizar endereço no mapa"}
                  </button>
                  <span className="small text-muted">
                    Sugestões por CEP: BrasilAPI. Busca pelo endereço completo:
                    Google Maps, quando configurado.
                  </span>
                </div>
                <PevMap
                  disabled={op.busy}
                  markerLabel={
                    locationConfirmed
                      ? "Localização confirmada do PEV"
                      : "Posição sugerida — confirme a entrada do PEV"
                  }
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onPick={pick}
                  label="Selecionar localização do PEV no mapa"
                />
                <div className="row g-3 mt-1">
                  {field("latitude", "Latitude", {
                    type: "number",
                    help: "Exemplo: -3.731900",
                  })}
                  {field("longitude", "Longitude", {
                    type: "number",
                    help: "Exemplo: -38.526700",
                  })}
                </div>
                <div
                  className={`pev-location-status mt-3 ${locationConfirmed ? "is-confirmed" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  <strong>
                    {locationConfirmed
                      ? "Localização confirmada"
                      : geoBusy
                        ? "Buscando localização"
                        : hasPosition(form)
                          ? "Confirmação necessária"
                          : "Localização pendente"}
                  </strong>
                  <p className="small mb-0 mt-1">{locationMessage}</p>
                </div>
                {locationError && (
                  <p role="alert" className="text-danger small mt-2">
                    {locationError}
                  </p>
                )}
                <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
                  <button
                    type="button"
                    className={`btn ${locationConfirmed ? "btn-success" : "btn-outline-success"}`}
                    disabled={
                      geoBusy ||
                      cepBusy ||
                      !hasPosition(form) ||
                      locationConfirmed
                    }
                    onClick={confirmLocation}
                  >
                    {locationConfirmed
                      ? "Localização confirmada no mapa"
                      : "Confirmar localização no mapa"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => pick({ latitude: "", longitude: "" })}
                  >
                    Limpar localização
                  </button>
                </div>
                {!hasPosition(form) && !geoBusy && (
                  <label className="d-block small mt-3">
                    <input
                      className="form-check-input me-2"
                      type="checkbox"
                      checked={allowPending}
                      onChange={(e) => {
                        setAllowPending(e.target.checked);
                        op.setError("");
                      }}
                    />
                    Salvar com localização pendente. Este PEV ficará fora dos
                    marcadores e do cálculo por ruas até a localização ser
                    completada.
                  </label>
                )}
              </section>
              <section className="card p-4 mb-4">
                <h2 className="fs-18 mb-3">
                  3. Materiais e orientações de entrega
                </h2>
                <div className="pev-materials">
                  {[...new Set([...MATERIALS, ...form.acceptedMaterials])].map(
                    (m) => (
                      <label key={m}>
                        <input
                          type="checkbox"
                          className="form-check-input me-2"
                          checked={form.acceptedMaterials.includes(m)}
                          onChange={(e) =>
                            set(
                              "acceptedMaterials",
                              e.target.checked
                                ? [...form.acceptedMaterials, m]
                                : form.acceptedMaterials.filter((x) => x !== m),
                            )
                          }
                        />
                        {m}
                      </label>
                    ),
                  )}
                </div>
                <p className="small text-muted mt-3">
                  Selecione somente os materiais atendidos por esta unidade e
                  informe condições de recebimento quando necessário.
                </p>
                <div className="row g-3">
                  {field(
                    "restrictions",
                    "Restrições e orientações de descarte",
                    { type: "textarea", maxLength: 1500 },
                  )}
                </div>
                {resource.data?.bin_type && !form.acceptedMaterials.length && (
                  <p className="small mt-2">
                    A categoria antiga será preservada. Defina os materiais
                    aceitos para completar o cadastro.
                  </p>
                )}
              </section>
              <section className="card p-4 mb-4">
                <h2 className="fs-18">4. Dias e horários de atendimento</h2>
                <p className="small text-muted">
                  Dias sem configuração ficam como “Não informado”. Use
                  “Fechado” quando o ponto não atende nesse dia.
                </p>
                {DAYS.map((day, index) => {
                  const config = form.openingHours.find((d) => d.day === index);
                  return (
                    <div className="pev-hours-row" key={day}>
                      <strong className="small">{day}</strong>
                      <div>
                        <select
                          className="form-select form-select-sm mb-2"
                          aria-label={`Atendimento ${day}`}
                          value={
                            !config
                              ? "unknown"
                              : config.intervals.length
                                ? "open"
                                : "closed"
                          }
                          onChange={(e) =>
                            e.target.value === "unknown"
                              ? set(
                                  "openingHours",
                                  form.openingHours.filter(
                                    (d) => d.day !== index,
                                  ),
                                )
                              : updateDay(
                                  index,
                                  e.target.value === "closed"
                                    ? []
                                    : [{ start: "08:00", end: "17:00" }],
                                )
                          }
                        >
                          <option value="unknown">Não informado</option>
                          <option value="closed">Fechado</option>
                          <option value="open">Informar horários</option>
                        </select>
                        {config?.intervals.map((v, i) => (
                          <div
                            className="d-flex align-items-center flex-wrap gap-2 mb-2"
                            key={i}
                          >
                            <input
                              aria-label={`Abertura ${day} ${i + 1}`}
                              type="time"
                              className="form-control form-control-sm w-auto"
                              required
                              value={v.start}
                              onChange={(e) =>
                                updateDay(
                                  index,
                                  config.intervals.map((x, j) =>
                                    j === i
                                      ? { ...x, start: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                            />
                            <span>até</span>
                            <input
                              aria-label={`Fechamento ${day} ${i + 1}`}
                              type="time"
                              className="form-control form-control-sm w-auto"
                              required
                              value={v.end}
                              onChange={(e) =>
                                updateDay(
                                  index,
                                  config.intervals.map((x, j) =>
                                    j === i ? { ...x, end: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                            {config.intervals.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() =>
                                  updateDay(
                                    index,
                                    config.intervals.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                Remover intervalo
                              </button>
                            )}
                          </div>
                        ))}
                        {!!config?.intervals.length &&
                          config.intervals.length < 4 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() =>
                                updateDay(index, [
                                  ...config.intervals,
                                  { start: "18:00", end: "19:00" },
                                ])
                              }
                            >
                              Adicionar intervalo
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
                <div className="row g-3 mt-2">
                  {field(
                    "hoursExceptions",
                    "Feriados e exceções de atendimento",
                    { type: "textarea", maxLength: 1000 },
                  )}
                </div>
              </section>
              <section className="card p-4 mb-4">
                <h2 className="fs-18 mb-3">5. Capacidade e logística</h2>
                <div className="row g-3">
                  {field("capacityValue", "Capacidade nominal", {
                    type: "number",
                    help: "Opcional. Não representa peso coletado nem ocupação atual.",
                  })}
                  {field("capacityUnit", "Unidade da capacidade", {
                    options: [
                      { value: "KG", label: "Quilogramas (kg)" },
                      { value: "LITER", label: "Litros (L)" },
                      { value: "CUBIC_METER", label: "Metros cúbicos (m³)" },
                    ],
                  })}
                  {field("vehicle_id", "Veículo de referência (opcional)", {
                    options: [
                      { value: "", label: "Sem veículo vinculado" },
                      ...(vehicles.data || [])
                        .filter(
                          (v) =>
                            v.status === "ACTIVE" || v.id === form.vehicle_id,
                        )
                        .map((v) => ({
                          value: v.id,
                          label: `${v.plate} · ${v.model}${v.status !== "ACTIVE" ? " (vínculo atual indisponível)" : ""}`,
                        })),
                      ...(form.vehicle_id &&
                      !(vehicles.data || []).some(
                        (v) => v.id === form.vehicle_id,
                      )
                        ? [
                            {
                              value: form.vehicle_id,
                              label: "Veículo atualmente vinculado",
                            },
                          ]
                        : []),
                    ],
                  })}
                </div>
                {vehicles.error && (
                  <div className="alert alert-warning mt-3" role="alert">
                    {vehicles.error}{" "}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={vehicles.refresh}
                    >
                      Atualizar veículos
                    </button>
                  </div>
                )}
                <label className="form-check mt-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={Boolean(form.publicAccess)}
                    disabled={
                      op.busy || !["PEV", "ECOPONTO"].includes(form.pointKind)
                    }
                    onChange={(e) => set("publicAccess", e.target.checked)}
                  />
                  <span className="form-check-label">
                    PEV de acesso público · exibir para pessoas físicas e permitir relatos de
                    pessoas físicas
                  </span>
                </label>
                <p className="small text-muted">
                  Somente modalidades PEV/Ecoponto com localização salva e
                  funcionamento ativo ou em manutenção aparecem para o público.
                  Endereço e materiais aceitos serão exibidos; contatos internos
                  não são publicados. Outras cooperativas e seus catadores não recebem acesso ao ponto.
                </p>
                <label className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.needsPickup}
                    onChange={(e) => set("needsPickup", e.target.checked)}
                  />
                  <span className="form-check-label">
                    Ponto precisa de retirada (informação manual)
                  </span>
                </label>
                <div className="row g-3 mt-1">
                  {field("pickupReason", "Motivo / orientação para retirada", {
                    type: "textarea",
                    maxLength: 1000,
                  })}
                  {field("notes", "Observações operacionais", {
                    type: "textarea",
                    maxLength: 2000,
                  })}
                </div>
              </section>
              <section className="card p-4 mb-4">
                <h2 className="fs-18">6. Foto do ponto</h2>
                <label htmlFor="pev-photo" className="form-label">
                  Imagem JPG, PNG ou WEBP de até 5 MB
                </label>
                <input
                  ref={fileInput}
                  id="pev-photo"
                  className="form-control"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={photoChange}
                />
                {(preview || (!removePhoto && resource.data?.photo_url)) && (
                  <div className="mt-3">
                    <img
                      className="pev-photo-large"
                      src={preview || photoUrl(resource.data.photo_url)}
                      alt="Foto do ponto de entrega"
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger d-block mt-2"
                      onClick={() => {
                        setPhoto(null);
                        setRemovePhoto(true);
                        if (fileInput.current) fileInput.current.value = "";
                      }}
                    >
                      Remover foto ao salvar
                    </button>
                  </div>
                )}
              </section>
            </fieldset>
            <PevGuide>
              <strong>Conferência</strong>
              <div>
                {form.name || "Nome não informado"} ·{" "}
                {form.bin_id || "Código não informado"} · {STATES[form.status]}
                <br />
                Capacidade:{" "}
                {capacity({
                  ...form,
                  capacityValue: form.capacityValue || null,
                })}{" "}
                ·{" "}
                {locationConfirmed
                  ? "Localização confirmada no mapa"
                  : hasPosition(form)
                    ? "Marcador aguardando confirmação"
                    : "Localização no mapa pendente"}
              </div>
            </PevGuide>
            {op.error && (
              <div role="alert" className="alert alert-danger">
                {op.error}
              </div>
            )}
            <div className="d-flex justify-content-end gap-2">
              <BackToPevs />
              <button
                className="btn btn-success"
                disabled={op.busy || cepBusy || geoBusy}
              >
                {op.busy ? "Salvando..." : "Salvar PEV"}
              </button>
            </div>
          </form>
        )}
      </PevState>
    </PevPage>
  );
}
