const { mysqlTable, bigint, varchar, int, decimal, timestamp } = require('drizzle-orm/mysql-core');

const vehicles = mysqlTable('vehicles', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	vehicle_number: varchar('vehicle_number', { length: 191 }).notNull(),
	vehicle_type: varchar('vehicle_type', { length: 191 }).notNull(),
	model_brand: varchar('model_brand', { length: 191 }),
	zone_id: bigint('zone_id', { mode: 'number' })
		.references(() => {
			// Late import to avoid circular dependency
			const { zones } = require('../models/zone.model');
			return zones.id;
		}, { onDelete: 'set null' }),
	staff_id: bigint('staff_id', { mode: 'number' })
		.references(() => {
			// Late import to avoid circular dependency
			const { staff } = require('../models/staff.model');
			return staff.id;
		}, { onDelete: 'set null' }),
	capacity_kg: int('capacity_kg'),
	fuel_type: varchar('fuel_type', { length: 191 }),
	fuel_efficiency: decimal('fuel_efficiency', { precision: 8, scale: 2 }),
	status: varchar('status', { length: 32 }).notNull().default('active'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { vehicles };