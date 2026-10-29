export default function RefreshNotice({ at, deferred }) {
  return <p className="small text-muted" role="status">
    {at ? `Atualizado às ${new Date(at).toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza" })}. ` : ""}
    {deferred ? "Atualização automática pausada enquanto você consulta ou edita. Use Atualizar após concluir." : "Atualização automática enquanto esta tela estiver visível."}
  </p>;
}
