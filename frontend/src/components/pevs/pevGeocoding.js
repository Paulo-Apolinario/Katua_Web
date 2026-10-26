import {
  geocodeAddressWithGoogle,
  hasAddressGeocoder,
} from "../generators/geocodeAddress.js";
import { hasPosition } from "./pevUtils.js";
const postalCache = new Map();
const normalized = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
export const pevAddressKey = (form) =>
  ["zipCode", "street", "number", "neighborhood", "city", "state", "location"]
    .map((key) => normalized(form[key]))
    .join("|");
const brazilPosition = (point) =>
  hasPosition(point) &&
  Number(point.latitude) >= -34 &&
  Number(point.latitude) <= 6 &&
  Number(point.longitude) >= -74 &&
  Number(point.longitude) <= -28;
export async function locatePevAddress(form, { signal } = {}) {
  if (signal?.aborted)
    throw new DOMException("Consulta cancelada", "AbortError");
  if (hasAddressGeocoder() && (form.street?.trim() || form.location?.trim())) {
    try {
      const p = await geocodeAddressWithGoogle({
        ...form,
        street: form.street?.trim() || form.location,
        address: form.location,
      });
      if (signal?.aborted)
        throw new DOMException("Consulta cancelada", "AbortError");
      if (p && brazilPosition(p))
        return {
          ...p,
          source: "address",
          message:
            "Endereço localizado. Confira a entrada do PEV, ajuste o marcador se necessário e confirme no mapa.",
        };
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  const zip = String(form.zipCode || "").replace(/\D/g, "");
  if (zip.length !== 8)
    throw Error(
      "Não foi possível localizar automaticamente. Consulte um CEP válido ou marque a entrada do PEV no mapa.",
    );
  let data = postalCache.get(zip);
  if (!data || data.expiresAt < Date.now()) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 12000);
    let result;
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cep/v2/${zip}`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw Error(
          "O serviço de localização está indisponível ou não encontrou este CEP. Tente novamente ou marque o ponto manualmente no mapa.",
        );
      result = await response.json();
    } catch {
      if (signal?.aborted)
        throw new DOMException("Consulta cancelada", "AbortError");
      throw Error(
        "O serviço de localização está indisponível. Tente novamente ou marque a entrada do PEV manualmente no mapa.",
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
    if (!result || String(result.cep || "").replace(/\D/g, "") !== zip)
      throw Error(
        "A localização retornada não corresponde ao CEP consultado. Marque o ponto manualmente.",
      );
    data = { ...result, expiresAt: Date.now() + 300000 };
  }
  if (signal?.aborted)
    throw new DOMException("Consulta cancelada", "AbortError");
  if (
    (form.city?.trim() && normalized(form.city) !== normalized(data.city)) ||
    (form.state?.trim() && normalized(form.state) !== normalized(data.state))
  )
    throw Error(
      "O CEP não corresponde ao município e à UF informados. Corrija o endereço ou marque o ponto manualmente.",
    );
  const coords = data.location?.coordinates;
  const p = { latitude: coords?.latitude, longitude: coords?.longitude };
  if (!brazilPosition(p))
    throw Error(
      "O endereço foi preenchido, mas este CEP não possui coordenadas válidas disponíveis. Marque a entrada do PEV no mapa e confirme.",
    );
  if (postalCache.size >= 50 && !postalCache.has(zip))
    postalCache.delete(postalCache.keys().next().value);
  postalCache.set(zip, data);
  return {
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    source: "postal",
    message:
      "Sugestão aproximada por CEP (BrasilAPI). O número do imóvel não está localizado com precisão: ajuste o marcador para a entrada do PEV e confirme no mapa.",
  };
}
