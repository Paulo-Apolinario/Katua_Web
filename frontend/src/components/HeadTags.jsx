import { useEffect } from "react";
export default function HeadTags({ title, favicon }) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
  useEffect(() => {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon || "/images/fav.png";
  }, [favicon]);
  return null;
}
