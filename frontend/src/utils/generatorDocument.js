export const normalizeDocument = (value = "") => value.trim().toUpperCase().replace(/[.\-/\s]/g, "");

export function documentType(value) {
  const number = normalizeDocument(value || "");
  if (/^\d{11}$/.test(number)) return "CPF";
  if (/^[A-Z0-9]{12}\d{2}$/.test(number)) return "CNPJ";
  return null;
}

export function validDocument(value) {
  const number = normalizeDocument(value || ""), type = documentType(number);
  if (!type || /^(.)\1+$/.test(number)) return false;
  const digit = (text, weights) => {
    const remainder = [...text].reduce((sum, char, i) => sum + (char.charCodeAt(0) - 48) * weights[i], 0) % 11;
    return String(remainder < 2 ? 0 : 11 - remainder);
  };
  const weights = type === "CPF" ? [10, 9, 8, 7, 6, 5, 4, 3, 2] : [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const base = number.slice(0, -2), first = digit(base, weights);
  return number.endsWith(first + digit(base + first, type === "CPF" ? [11, ...weights] : [6, ...weights]));
}

export function formatDocument(value) {
  const number = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
  if (/^\d{0,11}$/.test(number)) return number.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  return number.slice(0, 2)
    + (number.length > 2 ? "." + number.slice(2, 5) : "")
    + (number.length > 5 ? "." + number.slice(5, 8) : "")
    + (number.length > 8 ? "/" + number.slice(8, 12) : "")
    + (number.length > 12 ? "-" + number.slice(12, 14) : "");
}

export function generatorCategory(generator) {
  if (generator.type === "LARGE") return "LARGE";
  if (!generator.documentNumber || !validDocument(generator.documentNumber)) return "PENDING_DOCUMENT";
  return documentType(generator.documentNumber) === "CPF" ? "REGISTERED_RESIDENTIAL" : "SMALL_BUSINESS";
}
export const categoryLabels = {
  REGISTERED_RESIDENTIAL: "Gerador residencial cadastrado",
  SMALL_BUSINESS: "Pequeno gerador",
  PENDING_DOCUMENT: "Pequeno gerador · documento pendente",
  LARGE: "Grande gerador",
};
export const generatorTypeLabel = (generator) => categoryLabels[generatorCategory(generator)];
