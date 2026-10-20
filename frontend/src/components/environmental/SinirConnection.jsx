import { useEffect, useState } from "react";
import { environmentalService as api } from "../../services/environmentalService";
import { Message } from "./EnvironmentalFields";
export default function SinirConnection({ unit }) {
  const [status, setStatus] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .sinirStatus(unit.id)
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [unit.id]);
  async function check() {
    setBusy(true);
    setError("");
    setStatus(null);
    try {
      setStatus(await api.sinirCheck(unit.id));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card p-4 mt-4">
      <h2>Conexão de leitura com o SINIR</h2>
      <p>
        Autenticação e consulta de catálogos. Nenhuma emissão, recebimento ou
        cancelamento é enviado por esta conexão.
      </p>
      <dl className="env-definition">
        <dt>Identificador local da unidade</dt>
        <dd>
          <code>{unit.id}</code>
        </dd>
        <dt>Configuração da credencial</dt>
        <dd>
          {status
            ? status.configured
              ? "Vinculada à unidade no servidor"
              : "Pendente ou incompatível"
            : "Não verificada"}
        </dd>
        <dt>Ambiente declarado no servidor</dt>
        <dd>
          {{
            UNCONFIRMED: "Não confirmado",
            HOMOLOGATION: "Homologação (informado pelo responsável)",
            PRODUCTION: "Produção (informado pelo responsável)",
          }[status?.environment] || "Não confirmado"}
        </dd>
        <dt>Autenticação</dt>
        <dd>
          {status?.authenticated
            ? "Token de acesso obtido pelo backend"
            : "Não confirmada"}
        </dd>
        {status?.checkedAt && (
          <>
            <dt>Última autenticação</dt>
            <dd>{new Date(status.checkedAt).toLocaleString("pt-BR")}</dd>
          </>
        )}
      </dl>
      {status?.reason && <p className="text-muted">{status.reason}</p>}
      <Message error={error} />
      <button
        type="button"
        className="btn btn-outline-success align-self-start"
        onClick={check}
        disabled={busy}
      >
        {busy ? "Verificando conexão..." : "Verificar autenticação no SINIR"}
      </button>
      <p className="small text-muted mt-3 mb-0">
        Credenciais são configuradas no servidor, sem senha Gov.br ou token no
        navegador. O nome do token e a seleção de ambiente não comprovam
        homologação. A emissão permanece bloqueada.
      </p>
    </section>
  );
}
