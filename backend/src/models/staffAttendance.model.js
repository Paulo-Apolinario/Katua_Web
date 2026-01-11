const { mysqlTable, bigint, date, varchar, mysqlEnum, time, timestamp } = require('drizzle-orm/mysql-core');
const { staff } = require('../models/staff.model');
const { routes } = require('../models/route.model');

const staffAttendances = mysqlTable('staff_attendances', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  staff_id: bigint('staff_id', { mode: 'number' }).notNull()
    .references(() => staff.id, { onDelete: 'cascade' }),
  route_id: bigint('route_id', { mode: 'number' })
    .references(() => routes.id, { onDelete: 'set null' }),
  attendance_date: date('attendance_date').notNull(),
  role: varchar('role', { length: 191 }),
  attendance_status: mysqlEnum('attendance_status', ['present', 'absent', 'leave']).notNull().default('present'),
  leave_type: mysqlEnum('leave_type', ['sick', 'casual', 'other']),
  check_in_time: time('check_in_time'),
  check_out_time: time('check_out_time'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});


module.exports = { staffAttendances };

