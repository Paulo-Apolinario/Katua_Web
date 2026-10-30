const number = value => Math.max(0, Number(value) || 0);
export const FOLLOW_UP_TYPES = ["STOCK", "TRIAGE", "RESERVATION"];
export const isIntermediate = type => ["TRIAGE", "RESERVATION"].includes(type);
export const canEditDestination = destination => {
  const status = destination.collectionWasteEntry?.collection?.status || destination.entry?.collection?.status;
  return destination.status !== "CANCELLED" && status !== "CANCELLED" && (status !== "COMPLETED" || isIntermediate(destination.type));
};
export function followUpQuantity(destination) {
  if (destination.status === "CANCELLED" || !FOLLOW_UP_TYPES.includes(destination.type)) return 0;
  if (destination.type !== "STOCK") return number(destination.quantity);
  if (!destination.stockLot) return number(destination.quantity);
  if (["SOLD", "DISCARDED", "CANCELLED"].includes(destination.stockLot.status)) return 0;
  return Math.min(number(destination.quantity), number(destination.stockLot.availableQuantity));
}
export function entryDisposition(entry) {
  const followUp = (entry.destinations || []).reduce((sum, destination) => sum + followUpQuantity(destination), 0);
  const remaining = number(entry.remainingQuantity), allocated = number(entry.destinedQuantity);
  return { remaining, followUp, final: Math.max(0, allocated - followUp),
    label: remaining > 0.000001 ? "Encaminhamento pendente" : followUp > 0.000001 ? "Material em acompanhamento" : "Etapa do material finalizada" };
}
export const collectionEntries = collection => collection.collectionWasteEntries || (collection.collectionMaterials || []).map(material => material.wasteEntry).filter(Boolean);
export function completionBlockers(collection) {
  const entries = collectionEntries(collection), reasons = [];
  if (!collection.quantityReviewVersion) reasons.push("Registre a conferência das quantidades.");
  if (!entries.length || (collection.collectionMaterials?.length && entries.length !== collection.collectionMaterials.length)) reasons.push("Confira as entradas dos materiais desta coleta.");
  if (entries.some(entry => number(entry.remainingQuantity) > 0.000001)) reasons.push("Encaminhe todo o saldo dos materiais antes de concluir a coleta.");
  if (collection.participants?.length && (!collection.allocationVersion || collection.allocationQuantityVersion !== collection.quantityReviewVersion)) reasons.push("Confirme a divisão dos materiais entre os participantes.");
  if (collection.incidents?.some(incident => incident.status === "OPEN")) reasons.push("Trate as ocorrências abertas da coleta.");
  return reasons;
}
