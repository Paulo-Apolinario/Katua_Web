const GOOGLE_MAPS_API_KEY = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
export function hasAddressGeocoder() {
  return Boolean(
    GOOGLE_MAPS_API_KEY ||
      (typeof window !== "undefined" && window.google?.maps),
  );
}
function buildFullAddress(form) {
  return [
    form.street,
    form.number,
    form.neighborhood,
    form.city,
    form.state,
    form.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function loadGoogleMapsScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps);
    if (!GOOGLE_MAPS_API_KEY)
      return reject(
        new Error(
          "Busca por endereço indisponível. Marque o ponto no mapa ou informe as coordenadas.",
        ),
      );
    let script = document.getElementById("google-maps-script");
    const created = !script;
    if (!script) {
      script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
    }
    const finish = (error) => {
      clearTimeout(timer);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
      if (error) {
        script.remove();
        reject(
          new Error(
            "Busca por endereço indisponível. Marque o ponto manualmente no mapa.",
          ),
        );
      } else resolve(window.google.maps);
    };
    const loaded = () => finish(!window.google?.maps);
    const failed = () => finish(true);
    const timer = setTimeout(failed, 15000);
    script.addEventListener("load", loaded);
    script.addEventListener("error", failed);
    if (created) document.body.appendChild(script);
  });
}

export async function geocodeAddressWithGoogle(form) {
  const query = buildFullAddress(form) || form.address?.trim();

  if (!query?.trim()) return null;
  const maps = await loadGoogleMapsScript();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "A busca excedeu o tempo de espera. Marque o ponto manualmente no mapa.",
          ),
        ),
      15000,
    );
    const geocoder = new maps.Geocoder();

    geocoder.geocode(
      {
        address: query,
        componentRestrictions: {
          country: "BR",
        },
      },
      (results, status) => {
        clearTimeout(timer);
        if (status !== "OK" || !results?.[0]) {
          resolve(null);
          return;
        }

        const location = results[0].geometry.location;

        resolve({
          latitude: location.lat(),
          longitude: location.lng(),
        });
      },
    );
  });
}
