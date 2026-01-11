const { mysqlTable, bigint, varchar, datetime, timestamp } = require('drizzle-orm/mysql-core');

const users = mysqlTable('users', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    name: varchar('name', { length: 191 }).notNull(),
    email: varchar('email', { length: 191 }).notNull().unique(),
    image: varchar('image', { length: 191 }),
    email_verified_at: datetime('email_verified_at'),
    password: varchar('password', { length: 255 }).notNull(),
    remember_token: varchar('remember_token', { length: 100 }),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { users };