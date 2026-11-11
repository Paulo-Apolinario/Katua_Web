import AgentsProvider from "../components/agents/AgentsProvider";
import AgentChat from "../components/agents/AgentChat";
import { ASSISTANT_VISIBLE } from '../config/features';
import { useAdminAuth } from "../context/AdminAuthContext";
import PanelReadNotice from "../components/PanelReadNotice";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Outlet } from "react-router";
import HeadTags from "../components/HeadTags";
import { ManagementWorkspace } from "../components/management/ManagementWorkspace";

const AdminWorkspace = () => {
  const [active, setActive] = useState(true);
  return (
    <div className="katua-admin">
      <HeadTags />
      <Sidebar active={active} setActive={setActive} />
      <Header active={active} setActive={setActive} />
      <main className="page-content mt-5">
        <div className="custom-container">
          <ManagementWorkspace>
            <PanelReadNotice />
            <Outlet />
          </ManagementWorkspace>
        </div>
      </main>
      {ASSISTANT_VISIBLE && <AgentChat />}
    </div>
  );
};

export default function AdminLayout(){
  const { admin, token } = useAdminAuth();
  return <AgentsProvider key={`${admin?.id}:${token}`} enabled={ASSISTANT_VISIBLE && admin?.role === 'COOPERATIVE'}><AdminWorkspace /></AgentsProvider>;
}
