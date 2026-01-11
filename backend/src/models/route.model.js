const { mysqlTable, bigint, varchar, decimal, text, timestamp } = require('drizzle-orm/mysql-core');
const { vehicles } = require('../models/vehicle.model');
const { staff } = require('../models/staff.model');
const { zones } =  require('../models/zone.model');

const routes = mysqlTable('routes', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 191 }).notNull(),
  zone_id: bigint('zone_id', { mode: 'number' }).notNull()
    .references(() => zones.id, { onDelete: 'cascade' }),
  vehicle_id: bigint('vehicle_id', { mode: 'number' })
    .references(() => vehicles.id, { onDelete: 'set null' }),
  staff_id: bigint('staff_id', { mode: 'number' })
    .references(() => staff.id, { onDelete: 'set null' }),
  start_location: varchar('start_location', { length: 191 }),
  end_location: varchar('end_location', { length: 191 }),
  waypoints: varchar('waypoints', { length: 191 }),
  estimated_distance: decimal('estimated_distance', { precision: 8, scale: 2 }),
  estimated_time: varchar('estimated_time', { length: 191 }),
  special_instructions: text('special_instructions'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { routes };