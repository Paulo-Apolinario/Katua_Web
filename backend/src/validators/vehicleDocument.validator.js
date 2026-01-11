const { z } = require('zod');

// Store Vehicle Document Schema
const storeVehicleDocumentSchema = z.object({
  vehicle_id: z
    .string({ required_error: 'Vehicle ID is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Vehicle ID must be a positive number' }),

  document_type: z
    .string({ required_error: 'Document type is required' })
    .min(1, 'Document type is required')
    .max(191, 'Document type must be less than 191 characters'),

  document_number: z
    .string({ required_error: 'Document number is required' })
    .min(1, 'Document number is required')
    .max(191, 'Document number must be less than 191 characters'),

  issue_date: z.string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'date must be in YYYY-MM-DD format',
    })
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Issue date must be a valid datetime',
    })
    .optional()
    .nullable(),

  expiry_date: z.string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Date must be in YYYY-MM-DD format',
    })
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Expiry date must be a valid datetime',
    })
    .optional()
    .nullable(),

  file: z
    .string({ required_error: 'File is required' })
    .min(1, 'File is required'),
});

// Update Vehicle Document Schema
const updateVehicleDocumentSchema = z.object({
  vehicle_id: z
    .string({ required_error: 'Vehicle ID is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Vehicle ID must be a positive number' })
    .optional(),

  document_type: z
    .string({ required_error: 'Document type is required' })
    .min(1, 'Document type is required')
    .max(191, 'Document type must be less than 191 characters')
    .optional(),

  document_number: z
    .string({ required_error: 'Document number is required' })
    .min(1, 'Document number is required')
    .max(191, 'Document number must be less than 191 characters')
    .optional(),

  issue_date: z.string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'date must be in YYYY-MM-DD format',
    })
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Issue date must be a valid datetime',
    })
    .optional()
    .nullable(),

  expiry_date: z.string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Date must be in YYYY-MM-DD format',
    })
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Expiry date must be a valid datetime',
    })
    .optional()
    .nullable(),

  file: z
    .string({ required_error: 'File is required' }).optional(),
});

module.exports = {
  storeVehicleDocumentSchema,
  updateVehicleDocumentSchema,
};


