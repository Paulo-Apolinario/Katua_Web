import { Link } from "react-router";
import { House, MapPin } from "lucide-react";
import { hasCoordinates } from "./mapPin";

export default function HeadquartersStatus({ base, onLocate, loading = false, error = "" }) {
  if (loading) return <p role="status" className="small">Carregando localização da sede...</p>;
  if (error) return <p role="status" className="alert alert-warning">Não foi possível consultar a localização da sede. Recarregue a página para tentar novamente.</p>;
  return <div className={hasCoordinates(base) ? "alert alert-light border d-flex align-items-center justify-content-between flex-wrap gap-2" : "alert alert-warning"}>
    {hasCoordinates(base) ? <>
      <span><House size={18} className="me-2" aria-hidden="true" /><strong>Sede: {base.name}</strong><small className="d-block">{base.address || "Localização cadastrada da cooperativa"}</small></span>
      <button type="button" className="btn btn-sm katua-hq-button" onClick={onLocate}><MapPin size={15} className="me-1" aria-hidden="true" />Localizar sede</button>
    </> : <>
      <strong>Sede sem coordenadas cadastradas.</strong> O endereço escrito não define o ponto exato no mapa. <Link to="/settings#sede">Definir localização da sede</Link>
    </>}
  </div>;
}
