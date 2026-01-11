const { mysqlTable, bigint, varchar, text, timestamp } =  require('drizzle-orm/mysql-core');

const systemAlerts = mysqlTable('system_alerts', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	type: varchar('type', { length: 191 }).notNull(),
	title: varchar('title', { length: 191 }).notNull(),
	message: text('message'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { systemAlerts };

