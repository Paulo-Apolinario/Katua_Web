import { useEffect, useState } from "react";
import { getStoredToken } from "../services/apiClient";
export default function useProfileImage(user) {
  const [image, setImage] = useState("");
  const avatarUrl = user?.avatarUrl;
  const userId = user?.id;
  useEffect(() => {
    setImage("");
    if (!avatarUrl || !userId) return;
    let active = true,
      objectUrl;
    const controller = new AbortController();
    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const url = new URL(avatarUrl, base);
    if (
      url.origin !== new URL(base).origin ||
      url.pathname !== "/auth/profile/avatar"
    )
      return;
    fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${getStoredToken()}` },
    })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.blob();
      })
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setImage(objectUrl);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl, userId]);
  return image;
}
