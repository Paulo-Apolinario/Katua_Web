import { BrowserRouter, Routes, Route } from "react-router";

import { AdminAuthProvider } from "../context/AdminAuthContext";
import AdminPrivateRoute from "./AdminPrivateRoute";
import AdminLayout from "../layouts/AdminLayout";
import GuestOnlyRoute from "./GuestOnlyRoute";

// Dashboard
import Dashboard from "../pages/Dashboard";

// Waste Management
import WasteList from "../pages/waste-management/WasteList";
import AddWaste from "../pages/waste-management/AddWaste";
import EditWaste from "../pages/waste-management/EditWaste";

// Zone Management
import ZoneList from "../pages/zone-management/ZoneList";
import AddZone from "../pages/zone-management/AddZone";
import EditZone from "../pages/zone-management/EditZone";

// Vehicle Management
import VehicleList from "../pages/vehicle-management/VehicleList";
import AddVehicle from "../pages/vehicle-management/AddVehicle";
import EditVehicle from "../pages/vehicle-management/EditVehicle";
import DocumentList from "../pages/vehicle-management/DocumentList";
import AddDocument from "../pages/vehicle-management/AddDocument";
import EditDocument from "../pages/vehicle-management/EditDocument";
import MaintenanceLogList from "../pages/vehicle-management/MaintenanceLogList";
import AddMaintenanceLog from "../pages/vehicle-management/AddMaintenanceLog";
import EditMaintenanceLog from "../pages/vehicle-management/EditMaintenanceLog";

// Bin Management
import BinList from "../pages/bin-management/BinList";
import AddBin from "../pages/bin-management/AddBin";
import EditBin from "../pages/bin-management/EditBin";

// Route Management
import RouteList from "../pages/route-management/RouteList";
import AddRoute from "../pages/route-management/AddRoute";
import EditRoute from "../pages/route-management/EditRoute";

// Staff Management
import StaffList from "../pages/staff-management/StaffList";
import AddStaff from "../pages/staff-management/AddStaff";
import EditStaff from "../pages/staff-management/EditStaff";
import AssignRouteList from "../pages/staff-management/AssignRouteList";
import AddAssignRoute from "../pages/staff-management/AddAssignRoute";
import EditAssignRoute from "../pages/staff-management/EditAssignRoute";
import StaffAttendanceList from "../pages/staff-management/StaffAttendanceList";
import AddStaffAttendance from "../pages/staff-management/AddStaffAttendance";
import EditStaffAttendance from "../pages/staff-management/EditStaffAttendance";
import StaffDocumentList from "../pages/staff-management/StaffDocumentList";
import AddStaffDocument from "../pages/staff-management/AddStaffDocument";
import EditStaffDocument from "../pages/staff-management/EditStaffDocument";

// Waste Type Management
import WasteTypeList from "../pages/waste-type/WasteTypeList";
import AddWasteType from "../pages/waste-type/AddWasteType";
import EditWasteType from "../pages/waste-type/EditWasteType";

// Reports
import WasteCollectionReports from "../pages/reports/WasteCollectionReports";
import WasteTypeReports from "../pages/reports/WasteTypeReports";
import StaffReports from "../pages/reports/StaffReports";
import VehicleReports from "../pages/reports/VehicleReports";

// Settings
import SystemAlerts from "../pages/settings/SystemAlerts";
import CompanySetting from "../pages/settings/CompanySetting";
import SmtpConfig from "../pages/settings/SmtpConfig";

// Authentication
import Login from "../pages/authentication/Login";
import ForgotPassword from "../pages/authentication/ForgotPassword";
import ResetPassword from "../pages/authentication/ResetPassword";

// User Profile Setup
import ProfileSetup from "../pages/ProfileSetup";

const Router = () => {
    return (
            <AdminAuthProvider>
              <BrowserRouter>
                <Routes>
                    <Route path="/" element={<AdminPrivateRoute><AdminLayout /></AdminPrivateRoute>}>
                        {/* Dashboard */}
                        <Route path="" element={<Dashboard />} />

                        {/* Waste Management */}
                        <Route path="waste-list" element={<WasteList />} />
                        <Route path="create-waste" element={<AddWaste />} />
                        <Route path="edit-waste/:id" element={<EditWaste />} />
                       

                        {/* Zone Management */}
                        <Route path="zone-list" element={<ZoneList />} />
                        <Route path="create-zone" element={<AddZone />} />
                        <Route path="edit-zone/:id" element={<EditZone />} />

                        {/* Vehicle Management */}
                        <Route path="vehicle-list" element={<VehicleList />} />
                        <Route path="create-vehicle" element={<AddVehicle />} />
                         <Route path="edit-vehicle/:id" element={<EditVehicle />} />
                        <Route path="document-list" element={<DocumentList />} />
                        <Route path="create-document" element={<AddDocument />} />
                        <Route path="edit-document/:id" element={<EditDocument />} />
                        <Route path="maintenance-list" element={<MaintenanceLogList />} />
                        <Route path="create-maintenance" element={<AddMaintenanceLog />} />
                        <Route path="edit-maintenance/:id" element={<EditMaintenanceLog />} />

                        {/* Bin Management */}
                        <Route path="bin-list" element={<BinList />} />
                        <Route path="create-bin" element={<AddBin />} />
                        <Route path="edit-bin/:id" element={<EditBin />} />

                        {/* Route Management */}
                        <Route path="route-list" element={<RouteList />} />
                        <Route path="create-route" element={<AddRoute />} />
                        <Route path="edit-route/:id" element={<EditRoute />} />

                        {/* Staff Management */}
                        <Route path="staff-list" element={<StaffList />} />
                        <Route path="create-staff" element={<AddStaff />} />
                        <Route path="edit-staff/:id" element={<EditStaff />} />
                        <Route path="assign-list" element={<AssignRouteList />} />
                        <Route path="create-assign" element={<AddAssignRoute />} />
                        <Route path="edit-assign/:id" element={<EditAssignRoute />} />
                        <Route path="attendance-list" element={<StaffAttendanceList />} />
                        <Route path="create-attendance" element={<AddStaffAttendance />} />
                        <Route path="edit-attendance/:id" element={<EditStaffAttendance />} />
                        <Route path="staff-document-list" element={<StaffDocumentList />} />
                        <Route path="create-staff-document" element={<AddStaffDocument />} />
                        <Route path="edit-staff-document/:id" element={<EditStaffDocument />} />

                        {/* Waste Type Management */}
                        <Route path="waste-type-list" element={<WasteTypeList />} />
                        <Route path="create-type" element={<AddWasteType />} />
                        <Route path="edit-waste-type/:id" element={<EditWasteType />} />

                        {/* Reports */}
                        <Route path="waste-collection-reports" element={<WasteCollectionReports />} />
                        <Route path="waste-type-reports" element={<WasteTypeReports />} />
                        <Route path="staff-reports" element={<StaffReports />} />
                        <Route path="vehicle-reports" element={<VehicleReports />} />

                        {/* Settings */}
                        <Route path="settings" element={<CompanySetting />} />
                        <Route path="smtp-config" element={<SmtpConfig />} />
                        <Route path="system-alerts" element={<SystemAlerts />} />

                        {/* Profile Setup */}
                        <Route path="profile-setup" element={<ProfileSetup />} />
                    </Route>
                        {/* Authentication */}
                        <Route path="/login" element={<GuestOnlyRoute> <Login /> </GuestOnlyRoute>} />
                        <Route path="/forgot-password" element={<GuestOnlyRoute> <ForgotPassword /> </GuestOnlyRoute> } />
                        <Route path="/reset-password" element={<GuestOnlyRoute> <ResetPassword /> </GuestOnlyRoute> } />
                </Routes>
        </BrowserRouter>
            </AdminAuthProvider>
    );
};

export default Router;
