import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
const palette = [
  "#087b55",
  "#258ca1",
  "#d79728",
  "#6b63a4",
  "#9c5279",
  "#6d913f",
  "#bc6945",
  "#536b83",
];
const number = (v) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    Number(v || 0),
  );
export function DistributionPie({
  data,
  unit = "",
  onSelect,
  label = "Distribuição",
}) {
  const rows = data
    .map((d, i) => ({
      ...d,
      value: Number(d.value || 0),
      key: d.key ?? String(i),
    }))
    .filter((d) => Number.isFinite(d.value) && d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0),
    ordered = [...rows].sort((a, b) => b.value - a.value);
  const slices =
    ordered.length > 8
      ? [
          ...ordered.slice(0, 7),
          {
            name: "Outros",
            key: "others",
            value: ordered.slice(7).reduce((s, d) => s + d.value, 0),
          },
        ]
      : ordered;
  if (!total)
    return <p role="status">Sem valores positivos para esta seleção.</p>;
  return (
    <div aria-label={label} role="group">
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <PieChart accessibilityLayer>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={0}
              outerRadius={95}
              isAnimationActive={false}
            >
              {slices.map((d, i) => (
                <Cell key={d.key} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, name) => [
                `${number(v)} ${unit} · ${number((Number(v) / total) * 100)}%`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {slices.map((d, i) => (
          <li key={d.key}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                background: palette[i % palette.length],
                marginRight: 6,
                borderRadius: 3,
              }}
            />
            {onSelect && d.key !== "others" ? (
              <button
                className="btn btn-link p-0"
                type="button"
                onClick={() => onSelect(d)}
              >
                {d.name}
              </button>
            ) : (
              <span>{d.name}</span>
            )}{" "}
            <strong>
              {number(d.value)} {unit}
            </strong>{" "}
            · {number((d.value / total) * 100)}%
          </li>
        ))}
      </ul>
      <details>
        <summary>Consultar todos os valores da pizza</summary>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Quantidade {unit && `(${unit})`}</th>
              <th>Participação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.name}</th>
                <td>{number(d.value)}</td>
                <td>{number((d.value / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
export function HeatTiles({
  data,
  unit = "",
  label = "Concentração por período",
  onSelect,
}) {
  const valid = data
    .map((d, i) => ({
      ...d,
      key: d.key ?? String(i),
      value: Number(d.value || 0),
    }))
    .filter((d) => Number.isFinite(d.value) && d.value >= 0);
  const max = Math.max(...valid.map((d) => d.value), 0);
  if (!valid.length) return <p>Sem intervalos para esta seleção.</p>;
  return (
    <div role="group" aria-label={label}>
      <p className="small text-muted">
        Escala nesta seleção: 0 a {number(max)} {unit}. Tons mais escuros
        indicam maior concentração.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
          gap: 7,
          maxHeight: 420,
          overflowY: "auto",
          padding: 2,
        }}
      >
        {valid.map((d) => {
          const intensity = max ? d.value / max : 0;
          const style = {
            border: "1px solid #b7cfc3",
            borderRadius: 8,
            padding: 10,
            background:
              d.value === 0
                ? "#f1f4f3"
                : `hsl(158 48% ${95 - intensity * 65}%)`,
            color: intensity > 0.6 ? "white" : "#123c2b",
            textAlign: "left",
            minHeight: 64,
          };
          const content = (
            <>
              <span style={{ display: "block", fontSize: 12 }}>{d.name}</span>
              <strong>
                {number(d.value)} {unit}
              </strong>
            </>
          );
          return onSelect ? (
            <button
              type="button"
              key={d.key}
              style={style}
              aria-label={`${d.name}: ${number(d.value)} ${unit}`}
              onClick={() => onSelect(d)}
            >
              {content}
            </button>
          ) : (
            <div key={d.key} style={style}>
              {content}
            </div>
          );
        })}
      </div>
      <details className="mt-2">
        <summary>Consultar valores do mapa de calor</summary>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Intervalo</th>
              <th>Quantidade {unit && `(${unit})`}</th>
            </tr>
          </thead>
          <tbody>
            {valid.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.name}</th>
                <td>{number(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
