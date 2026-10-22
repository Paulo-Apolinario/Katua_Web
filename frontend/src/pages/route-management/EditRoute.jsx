import { useParams } from "react-router";
import RoutePlanner from "../../components/routes/RoutePlanner";
export default function EditRoute() { const { id } = useParams(); return <RoutePlanner key={id} id={id} />; }
