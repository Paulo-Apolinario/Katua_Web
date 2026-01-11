const { mysqlTable, bigint, varchar, timestamp } = require('drizzle-orm/mysql-core');

const menus = mysqlTable('menus', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	name: varchar('name', { length: 191 }).notNull(),
	path: varchar('path', { length: 191 }).notNull(),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { menus };


