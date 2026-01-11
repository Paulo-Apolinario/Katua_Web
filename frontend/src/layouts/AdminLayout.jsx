import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router';
import { getAllCompanySettings } from "../services/settingService";
import HeadTags from "../components/HeadTags";

const AdminLayout = () => {
    const [active, setActive] = useState(true);
    const [settings, setSettings] = useState({
        company_name: '',
        logo: null,
        fav_icon: null,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await getAllCompanySettings();
                setSettings(response.data);
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, []);

    return (
        <>
        <HeadTags />
        <Toaster position="top-center" reverseOrder={false} />
        <Sidebar active={active} setting={settings} setActive={setActive} />
        <Header active={active} setActive={setActive} />
        <main className="page-content mt-5">
            <div className="custom-container">
                <Outlet />
            </div>
        </main>
        </>
    )
}

export default AdminLayout;