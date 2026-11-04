import { useAdminAuth } from '../context/AdminAuthContext';
export default function SessionRecovery() {
  const { bootstrapError, retryBootstrap, logout } = useAdminAuth();
  return <section className="container py-5" style={{ maxWidth: 640 }}>
    <h1 className="h4">Não foi possível confirmar sua sessão</h1>
    <p role="alert">{bootstrapError}</p>
    <p>Seu acesso salvo foi preservado. Tente novamente quando o serviço estiver disponível.</p>
    <div className="d-flex flex-wrap gap-2">
      <button type="button" className="btn btn-success" onClick={retryBootstrap}>Tentar confirmar sessão</button>
      <button type="button" className="btn btn-outline-secondary" onClick={logout}>Entrar com outra conta</button>
    </div>
  </section>;
}
