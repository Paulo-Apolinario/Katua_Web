import {
  collectionEntries,
  completionBlockers,
  entryDisposition,
} from "./materialDisposition.js";
export function receivingWorkflow(c) {
  const entries = collectionEntries(c),
    team = !!c.participants?.length;
  const steps = [
    { id: "receipt", label: "Recebimento" },
    { id: "weigh", label: "Pesagem e conferência" },
    ...(team ? [{ id: "team", label: "Divisão da equipe" }] : []),
    { id: "destination", label: "Encaminhamento" },
    { id: "complete", label: "Conclusão" },
  ];
  const followUp = entries.some((e) => entryDisposition(e).followUp > 0);
  let current = "receipt",
    title = "Confirmar a chegada do material",
    description =
      "Registre o recebimento físico para liberar a pesagem e a conferência.";
  if (c.status === "CANCELLED")
    return {
      steps,
      current: "cancelled",
      title: "Coleta cancelada",
      description: "Este registro permanece disponível para consulta.",
      followUp,
    };
  if (c.status === "COMPLETED")
    return {
      steps,
      current: "done",
      title: "Coleta concluída",
      description: followUp
        ? "A coleta foi encerrada. Há materiais em estoque, triagem ou reserva que continuam em acompanhamento."
        : "Consulte os encaminhamentos e o histórico dos materiais abaixo.",
      followUp,
    };
  if (!c.intakeKind && ["PENDING", "IN_PROGRESS"].includes(c.status))
    return {
      steps,
      current: "field",
      title: "Aguardando retirada em campo",
      description:
        "O recebimento será liberado quando a equipe registrar a coleta realizada.",
      followUp,
    };
  if (["RECEIVED", "SORTING"].includes(c.status)) {
    if (!c.quantityReviewVersion) {
      current = "weigh";
      title = "Separar, pesar e conferir";
      description = "Informe as quantidades reais de cada material recebido.";
    } else if (
      team &&
      (!c.allocationVersion ||
        c.allocationQuantityVersion !== c.quantityReviewVersion)
    ) {
      current = "team";
      title = "Conferir a divisão da equipe";
      description = "Distribua os materiais conferidos entre os participantes.";
    } else if (c.incidents?.some((i) => i.status === "OPEN")) {
      current = "incidents";
      title = "Resolver as ocorrências abertas";
      description = "Confira as pendências antes de encerrar o atendimento.";
    } else if (
      !entries.length ||
      (c.collectionMaterials?.length &&
        entries.length !== c.collectionMaterials.length)
    ) {
      current = "review";
      title = "Conferir os registros dos materiais";
      description =
        "As entradas estão incompletas. Atualize os detalhes antes de continuar.";
    } else if (entries.some((e) => Number(e.remainingQuantity) > 0.000001)) {
      current = "destination";
      title = "Encaminhar os materiais";
      description =
        "Escolha o encaminhamento de cada saldo: estoque, triagem, reserva ou destino final.";
    } else {
      current = "complete";
      title = "Concluir a coleta";
      description =
        "Quantidades conferidas e saldos encaminhados. Confira as informações e confirme o encerramento.";
    }
  }
  return {
    steps,
    current,
    title,
    description,
    followUp,
    blockers: completionBlockers(c),
  };
}
