import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { Users, Plus, RefreshCw, Pencil } from "lucide-react";
import HeadTags from "../../components/HeadTags";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import CollectionDialog from "../../components/collections/CollectionDialog";
import { getAllCollectors } from "../../services/collectorService";
import { listTeams, saveTeam } from "../../services/teamService";
const blank = { name: "", active: true, memberIds: [] };
export default function CollectorTeams() {
  const [teams, setTeams] = useState([]),
    [people, setPeople] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState(null),
    [search, setSearch] = useState("");
  const guard = useRef(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [t, p] = await Promise.all([listTeams(), getAllCollectors()]);
      setTeams(t);
      setPeople(Array.isArray(p) ? p : p.collectors || p.data || []);
    } catch (e) {
      setError(e.error || e.message || "Não foi possível carregar as equipes.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await saveTeam(form.id, {
        name: form.name,
        active: form.active,
        memberIds: form.memberIds,
        ...(form.id ? { expectedVersion: form.version } : {}),
      });
      setForm(null);
      await load();
    } catch (e) {
      setError(e.error || e.message || "Não foi possível salvar.");
    } finally {
      setBusy(false);
      guard.current = false;
    }
  }
  const name = (id) =>
    people.find((p) => p.id === id)?.name || "Cadastro indisponível";
  return (
    <>
      <HeadTags title="Equipes de catadores" />
      <ManagementHeader
        title="Equipes de catadores"
        description="Organize quem trabalha junto e mantenha a produção individual após a conferência."
        actions={
          <>
            <button
              className="btn btn-outline-success"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw size={16} /> Atualizar
            </button>
            <button
              className="btn btn-success"
              onClick={() => {
                setError("");
                setForm({ ...blank });
              }}
            >
              <Plus size={16} /> Nova equipe
            </button>
          </>
        }
      />
      {error && !form && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      <div className="card p-4 mb-4">
        <p>
          <Users size={20} /> Uma equipe, uma coleta, parcelas individuais.
        </p>
        <p className="text-muted">
          Selecione a equipe ao construir a rota ou nos detalhes de uma coleta
          avulsa ainda pendente. Após receber, confira a pesagem e divida os
          materiais. Alterar a equipe aqui não modifica coletas já registradas.
        </p>
        <Link className="btn btn-sm btn-outline-success align-self-center" to="/collector-list">Ver catadores</Link>
      </div>
      <div className="card p-4">
        <label htmlFor="team-search">Buscar equipe</label>
        <input
          id="team-search"
          className="form-control mb-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Equipe</th>
                <th>Participantes</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {teams
                .filter((t) =>
                  (t.name + t.memberIds.map(name).join(" "))
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.name}</strong>
                    </td>
                    <td>{t.memberIds.map(name).join(" · ")}</td>
                    <td>{t.active ? "Ativa" : "Inativa"}</td>
                    <td>
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => {
                          setError("");
                          setForm({ ...t });
                        }}
                      >
                        <Pencil size={14} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!teams.length && (
          <p>{loading ? "Carregando…" : "Nenhuma equipe cadastrada."}</p>
        )}
      </div>
      {form && (
        <CollectionDialog
          title={form.id ? "Editar equipe" : "Nova equipe"}
          busy={busy}
          onClose={() => setForm(null)}
        >
          <form onSubmit={submit}>
            <label htmlFor="team-name">Nome da equipe</label>
            <input
              id="team-name"
              className="form-control mb-3"
              value={form.name}
              maxLength={120}
              minLength={2}
              required
              disabled={busy}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <fieldset disabled={busy}>
              <legend className="fs-18">Participantes · mínimo de 2</legend>
              {people
                .filter(
                  (p) =>
                    p.status !== "INACTIVE" || form.memberIds.includes(p.id),
                )
                .map((p) => (
                  <label key={p.id} className="d-flex gap-2 p-2 border-bottom">
                    <input
                      type="checkbox"
                      checked={form.memberIds.includes(p.id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          memberIds: e.target.checked
                            ? [...form.memberIds, p.id]
                            : form.memberIds.filter((i) => i !== p.id),
                        })
                      }
                    />
                    {p.name}
                    {p.status === "INACTIVE" && " · inativo"}
                  </label>
                ))}
              <label className="d-flex gap-2 my-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Equipe ativa
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
            <button
              disabled={
                busy || form.memberIds.length < 2 || form.memberIds.length > 30
              }
              className="btn btn-success"
              type="submit"
            >
              {busy ? "Salvando…" : "Salvar equipe"}
            </button>
          </form>
        </CollectionDialog>
      )}
    </>
  );
}
