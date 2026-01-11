const { mysqlTable, varchar, timestamp } = require('drizzle-orm/mysql-core');

const passwordResetTokens = mysqlTable('password_reset_tokens', {
	email: varchar('email', { length: 191 }).primaryKey(),
	token: varchar('token', { length: 255 }).notNull(),
	created_at: timestamp('created_at'),
});

module.exports = { passwordResetTokens };


