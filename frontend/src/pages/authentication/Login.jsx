import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import AuthenticationLayout from "../../layouts/AuthenticationLayout";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { login as loginService } from "../../services/authService";
import HeadTags from '../../components/HeadTags';

const Login = () => {
    const { login, admin, loading } = useAdminAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();


    // Redirect if already authenticated
    if (!loading && admin) {
        return <Navigate to="/" replace />;
    }

     // Handle form submission to authenticate user using Fetch
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        try {
            // Prepare data for API request
            const dataToSend = {
                email: email,
                password: password,
            };

            const response = await loginService(dataToSend);

            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            login(response.token);
            navigate('/');

        } catch (err) {
            if (err?.errors) {
                setErrors(err.errors);
            } else {
                toast.error(err?.message || 'Network error. Please check your connection.');
            }
        }
    };

    return (
        <AuthenticationLayout>
            <HeadTags title="Login" />
            <div className="auth-form-container">
                <h1 className="form-heading">Welcome back!</h1>
                <p className="form-description">
                    Please enter your credentials to log in!
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email<span className="required-asterisk">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            className={`form-input ${errors.email ? "border-red-500" : ""}`}
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                        {errors.email && (<div className="text-danger text-sm mt-1">{errors.email[0]}</div>)}
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password<span className="required-asterisk">*</span>
                        </label>
                        <div className="password-input-container">
                            <input
                                type={visible ? "text" : "password"}
                                id="password"
                                className={`password-input form-input ${errors.password ? "border-red-500" : ""}`}
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <span
                                className="toggle-icon"
                                onClick={() => setVisible(!visible)}
                            >
                                {visible ? <Eye /> : <EyeOff />}
                            </span>
                        </div>
                        {errors.password && (<div className="text-danger text-sm mt-1">{errors.password[0]}</div>)}
                    </div>
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Submit"}
                    </button>
                </form>
                <Link to='/forgot-password' className="back-link d-flex justify-content-center fw-500 text-dark fs-16 text-decoration-underline">
                    Forgot Password
                </Link>
            </div>
        </AuthenticationLayout>
    );
};

export default Login;