import { useState, useEffect } from "react";
import { environmentalService as api } from "../../services/environmentalService";
import { Field, Message } from "./EnvironmentalFields";
const config = {
  residues: ["resCodigoIbama", "resNome", "resDescricao"],
  units: ["uniCodigo", "uniDescricao", "uniNome", "uniSigla"],
  classes: ["claCodigo", "claNome", "claDescricao"],
  physicalStates: ["tieCodigo", "tieNome", "tieDescricao"],
  packaging: ["tiaCodigo", "tiaNome", "tiaDescricao"],
  treatments: ["traCodigo", "traNome", "traDescricao"],
  reverseSystems: ["simCodigo", "simNome", "simDescricao"],
};
export default function SinirCatalogField({
  label,
  catalog,
  catalogs,
  value,
  onChange,
  unitId,
  filter,
}) {
  const [search, setSearch] = useState("");
  const [dependent, setDependent] = useState(null),
    [error, setError] = useState("");
  const loaded = !!catalogs;
  const needsFilter = !!filter && ["classes", "packaging"].includes(catalog);
  useEffect(() => {
    let active = true;
    setDependent(null);
    setError("");
    if (loaded && needsFilter && unitId)
      api
        .sinirCatalog(unitId, catalog, filter)
        .then((data) => {
          if (active) setDependent({ filter, items: data.items });
        })
        .catch((e) => {
          if (active) setError(e);
        });
    return () => {
      active = false;
    };
  }, [unitId, catalog, filter, loaded, needsFilter]);
  const [code, ...names] = config[catalog];
  const items = (
    loaded && needsFilter
      ? dependent?.filter === filter
        ? dependent.items
        : []
      : catalogs?.[catalog] || []
  ).filter((r) => r[code] != null);
  if (!items.length)
    return (
      <div>
        <Message error={error} />
        <Field
          label={label}
          value={value}
          onChange={onChange}
          help="Código informado manualmente. Carregue o catálogo oficial para selecionar e conferir."
        />
      </div>
    );
  const filtered = items
    .filter((r) =>
      [r[code], ...names.map((n) => r[n])]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
    )
    .slice(0, 200);
  const selected = items.find((r) => String(r[code]) === String(value));
  const visible =
    selected && !filtered.includes(selected)
      ? [selected, ...filtered]
      : filtered;
  const options = [
    { value: "", label: "Selecione no catálogo oficial" },
    ...visible.map((r) => ({
      value: String(r[code]),
      label: [r[code], ...names.map((n) => r[n]).filter(Boolean)].join(" — "),
    })),
  ];
  if (value && !selected)
    options.push({
      value: String(value),
      label: value + " — não encontrado neste catálogo",
    });
  return (
    <div>
      {items.length > 200 && (
        <Field
          label={label + " — buscar no catálogo"}
          value={search}
          onChange={setSearch}
        />
      )}
      <Field
        label={label}
        value={value}
        onChange={onChange}
        options={options}
        help={
          items.length > 200
            ? "Mostrando até 200 resultados e a seleção atual. Refine a busca."
            : "Fonte: catálogo oficial consultado pelo backend."
        }
      />
    </div>
  );
}
