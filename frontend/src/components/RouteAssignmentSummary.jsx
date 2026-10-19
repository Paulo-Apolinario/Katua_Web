const RouteAssignmentSummary = ({ route }) => {
  const vehicle = [route?.vehicle?.brand, route?.vehicle?.model, route?.vehicle?.plate]
    .filter(Boolean).join(" • ");

  return (
    <div className="small mt-2" style={{ whiteSpace: "normal" }}>
      <div><strong>Motorista:</strong> {route?.driver?.name || "Não vinculado"}</div>
      <div><strong>Veículo:</strong> {vehicle || "Não vinculado"}</div>
    </div>
  );
};

export default RouteAssignmentSummary;
