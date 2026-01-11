import dashboard_img from '../../public/images/dashboard.jpg';
import { Toaster } from 'react-hot-toast';
import HeadTags from "../components/HeadTags";

const AuthenticationLayout = ({ children }) => {
    return (
        <>
        <HeadTags />
        <Toaster position="top-center" reverseOrder={false} />
            <div className="auth-container">
                <div className="left-section flex-column">
                    {children}
                </div>
                <div className="right-section">
                    <img src={dashboard_img} alt="Dashboard" />
                    <div className="marketing-content">
                        <h1 className="main-heading">The smartest way to manage waste operations</h1>
                    </div>
                </div>
            </div>
        </>
    )
}

export default AuthenticationLayout;