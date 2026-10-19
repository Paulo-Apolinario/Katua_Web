import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../../utils/wasteWorkspace";
export function useWasteResource(loader) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: "",
    updatedAt: null,
  });
  const request = useRef({ id: 0 });
  const refresh = useCallback(async () => {
    const ref = request.current,
      id = ++ref.id;
    setState({ data: null, loading: true, error: "", updatedAt: null });
    try {
      const data = await loader();
      if (id === ref.id)
        setState({ data, loading: false, error: "", updatedAt: new Date() });
    } catch (e) {
      if (id === ref.id)
        setState({
          data: null,
          loading: false,
          error: errorMessage(e),
          updatedAt: null,
        });
    }
  }, [loader]);
  useEffect(() => {
    const ref = request.current;
    void refresh();
    return () => {
      ref.id++;
    };
  }, [refresh]);
  return { ...state, refresh };
}

export function useWasteOperation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const guard = useRef({ busy: false, alive: true });
  useEffect(() => {
    const ref = guard.current;
    ref.alive = true;
    return () => {
      ref.alive = false;
    };
  }, []);
  const run = async (action) => {
    const ref = guard.current;
    if (ref.busy) return;
    ref.busy = true;
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (result?.success === false)
        throw Error(result.error || "Operação rejeitada.");
      return ref.alive ? result : undefined;
    } catch (e) {
      if (ref.alive) setError(errorMessage(e));
    } finally {
      ref.busy = false;
      if (ref.alive) setBusy(false);
    }
  };
  return { busy, error, setError, run };
}
