import { useState, useEffect } from 'react';
import { PanelRight, LogOut, Settings, UserRoundPen } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAdminAuth } from "../context/AdminAuthContext";
import { toast } from "react-hot-toast";
import default_img from "../../public/images/profile.png";

const Header = ({ active, setActive }) => {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const [userImage, setUserImage] = useState(null);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user) {
      setUserImage(user.image);
      setUserName(user.name);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast.error("No active session found");
        logout();
        navigate("/login");
        return;
      }

      logout();

      localStorage.removeItem("user");
      localStorage.removeItem("auth_token");
      navigate("/login");

    } catch (error) {
      toast.error(`Logout failed: ${error.message}`);
      logout();
      navigate("/login");
    }
  };

  return (
    <header className="header">
      <ul className="nav align-items-center">
        <li className="nav-item">
          <button className="nav-link sidebar-btn" onClick={() => setActive(!active)}>
            <PanelRight />
          </button>
        </li>
        <li className="nav-item dropdown ms-auto">
          <a className="nav-link text-dark" data-bs-toggle="dropdown" href="#">

            <span>
              {userImage ? (
                <img
                  className="rounded-circle object-fit-cover profile-img"
                  width="35"
                  height="35"
                  src={`${import.meta.env.VITE_API_BASE_URL}/uploads/profile/${userImage}`}
                  alt="Profile"
                />
              ) : (
                 <img
                  className="rounded-circle object-fit-cover profile-img"
                  width="35"
                  height="35"
                  src={default_img}
                  alt="Profile"
                />
              )}

            </span>
            <span className="fs-15 fw-500 text-muted ms-2 d-none d-lg-inline-block">
              {userName}
            </span>
          </a>
          <ul className="dropdown-menu border-0 mt-2">
            <li>
              <Link
                to="/profile-setup"
                className="dropdown-item d-flex align-items-center gap-10"
              >
                <UserRoundPen size={20} />
                Profile Setup
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className="dropdown-item d-flex align-items-center gap-10"
              >
                <Settings size={20} />
                Setting
              </Link>
            </li>
            <li className="border-top pt-2 mt-2">
              <button
                className="dropdown-item d-flex align-items-center gap-10"
                onClick={handleLogout}
              >
                <LogOut size={20} />
                Log Out
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </header>
  );
};

export default Header;