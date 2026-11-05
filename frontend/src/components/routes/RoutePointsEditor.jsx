import { useState } from "react";
import { Plus, MapPin, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import GeneratorLocationEditor from "../generators/GeneratorLocationEditor";
import { geocodeAddressWithGoogle } from "../generators/geocodeAddress";
import { normalizeSearchText } from "../../utils/generatorNeighborhood";
import {
  sourceAddress,
  neighborhoodGroups,
  neighborhoodPreview,
  appendNeighborhoodPoints,
} from "./neighborhoodPoints";
const blank = () => ({
  key: crypto.randomUUID(),
  kind: "ADDRESS",
  name: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "CE",
  address: "",
  latitude: "",
  longitude: "",
  notes: "",
  materials: "",
  phone: "",
  collectorId: "",
  weekdays: [],
});
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const fullAddress = sourceAddress;
export default function RoutePointsEditor({
  points,
  onChange,
  sources,
  collectorIds = [],
  disabled = false,
  recurring = false,
  hideSources = false,
  onReloadSources,
  occupiedSources = [],
  maxPoints = 100,
}) {
  const [draft, setDraft] = useState(null),
    [editing, setEditing] = useState(null),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [neighborhood, setNeighborhood] = useState(""),
    [notice, setNotice] = useState("");
  const groups = neighborhoodGroups(sources?.generators || []);
  const group = groups.find((g) => g.key === neighborhood);
  const preview = neighborhoodPreview(
    group?.generators || [],
    points,
    occupiedSources,
  );
  const included = (kind, id) =>
    [...points, ...occupiedSources].some(
      (p) => p.kind === kind && p.sourceId === id,
    );
  function addNeighborhood() {
    setError("");
    setNotice("");
    try {
      const next = appendNeighborhoodPoints(
        points,
        group?.generators || [],
        occupiedSources,
        maxPoints,
      );
      onChange(next);
      setNotice(
        `${next.length - points.length} gerador(es) adicionado(s) ao planejamento. Confira a sequência e salve a rota.`,
      );
    } catch (e) {
      setError(e.message);
    }
  }
  const change = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
    if (
      [
        "street",
        "number",
        "neighborhood",
        "city",
        "state",
        "zipCode",
        "address",
        "latitude",
        "longitude",
      ].includes(key)
    )
      setConfirmed(false);
  };
  const choose = (kind, p) => {
    const address = fullAddress(p);
    setDraft({
      ...blank(),
      kind,
      sourceId: p.id,
      name: p.companyName || p.name || p.binId,
      address,
      zipCode: p.zipCode || "",
      latitude: p.latitude ?? "",
      longitude: p.longitude ?? "",
    });
    setConfirmed(false);
    setEditing(null);
    setError("");
  };
  async function reload() {
    setBusy(true);
    setError("");
    try {
      await onReloadSources?.();
    } catch (e) {
      setError(
        e.error || e.message || "Não foi possível recarregar cadastros.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function cep() {
    setBusy(true);
    setError("");
    try {
      const code = draft.zipCode.replace(/\D/g, "");
      if (code.length !== 8) throw Error("Informe um CEP com 8 dígitos.");
      const r = await fetch(`https://viacep.com.br/ws/${code}/json/`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw Error("CEP indisponível.");
      const p = await r.json();
      if (p.erro)
        throw Error("CEP não encontrado. Preencha o endereço manualmente.");
      setDraft((d) => ({
        ...d,
        street: p.logradouro || "",
        neighborhood: p.bairro || "",
        city: p.localidade || "",
        state: p.uf || "CE",
        address: "",
        latitude: "",
        longitude: "",
      }));
      setConfirmed(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function locate() {
    setBusy(true);
    setError("");
    try {
      const p = await geocodeAddressWithGoogle({
        ...draft,
        address: fullAddress(draft),
      });
      if (!p)
        throw Error("Endereço não encontrado. Posicione o pino manualmente.");
      setDraft((d) => ({ ...d, latitude: p.latitude, longitude: p.longitude }));
      setConfirmed(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function commit() {
    if (!confirmed)
      return setError("Confirme a localização no mapa antes de adicionar.");
    if (draft.name.trim().length < 2 || fullAddress(draft).length < 5)
      return setError("Informe nome e endereço completos.");
    const p = {
      ...draft,
      address: fullAddress(draft),
      latitude: Number(draft.latitude),
      longitude: Number(draft.longitude),
    };
    for (const key of ["street", "number", "neighborhood", "city", "state"])
      delete p[key];
    if (!p.sourceId) delete p.sourceId;
    if (editing !== null)
      onChange(points.map((v, i) => (i === editing ? p : v)));
    else {
      if (points.length >= maxPoints)
        return setError(`Limite de ${maxPoints} pontos neste planejamento.`);
      if (p.sourceId && included(p.kind, p.sourceId))
        return setError("Este cadastro já está no roteiro.");
      onChange([...points, p]);
    }
    setDraft(null);
    setEditing(null);
  }
  function move(i, d) {
    const next = [...points];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  }
  const filtered = (items) =>
    items.filter((p) =>
      normalizeSearchText(
        [p.name, p.companyName, p.binId, fullAddress(p)].join(" "),
      ).includes(normalizeSearchText(search)),
    );
  return (
    <div className="route-points-editor">
      {error && !draft && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      <ol className="route-stop-list">
        {points.map((p, i) => (
          <li key={p.key}>
            <div>
              <strong>
                {i + 1}. {p.name}
              </strong>
              <small className="d-block">
                {p.kind === "PEV"
                  ? "PEV"
                  : p.kind === "GENERATOR"
                    ? "Gerador"
                    : "Ponto avulso"}{" "}
                · {p.address}
              </small>
              <small className="d-block">
                {p.materials || "Materiais a registrar em campo"}
              </small>
              {p.weekdays?.length > 0 && (
                <small>{p.weekdays.map((d) => weekdays[d]).join(", ")}</small>
              )}
            </div>
            <div className="route-stop-actions">
              <button
                type="button"
                aria-label={`Subir ponto ${i + 1}`}
                disabled={disabled || i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                aria-label={`Descer ponto ${i + 1}`}
                disabled={disabled || i === points.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label={`Editar ponto ${i + 1}`}
                disabled={disabled}
                onClick={() => {
                  setDraft({ ...blank(), ...p });
                  setEditing(i);
                  setConfirmed(true);
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                aria-label={`Retirar ponto ${i + 1}`}
                disabled={disabled}
                onClick={() => onChange(points.filter((_, n) => i !== n))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!disabled && !hideSources && (
        <>
          <div className="route-neighborhood-picker">
            <h3>Adicionar geradores por bairro</h3>
            <p className="small">
              Escolha o bairro e inclua seus geradores de uma vez. Municípios
              diferentes aparecem separados.
            </p>
            <label className="d-block">
              Bairro dos geradores
              <select
                className="form-select"
                aria-label="Bairro dos geradores"
                value={neighborhood}
                onChange={(e) => {
                  setNeighborhood(e.target.value);
                  setNotice("");
                  setError("");
                }}
              >
                <option value="">Selecione um bairro</option>
                {groups.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label} ({g.generators.length})
                  </option>
                ))}
              </select>
            </label>
            {group && (
              <>
                <p className="small mt-2" role="status">
                  {preview.ready.length} para adicionar ·{" "}
                  {preview.existing.length} já na rota ·{" "}
                  {preview.invalid.length} com cadastro incompleto
                </p>
                {!!preview.invalid.length && (
                  <details className="small mb-2">
                    <summary>Cadastros que precisam de revisão</summary>
                    <ul>
                      {preview.invalid.map((g) => (
                        <li key={g.id}>
                          {g.companyName || g.name || g.id} — confira nome,
                          endereço e localização no cadastro do gerador.
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
            <button
              type="button"
              className="btn btn-success"
              disabled={!preview.ready.length || !!draft || busy}
              onClick={addNeighborhood}
            >
              <Plus size={16} /> Adicionar geradores do bairro
              {group ? ` (${preview.ready.length})` : ""}
            </button>
            <small className="d-block mt-2">
              Revisão antes de salvar: não repete geradores já selecionados.
              Novos cadastros futuros no bairro devem ser incluídos na edição da
              rota.
            </small>
            {notice && (
              <p role="status" className="alert alert-success mt-2 mb-0">
                {notice}
              </p>
            )}
          </div>
          <label className="d-block">
            Buscar PEV ou gerador cadastrado
            <input
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou endereço"
            />
          </label>
          <div className="route-source-grid">
            {[
              ["PEV", sources?.bins || []],
              ["GENERATOR", sources?.generators || []],
            ].map(([kind, items]) => (
              <div key={kind}>
                <h3>
                  {kind === "PEV" ? "PEVs" : "Geradores"}{" "}
                  <small>({filtered(items).length})</small>
                </h3>
                <div className="route-source-options">
                  {filtered(items).map((p) => (
                    <button
                      type="button"
                      className="btn btn-outline-secondary text-start"
                      key={p.id}
                      disabled={
                        included(kind, p.id) || points.length >= maxPoints
                      }
                      onClick={() => choose(kind, p)}
                    >
                      <span>
                        <strong>{p.companyName || p.name || p.binId}</strong>
                        <small className="d-block">
                          {fullAddress(p) || "Endereço a conferir"}
                        </small>
                      </span>
                      <span>
                        {included(kind, p.id) ? "Na rota" : <Plus size={16} />}
                      </span>
                    </button>
                  ))}
                  {!filtered(items).length && (
                    <small>Nenhum cadastro encontrado.</small>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-outline-success mt-3"
            onClick={() => {
              setDraft(blank());
              setConfirmed(false);
              setEditing(null);
              setError("");
            }}
          >
            <MapPin size={16} /> Adicionar ponto por endereço
          </button>
          <div className="d-flex gap-2 flex-wrap mt-2">
            <a
              className="btn btn-sm btn-outline-success align-self-center"
              href="/create-bin"
              target="_blank"
              rel="noreferrer"
            >
              Cadastrar novo PEV
            </a>
            <a
              className="btn btn-sm btn-outline-success align-self-center"
              href="/create-generator"
              target="_blank"
              rel="noreferrer"
            >
              Cadastrar novo gerador
            </a>
          </div>
          {onReloadSources && (
            <button
              type="button"
              disabled={busy}
              className="btn btn-sm btn-outline-secondary mt-2"
              onClick={reload}
            >
              Recarregar cadastros
            </button>
          )}
          <small className="d-block mt-2">
            Cadastre em outra aba e recarregue as opções. O planejamento atual
            será mantido.
          </small>
        </>
      )}
      {draft && !disabled && (
        <div
          className="route-point-draft mt-3"
          role="region"
          aria-label="Cadastro do ponto"
        >
          <h3>{editing !== null ? "Editar ponto" : "Adicionar ponto"}</h3>
          {error && (
            <p role="alert" className="alert alert-danger">
              {error}
            </p>
          )}
          <div className="route-fields">
            <label>
              Nome do ponto ou responsável
              <input
                className="form-control"
                maxLength={150}
                value={draft.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            <label>
              Telefone opcional
              <input
                className="form-control"
                maxLength={30}
                value={draft.phone}
                onChange={(e) => change("phone", e.target.value)}
              />
            </label>
          </div>
          {draft.kind === "ADDRESS" ? (
            <>
              <div className="d-flex gap-2 align-items-end mt-2">
                <label>
                  CEP
                  <input
                    className="form-control"
                    inputMode="numeric"
                    value={draft.zipCode}
                    maxLength={9}
                    onChange={(e) => change("zipCode", e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline-success"
                  disabled={busy}
                  onClick={cep}
                >
                  Buscar CEP
                </button>
              </div>
              <div className="route-fields mt-2">
                {[
                  ["street", "Rua"],
                  ["number", "Número e complemento"],
                  ["neighborhood", "Bairro"],
                  ["city", "Município"],
                  ["state", "UF"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      className="form-control"
                      maxLength={150}
                      value={draft[key]}
                      onChange={(e) => change(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p>{draft.address}</p>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary mt-2"
            disabled={busy}
            onClick={locate}
          >
            Localizar endereço no mapa
          </button>
          <GeneratorLocationEditor
            label="ponto da rota"
            latitude={draft.latitude}
            longitude={draft.longitude}
            onChange={(latitude, longitude) => {
              setDraft((d) => ({ ...d, latitude, longitude }));
              setConfirmed(false);
            }}
          />
          <div className="route-fields">
            <label>
              Latitude
              <input
                className="form-control"
                type="number"
                step="any"
                value={draft.latitude}
                onChange={(e) => change("latitude", e.target.value)}
              />
            </label>
            <label>
              Longitude
              <input
                className="form-control"
                type="number"
                step="any"
                value={draft.longitude}
                onChange={(e) => change("longitude", e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className={`btn mt-2 ${confirmed ? "btn-success" : "btn-outline-success"}`}
            onClick={() => {
              if (
                draft.latitude === "" ||
                draft.longitude === "" ||
                !Number.isFinite(Number(draft.latitude)) ||
                !Number.isFinite(Number(draft.longitude)) ||
                Math.abs(Number(draft.latitude)) > 90 ||
                Math.abs(Number(draft.longitude)) > 180
              )
                return setError("Marque uma localização válida no mapa.");
              setConfirmed(true);
              setError("");
            }}
          >
            {" "}
            {confirmed
              ? "Localização confirmada"
              : "Confirmar localização no mapa"}
          </button>
          <div className="route-fields mt-3">
            <label>
              Materiais previstos
              <input
                className="form-control"
                maxLength={500}
                value={draft.materials}
                onChange={(e) => change("materials", e.target.value)}
              />
            </label>
            <label>
              Catador responsável
              <select
                className="form-select"
                value={draft.collectorId}
                onChange={(e) => change("collectorId", e.target.value)}
              >
                <option value="">Primeiro catador da equipe</option>
                {(sources?.collectors || [])
                  .filter((c) => collectorIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="d-block mt-2">
            Acesso e orientações
            <textarea
              className="form-control"
              maxLength={1000}
              value={draft.notes}
              onChange={(e) => change("notes", e.target.value)}
            />
          </label>
          {recurring && (
            <div className="mt-2">
              <span>
                Dias específicos deste ponto (vazio: todos os dias da rota)
              </span>
              <div className="d-flex gap-2 flex-wrap">
                {weekdays.map((w, i) => (
                  <label key={w}>
                    <input
                      type="checkbox"
                      checked={draft.weekdays.includes(i)}
                      onChange={(e) =>
                        change(
                          "weekdays",
                          e.target.checked
                            ? [...draft.weekdays, i]
                            : draft.weekdays.filter((x) => x !== i),
                        )
                      }
                    />{" "}
                    {w}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="d-flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-success"
              disabled={busy}
              onClick={commit}
            >
              Salvar ponto no planejamento
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setDraft(null)}
            >
              Cancelar ponto
            </button>
          </div>
          <small>
            As coordenadas ficam vinculadas a este atendimento. O cadastro de
            origem é preservado.
          </small>
        </div>
      )}
    </div>
  );
}
