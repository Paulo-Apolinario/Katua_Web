import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { House, ChevronRight, Plus, EyeOff, Eye } from "lucide-react";
import toast from "react-hot-toast";

import default_img from "../../public/images/profile.png";
import HeadTags from "../components/HeadTags";
import TopProgressBar from "../components/TopProgressBar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getToken = () => {
  return (
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("@katu:token")
  );
};

const parseResponse = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    displayName: user.displayName || user.name || "",
    email: user.email || "",
    imageUrl:
      user.imageUrl ||
      user.avatarUrl ||
      user.profileImageUrl ||
      user.image ||
      "",
  };
};

const ProfileSetup = () => {
  const navigate = useNavigate();

  const [visibleCurrent, setVisibleCurrent] = useState(false);
  const [visibleNew, setVisibleNew] = useState(false);
  const [visibleConfirm, setVisibleConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    profileImage: null,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [userImage, setUserImage] = useState("");

  const [profileErrors, setProfileErrors] = useState({
    displayName: "",
    profileImage: "",
  });

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleUnauthorized = useCallback(() => {
    toast.error("Sessão expirada. Faça login novamente.");

    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
    localStorage.removeItem("@katu:token");
    localStorage.removeItem("user");
    localStorage.removeItem("@katu:user");

    navigate("/login");
  }, [navigate]);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponse(response);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Erro ao carregar perfil."
        );
      }

      const user = normalizeUser(data?.user || data);

      setFormData({
        displayName: user?.displayName || "",
        email: user?.email || "",
        profileImage: null,
      });

      setUserImage(user?.imageUrl || "");

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("@katu:user", JSON.stringify(user));
    } catch (error) {
      try {
        const localUser = normalizeUser(
          JSON.parse(
            localStorage.getItem("user") ||
              localStorage.getItem("@katu:user") ||
              "null"
          )
        );

        if (localUser) {
          setFormData({
            displayName: localUser.displayName || "",
            email: localUser.email || "",
            profileImage: null,
          });

          setUserImage(localUser.imageUrl || "");
        }
      } catch {
        // Mantém silencioso para não quebrar a tela caso o localStorage esteja inválido.
      }

      toast.error(error?.message || "Erro ao obter dados do perfil.");
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const previewSrc = useMemo(() => {
    if (imagePreview) return imagePreview;

    if (userImage) {
      if (String(userImage).startsWith("http")) return userImage;

      return `${API_BASE_URL}${String(userImage).startsWith("/") ? "" : "/"}${userImage}`;
    }

    return default_img;
  }, [imagePreview, userImage]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setProfileErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPasswordErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setProfileErrors((prev) => ({
        ...prev,
        profileImage: "Envie uma imagem nos formatos JPG, PNG ou WEBP.",
      }));
      return;
    }

    const maxSizeMb = 3;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setProfileErrors((prev) => ({
        ...prev,
        profileImage: `A imagem deve ter no máximo ${maxSizeMb}MB.`,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      profileImage: file,
    }));

    setProfileErrors((prev) => ({
      ...prev,
      profileImage: "",
    }));

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      setImagePreview(readerEvent.target.result);
    };

    reader.readAsDataURL(file);
  };

  const validateProfile = () => {
    const errors = {
      displayName: "",
      profileImage: "",
    };

    const displayName = formData.displayName.trim();

    if (!displayName) {
      errors.displayName = "Informe o nome completo.";
    } else if (displayName.length < 3) {
      errors.displayName = "O nome precisa ter pelo menos 3 caracteres.";
    }

    setProfileErrors(errors);

    return !errors.displayName && !errors.profileImage;
  };

  const validatePassword = () => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Informe a senha atual.";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "Informe a nova senha.";
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = "A nova senha precisa ter pelo menos 6 caracteres.";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Confirme a nova senha.";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "As senhas não conferem.";
    }

    setPasswordErrors(errors);

    return (
      !errors.currentPassword &&
      !errors.newPassword &&
      !errors.confirmPassword
    );
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (!validateProfile()) return;

    setSavingProfile(true);

    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const form = new FormData();
      form.append("displayName", formData.displayName.trim());

      if (formData.profileImage) {
        form.append("profileImage", formData.profileImage);
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = await parseResponse(response);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          setProfileErrors({
            displayName:
              data?.errors?.displayName?.[0] ||
              data?.errors?.name?.[0] ||
              "",
            profileImage:
              data?.errors?.profileImage?.[0] ||
              data?.errors?.image?.[0] ||
              "",
          });
        }

        throw new Error(
          data?.error || data?.message || "Erro ao atualizar perfil."
        );
      }

      const updatedUser = normalizeUser(data?.user || data);

      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("@katu:user", JSON.stringify(updatedUser));

      setFormData((prev) => ({
        ...prev,
        displayName: updatedUser?.displayName || prev.displayName,
        email: updatedUser?.email || prev.email,
        profileImage: null,
      }));

      setUserImage(updatedUser?.imageUrl || "");
      setImagePreview("");

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      toast.error(error?.message || "Erro ao atualizar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!validatePassword()) return;

    setSavingPassword(true);

    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await parseResponse(response);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          setPasswordErrors({
            currentPassword:
              data?.errors?.currentPassword?.[0] ||
              data?.errors?.current_password?.[0] ||
              "",
            newPassword:
              data?.errors?.newPassword?.[0] ||
              data?.errors?.password?.[0] ||
              "",
            confirmPassword:
              data?.errors?.confirmPassword?.[0] ||
              data?.errors?.password_confirmation?.[0] ||
              "",
          });
        }

        throw new Error(
          data?.error || data?.message || "Erro ao alterar senha."
        );
      }

      toast.success("Senha alterada com sucesso!");

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error?.message || "Erro ao alterar senha.");
    } finally {
      setSavingPassword(false);
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
                  <li className="breadcrumb-item">
                    <Link to="/" className="d-flex align-items-center gap-8">
                      <House />
                      Painel
                    </Link>
                  </li>
                  <li className="breadcrumb-item">
                    <ChevronRight />
                  </li>
                  <li className="breadcrumb-item active">
                    Configuração de perfil
                  </li>
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
                  <img
                    src={previewSrc}
                    alt="Imagem de perfil"
                    className="wh-80 rounded-circle"
                    style={{
                      objectFit: "cover",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                </div>

                <div>
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                    disabled={savingProfile}
                  />

                  <label htmlFor="imageUpload" className="btn-md outline-btn">
                    <Plus />
                    Carregar imagem
                  </label>

                  <p className="text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                    Formatos aceitos: JPG, PNG ou WEBP até 3MB.
                  </p>

                  {profileErrors.profileImage && (
                    <p className="text-danger text-sm mt-1">
                      {profileErrors.profileImage}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="displayName" className="form-label">
                  Nome completo <span className="text-danger">*</span>
                </label>

                <input
                  type="text"
                  className={`form-control ${
                    profileErrors.displayName ? "border-red-500" : ""
                  }`}
                  id="displayName"
                  name="displayName"
                  placeholder="Digite seu nome completo"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={savingProfile || loading}
                />

                {profileErrors.displayName && (
                  <p className="text-danger text-sm mt-1">
                    {profileErrors.displayName}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="form-label">
                  Email de cadastro
                </label>

                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  readOnly
                />

                <p className="text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                  O email permanece o mesmo utilizado no cadastro e não pode ser
                  alterado por esta tela.
                </p>
              </div>

              <div className="d-flex gap-20">
                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={savingProfile || loading}
                >
                  {savingProfile ? "Salvando..." : "Salvar perfil"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-10 col-xl-8">
          <div className="card p-25">
            <h3 className="fw-600 fs-18 mb-4">Alterar senha</h3>

            <form className="form" onSubmit={handlePasswordSubmit}>
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="currentPassword">
                  Senha atual <span className="text-danger">*</span>
                </label>

                <div className="password-input-container">
                  <input
                    type={visibleCurrent ? "text" : "password"}
                    className={`password-input form-control ${
                      passwordErrors.currentPassword ? "border-red-500" : ""
                    }`}
                    id="currentPassword"
                    name="currentPassword"
                    placeholder="Digite sua senha atual"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    disabled={savingPassword || loading}
                  />

                  <span
                    className="toggle-icon"
                    onClick={() => setVisibleCurrent((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                  >
                    {visibleCurrent ? <Eye /> : <EyeOff />}
                  </span>
                </div>

                {passwordErrors.currentPassword && (
                  <p className="text-danger text-sm mt-1">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="newPassword">
                  Nova senha <span className="text-danger">*</span>
                </label>

                <div className="password-input-container">
                  <input
                    type={visibleNew ? "text" : "password"}
                    className={`password-input form-control ${
                      passwordErrors.newPassword ? "border-red-500" : ""
                    }`}
                    id="newPassword"
                    name="newPassword"
                    placeholder="Digite a nova senha"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    disabled={savingPassword || loading}
                  />

                  <span
                    className="toggle-icon"
                    onClick={() => setVisibleNew((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                  >
                    {visibleNew ? <Eye /> : <EyeOff />}
                  </span>
                </div>

                {passwordErrors.newPassword && (
                  <p className="text-danger text-sm mt-1">
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div className="form-group mb-4">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirmar nova senha <span className="text-danger">*</span>
                </label>

                <div className="password-input-container">
                  <input
                    type={visibleConfirm ? "text" : "password"}
                    className={`password-input form-control ${
                      passwordErrors.confirmPassword ? "border-red-500" : ""
                    }`}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirme a nova senha"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    disabled={savingPassword || loading}
                  />

                  <span
                    className="toggle-icon"
                    onClick={() => setVisibleConfirm((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                  >
                    {visibleConfirm ? <Eye /> : <EyeOff />}
                  </span>
                </div>

                {passwordErrors.confirmPassword && (
                  <p className="text-danger text-sm mt-1">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="d-flex gap-20">
                <button
                  type="submit"
                  className="btn-md primary-btn border-0"
                  disabled={savingPassword || loading}
                >
                  {savingPassword ? "Alterando..." : "Alterar senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSetup;