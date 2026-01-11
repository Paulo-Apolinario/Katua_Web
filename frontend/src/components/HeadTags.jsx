import { useEffect, useState } from "react";
import { getAllCompanySettings } from "../services/settingService";
import default_fav from "../../public/images/fav.png"

const HeadTags = ({ title, favicon }) => {
  const [cachedFavicon, setCachedFavicon] = useState(null);

  useEffect(() => {
    // Set the page title
    if (title) {
      document.title = title;
    }
  }, [title]);

  useEffect(() => {
    const loadFavicon = async () => {
      // Check if favicon is passed as prop (for manual override)
      if (favicon) {
        setCachedFavicon(favicon);
        return;
      }

      // Check localStorage cache first
      const cachedSettings = localStorage.getItem('company_settings');
      if (cachedSettings) {
        try {
          const settings = JSON.parse(cachedSettings);
          if (settings.fav_icon) {
            const faviconUrl = `${import.meta.env.VITE_API_BASE_URL}/uploads/logo/${settings.fav_icon}`;
            setCachedFavicon(faviconUrl);
            return;
          }
        } catch (error) {
          console.error('Error parsing cached settings:', error);
          localStorage.removeItem('company_settings');
        }
      }

      // Fetch from API if not cached
      try {
        const response = await getAllCompanySettings();
        if (response.success && response.data) {
          // Cache the settings
          localStorage.setItem('company_settings', JSON.stringify(response.data));
          
          if (response.data.fav_icon) {
            const faviconUrl = `${import.meta.env.VITE_API_BASE_URL}/uploads/logo/${response.data.fav_icon}`;
            setCachedFavicon(faviconUrl);
          } else {
            setCachedFavicon(default_fav);
          }
        } else {
          setCachedFavicon(default_fav);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setCachedFavicon(default_fav);
      }
    };

    loadFavicon();
  }, [favicon]);

  useEffect(() => {
    if (!cachedFavicon) return;

    // Remove existing favicon links to avoid duplicates
    const existingFavicons = document.querySelectorAll("link[rel*='icon']");
    existingFavicons.forEach(link => link.remove());

    // Create new favicon link
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = cachedFavicon + "?v=" + Date.now(); // Cache busting for browser
    
    document.getElementsByTagName("head")[0].appendChild(link);
  }, [cachedFavicon]);

  return null;
};

export default HeadTags;