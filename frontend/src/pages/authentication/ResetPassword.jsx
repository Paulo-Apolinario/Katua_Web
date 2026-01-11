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
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [visibleNew, setVisibleNew] = useState(false);
    const [visibleConfirm, setVisibleConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const location = useLocation();

     // Extract token and email from URL query parameters
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setToken(params.get("token") || "");
        setEmail(params.get("email") || "");
    }, [location]);

     // Handle form submission to reset password
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setLoading(true);

        try {
            const response = await resetPassword({
                token,
                email,
                password,
                password_confirmation: passwordConfirmation,
            });

            if (response.success) {
                toast.success('Password reset successfully!');
                navigate("/login");

            } else {
                toast.error(response.message || 'An error occurred. Please try again.');
                setErrors(response.errors || {});
            }

        } catch (err) {

            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Network error. Please check your connection.g');
            }
           
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthenticationLayout>
            <HeadTags title="Reset Password" />
            <div className="auth-form-container">
                <h1 className="form-heading">Set new password</h1>
                <p className="form-description">
                    Your new password must be different from your previous password
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email<span className="required-asterisk">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="Enter email"
                            value={email}
                            disabled="disabled"
                        />
                        {errors.email && (
                            <p className="text-danger text-sm mt-1">{errors.email[0]}</p>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            New Password<span className="required-asterisk">*</span>
                        </label>
                        <div className="password-input-container">
                            <input
                                type={visibleNew ? "text" : "password"}
                                id="password"
                                className="password-input form-input"
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <span
                                className="toggle-icon"
                                onClick={() => setVisibleNew(!visibleNew)}
                            >
                                {visibleNew ? <Eye /> : <EyeOff />}
                            </span>
                        </div>
                        {errors.password && (
                            <p className="text-danger text-sm mt-1">{errors.password[0]}</p>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="confirm-password">
                            Confirm Password<span className="required-asterisk">*</span>
                        </label>
                        <div className="password-input-container">
                            <input
                                type={visibleConfirm ? "text" : "password"}
                                id="confirm-password"
                                className="password-input form-input"
                                placeholder="Confirm Password"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                disabled={loading}
                            />
                            <span
                                className="toggle-icon"
                                onClick={() => setVisibleConfirm(!visibleConfirm)}
                            >
                                {visibleConfirm ? <Eye /> : <EyeOff />}
                            </span>
                        </div>
                        {errors.password_confirmation && (
                            <div className="text-danger text-sm mt-1">{errors.password_confirmation[0]}</div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                </form>
                <Link
                    to="/login"
                    className="back-link d-flex justify-content-center"
                >
                    Back to <b>Log In</b>
                </Link>
            </div>
        </AuthenticationLayout>
    );
};

export default ResetPassword;