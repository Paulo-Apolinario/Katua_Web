import { useEffect } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  apiRequest,
  getStoredToken,
  getStoredUser,
} from "../../services/apiClient";
import { createActivityMeter } from "../../services/activityMeter";

export default function UsageTracker() {
  const { admin, token } = useAdminAuth();
  useEffect(() => {
    if (admin?.role !== "COOPERATIVE" || !token) return;
    const meter = createActivityMeter();
    let sent = Date.now(),
      busy = false,
      alive = true;
    meter.setVisible(document.visibilityState === "visible");
    const flush = async () => {
      const activeSeconds = meter.drain();
      if (
        !activeSeconds ||
        busy ||
        !alive ||
        token !== getStoredToken() ||
        admin.id !== getStoredUser()?.id
      )
        return;
      busy = true;
      try {
        await apiRequest("/analytics/usage/heartbeat", {
          method: "POST",
          body: { activeSeconds, platform: "WEB" },
          suppressReadNotice: true,
          keepalive: true,
        });
      } catch {
        /* Missing network/older API is not a business-operation error. */
      } finally {
        busy = false;
      }
    };
    const interact = () => meter.touch();
    const visibility = () => {
      if (document.visibilityState !== "visible") void flush();
      meter.setVisible(document.visibilityState === "visible");
    };
    ["pointerdown", "keydown", "scroll"].forEach((event) =>
      window.addEventListener(event, interact, {
        passive: true,
        capture: true,
      }),
    );
    document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(() => {
      meter.tick();
      if (Date.now() - sent >= 30000) {
        sent = Date.now();
        void flush();
      }
    }, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      ["pointerdown", "keydown", "scroll"].forEach((event) =>
        window.removeEventListener(event, interact, true),
      );
    };
  }, [admin?.id, admin?.role, token]);
  return null;
}
