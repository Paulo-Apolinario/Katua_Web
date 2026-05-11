import { useState, useEffect } from "react";
import { Link } from "react-router";
import AuthenticationLayout from "../../layouts/AuthenticationLayout";
import toast from "react-hot-toast";
import { forgotPassword } from "../../services/authService";
import HeadTags from "../../components/HeadTags";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = () => {
    if (!email.trim()) {
      setError("Informe seu e-mail cadastrado.");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Informe um e-mail válido.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateEmail()) return;

    try {
      setLoading(true);

      const response = await forgotPassword({
        email: email.trim().toLowerCase(),
      });

      if (response?.success === false) {
        toast.error(
          response?.message || "Não foi possível enviar o e-mail de recuperação."
        );

        if (response?.errors?.email) {
          setError(Array.isArray(response.errors.email) ? response.errors.email[0] : response.errors.email);
        }

        return;
      }

      setShowEmailSent(true);
      setCountdown(6);

      toast.success(
        response?.message ||
          "Enviamos uma senha temporária e o link de redefinição para seu e-mail."
      );
    } catch (err) {
      if (err?.errors?.email) {
        setError(Array.isArray(err.errors.email) ? err.errors.email[0] : err.errors.email);
      } else {
        toast.error(
          err?.message ||
            "Erro ao solicitar recuperação de senha. Verifique sua conexão."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showEmailSent) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowEmailSent(false);
          return 6;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showEmailSent]);

  const handleBackToSignIn = () => {
    setShowEmailSent(false);
    setCountdown(6);
    setEmail("");
    setError("");
  };

  return (
    <AuthenticationLayout>
      <HeadTags title="Esqueci minha senha" />

      {showEmailSent && (
        <div className="email-notification">
          <div className="chat-icon">
            <svg width="35" height="35" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M35.1576 9.11876C35.1576 7.98563 35.4936 6.87796 36.1231 5.9358C36.7526 4.99365 37.6474 4.25932 38.6943 3.8257C39.7411 3.39207 40.8931 3.27861 42.0044 3.49967C43.1158 3.72074 44.1366 4.26639 44.9379 5.06762C45.7391 5.86886 46.2847 6.8897 46.5058 8.00105C46.7269 9.1124 46.6134 10.2643 46.1798 11.3112C45.7462 12.3581 45.0118 13.2529 44.0697 13.8824C43.1275 14.5119 42.0198 14.8479 40.8867 14.8479C39.3678 14.8463 37.9115 14.2421 36.8374 13.1681C35.7633 12.094 35.1592 10.6377 35.1576 9.11876ZM45.0534 19.8396V29.8688C45.0534 31.234 44.7845 32.5858 44.2621 33.8471C43.7396 35.1084 42.9739 36.2544 42.0085 37.2197C41.0432 38.1851 39.8971 38.9508 38.6359 39.4733C37.3746 39.9957 36.0228 40.2646 34.6576 40.2646H31.5117C31.189 40.2644 30.8706 40.3392 30.5818 40.4831C30.2929 40.627 30.0414 40.8361 29.8471 41.0938L26.7201 45.2438C26.4515 45.6631 26.0818 46.0082 25.6449 46.2472C25.208 46.4862 24.718 46.6114 24.2201 46.6114C23.7221 46.6114 23.2321 46.4862 22.7952 46.2472C22.3584 46.0082 21.9886 45.6631 21.7201 45.2438L18.5951 41.0979C18.3901 40.8512 18.1361 40.6497 17.8492 40.5063C17.5623 40.3629 17.2487 40.2805 16.9284 40.2646H13.8034C11.0407 40.2646 8.39119 39.1671 6.43769 37.2136C4.48419 35.2601 3.38672 32.6106 3.38672 29.8479V15.3688C3.38672 12.6061 4.48419 9.95657 6.43769 8.00306C8.39119 6.04956 11.0407 4.95209 13.8034 4.95209H30.1659C30.4737 4.95305 30.7775 5.02248 31.0552 5.15536C31.3328 5.28825 31.5775 5.48125 31.7713 5.72037C31.9652 5.9595 32.1034 6.23876 32.176 6.53792C32.2485 6.83708 32.2536 7.14864 32.1909 7.45001C31.9616 8.66145 31.9815 9.9069 32.2492 11.1104C32.6151 12.7333 33.4337 14.2191 34.6101 15.3954C35.7864 16.5717 37.2722 17.3904 38.8951 17.7563C40.0987 18.0233 41.3442 18.0424 42.5555 17.8125C42.857 17.7497 43.1688 17.7549 43.4681 17.8276C43.7674 17.9002 44.0467 18.0386 44.2859 18.2327C44.5251 18.4268 44.718 18.6717 44.8508 18.9496C44.9835 19.2276 45.0527 19.5316 45.0534 19.8396Z" fill="#34D39D" />
            </svg>
          </div>

          <div className="notification-content">
            <h5>E-mail de recuperação enviado!</h5>
            <p>
              Enviamos uma senha temporária e o link para redefinir sua senha.
              Verifique sua caixa de entrada e spam.
            </p>
          </div>

          <div
            className="countdown-progress"
            style={{ width: `${(countdown / 6) * 100}%` }}
          ></div>

          <div className="countdown-text">Fechando em {countdown}s</div>
        </div>
      )}

      <div className="auth-form-container">
        <h1 className="form-heading">Esqueci minha senha</h1>

        <p className="form-description">
          Informe seu e-mail cadastrado. Enviaremos uma senha temporária e um
          link seguro para você criar uma nova senha.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              E-mail<span className="required-asterisk">*</span>
            </label>

            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              disabled={loading}
            />

            {error && <div className="text-danger text-sm mt-1">{error}</div>}
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Enviando..." : "Enviar recuperação"}
          </button>
        </form>

        <Link
          to="/login"
          className="back-link d-flex justify-content-center"
          onClick={handleBackToSignIn}
        >
          Voltar para <b>Entrar</b>
        </Link>
      </div>
    </AuthenticationLayout>
  );
};

export default ForgotPassword;