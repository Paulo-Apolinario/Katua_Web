import { searchText } from "./collectionWorkspace.js";

// A material match includes its lots; a lot-only match includes matching lots only.
export function filterInventory(
  items,
  {
    search = "",
    category = "",
    unit = "",
    status = "",
    lotStatus = "",
    processingStage = "",
    origin = "",
    catalog = false,
    lotScope = "all",
    itemId = "",
  } = {},
) {
  const query = searchText(search);
  return items.flatMap((item) => {
    if (
      (itemId && item.id !== itemId) ||
      (category && item.category !== category) ||
      (status && item.status !== status)
    )
      return [];
    const materialMatch =
      !query ||
      searchText(
        [
          item.name,
          item.category,
          item.subcategory,
          item.internalCode,
          item.ncm,
          item.description,
        ].join(" "),
      ).includes(query);
    if (catalog)
      return materialMatch && (!unit || item.unit === unit) ? [item] : [];
    const lots = (item.lots || []).filter((lot) => {
      const linked = !!(
        lot.originCollectionWasteEntryId ||
        lot.originCollectionId ||
        lot.originCollectionMaterialId
      );
      return (
        (lotScope === "cancelled"
          ? lot.status === "CANCELLED"
          : lotScope === "current"
            ? lot.status !== "CANCELLED"
            : true) &&
        (!unit || lot.unit === unit) &&
        (!lotStatus || lot.status === lotStatus) &&
        (!processingStage || lot.processingStage === processingStage) &&
        (!origin || (origin === "COLLECTION" ? linked : !linked)) &&
        (materialMatch ||
          searchText(
            [
              lot.id,
              lot.lotCode,
              lot.code,
              lot.storageLocation,
              lot.origin,
              lot.originCollectionWasteEntryId,
              lot.originCollectionId,
              ...(lotScope === "cancelled" ? [lot.notes] : []),
            ].join(" "),
          ).includes(query))
      );
    });
    if (
      !lots.length &&
      (lotScope === "cancelled" ||
        (lotScope === "current" && item.lots?.length) ||
        unit ||
        lotStatus ||
        processingStage ||
        origin ||
        !materialMatch)
    )
      return [];
    return [
      {
        ...item,
        lots,
        cancelledLotsCount: (item.lots || []).filter(
          (l) => l.status === "CANCELLED",
        ).length,
      },
    ];
  });
}

export function csvContent(headers, rows) {
  const cell = (value) => {
    let text = String(value ?? "");
    // Spreadsheet applications must treat user content as text, never formulas.
    if (/^[\s\uFEFF]*[=+@-]/u.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n")
  );
}

export function downloadCsv(filename, headers, rows) {
  const url = URL.createObjectURL(
    new Blob([csvContent(headers, rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
