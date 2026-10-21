import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Outlet } from "react-router";
import HeadTags from "../components/HeadTags";
import { ManagementWorkspace } from "../components/management/ManagementWorkspace";

const AdminLayout = () => {
  const [active, setActive] = useState(true);
  return (
    <>
      <HeadTags />
      <Sidebar active={active} setActive={setActive} />
      <Header active={active} setActive={setActive} />
      <main className="page-content mt-5">
        <div className="custom-container">
          <ManagementWorkspace>
            <Outlet />
          </ManagementWorkspace>
        </div>
      </main>
    </>
  );
};

export default AdminLayout;
