import { useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";
import { settingsApi as api } from "../../services/settingService";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  ManagementWorkspace,
  ManagementHeader,
} from "../management/ManagementWorkspace";
import HeadTags from "../HeadTags";
import LocationPicker from "./LocationPicker";
import {
  SECTIONS,
  CATEGORIES,
  LABELS,
  FIELD_NAMES,
  date,
} from "./settingsModel";
import "./settingsWorkspace.css";
function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
  help,
  disabled = false,
  required = false,
  min,
  max,
  autoComplete,
}) {
  const id = useId();
  return (
    <div className="settings-field">
      <label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </label>
      {options ? (
        <select
          id={id}
          className="form-select"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="form-control"
          type={type}
          value={value ?? ""}
          required={required}
          min={min}
          max={max}
          step={type === "number" ? "any" : undefined}
          disabled={disabled}
          maxLength={type === "password" ? 1000 : 500}
          autoComplete={autoComplete}
          onChange={(e) =>
            onChange(
              type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
      {help && <small className="text-muted">{help}</small>}
    </div>
  );
}
function Check({ label, checked, onChange }) {
  const id = useId();
  return (
    <label htmlFor={id} className="settings-check">
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
const options = (o) => Object.entries(o);
export default function SettingsWorkspace({ kind }) {
  const navigate = useNavigate(),
    { logout } = useAdminAuth();
  const [data, setData] = useState(null),
    [form, setForm] = useState(null),
    [extra, setExtra] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [historyPage, setHistoryPage] = useState(1),
    [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [visible, setVisible] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState("OPEN"),
    [priority, setPriority] = useState(""),
    [showSnoozed, setShowSnoozed] = useState(false),
    [assignees, setAssignees] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    setExtra(null);
    Promise.all([
      api.context(controller.signal),
      kind === "alerts"
        ? api.alerts(controller.signal)
        : kind === "smtp"
          ? api.mailHistory(controller.signal)
          : kind === "history"
            ? api.history(historyPage, controller.signal)
            : null,
    ])
      .then(([c, e]) => {
        if (!active) return;
        setData(c);
        setForm(
          structuredClone(
            kind === "company"
              ? c.company
              : kind === "smtp"
                ? { ...c.smtp, password: "" }
                : c.preferences,
          ),
        );
        setExtra(e);
      })
      .catch((e) => {
        if (active)
          setError(
            e.error ||
              e.message ||
              "Não foi possível carregar as configurações.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [kind, refresh, historyPage]);
  const patch = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  async function perform(fn, reload = true) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await fn();
      setNotice(result?.message || "Alterações salvas.");
      if (reload) setRefresh((n) => n + 1);
      return result;
    } catch (e) {
      setError(e.error || e.message || "Não foi possível concluir.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function companySave(e) {
    e.preventDefault();
    const result = await perform(() =>
      api.company({ ...form, version: data.version }),
    );
    if (result) window.dispatchEvent(new Event("katua-brand-updated"));
  }
  async function logo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 256000
    ) {
      setError("Escolha PNG ou JPEG de até 250 KB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch("logo", String(reader.result));
    reader.readAsDataURL(file);
  }
  const current = SECTIONS[kind],
    prefs = data?.preferences;
  const rows = (extra?.rows || []).filter(
    (a) =>
      (!status || a.status === status) &&
      (!category || a.category === category) &&
      (!priority || a.priority === priority) &&
      (showSnoozed ||
        !a.snoozedUntil ||
        new Date(a.snoozedUntil) <= new Date()) &&
      [a.title, a.message, a.assignee]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const saveButtons = (
    <div className="settings-actions">
      <button type="submit" className="btn btn-success" disabled={busy}>
        {busy ? "Salvando..." : "Salvar alterações"}
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        disabled={busy}
        onClick={() => {
          setRefresh((n) => n + 1);
          setNotice("Alterações não salvas foram descartadas.");
        }}
      >
        Cancelar alterações
      </button>
    </div>
  );
  return (
    <ManagementWorkspace>
      <div className="settings-workspace">
        <HeadTags title={current.title} />
        <ManagementHeader
          title={current.title}
          description={current.description}
          eyebrow="Configurações do sistema"
          hideNavigation
          actions={
            <button
              className="btn btn-outline-success"
              disabled={busy || loading}
              onClick={() => setRefresh((n) => n + 1)}
            >
              Atualizar dados
            </button>
          }
        />
        <nav
          className="management-nav d-flex flex-wrap gap-2 mb-4"
          aria-label="Configurações do sistema"
        >
          {Object.entries(SECTIONS).map(([key, s]) => (
            <Link
              key={key}
              to={"/" + s.path}
              aria-current={key === kind ? "page" : undefined}
              className={
                "btn btn-sm " +
                (key === kind ? "btn-success" : "btn-outline-secondary")
              }
            >
              {s.title}
            </Link>
          ))}
        </nav>
        {notice && (
          <p role="status" className="alert alert-success">
            {notice}
          </p>
        )}
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
            {!data && (
              <button
                className="btn btn-sm btn-outline-danger ms-3"
                onClick={() => setRefresh((n) => n + 1)}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
        {loading ? (
          <section className="card p-4" role="status">
            Carregando configurações...
          </section>
        ) : data && form ? (
          <>
            <div className="settings-context mb-4">
              <strong>{data.company.name}</strong>
              <span>
                Alterações organizacionais afetam somente esta cooperativa.
              </span>
              {data.updatedAt && (
                <small>Última atualização: {date(data.updatedAt)}</small>
              )}
            </div>
            {kind === "company" && (
              <form onSubmit={companySave}>
                <fieldset disabled={busy}>
                  <section className="card p-4 mb-4">
                    <h2>Identificação e contato</h2>
                    <p>
                      O e-mail institucional abaixo é um contato da cooperativa.
                      O e-mail usado para entrar e confirmar a senha fica em
                      Minha conta.
                    </p>
                    <div className="settings-grid">
                      {[
                        "name",
                        "legalName",
                        "registrationNumber",
                        "email",
                        "phone",
                        "responsibleName",
                        "responsiblePosition",
                        "website",
                      ].map((k) => (
                        <Field
                          key={k}
                          label={FIELD_NAMES[k]}
                          value={form[k]}
                          type={
                            k === "email"
                              ? "email"
                              : k === "website"
                                ? "url"
                                : "text"
                          }
                          required={k === "name"}
                          onChange={(v) => patch(k, v)}
                        />
                      ))}
                    </div>
                  </section>
                  <section className="card p-4 mb-4">
                    <h2>Identidade visual</h2>
                    <p>
                      Logotipo da cooperativa no menu e na identificação dos
                      relatórios PDF.
                    </p>
                    {form.logo && (
                      <img
                        className="settings-logo"
                        src={form.logo}
                        alt="Prévia do logotipo da cooperativa"
                      />
                    )}
                    <label className="form-label" htmlFor="cooperative-logo">
                      Carregar logotipo PNG ou JPEG — até 250 KB
                    </label>
                    <input
                      id="cooperative-logo"
                      className="form-control"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={logo}
                    />
                    {form.logo && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary mt-3"
                        onClick={() => patch("logo", "")}
                      >
                        Remover logotipo
                      </button>
                    )}
                  </section>
                  <section className="card p-4 mb-4">
                    <h2>Endereço e sede</h2>
                    <div className="settings-grid mb-4">
                      {[
                        "zipCode",
                        "street",
                        "number",
                        "neighborhood",
                        "city",
                        "state",
                        "address",
                      ].map((k) => (
                        <Field
                          key={k}
                          label={FIELD_NAMES[k]}
                          value={form[k]}
                          onChange={(v) =>
                            patch(k, k === "state" ? v.toUpperCase() : v)
                          }
                        />
                      ))}
                    </div>
                    <LocationPicker
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onChange={(lat, lng) =>
                        setForm((p) => ({
                          ...p,
                          latitude: lat,
                          longitude: lng,
                        }))
                      }
                    />
                    <div className="settings-grid mt-3">
                      {["latitude", "longitude"].map((k) => (
                        <Field
                          key={k}
                          label={FIELD_NAMES[k]}
                          type="number"
                          value={form[k]}
                          min={k === "latitude" ? -90 : -180}
                          max={k === "latitude" ? 90 : 180}
                          onChange={(v) => patch(k, v)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary mt-3"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          latitude: null,
                          longitude: null,
                        }))
                      }
                    >
                      Limpar localização
                    </button>
                  </section>
                  {saveButtons}
                </fieldset>
              </form>
            )}
            {kind === "account" && (
              <section className="card p-4">
                <h2>Definir ou trocar minha senha</h2>
                <p>
                  Para quem usa senha ou acesso rápido por e-mail. Você não
                  precisa informar a senha antiga.
                </p>
                <dl className="settings-grid">
                  <div>
                    <dt>Usuário conectado</dt>
                    <dd>{data.account.name}</dd>
                  </div>
                  <div>
                    <dt>E-mail de confirmação</dt>
                    <dd>{data.account.email}</dd>
                  </div>
                </dl>
                <p>
                  Enviaremos um código de uso único para esse e-mail. O código
                  vale por 10 minutos e aceita até cinco tentativas. Ao
                  concluir, as sessões anteriores serão encerradas.
                </p>
                {!data.centralEmailReady && (
                  <p className="alert alert-warning">
                    O administrador precisa configurar o SMTP geral do KATUÁ
                    para enviar o código. O SMTP operacional da cooperativa não
                    substitui esse canal.
                  </p>
                )}
                <button
                  className="btn btn-outline-success mb-4"
                  disabled={busy || !data.centralEmailReady}
                  onClick={async () => {
                    const r = await perform(() => api.passwordRequest(), false);
                    if (r) {
                      setChallenge(r.challengeId);
                      setCode("");
                    }
                  }}
                >
                  {challenge
                    ? "Enviar novo código"
                    : "Enviar código ao meu e-mail"}
                </button>
                {challenge && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (password !== confirmation) {
                        setError("As novas senhas não conferem.");
                        return;
                      }
                      const r = await perform(
                        () =>
                          api.passwordConfirm({
                            challengeId: challenge,
                            code,
                            newPassword: password,
                          }),
                        false,
                      );
                      if (r) {
                        setPassword("");
                        setConfirmation("");
                        logout();
                        toast.success(r.message);
                        navigate("/login", { replace: true });
                      }
                    }}
                  >
                    <fieldset disabled={busy}>
                      <div className="settings-grid">
                        <Field
                          label="Código recebido por e-mail"
                          value={code}
                          onChange={setCode}
                          required
                          autoComplete="one-time-code"
                        />
                        <Field
                          label="Nova senha"
                          value={password}
                          type={visible ? "text" : "password"}
                          onChange={setPassword}
                          autoComplete="new-password"
                          required
                          help="Use ao menos 12 caracteres; você pode usar uma frase longa."
                        />
                        <Field
                          label="Confirme a nova senha"
                          value={confirmation}
                          type={visible ? "text" : "password"}
                          onChange={setConfirmation}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                      <Check
                        label="Mostrar novas senhas"
                        checked={visible}
                        onChange={setVisible}
                      />
                      <button className="btn btn-success mt-3" type="submit">
                        Confirmar e trocar senha
                      </button>
                    </fieldset>
                  </form>
                )}
              </section>
            )}
            {kind === "smtp" && (
              <>
                <section className="card p-4 mb-4">
                  <h2>Servidor de envio da cooperativa</h2>
                  <p>
                    Use os dados fornecidos pelo seu provedor. Porta 465: TLS;
                    portas 587 ou 2525: STARTTLS. Algumas contas exigem senha de
                    aplicativo ou liberação de SMTP pelo provedor.
                  </p>
                  {!data.encryptionReady && (
                    <p className="alert alert-warning">
                      O administrador precisa configurar a chave de criptografia
                      na API antes de salvar uma nova credencial.
                    </p>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const { hasPassword, ...payload } = form;
                      void hasPassword;
                      perform(() =>
                        api.smtp({ ...payload, version: data.version }),
                      );
                    }}
                  >
                    <fieldset disabled={busy}>
                      <Check
                        label="Ativar SMTP da cooperativa"
                        checked={form.enabled}
                        onChange={(v) => patch("enabled", v)}
                      />
                      <div className="settings-grid">
                        {[
                          "host",
                          "username",
                          "fromName",
                          "fromAddress",
                          "replyTo",
                        ].map((k) => (
                          <Field
                            key={k}
                            label={FIELD_NAMES[k]}
                            value={form[k]}
                            type={
                              ["fromAddress", "replyTo"].includes(k)
                                ? "email"
                                : "text"
                            }
                            onChange={(v) => patch(k, v)}
                            required={k !== "replyTo"}
                          />
                        ))}
                        <Field
                          label="Porta"
                          value={form.port}
                          options={[
                            [587, "587 — STARTTLS"],
                            [465, "465 — TLS"],
                            [2525, "2525 — STARTTLS"],
                          ]}
                          onChange={(v) =>
                            setForm((p) => ({
                              ...p,
                              port: Number(v),
                              security: Number(v) === 465 ? "TLS" : "STARTTLS",
                            }))
                          }
                        />
                        <Field
                          label={
                            data.smtp.hasPassword
                              ? "Nova credencial SMTP (opcional)"
                              : "Credencial SMTP"
                          }
                          value={form.password}
                          type="password"
                          autoComplete="new-password"
                          onChange={(v) => patch("password", v)}
                          help={
                            data.smtp.hasPassword
                              ? "Deixe vazio para manter a credencial cadastrada. A senha salva nunca é exibida."
                              : "Informe a credencial de envio fornecida pelo seu provedor."
                          }
                        />
                      </div>
                      {saveButtons}
                    </fieldset>
                  </form>
                  <hr />
                  <p>
                    Os testes usam a configuração salva. O e-mail de teste é
                    enviado somente à conta conectada: {data.account.email}.
                  </p>
                  <div className="settings-actions">
                    <button
                      className="btn btn-outline-success"
                      disabled={
                        busy || !data.smtp.enabled || !data.smtp.hasPassword
                      }
                      onClick={() => perform(() => api.verify(), false)}
                    >
                      Testar conexão
                    </button>
                    <button
                      className="btn btn-outline-success"
                      disabled={
                        busy || !data.smtp.enabled || !data.smtp.hasPassword
                      }
                      onClick={() => perform(() => api.test())}
                    >
                      Enviar e-mail de teste
                    </button>
                    <Link
                      className="btn btn-outline-secondary"
                      to="/operational-preferences"
                    >
                      Configurar avisos automáticos
                    </Link>
                  </div>
                  <p className="small text-muted mt-3">
                    Conexão validada e mensagem aceita pelo provedor não
                    garantem entrega na caixa de entrada. Confira também
                    remetente, spam e autenticação do domínio com o provedor.
                  </p>
                </section>
                <section className="card p-4">
                  <h2>Últimos 50 envios</h2>
                  <p>
                    A fila é processada a cada minuto enquanto a API está ativa.
                    Envios com confirmação desconhecida ou aceite parcial exigem
                    conferência antes de uma nova comunicação.
                  </p>
                  <div className="table-responsive">
                    <table className="table">
                      <caption>Envios desta cooperativa.</caption>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Assunto e destinatários</th>
                          <th>Situação</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(extra || []).map((m) => (
                          <tr key={m.id}>
                            <td>{date(m.createdAt)}</td>
                            <td>
                              {m.subject}
                              <small className="d-block">
                                {m.recipients.join(", ")}
                              </small>
                            </td>
                            <td>
                              {LABELS[m.status] || m.status}
                              {m.error && (
                                <small className="d-block">{m.error}</small>
                              )}
                              <small className="d-block">
                                Tentativas: {m.attempts}
                              </small>
                            </td>
                            <td>
                              {m.status === "FAILED" && m.attempts < 5 && (
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  disabled={busy}
                                  onClick={() => perform(() => api.retry(m.id))}
                                >
                                  Tentar novamente
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!extra?.length && <p>Nenhum envio registrado.</p>}
                  </div>
                </section>
              </>
            )}
            {kind === "preferences" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  perform(() =>
                    api.preferences({ ...form, version: data.version }),
                  );
                }}
              >
                <fieldset disabled={busy}>
                  <section className="card p-4 mb-4">
                    <h2>Funcionamento e critérios de aviso</h2>
                    <p>
                      Horários em Fortaleza/CE (UTC−3). O horário cadastrado
                      informa o funcionamento; não bloqueia operações fora desse
                      intervalo.
                    </p>
                    <div className="d-flex flex-wrap gap-3 mb-4">
                      {[
                        "Domingo",
                        "Segunda",
                        "Terça",
                        "Quarta",
                        "Quinta",
                        "Sexta",
                        "Sábado",
                      ].map((day, i) => (
                        <Check
                          key={day}
                          label={day}
                          checked={form.workingDays.includes(i)}
                          onChange={(v) =>
                            patch(
                              "workingDays",
                              v
                                ? [...form.workingDays, i]
                                : form.workingDays.filter((n) => n !== i),
                            )
                          }
                        />
                      ))}
                    </div>
                    <div className="settings-grid">
                      <Field
                        label="Abertura"
                        value={form.openAt}
                        type="time"
                        onChange={(v) => patch("openAt", v)}
                      />
                      <Field
                        label="Encerramento"
                        value={form.closeAt}
                        type="time"
                        onChange={(v) => patch("closeAt", v)}
                      />
                      <Field
                        label="Avisar documentos com antecedência de (dias)"
                        type="number"
                        min={1}
                        max={180}
                        value={form.documentAdvanceDays}
                        onChange={(v) => patch("documentAdvanceDays", v)}
                      />
                      <Field
                        label="Alertar coleta sem execução após (horas)"
                        type="number"
                        min={1}
                        max={720}
                        value={form.collectionOverdueHours}
                        onChange={(v) => patch("collectionOverdueHours", v)}
                      />
                      <Field
                        label="Alertar saldo a destinar após (dias)"
                        type="number"
                        min={1}
                        max={365}
                        value={form.pendingWasteDays}
                        onChange={(v) => patch("pendingWasteDays", v)}
                      />
                    </div>
                  </section>
                  <section className="card p-4 mb-4">
                    <h2>Notificações por e-mail</h2>
                    <p>
                      Os avisos permanecem no painel. Ative o e-mail somente
                      depois de salvar e testar o SMTP. Um aviso imediato é
                      enviado uma vez por ocorrência; o resumo diário reúne as
                      pendências ainda abertas.
                    </p>
                    <Check
                      label="Receber avisos por e-mail"
                      checked={form.emailEnabled}
                      onChange={(v) => patch("emailEnabled", v)}
                    />
                    <div className="settings-grid">
                      <Field
                        label="Frequência"
                        value={form.frequency}
                        options={[
                          ["DAILY", "Resumo diário"],
                          [
                            "IMMEDIATE",
                            "Após a detecção — processamento a cada minuto",
                          ],
                        ]}
                        onChange={(v) => patch("frequency", v)}
                      />
                      <Field
                        label="Hora do resumo diário (0 a 23)"
                        type="number"
                        min={0}
                        max={23}
                        value={form.digestHour}
                        onChange={(v) => patch("digestHour", v)}
                        disabled={form.frequency !== "DAILY"}
                      />
                    </div>
                    <label
                      className="form-label mt-3"
                      htmlFor="notification-recipients"
                    >
                      Destinatários — até cinco e-mails, um por linha
                    </label>
                    <textarea
                      id="notification-recipients"
                      className="form-control"
                      rows={4}
                      value={form.recipients.join("\n")}
                      onChange={(e) =>
                        patch("recipients", e.target.value.split("\n"))
                      }
                      onBlur={() =>
                        patch("recipients", [
                          ...new Set(
                            form.recipients
                              .map((s) => s.trim())
                              .filter(Boolean),
                          ),
                        ])
                      }
                    />
                    <p className="small text-muted mt-2">
                      Cadastre apenas pessoas que devem receber as informações
                      operacionais da cooperativa.
                    </p>
                    <div className="d-flex flex-wrap gap-3">
                      {Object.entries(CATEGORIES).map(([key, label]) => (
                        <Check
                          key={key}
                          label={label}
                          checked={form.categories.includes(key)}
                          onChange={(v) =>
                            patch(
                              "categories",
                              v
                                ? [...form.categories, key]
                                : form.categories.filter((n) => n !== key),
                            )
                          }
                        />
                      ))}
                    </div>
                  </section>
                  {saveButtons}
                </fieldset>
              </form>
            )}
            {kind === "alerts" && (
              <>
                <section className="card p-4 mb-4">
                  <h2>Acompanhe o que precisa de ação</h2>
                  <p>
                    Uma pendência é resolvida quando o registro de origem é
                    corrigido. Marcar como lido não significa resolver. O
                    responsável abaixo é uma indicação interna; não envia uma
                    mensagem individual.
                  </p>
                  <div className="settings-grid">
                    <Field
                      label="Buscar pendência"
                      value={search}
                      onChange={setSearch}
                    />
                    <Field
                      label="Situação"
                      value={status}
                      options={[
                        ["", "Todas"],
                        ["OPEN", "Pendentes"],
                        ["RESOLVED", "Resolvidas"],
                      ]}
                      onChange={setStatus}
                    />
                    <Field
                      label="Categoria"
                      value={category}
                      options={[["", "Todas"], ...options(CATEGORIES)]}
                      onChange={setCategory}
                    />
                    <Field
                      label="Prioridade"
                      value={priority}
                      options={[
                        ["", "Todas"],
                        ["CRITICAL", "Prioritário"],
                        ["WARNING", "Atenção"],
                        ["INFO", "Informativo"],
                      ]}
                      onChange={setPriority}
                    />
                  </div>
                  <Check
                    label="Mostrar também avisos adiados"
                    checked={showSnoozed}
                    onChange={setShowSnoozed}
                  />
                  <Link to="/operational-preferences">
                    Ajustar critérios e destinatários dos avisos
                  </Link>
                </section>
                {extra?.truncated && (
                  <p role="status" className="alert alert-warning">
                    Há mais registros do que o limite de atualização desta
                    consulta. A lista pode estar parcial; pendências anteriores
                    foram preservadas.
                  </p>
                )}
                <p>{rows.length} pendência(s) nesta consulta.</p>
                <div className="settings-alert-list">
                  {rows.map((a) => (
                    <article
                      className={
                        "card p-4 settings-alert " + a.priority.toLowerCase()
                      }
                      key={a.id}
                    >
                      <div className="d-flex justify-content-between flex-wrap gap-2">
                        <span className="badge text-bg-light">
                          {CATEGORIES[a.category]} · {LABELS[a.priority]}
                        </span>
                        <span>
                          {LABELS[a.status]}
                          {a.readAt ? " · Lido" : ""}
                        </span>
                      </div>
                      <h2 className="mt-3">{a.title}</h2>
                      <p>{a.message}</p>
                      <small>
                        Detectado em {date(a.createdAt)}
                        {a.resolvedAt
                          ? " · Resolvido em " + date(a.resolvedAt)
                          : ""}
                      </small>
                      {a.snoozedUntil &&
                        new Date(a.snoozedUntil) > new Date() && (
                          <p>Adiado até {date(a.snoozedUntil)}</p>
                        )}
                      <div className="settings-actions mt-3">
                        <Link className="btn btn-outline-success" to={a.link}>
                          Ver pendência
                        </Link>
                        <button
                          className="btn btn-outline-secondary"
                          disabled={busy || !!a.readAt}
                          onClick={() =>
                            perform(() => api.alert(a.id, { action: "READ" }))
                          }
                        >
                          Marcar como lido
                        </button>
                        {a.status === "OPEN" && (
                          <button
                            className="btn btn-outline-secondary"
                            disabled={busy}
                            onClick={() =>
                              perform(() =>
                                api.alert(a.id, {
                                  action: "SNOOZE",
                                  hours: 24,
                                }),
                              )
                            }
                          >
                            Adiar por 24 horas
                          </button>
                        )}
                      </div>
                      <div className="settings-grid mt-3">
                        <Field
                          label={"Responsável — " + a.title}
                          value={assignees[a.id] ?? a.assignee ?? ""}
                          onChange={(v) =>
                            setAssignees((p) => ({ ...p, [a.id]: v }))
                          }
                        />
                        <button
                          className="btn btn-outline-secondary align-self-end"
                          disabled={busy}
                          onClick={() =>
                            perform(() =>
                              api.alert(a.id, {
                                action: "ASSIGN",
                                assignee: assignees[a.id] ?? a.assignee ?? "",
                              }),
                            )
                          }
                        >
                          Salvar responsável
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!rows.length && (
                  <section className="card p-4">
                    Nenhuma pendência encontrada para estes filtros.
                  </section>
                )}
              </>
            )}
            {kind === "history" && (
              <section className="card p-4">
                <h2>Rastreabilidade das configurações</h2>
                <p>
                  São registrados autor, data e nomes dos campos alterados.
                  Senhas, códigos de confirmação e valores anteriores de
                  credenciais não aparecem neste histórico.
                </p>
                <div className="table-responsive">
                  <table className="table">
                    <caption>
                      Histórico da cooperativa, mais recente primeiro.
                    </caption>
                    <thead>
                      <tr>
                        <th>Quando</th>
                        <th>Responsável</th>
                        <th>Seção ou ação</th>
                        <th>Campos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extra?.rows?.map((e) => (
                        <tr key={e.id}>
                          <td>{date(e.createdAt)}</td>
                          <td>{e.actorName}</td>
                          <td>{LABELS[e.section] || e.section}</td>
                          <td>
                            {e.fields
                              .map((k) => FIELD_NAMES[k] || k)
                              .join(", ") || "Ação registrada"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!extra?.rows?.length && <p>Nenhuma alteração registrada.</p>}
                <div className="settings-actions">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((n) => n - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    Página {historyPage} de{" "}
                    {Math.max(1, Math.ceil((extra?.total || 0) / 20))}
                  </span>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={historyPage * 20 >= (extra?.total || 0)}
                    onClick={() => setHistoryPage((n) => n + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </section>
            )}
            {kind !== "preferences" && prefs?.emailEnabled && (
              <p className="small text-muted mt-4">
                Avisos por e-mail ativos:{" "}
                {prefs.frequency === "DAILY"
                  ? "resumo diário"
                  : "após detecção"}
                .
              </p>
            )}
          </>
        ) : null}
      </div>
    </ManagementWorkspace>
  );
}
