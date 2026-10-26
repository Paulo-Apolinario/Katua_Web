import { useState, useRef } from "react";
import { optimizeRoute } from "../../services/routePlanningService";
import { hasCoordinates } from "../maps/mapPin";
import GeneratorLocationEditor from "../generators/GeneratorLocationEditor";
export function RouteEndpoints({
  startPoint,
  endPoint,
  onChange,
  disabled = false,
}) {
  return (
    <div className="route-fields">
      {[
        ["startPoint", "Saída", startPoint],
        ["endPoint", "Destino final", endPoint],
      ].map(([key, label, value]) => (
        <details key={key}>
          <summary>
            {label}: {value?.name || "Definir localização"}
          </summary>
          {["name", "address", "latitude", "longitude"].map((field) => (
            <label className="d-block mt-2" key={field}>
              {
                {
                  name: "Nome",
                  address: "Endereço",
                  latitude: "Latitude",
                  longitude: "Longitude",
                }[field]
              }
              <input
                className="form-control"
                disabled={disabled}
                type={
                  ["latitude", "longitude"].includes(field) ? "number" : "text"
                }
                step="any"
                value={value?.[field] ?? ""}
                onChange={(e) =>
                  onChange(key, {
                    ...value,
                    [field]: ["latitude", "longitude"].includes(field)
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : e.target.value,
                  })
                }
              />
            </label>
          ))}
          <GeneratorLocationEditor
            label={label.toLowerCase()}
            disabled={disabled}
            latitude={value?.latitude}
            longitude={value?.longitude}
            onChange={(latitude, longitude) =>
              onChange(key, {
                ...value,
                latitude: Number(latitude),
                longitude: Number(longitude),
              })
            }
          />
        </details>
      ))}
    </div>
  );
}
export default function RouteOptimization({
  points,
  startPoint,
  endPoint,
  onOptimized,
  disabled = false,
}) {
  const signature = JSON.stringify({ points, startPoint, endPoint }),
    latest = useRef(signature);
  latest.current = signature;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function calculate() {
    if (busy) return;
    setError("");
    if (
      !hasCoordinates(startPoint) ||
      !hasCoordinates(endPoint) ||
      points.some((p) => !hasCoordinates(p))
    )
      return setError(
        "Confirme as coordenadas da saída, destino final e de todos os pontos.",
      );
    if (
      !window.confirm(
        "Calcular o percurso? As coordenadas serão enviadas ao serviço de ruas OSRM configurado na API. Não são enviados nomes, telefones ou materiais.",
      )
    )
      return;
    setBusy(true);
    try {
      const response = await optimizeRoute({
        start: startPoint,
        end: endPoint,
        points,
      });
      if (latest.current !== signature)
        throw Error(
          "O planejamento mudou durante o cálculo. Solicite uma nova sugestão.",
        );
      onOptimized(response);
    } catch (e) {
      setError(
        e.error ||
          e.message ||
          "Cálculo indisponível. A sequência manual foi preservada.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="route-optimization">
      <button
        type="button"
        className="btn btn-outline-success"
        disabled={disabled || busy || !points.length}
        onClick={calculate}
      >
        {busy ? "Calculando percurso…" : "Sugerir melhor sequência por ruas"}
      </button>
      <p className="small mt-2 mb-0">
        Até 60 pontos por cálculo. Sugestão por distância rodoviária, sem
        trânsito ao vivo, restrições de caminhão ou garantia de economia de
        combustível. Revise os horários de atendimento antes de salvar.
      </p>
      {error && (
        <p role="alert" className="alert alert-warning mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
