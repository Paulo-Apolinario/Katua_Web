import { Search, Link as LucideLink } from "lucide-react";
import { useNavigate } from "react-router";
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const MenuSearch = () => {
    const [search, setSearch] = useState('');
    const [menuItems, setMenuItems] = useState([]);
    const navigate = useNavigate();

    const token = localStorage.getItem("auth_token");

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/menu-links?search=${search}`, {
                    headers: {
                        'Accept': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok){
                    toast.error('Failed to fetch menu');
                } 

                 const data = await response.json();
                 setMenuItems(data);

            } catch (error) {
                toast.error('Error:', error);
                console.error('Error:', error);
            }
        };

        fetchMenu();
    }, [search]);

    function redirect(url){
       navigate(url);
    }

    return (
        <>
            <div className="modal fade menu-search" id="staticBackdrop" data-bs-keyboard="false" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="d-flex align-items-center">
                                <Search />
                                <input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search menu..." />
                            </div>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body py-4">
                            {menuItems.map((item,key) => (
                                <div key={key} className="item px-4 d-flex align-items-center justify-content-between">
                                    <div className="left-content">
                                        <h5 className="fw-semibold">{item.name}</h5>
                                        <span>{item.path}</span>
                                    </div>
                                    <button type="button" className="redirect-btn"  onClick={() => redirect(item.path)}  data-bs-dismiss="modal">visit link <LucideLink /></button>
                                </div>
                            ))}
                            {menuItems.length === 0 && (
                                <h3 className="text-muted small px-2 text-center">No results found.</h3>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default MenuSearch;