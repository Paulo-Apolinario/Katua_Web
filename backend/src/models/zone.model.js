const { mysqlTable, bigint, varchar, text, timestamp } = require('drizzle-orm/mysql-core');
const { staff } = require('../models/staff.model');

const zones = mysqlTable('zones', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  name: varchar('name', { length: 191 }).notNull(),
  area_names: text('area_names'),
  staff_id: bigint('staff_id', { mode: 'number' })
    .references(() => staff.id, { onDelete: 'cascade' }),
  zone_type: varchar('zone_type', { length: 191 }),
  description: text('description'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { zones };