const { mysqlTable, bigint, varchar, date, timestamp } = require('drizzle-orm/mysql-core');
const { vehicles } = require('../models/vehicle.model');
const { zones } = require('../models/zone.model');

const bins = mysqlTable('bins', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	bin_id: varchar('bin_id', { length: 191 }).notNull(),
	location: varchar('location', { length: 191 }).notNull(),
	zone_id: bigint('zone_id', { mode: 'number' }).notNull()
		.references(() => zones.id, { onDelete: 'cascade' }),
	vehicle_id: bigint('vehicle_id', { mode: 'number' })
		.references(() => vehicles.id, { onDelete: 'set null' }),
	status: varchar('status', { length: 32 }).notNull().default('active'),
	bin_type: varchar('bin_type', { length: 191 }),
	last_collection_date: date('last_collection_date'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { bins };


