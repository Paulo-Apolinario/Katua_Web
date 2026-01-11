const { mysqlTable, bigint, varchar, text, mysqlEnum, date, timestamp } = require('drizzle-orm/mysql-core');
const { vehicles } = require('../models/vehicle.model');

const staff = mysqlTable('staff', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  vehicle_id: bigint('vehicle_id', { mode: 'number' })
    .references(() => vehicles.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 191 }).notNull(),
  email: varchar('email', { length: 191 }).unique(),
  phone: varchar('phone', { length: 64 }).notNull().unique(),
  gender: mysqlEnum('gender', ['male', 'female', 'other']).notNull(),
  date_of_birth: date('date_of_birth'),
  nid_or_passport: varchar('nid_or_passport', { length: 191 }),
  address: text('address'),
  file: varchar('file', { length: 191 }),
  role: mysqlEnum('role', ['manager', 'driver', 'collector', 'admin']).notNull(),
  joining_date: date('joining_date').notNull(),
  status: mysqlEnum('status', ['active', 'inactive', 'suspended']).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { staff };


