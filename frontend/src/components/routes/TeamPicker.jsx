export default function TeamPicker({ teams = [], teamId, onChange, disabled }) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor="route-team">
        Equipe de trabalho conjunto
      </label>
      <select
        id="route-team"
        className="form-select"
        value={teamId || ""}
        disabled={disabled}
        onChange={(e) => {
          const t = teams.find((t) => t.id === e.target.value);
          onChange(t || null);
        }}
      >
        <option value="">Distribuição individual por ponto</option>
        {teams
          .filter((t) => t.active || t.id === teamId)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.memberIds.length} catadores
              {!t.active ? " · inativa" : ""}
            </option>
          ))}
      </select>
      <p className="small text-muted">
        Com uma equipe, todos os participantes acompanham as mesmas coletas e
        recebem parcelas após a conferência. Sem equipe, cada ponto mantém seu
        catador responsável.
      </p>
    </div>
  );
}
