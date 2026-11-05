import { useMemo } from "react";
import { neighborhoodOptions } from "../../utils/generatorNeighborhood";
export default function NeighborhoodFilter({
  id,
  generators,
  value,
  onChange,
}) {
  const options = useMemo(() => neighborhoodOptions(generators), [generators]);
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        Bairro do gerador
      </label>
      <input
        id={id}
        className="form-control"
        type="search"
        list={`${id}-options`}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite ou selecione um bairro"
        aria-describedby={`${id}-hint`}
      />
      <datalist id={`${id}-options`}>
        {options.map((option) => (
          <option key={option.label} value={option.label}>
            {option.count} cadastro(s)
          </option>
        ))}
      </datalist>
      <small id={`${id}-hint`} className="text-muted d-block mt-1">
        {options.length} bairro(s) cadastrado(s). Deixe vazio para mostrar
        todos.
      </small>
    </div>
  );
}
