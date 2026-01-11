const { mysqlTable, bigint, varchar, date, timestamp } = require('drizzle-orm/mysql-core');
const { vehicles } = require('../models/vehicle.model');

const vehicleDocuments = mysqlTable('vehicle_documents', {
	id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
	vehicle_id: bigint('vehicle_id', { mode: 'number' }).notNull()
		.references(() => vehicles.id, { onDelete: 'cascade' }),
	document_type: varchar('document_type', { length: 191 }).notNull(),
	document_number: varchar('document_number', { length: 191 }),
	issue_date: date('issue_date'),
	expiry_date: date('expiry_date'),
	file: varchar('file', { length: 191 }).notNull(),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = { vehicleDocuments };

