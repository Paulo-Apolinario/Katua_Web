const { mysqlTable, bigint, varchar, timestamp } = require('drizzle-orm/mysql-core');

const smtpConfigs = mysqlTable('smtp_configs', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	mailer: varchar('mailer', { length: 191 }),
	host: varchar('host', { length: 191 }),
	port: varchar('port', { length: 191 }),
	username: varchar('username', { length: 191 }),
	password: varchar('password', { length: 191 }),
	mail_from_address: varchar('mail_from_address', { length: 191 }),
	mail_from_name: varchar('mail_from_name', { length: 191 }),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { smtpConfigs };


