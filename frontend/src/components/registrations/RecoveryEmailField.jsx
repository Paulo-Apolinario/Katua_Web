import { useState } from "react";
import toast from "react-hot-toast";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { apiRequest } from "../../services/apiClient";
export default function RecoveryEmailField({
  value,
  onChange,
  disabled = false,
  record,
  kind,
  canSend = true,
}) {
  const { admin } = useAdminAuth();
  const [sending, setSending] = useState(false);
  const cooperativeEmail = admin?.cooperative?.email || admin?.email || "";
  async function send() {
    if (sending || !record?.id) return;
    setSending(true);
    try {
      const response = await apiRequest(
        `/registrations/${kind}/${record.id}/access-link`,
        { method: "POST", suppressReadNotice: true },
      );
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="col-12">
      <label className="form-label" htmlFor="registration-recovery-email">
        E-mail de recuperação (opcional)
      </label>
      <div className="d-flex flex-wrap gap-2">
        <input
          id="registration-recovery-email"
          type="email"
          autoComplete="off"
          className="form-control"
          style={{ maxWidth: 480 }}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || sending}
          placeholder="Pode ser o e-mail da cooperativa"
        />
        {cooperativeEmail && (
          <button
            type="button"
            className="secondary-btn btn-sm"
            disabled={disabled || sending}
            onClick={() => onChange(cooperativeEmail)}
          >
            Usar e-mail da cooperativa
          </button>
        )}
      </div>
      <small className="d-block text-muted mt-2">
        Os links irão para este endereço. Ele pode ser usado na recuperação de
        vários colaboradores e não se torna o login deles. Sem este campo,
        usamos o e-mail pessoal cadastrado.
      </small>
      {record?.id && (
        <>
          <button
            type="button"
            className="secondary-btn btn-sm mt-2"
            disabled={disabled || sending || !canSend}
            onClick={send}
          >
            {sending
              ? "Enviando…"
              : record.hasOnlineAccess
                ? "Enviar recuperação de acesso"
                : "Enviar link para definir acesso"}
          </button>
          {!canSend && (
            <small className="d-block text-muted">
              Salve as alterações de e-mail, celular e recuperação antes de
              enviar o link.
            </small>
          )}
        </>
      )}
    </div>
  );
}
