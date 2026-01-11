const { mysqlTable, bigint, mysqlEnum, varchar, date, text, timestamp } = require('drizzle-orm/mysql-core');
const { staff } = require('../models/staff.model');

const staffDocuments = mysqlTable('staff_documents', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  staff_id: bigint('staff_id', { mode: 'number' }).notNull().references(() => staff.id, { onDelete: 'cascade' }),
  document_type: mysqlEnum('document_type', ['passport', 'license', 'certificate', 'id_card', 'other']).notNull(),
  document_number: varchar('document_number', { length: 191 }),
  issue_date: date('issue_date'),
  expiry_date: date('expiry_date'),
  file: varchar('file', { length: 191 }).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { staffDocuments };

