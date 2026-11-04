import { createContext, useContext } from "react";
export const AgentsContext = createContext(null);
export const useAgents = () => useContext(AgentsContext);
