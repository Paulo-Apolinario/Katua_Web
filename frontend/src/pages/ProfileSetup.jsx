import { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router";
import { House, ChevronRight, Plus, EyeOff, Eye } from "lucide-react";
import default_img from "../../public/images/profile.png";
import toast from 'react-hot-toast';
import HeadTags from '../components/HeadTags';
import TopProgressBar from '../components/TopProgressBar';

const ProfileSetup = () => {
    const [visibleNew, setVisibleNew] = useState(false);
    const [visibleConfirm, setVisibleConfirm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        profileImage: null,
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [userImage, setUserImage] = useState(null);
    const [profileErrors, setProfileErrors] = useState({ name: '', email: '' });
    const [passwordErrors, setPasswordErrors] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const navigate = useNavigate();

    /**
     * Initialize form with user data from localStorage
     */
    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user) {
                setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    profileImage: null,
                });
                setUserImage(user.image);
            }

        } catch (err) {
            toast.error(err || 'Erro ao obter dados');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
    * Handle input changes for profile form
    */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    /**
     * Handle input changes for password form
     */
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    /**
     * Handle profile image upload
     */
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData((prev) => ({
                ...prev,
                profileImage: file,
            }));
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    /**
      * Handle profile form submission
    */
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileErrors({ name: '', email: '' });

        const form = new FormData();
        form.append('name', formData.name);
        form.append('email', formData.email);

        if (formData.profileImage) {
            form.append('image', formData.profileImage);
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/profile/update`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                credentials: 'include',
                body: form,
            });

            const data = await response.json();

            if (!data.success) {
                if (response.status === 422) {
                    setProfileErrors({
                        name: data.errors?.name ? data.errors.name[0] : '',
                        email: data.errors?.email ? data.errors.email[0] : '',
                    });
                } else if (response.status === 401) {
                    toast.error('Unauthorized. Please log in again.');
                    navigate('/login');
                } else {
                    toast.error(data.message || 'Ocorreu um erro. Tente novamente.');
                }
                return;
            }

            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Perfil atualizado com sucesso!');

        } catch (error) {
            toast.error('Erro de rede. Verifique sua conexão.');
            console.error('Erro de atualização do perfil:', error);
        }
    };

    /**
     * Handle password form submission
     */
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordErrors({ current_password: '', password: '', password_confirmation: '' });
        setLoadingPassword(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/password/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                credentials: 'include',
                body: JSON.stringify(passwordData),
            });

            const data = await response.json();

            if (!data.success) {
                if (response.status === 422) {
                    setPasswordErrors({
                        current_password: data.errors?.current_password ? data.errors.current_password[0] : '',
                        password: data.errors?.password ? data.errors.password[0] : '',
                        password_confirmation: data.errors?.password_confirmation
                            ? data.errors.password_confirmation[0]
                            : '',
                    });
                } else if (response.status === 401) {
                    toast.error('Acesso não autorizado. Por favor, faça login novamente.');
                    navigate('/login');
                } else {
                    toast.error(data.message || 'Ocorreu um erro. Tente novamente.');
                }
                return;
            }

            toast.success('Senha atualizada com sucesso!');
            setPasswordData({ current_password: '', password: '', password_confirmation: '' });
        } catch (error) {
            toast.error('Erro de rede. Verifique sua conexão.');
            console.error('Erro ao atualizar senha:', error);
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <>
            <HeadTags title="Configuração de perfil" />
            <TopProgressBar loading={loading} />
            <div className="page-header mb-30 px-2">
                <div className="page-title mb-3">
                    <h3 className="fs-30">Configuração de perfil</h3>
                    <div className="page-tool d-flex justify-content-between flex-wrap gap-20 align-items-center">
                        <div className="breadcrumb-wrap">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb pb-0 mb-0">
                                    <li className="breadcrumb-item"><Link to="" className="d-flex align-items-center gap-8" ><House />Painel</Link></li>
                                    <li className="breadcrumb-item"><ChevronRight /></li>
                                    <li className="breadcrumb-item active">Configuração de perfil</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mb-5 gy-4">
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Informações pessoais</h3>
                        <form className="form" onSubmit={handleProfileSubmit}>
                            <div className="profile d-flex align-items-center gap-20 mb-4">
                                <div>
                                    {imagePreview ? (
                                        <img src={imagePreview} className="wh-80 rounded-circle" />
                                    ) : userImage ? (
                                        <img src={`${import.meta.env.VITE_API_BASE_URL}/uploads/profile/${userImage}`} className="wh-80 rounded-circle" />
                                    ) : (
                                        <img src={default_img} className="wh-80 rounded-circle" />
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        id="imageUpload"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="imageUpload" className="btn-md outline-btn" >
                                        <Plus /> Carregar imagem
                                    </label>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="name" className="form-label">
                                    Nome completo <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${profileErrors.name ? 'border-red-500' : ''}`}
                                    id="name"
                                    name="name"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                                {profileErrors.name && (
                                    <p className="text-danger text-sm mt-1">{profileErrors.name}</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="email" className="form-label">
                                    Email <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="email"
                                    className={`form-control ${profileErrors.email ? 'border-red-500' : ''}`}
                                    id="email"
                                    name="email"
                                    placeholder="Enter email address"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                                {profileErrors.email && (
                                    <p className="text-danger text-sm mt-1">{profileErrors.email}</p>
                                )}
                            </div>
                            <div className="d-flex gap-20">
                                <button className="btn-md primary-btn border-0">Enviar</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="col-lg-10 col-xl-8">
                    <div className="card p-25">
                        <h3 className="fw-600 fs-18 mb-4">Alterar a senha</h3>
                        <form className="form" onSubmit={handlePasswordSubmit}>
                            <div className="mb-4">
                                <label htmlFor="current_password" className="form-label">
                                    Senha atual <span className="text-danger">*</span>
                                </label>
                                <div className="password-input-container">
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="current_password"
                                        name="current_password"
                                        placeholder="Digite a senha atual"
                                        value={passwordData.current_password}
                                        onChange={handlePasswordChange}
                                        disabled={loadingPassword}
                                    />
                                </div>
                                {passwordErrors.current_password && (
                                    <p className="text-danger text-sm mt-1">{passwordErrors.current_password}</p>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="password">
                                    New Password<span className="text-danger">*</span>
                                </label>
                                <div className="password-input-container">
                                    <input
                                        type={visibleNew ? 'text' : 'password'}
                                        className={`password-input form-control ${passwordErrors.password ? 'border-red-500' : ''}`}
                                        id="password"
                                        name="password"
                                        placeholder="Digite a senha"
                                        value={passwordData.password}
                                        onChange={handlePasswordChange}
                                        disabled={loadingPassword}
                                    />
                                    <span
                                        className="toggle-icon"
                                        onClick={() => setVisibleNew(!visibleNew)}
                                    >
                                        {visibleNew ? <Eye /> : <EyeOff />}
                                    </span>
                                </div>
                                {passwordErrors.password && (
                                    <p className="text-danger text-sm mt-1">{passwordErrors.password}</p>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="password_confirmation">
                                    Confirmar Senha<span className="text-danger">*</span>
                                </label>
                                <div className="password-input-container">
                                    <input
                                        type={visibleConfirm ? 'text' : 'password'}
                                        className={`password-input form-control ${passwordErrors.password_confirmation ? 'border-red-500' : ''}`}
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        placeholder="Digite a confirmação da senha"
                                        value={passwordData.password_confirmation}
                                        onChange={handlePasswordChange}
                                        disabled={loadingPassword}
                                    />
                                    <span
                                        className="toggle-icon"
                                        onClick={() => setVisibleConfirm(!visibleConfirm)}
                                    >
                                        {visibleConfirm ? <Eye /> : <EyeOff />}
                                    </span>
                                </div>
                                {passwordErrors.password_confirmation && (
                                    <p className="text-danger text-sm mt-1">{passwordErrors.password_confirmation}</p>
                                )}
                            </div>
                            <div className="d-flex gap-20">
                                <button className="btn-md primary-btn border-0">Enviar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ProfileSetup;