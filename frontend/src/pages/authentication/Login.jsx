import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import {
  BarChart3,
  Bell,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  Recycle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAdminAuth } from "../../context/AdminAuthContext";
import { login as loginService } from "../../services/authService";
import HeadTags from "../../components/HeadTags";

const Login = () => {
  const { login, admin, loading } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  if (!loading && admin) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!email || !password) {
      toast.error("Informe email e senha.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await loginService({ email, password });

      login({
        token: response?.token,
        user: response?.user,
      });

      navigate("/", { replace: true });
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors);
        return;
      }

      toast.error(
        err?.message ||
          "Não foi possível fazer login. Verifique suas credenciais."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeadTags title="Login" />

      <div
        style={{
          height: "100vh",
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ padding: "24px" }}
        >
          <div style={{ width: "100%", maxWidth: 390 }}>
            <div className="mb-3">
              <div
                className="d-flex align-items-center justify-content-center mb-3"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "#ecfdf5",
                  color: "#028C56",
                }}
              >
                <Recycle size={24} />
              </div>

              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                Bem-vindo de volta!
              </h1>

              <p
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  marginBottom: 0,
                  lineHeight: 1.45,
                }}
              >
                Acesse o painel KATUÁ para gerenciar coletas, rotas,
                motoristas, catadores e geradores.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label
                  htmlFor="email"
                  className="form-label"
                  style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}
                >
                  Email <span className="text-danger">*</span>
                </label>

                <div style={{ position: "relative" }}>
                  <Mail
                    size={18}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />

                  <input
                    type="email"
                    id="email"
                    className={`form-control ${
                      errors.email ? "border-danger" : ""
                    }`}
                    placeholder="email@cooperativa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    style={{
                      height: 46,
                      borderRadius: 10,
                      paddingLeft: 42,
                      background: "#f8fafc",
                    }}
                  />
                </div>

                {errors.email && (
                  <div className="text-danger small mt-1">
                    {errors.email[0]}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label
                  htmlFor="password"
                  className="form-label"
                  style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}
                >
                  Senha <span className="text-danger">*</span>
                </label>

                <div style={{ position: "relative" }}>
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />

                  <input
                    type={visible ? "text" : "password"}
                    id="password"
                    className={`form-control ${
                      errors.password ? "border-danger" : ""
                    }`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    style={{
                      height: 46,
                      borderRadius: 10,
                      paddingLeft: 42,
                      paddingRight: 42,
                      background: "#f8fafc",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setVisible((prev) => !prev)}
                    disabled={submitting}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "#64748b",
                    }}
                  >
                    {visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>

                {errors.password && (
                  <div className="text-danger small mt-1">
                    {errors.password[0]}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  height: 46,
                  border: "none",
                  borderRadius: 10,
                  background: submitting ? "#65a30d" : "#138a00",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: 15,
                  boxShadow: "0 10px 20px rgba(19, 138, 0, 0.16)",
                }}
              >
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="text-center mt-3">
              <Link
                to="/forgot-password"
                style={{
                  color: "#111827",
                  fontWeight: 600,
                  textDecoration: "underline",
                  fontSize: 14,
                }}
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>
        </div>

        <div
          className="d-none d-lg-flex align-items-center justify-content-center"
          style={{
            height: "100vh",
            background:
              "linear-gradient(135deg, #5cc947 0%, #1b8f08 48%, #137000 100%)",
            padding: "24px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.10)",
              right: -100,
              top: -100,
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              left: -70,
              bottom: 30,
            }}
          />

          <div style={{ width: "100%", maxWidth: 560, position: "relative" }}>
            <div
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: 16,
                boxShadow: "0 24px 55px rgba(15, 23, 42, 0.22)",
                marginBottom: 18,
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h5 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>
                    Dashboard
                  </h5>
                  <p className="text-muted small mb-0">
                    Operação da cooperativa
                  </p>
                </div>

                <span
                  style={{
                    background: "#138a00",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  KATUÁ
                </span>
              </div>

              <div className="row g-2 mb-2">
                {[
                  {
                    label: "Resíduos",
                    value: "352 KG",
                    icon: <Recycle size={15} />,
                  },
                  {
                    label: "Rotas",
                    value: "8",
                    icon: <Truck size={15} />,
                  },
                  {
                    label: "Solicitações",
                    value: "14",
                    icon: <Bell size={15} />,
                  },
                  {
                    label: "Operação",
                    value: "92%",
                    icon: <ShieldCheck size={15} />,
                  },
                ].map((item) => (
                  <div className="col-6 col-xl-3" key={item.label}>
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 13,
                        padding: 10,
                        minHeight: 74,
                      }}
                    >
                      <div style={{ color: "#138a00", marginBottom: 4 }}>
                        {item.icon}
                      </div>

                      <p
                        className="text-muted mb-1"
                        style={{ fontSize: 10, fontWeight: 700 }}
                      >
                        {item.label}
                      </p>

                      <strong style={{ fontSize: 14 }}>{item.value}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="row g-2">
                <div className="col-md-7">
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 15,
                      padding: 12,
                      height: "100%",
                    }}
                  >
                    <div className="d-flex justify-content-between mb-2">
                      <strong style={{ fontSize: 13 }}>
                        Coletas por mês
                      </strong>
                      <span className="text-muted small">2026</span>
                    </div>

                    <div
                      className="d-flex align-items-end gap-2"
                      style={{ height: 94 }}
                    >
                      {[32, 52, 70, 45, 86, 98, 80].map((height, index) => (
                        <div
                          key={index}
                          style={{
                            flex: 1,
                            height,
                            borderRadius: "8px 8px 0 0",
                            background:
                              index % 2 === 0 ? "#138a00" : "#6bd65a",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-md-5">
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 15,
                      padding: 12,
                      height: "100%",
                    }}
                  >
                    <div className="d-flex justify-content-between mb-2">
                      <strong style={{ fontSize: 13 }}>Distribuição</strong>
                      <BarChart3 size={16} color="#138a00" />
                    </div>

                    {[
                      ["Vidro", "42%"],
                      ["Plástico", "28%"],
                      ["Papel", "18%"],
                      ["Metal", "12%"],
                    ].map(([label, value]) => (
                      <div
                        className="d-flex justify-content-between align-items-center mb-2"
                        key={label}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <Leaf size={12} color="#138a00" />
                          <span className="small">{label}</span>
                        </div>
                        <strong className="small">{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <h2
              style={{
                color: "#ffffff",
                fontSize: 28,
                fontWeight: 900,
                textAlign: "center",
                lineHeight: 1.12,
                textShadow: "0 10px 26px rgba(0,0,0,0.18)",
                marginBottom: 8,
              }}
            >
              A forma mais inteligente de gerenciar operações de coleta
            </h2>

            <p
              style={{
                color: "rgba(255,255,255,0.86)",
                fontSize: 14,
                textAlign: "center",
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              Controle solicitações, rotas, motoristas, catadores, geradores e
              indicadores ambientais em um só painel.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;