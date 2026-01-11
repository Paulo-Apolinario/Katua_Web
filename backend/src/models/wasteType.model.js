const { mysqlTable, bigint, varchar, timestamp } = require('drizzle-orm/mysql-core');

const wasteTypes = mysqlTable('waste_types', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	name: varchar('name', { length: 191 }).notNull(),
	status: varchar('status', { length: 32 }).notNull().default('active'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { wasteTypes };


