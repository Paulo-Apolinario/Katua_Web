import GeneratorDocumentField from "../../components/generators/GeneratorDocumentField";
import { validDocument, documentType } from "../../utils/generatorDocument";
import { ManagementHeader } from "../../components/management/ManagementWorkspace";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle, MapPin, Save, Search } from "lucide-react";
import toast from "react-hot-toast";

import HeadTags from "../../components/HeadTags";
import TopProgressBar from "../../components/TopProgressBar";
import generatorService from "../../services/generatorService";
import { hasCoordinates } from "../../components/maps/mapPin";

import { geocodeAddressWithGoogle, loadGoogleMapsScript } from "../../components/generators/geocodeAddress";

const initialForm = {
  type: "SMALL",
  name: "",
  companyName: "",
  documentNumber: "",
  email: "",
  phone: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  address: "",
};

const DEFAULT_CENTER = {
  latitude: -3.7319,
  longitude: -38.5267,
};

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCep(value) {
  const numbers = onlyNumbers(value).slice(0, 8);
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
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

function GoogleLocationPicker({
  pendingLocation,
  selectedLocation,
  onPickLocation,
  onConfirmLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const onPickLocationRef = useRef(onPickLocation);

  useEffect(() => {
    onPickLocationRef.current = onPickLocation;
  }, [onPickLocation]);

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      try {
        const maps = await loadGoogleMapsScript();

        if (!mounted || !mapContainerRef.current) return;

        const map = new maps.Map(mapContainerRef.current, {
          center: {
            lat: DEFAULT_CENTER.latitude,
            lng: DEFAULT_CENTER.longitude,
          },
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: true,
          gestureHandling: "greedy",
        });

        const marker = new maps.Marker({
          map,
          draggable: true,
          visible: false,
          title: "Localização selecionada",
        });

        map.addListener("click", (event) => {
          const location = {
            latitude: event.latLng.lat(),
            longitude: event.latLng.lng(),
          };

          marker.setVisible(true);
          marker.setPosition(event.latLng);

          onPickLocationRef.current(location);
        });

        marker.addListener("dragend", (event) => {
          const location = {
            latitude: event.latLng.lat(),
            longitude: event.latLng.lng(),
          };

          onPickLocationRef.current(location);
        });

        mapRef.current = map;
        markerRef.current = marker;
      } catch (error) {
        console.error("Erro ao carregar Google Maps:", error);
        toast.error(
          error?.message ||
            "Não foi possível carregar o Google Maps. Verifique a chave e as APIs no Google Cloud."
        );
      }
    }

    initMap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const location = pendingLocation || selectedLocation;

    if (!location || !mapRef.current || !markerRef.current) return;

    const position = {
      lat: location.latitude,
      lng: location.longitude,
    };

    markerRef.current.setVisible(true);
    markerRef.current.setPosition(position);
    mapRef.current.panTo(position);
    mapRef.current.setZoom(17);
  }, [pendingLocation, selectedLocation]);

  return (
    <div>
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "460px",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          background: "#f3f4f6",
        }}
      />

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
        <div className="d-flex align-items-center gap-2 text-muted small">
          <MapPin size={16} />
          <span>
            Mova o mapa e clique no ponto exato. Também é possível arrastar o
            marcador depois de criado.
          </span>
        </div>

        {pendingLocation ? (
          <button
            type="button"
            className="primary-btn btn-sm"
            onClick={onConfirmLocation}
          >
            <CheckCircle size={16} />
            Confirmar localização
          </button>
        ) : null}
      </div>

      {selectedLocation ? (
        <div
          className="mt-3 p-3"
          style={{
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            color: "#065f46",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Localização confirmada. A latitude e longitude serão salvas.
        </div>
      ) : (
        <div
          className="mt-3 p-3"
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: "12px",
            color: "#9a3412",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Nenhuma localização confirmada ainda.
        </div>
      )}
    </div>
  );
}

const AddGenerator = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const handlePickLocation = useCallback((location) => {
    setPendingLocation(location);
    toast.success("Ponto selecionado. Confirme a localização para salvar.");
  }, []);

  const handleConfirmLocation = useCallback(() => {
    if (!pendingLocation) {
      toast.error("Clique em um ponto no mapa primeiro.");
      return;
    }

    setSelectedLocation(pendingLocation);
    toast.success("Localização confirmada.");
  }, [pendingLocation]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "zipCode" ? formatCep(value) : value,
    }));
  };

  const handleSearchCep = async () => {
    const cep = onlyNumbers(form.zipCode);

    if (cep.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }

    try {
      setLoadingCep(true);

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data?.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      const updatedForm = {
        ...form,
        zipCode: formatCep(cep),
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        address: [data.logradouro, data.bairro, data.localidade, data.uf]
          .filter(Boolean)
          .join(", "),
      };

      setForm(updatedForm);

      const location = await geocodeAddressWithGoogle(updatedForm);

      if (location) {
        setPendingLocation(location);
        toast.success(
          "Endereço localizado. Confira o ponto no mapa e confirme."
        );
      } else {
        toast.success(
          "Endereço preenchido. Clique no mapa para marcar a localização."
        );
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Não foi possível buscar o CEP/localização.");
    } finally {
      setLoadingCep(false);
    }
  };

  const buildPayload = () => ({
    type: form.type,
    documentNumber: form.documentNumber.trim() || undefined,
    name: form.name.trim(),
    companyName: form.companyName.trim() || undefined,
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim() || undefined,
    zipCode: form.zipCode.trim() || undefined,
    street: form.street.trim() || undefined,
    number: form.number.trim() || undefined,
    neighborhood: form.neighborhood.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim().toUpperCase() || undefined,
    address: form.address.trim() || buildFullAddress(form) || undefined,
    latitude: selectedLocation?.latitude,
    longitude: selectedLocation?.longitude,
  });

  const validate = () => {
    if (form.documentNumber && !validDocument(form.documentNumber)) {
      toast.error("Informe um CPF ou CNPJ válido, incluindo os dígitos verificadores."); return false;
    }
    if (form.type === "LARGE" && documentType(form.documentNumber) === "CPF") {
      toast.error("Para grande gerador, informe um CNPJ."); return false;
    }
    if (form.type === "SMALL" && !form.documentNumber.trim()) {
      toast.error("Informe o CPF ou CNPJ para classificar o pequeno gerador."); return false;
    }

    if (!form.name.trim()) {
      toast.error("Informe o nome do responsável ou do gerador.");
      return false;
    }

    if (!form.email.trim()) {
      toast.error("Informe o e-mail do gerador.");
      return false;
    }

    if (!form.type) {
      toast.error("Selecione o tipo do gerador.");
      return false;
    }

    if (!hasCoordinates(selectedLocation)) {
      toast.error("Clique no mapa e confirme a localização do gerador.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      await generatorService.create(buildPayload());

      toast.success("Gerador cadastrado com sucesso.");
      navigate("/generator-list");
    } catch (error) {
      console.error("Erro ao cadastrar gerador:", error);
      toast.error(error?.message || "Não foi possível cadastrar o gerador.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HeadTags title="Novo Gerador" />
      <TopProgressBar loading={loading || loadingCep} />

      <ManagementHeader
        title="Novo Gerador"
        description="Cadastre um residencial com CPF, pequeno gerador com CNPJ ou grande gerador vinculado à cooperativa."
        actions={
          <>
            <Link to="/generator-list" className="secondary-btn btn-sm">
              <ArrowLeft />
              Voltar
            </Link>
          </>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="card p-25 mb-4">
          <h4 className="fw-600 mb-4">Dados do Gerador</h4>

          <div className="row g-4">
            <div className="col-md-4">
              <label className="form-label">Tipo *</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="form-control"
              >
                <option value="SMALL">Pequeno Gerador</option>
                <option value="LARGE">Grande Gerador</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Nome / Responsável *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Nome do responsável"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Empresa / Razão social</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                className="form-control"
                placeholder="Nome da empresa"
              />
            </div>

            <GeneratorDocumentField value={form.documentNumber} type={form.type} disabled={loading}
               onChange={documentNumber => setForm(previous => ({ ...previous, documentNumber }))} />

            <div className="col-md-6">
              <label className="form-label">E-mail *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="form-control"
                placeholder="gerador@email.com"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Telefone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="form-control"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </div>

        <div className="card p-25 mb-4">
          <h4 className="fw-600 mb-4">Endereço e Localização</h4>

          <div className="row g-4">
            <div className="col-md-4">
              <label className="form-label">CEP</label>

              <div className="d-flex gap-2">
                <input
                  name="zipCode"
                  value={form.zipCode}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="00000-000"
                />

                <button
                  type="button"
                  className="primary-btn btn-sm"
                  onClick={handleSearchCep}
                  disabled={loadingCep}
                >
                  <Search size={16} />
                  {loadingCep ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            <div className="col-md-5">
              <label className="form-label">Rua</label>
              <input
                name="street"
                value={form.street}
                onChange={handleChange}
                className="form-control"
                placeholder="Rua / Avenida"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Número</label>
              <input
                name="number"
                value={form.number}
                onChange={handleChange}
                className="form-control"
                placeholder="Nº"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Bairro</label>
              <input
                name="neighborhood"
                value={form.neighborhood}
                onChange={handleChange}
                className="form-control"
                placeholder="Bairro"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Cidade</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="form-control"
                placeholder="Cidade"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">UF</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                className="form-control"
                placeholder="CE"
                maxLength={2}
              />
            </div>

            <div className="col-12">
              <label className="form-label">
                Endereço completo / complemento
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className="form-control"
                placeholder="Complemento, referência ou endereço completo"
              />
            </div>

            <div className="col-12">
              <label className="form-label">
                Marcar localização no Google Maps *
              </label>

              <GoogleLocationPicker
                pendingLocation={pendingLocation}
                selectedLocation={selectedLocation}
                onPickLocation={handlePickLocation}
                onConfirmLocation={handleConfirmLocation}
              />
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-3">
          <Link to="/generator-list" className="secondary-btn">
            Cancelar
          </Link>

          <button type="submit" className="primary-btn" disabled={loading}>
            <Save />
            {loading ? "Salvando..." : "Salvar gerador"}
          </button>
        </div>
      </form>
    </>
  );
};

export default AddGenerator;