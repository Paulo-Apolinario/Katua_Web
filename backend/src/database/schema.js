// Auth
const { users } = require("../models/user.model.js");
const { passwordResetTokens } = require("../models/passwordResetToken.model.js");

// Route
const { assignToRoutes } = require("../models/assignToRoute.model.js");
const { routes } = require("../models/route.model.js");
const { zones } = require("../models/zone.model.js");

// Settings
const { settings } = require("../models/settings.model.js");
const { systemAlerts } = require("../models/systemAlert.model.js");
const { smtpConfigs } = require("../models/smtpConfig.model.js");
const { menus } = require("../models/menu.model.js");

// Vehicle
const { vehicles } = require("../models/vehicle.model.js");
const { vehicleDocuments } = require("../models/vehicleDocument.model.js");
const { vehicleMaintenanceLogs } = require("../models/vehicleMaintenanceLog.model.js");

// Staff
const { staff } = require("../models/staff.model.js");
const { staffAttendances } = require("../models/staffAttendance.model.js");
const { staffDocuments } = require("../models/staffDocument.model.js");

// Waste
const { wasteTypes } = require("../models/wasteType.model.js");
const { bins } = require("../models/bin.model.js");
const { wastes } = require("../models/waste.model.js");

module.exports = {
  // Auth
  users,
  passwordResetTokens,

  // Route
  assignToRoutes,
  routes,
  zones,

  // Settings
  settings,
  systemAlerts,
  smtpConfigs,
  menus,

  // Vehicle
  vehicles,
  vehicleDocuments,
  vehicleMaintenanceLogs,

  // Staff
  staff,
  staffAttendances,
  staffDocuments,

  // Waste
  wasteTypes,
  bins,
  wastes,
};
