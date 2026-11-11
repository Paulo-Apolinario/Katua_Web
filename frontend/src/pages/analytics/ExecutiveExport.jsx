import { useEffect, useRef, useState } from "react";
import { participationRequest } from "../../services/participationAnalytics";
import { exportExecutive } from "../../services/analyticsExport";
export default function ExecutiveExport({ filters }) {
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const active = useRef(true),
    controller = useRef(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  const generate = async (format) => {
    if (busy) return;
    setBusy(format);
    setError("");
    controller.current = new AbortController();
    try {
      const data = await participationRequest(
        "executive",
        filters,
        controller.current.signal,
      );
      if (active.current)
        await exportExecutive(format, data, () => active.current);
    } catch (err) {
      if (active.current)
        setError(err.message || "Não foi possível exportar o resumo.");
    } finally {
      if (active.current) setBusy("");
    }
  };
  return (
    <section className="pa-panel" aria-label="Exportação do resumo executivo">
      <div className="pa-heading">
        <h2>Resumo executivo</h2>
        <div className="pa-actions">
          <button disabled={!!busy} onClick={() => generate("pdf")}>
            {busy === "pdf" ? "Gerando PDF…" : "Baixar resumo PDF"}
          </button>
          <button disabled={!!busy} onClick={() => generate("xlsx")}>
            {busy === "xlsx" ? "Gerando planilha…" : "Baixar resumo Excel"}
          </button>
        </div>
      </div>
      <p>
        Totais completos do período e dos filtros do cabeçalho. O resumo geral
        não é limitado à página, à busca por nome ou ao material escolhido no
        mapa. Inclui fontes de contagem e limites dos dados.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
