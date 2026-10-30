import { useCallback, useEffect, useRef, useState } from "react";
import { geocodeAddressWithGoogle } from "./geocodeAddress";

export const ADDRESS_FIELDS = ["zipCode", "street", "number", "neighborhood", "city", "state", "address"];
export const addressSignature = form => JSON.stringify(ADDRESS_FIELDS.map(key => String(form[key] || "").trim()));

// A suggestion is never a confirmation. Ignore obsolete results, including after a manual pick.
export default function useAddressLocation(form, { enabled = true, onInvalidate, onSuggestion }) {
  const signature = addressSignature(form);
  const current = useRef(null);
  current.current = { form, signature, onInvalidate, onSuggestion };
  const version = useRef(0), timer = useRef(null), baseline = useRef(null);
  const [message, setMessage] = useState("");
  const cancel = useCallback(() => {
    version.current += 1;
    clearTimeout(timer.current);
    setMessage("");
  }, []);
  const search = useCallback(async () => {
    clearTimeout(timer.current);
    const request = ++version.current, snapshot = current.current;
    const valid = () => request === version.current && snapshot.signature === current.current.signature;
    setMessage("Buscando o endereço com o número informado...");
    try {
      const location = await geocodeAddressWithGoogle(snapshot.form);
      if (!valid()) return;
      if (!location) throw new Error("Endereço não encontrado. Selecione o ponto manualmente no mapa.");
      current.current.onSuggestion(location);
      setMessage("Confira o ponto sugerido e confirme a localização. A precisão depende dos dados disponíveis para o endereço.");
    } catch (error) {
      if (valid()) setMessage(error.message || "Busca indisponível. Selecione o ponto no mapa.");
    }
  }, []);
  useEffect(() => {
    if (!enabled) { baseline.current = null; return; }
    if (baseline.current === null) { baseline.current = signature; return; }
    if (baseline.current === signature) return;
    baseline.current = signature;
    cancel();
    current.current.onInvalidate();
    const value = current.current.form;
    if (value.street?.trim() && value.number?.trim() && value.city?.trim() && value.state?.trim()) {
      timer.current = setTimeout(search, 800);
    } else setMessage("Preencha rua, número, cidade e UF para buscar o ponto. Você também pode selecioná-lo no mapa.");
    return () => clearTimeout(timer.current);
  }, [signature, enabled, cancel, search]);
  useEffect(() => () => { version.current += 1; clearTimeout(timer.current); }, []);
  return { cancel, search, message };
}
