import { useEffect, useState } from "react";
import { apiRequest } from "../../services/apiClient";

export default function GeneratorPicker({ selected, onSelect }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      apiRequest("/cooperative-field/generators?" + new URLSearchParams({ q, page: String(page) }))
        .then(result => { if (active) { setData(result); setError(""); } })
        .catch(e => { if (active) { setError(e.message); setData(null); } })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [q, page]);
  return <section className="border rounded p-3 mb-3" aria-label="Gerador da entrega">
    <label className="d-block">Buscar gerador por nome ou local
      <input className="form-control" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} />
    </label>
    {selected && <p role="status">Gerador selecionado: <strong>{selected.name}</strong></p>}
    <label className="d-block my-2">Gerador cadastrado *
      <select aria-label="Gerador cadastrado" className="form-select" required value={selected?.id || ""} onChange={e => onSelect(data?.items.find(g => g.id === e.target.value) || null)} disabled={loading}>
        <option value="">Selecione o gerador</option>
        {selected && !data?.items.some(g => g.id === selected.id) && <option value={selected.id}>{selected.name}</option>}
        {data?.items.map(g => <option key={g.id} value={g.id}>{g.name}{g.companyName ? ` · ${g.companyName}` : ""}{g.neighborhood ? ` · ${g.neighborhood}` : ""}</option>)}
      </select>
    </label>
    {loading && <p role="status">Buscando geradores...</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {!loading && data?.items.length === 0 && <p>Nenhum gerador encontrado nesta busca.</p>}
    <div className="d-flex gap-2 align-items-center">
      <button type="button" className="btn btn-outline-secondary" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
      <span>Página {page} de {data?.pagination.totalPages || 1}</span>
      <button type="button" className="btn btn-outline-secondary" disabled={loading || !data || page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
    </div>
    <p className="small text-muted mt-2 mb-0">A entrada será vinculada ao histórico deste gerador. A entrega não atribui produção a um catador.</p>
  </section>;
}
