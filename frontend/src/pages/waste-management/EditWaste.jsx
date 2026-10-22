import { Navigate, useParams } from "react-router";
export default function EditWaste() {
  const { id } = useParams();
  return (
    <Navigate
      to={id ? `/waste-list?coleta=${encodeURIComponent(id)}` : "/waste-list"}
      replace
    />
  );
}
