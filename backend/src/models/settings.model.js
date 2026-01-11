const { mysqlTable, bigint, varchar, timestamp } = require('drizzle-orm/mysql-core');

const settings = mysqlTable('settings', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	company_name: varchar('company_name', { length: 191 }).notNull(),
	fav_icon: varchar('fav_icon', { length: 191 }).notNull(),
	logo: varchar('logo', { length: 191 }).notNull(),
	copy_right: varchar('copy_right', { length: 191 }).notNull(),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { settings };


