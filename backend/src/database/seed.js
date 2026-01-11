require('dotenv').config()
const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { seed, reset } = require('drizzle-seed');
const bcrypt = require('bcryptjs');
const { users } = require('../models/user.model');
const { menus } = require('../models/menu.model');

async function seedUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME
  });

  const db = drizzle(connection);

  await reset(db, { users, menus });

  // Hash admin password
  const adminPassword = await bcrypt.hash('Admin@12345', 12);

  // Seed only 1 admin user
  await seed(db, { users, menus }).refine((f) => ({
    users: {
      count: 1,
      columns: {
        name: f.default({ defaultValue: 'Admin User' }),
        email: f.default({ defaultValue: 'admin@wasteflow.app' }),
        image: f.default({ defaultValue: null }),
        email_verified_at: f.default({ defaultValue: null }),
        password: f.default({ defaultValue: adminPassword }),
        remember_token: f.default({ defaultValue: null })
      }
    },
  }));

  // Seed menus from provided list
  const menuData = [
    { name: 'Dashboard', path: '/' },

    // Waste Management
    { name: 'Waste List', path: '/waste-list' },
    { name: 'Add Waste', path: '/create-waste' },
    { name: 'Calendar', path: '/calendar' },

    // Zone Management
    { name: 'Zone List', path: '/zone-list' },
    { name: 'Add Zone', path: '/create-zone' },

    // Vehicle Management
    { name: 'Vehicle List', path: '/vehicle-list' },
    { name: 'Add Vehicle', path: '/create-vehicle' },
    { name: 'Document List', path: '/document-list' },
    { name: 'Add Document', path: '/create-document' },
    { name: 'Maintenance List', path: '/maintenance-list' },
    { name: 'Add Maintenance', path: '/create-maintenance' },

    // Bin Management
    { name: 'Bin List', path: '/bin-list' },
    { name: 'Add Bin', path: '/create-bin' },

    // Route Management
    { name: 'Route List', path: '/route-list' },
    { name: 'Add Route', path: '/create-route' },

    // Staff Management
    { name: 'Staff List', path: '/staff-list' },
    { name: 'Add Staff', path: '/create-staff' },
    { name: 'Assign List', path: '/assign-list' },
    { name: 'Add Assign', path: '/create-assign' },
    { name: 'Attendance List', path: '/attendance-list' },
    { name: 'Add Attendance', path: '/create-attendance' },
    { name: 'Staff Document List', path: '/staff-document-list' },
    { name: 'Add Staff Document', path: '/create-staff-document' },

    // Waste Type Management
    { name: 'Waste Type List', path: '/waste-type-list' },
    { name: 'Add Waste Type', path: '/create-type' },

    // Reports
    { name: 'Waste Collection Reports', path: '/waste-collection-reports' },
    { name: 'Waste Type Reports', path: '/waste-type-reports' },
    { name: 'Staff Reports', path: '/staff-reports' },
    { name: 'Vehicle Reports', path: '/vehicle-reports' },

    // Settings
    { name: 'Settings', path: '/settings' },
    { name: 'SMTP Config', path: '/smtp-config' },
    { name: 'System Alerts', path: '/system-alerts' },

    // Profile Setup
    { name: 'Profile Setup', path: '/profile-setup' },
  ];

  await db.insert(menus).values(menuData);

  console.log('Admin user created successfully!');
  console.log('Admin: admin@wasteflow.app / Admin@12345');
  console.log('Menus seeded successfully!');
  
  await connection.end();
  process.exit(0);
}

seedUsers().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
