const { mysqlTable, bigint, varchar, date,timestamp } =  require('drizzle-orm/mysql-core');
const { staff } =  require('../models/staff.model');
const { routes } = require('../models/route.model');
const { vehicles } =  require('../models/vehicle.model');

const assignToRoutes = mysqlTable('assign_to_routes', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  staff_id: bigint('staff_id', { mode: 'number' }).notNull()
    .references(() => staff.id, { onDelete: 'cascade' }),
  route_id: bigint('route_id', { mode: 'number' }).notNull()
    .references(() => routes.id, { onDelete: 'cascade' }),
  vehicle_id: bigint('vehicle_id', { mode: 'number' })
    .references(() => vehicles.id, { onDelete: 'set null' }),
  role: varchar('role', { length: 191 }).notNull(),
  assignment_start_at: date('assignment_start_at').notNull(),
  shift: varchar('shift', { length: 191 }),
  status: varchar('status', { length: 64 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { assignToRoutes };
