const { mysqlTable, bigint, date, varchar, decimal, text, mysqlEnum,timestamp } = require('drizzle-orm/mysql-core');
const { vehicles } = require('../models/vehicle.model');
const { staff } = require('../models/staff.model');
const { wasteTypes } = require('../models/wasteType.model');
const { bins } = require('../models/bin.model');
const { zones } = require('../models/zone.model');

const wastes = mysqlTable('wastes', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	collected_date: date('collected_date').notNull(),
	time_slot: varchar('time_slot', { length: 191 }),
	quantity: decimal('quantity', { precision: 8, scale: 2 }).notNull(),
	special_instructions: text('special_instructions'),
	status: mysqlEnum('status', ['pending', 'collected', 'cancelled']).notNull().default('pending'),
	zone_id: bigint('zone_id', { mode: 'number' })
		.references(() => zones.id, { onDelete: 'set null' }),
	vehicle_id: bigint('vehicle_id', { mode: 'number' })
		.references(() => vehicles.id, { onDelete: 'set null' }),
	staff_id: bigint('staff_id', { mode: 'number' })
		.references(() => staff.id, { onDelete: 'set null' }),
	waste_type_id: bigint('waste_type_id', { mode: 'number' }).notNull()
		.references(() => wasteTypes.id, { onDelete: 'cascade' }),
	bin_id: bigint('bin_id', { mode: 'number' })
		.references(() => bins.id, { onDelete: 'set null' }),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { wastes };

