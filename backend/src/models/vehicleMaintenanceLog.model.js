const { mysqlTable, bigint, date, varchar, decimal, text, timestamp } = require('drizzle-orm/mysql-core');
const { vehicles } = require('../models/vehicle.model');

const vehicleMaintenanceLogs = mysqlTable('vehicle_maintenance_logs', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	vehicle_id: bigint('vehicle_id', { mode: 'number' }).notNull()
		.references(() => vehicles.id, { onDelete: 'cascade' }),
	maintenance_date: date('maintenance_date').notNull(),
	maintenance_type: varchar('maintenance_type', { length: 191 }).notNull(),
	cost: decimal('cost', { precision: 10, scale: 2 }),
	location: varchar('location', { length: 191 }),
	performed_by: varchar('performed_by', { length: 191 }),
	next_maintenance_date: date('next_maintenance_date'),
	file: varchar('file', { length: 191 }),
	notes: text('notes'),
	status: varchar('status', { length: 32 }).notNull().default('completed'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { vehicleMaintenanceLogs };


