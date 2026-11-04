import AgentsProvider from "../components/agents/AgentsProvider";
import AgentChat from "../components/agents/AgentChat";
import { useAgents } from "../components/agents/agentsContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import PanelReadNotice from "../components/PanelReadNotice";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Outlet } from "react-router";
import HeadTags from "../components/HeadTags";
import { ManagementWorkspace } from "../components/management/ManagementWorkspace";

const AdminWorkspace = () => {
  const agents = useAgents();
  const [active, setActive] = useState(true);
  return (
    <div className={`katua-admin ${agents?.isOpen ? "agents-chat-open" : ""}`}>
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
      <AgentChat />
    </div>
  );
};

export default function AdminLayout(){
  const { admin, token } = useAdminAuth();
  return <AgentsProvider key={`${admin?.id}:${token}`} enabled={admin?.role === 'COOPERATIVE'}><AdminWorkspace /></AgentsProvider>;
}
