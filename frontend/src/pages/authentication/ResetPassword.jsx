import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import AuthenticationLayout from "../../layouts/AuthenticationLayout";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { resetPassword } from "../../services/authService";
import HeadTags from "../../components/HeadTags";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [visibleTemp, setVisibleTemp] = useState(false);
  const [visibleNew, setVisibleNew] = useState(false);
  const [visibleConfirm, setVisibleConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    setToken(params.get("token") || "");
    setEmail(params.get("email") || "");
  }, [location]);

  const getErrorMessage = (value) => {
    if (!value) return "";
    return Array.isArray(value) ? value[0] : value;
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!email) {
      nextErrors.email = ["E-mail não encontrado no link de recuperação."];
    }

    if (!token) {
      nextErrors.token = ["Token de recuperação não encontrado ou inválido."];
    }

    if (!temporaryPassword.trim()) {
      nextErrors.temporaryPassword = [
        "Informe a senha temporária recebida por e-mail.",
      ];
    }

    if (!password) {
      nextErrors.password = ["Informe a nova senha."];
    } else if (password.length < 6) {
      nextErrors.password = ["A nova senha deve ter pelo menos 6 caracteres."];
    }

    if (!passwordConfirmation) {
      nextErrors.passwordConfirmation = ["Confirme a nova senha."];
    } else if (password !== passwordConfirmation) {
      nextErrors.passwordConfirmation = ["As senhas não conferem."];
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Revise os campos obrigatórios.");
      return;
    }

    try {
      setErrors({});
      setLoading(true);

      const response = await resetPassword({
        email,
        token,
        temporaryPassword,
        temporary_password: temporaryPassword,

        newPassword: password,
        password,

        confirmPassword: passwordConfirmation,
        password_confirmation: passwordConfirmation,
      });

      if (response?.success === false) {
        toast.error(
          response?.message || "Não foi possível redefinir sua senha."
        );

        setErrors(response?.errors || {});
        return;
      }

      toast.success(
        response?.message ||
          "Senha redefinida com sucesso. Faça login novamente."
      );

      navigate("/login");
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors);
      }

      toast.error(
        err?.message ||
          "Erro ao redefinir senha. Verifique os dados e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticationLayout>
      <HeadTags title="Redefinir senha" />

      <div className="auth-form-container">
        <h1 className="form-heading">Redefinir senha</h1>

        <p className="form-description">
          Informe a senha temporária recebida por e-mail e cadastre uma nova
          senha de acesso ao sistema.
        </p>

        <form onSubmit={handleSubmit}>
          <input type="hidden" value={token} readOnly />

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              E-mail<span className="required-asterisk">*</span>
            </label>

            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="E-mail"
              value={email}
              disabled
            />

            {errors.email && (
              <p className="text-danger text-sm mt-1">
                {getErrorMessage(errors.email)}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="temporaryPassword">
              Senha temporária<span className="required-asterisk">*</span>
            </label>

            <div className="password-input-container">
              <input
                type={visibleTemp ? "text" : "password"}
                id="temporaryPassword"
                className="password-input form-input"
                placeholder="Digite a senha temporária recebida por e-mail"
                value={temporaryPassword}
                onChange={(e) => {
                  setTemporaryPassword(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    temporaryPassword: "",
                    temporary_password: "",
                    token: "",
                  }));
                }}
                disabled={loading}
              />

              <span
                className="toggle-icon"
                onClick={() => setVisibleTemp((prev) => !prev)}
              >
                {visibleTemp ? <Eye /> : <EyeOff />}
              </span>
            </div>

            {(errors.temporaryPassword || errors.temporary_password) && (
              <p className="text-danger text-sm mt-1">
                {getErrorMessage(
                  errors.temporaryPassword || errors.temporary_password
                )}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Nova senha<span className="required-asterisk">*</span>
            </label>

            <div className="password-input-container">
              <input
                type={visibleNew ? "text" : "password"}
                id="password"
                className="password-input form-input"
                placeholder="Digite a nova senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: "" }));
                }}
                disabled={loading}
              />

              <span
                className="toggle-icon"
                onClick={() => setVisibleNew((prev) => !prev)}
              >
                {visibleNew ? <Eye /> : <EyeOff />}
              </span>
            </div>

            {errors.password && (
              <p className="text-danger text-sm mt-1">
                {getErrorMessage(errors.password)}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Confirmar nova senha<span className="required-asterisk">*</span>
            </label>

            <div className="password-input-container">
              <input
                type={visibleConfirm ? "text" : "password"}
                id="confirm-password"
                className="password-input form-input"
                placeholder="Confirme a nova senha"
                value={passwordConfirmation}
                onChange={(e) => {
                  setPasswordConfirmation(e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    passwordConfirmation: "",
                    password_confirmation: "",
                  }));
                }}
                disabled={loading}
              />

              <span
                className="toggle-icon"
                onClick={() => setVisibleConfirm((prev) => !prev)}
              >
                {visibleConfirm ? <Eye /> : <EyeOff />}
              </span>
            </div>

            {(errors.passwordConfirmation || errors.password_confirmation) && (
              <div className="text-danger text-sm mt-1">
                {getErrorMessage(
                  errors.passwordConfirmation || errors.password_confirmation
                )}
              </div>
            )}
          </div>

          {errors.token && (
            <div className="text-danger text-sm mb-3">
              Link de recuperação inválido ou expirado. Solicite uma nova
              recuperação de senha.
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>

        <Link to="/login" className="back-link d-flex justify-content-center">
          Voltar para <b>Entrar</b>
        </Link>
      </div>
    </AuthenticationLayout>
  );
};

export default ResetPassword;