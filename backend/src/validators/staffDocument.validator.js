const { z } = require('zod');

// Store Staff Document Schema
const storeStaffDocumentSchema = z.object({
  staff_id: z
    .string()
    .min(1, { message: 'Staff is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Staff ID must be a valid positive number',
    }),

  document_type: z
    .enum(['passport', 'license', 'certificate', 'id_card', 'other'], {
      required_error: 'Document type is required',
      invalid_type_error: 'Document type must be passport, license, certificate, id_card, or other',
    }),
  
  document_number: z
    .string()
    .min(1, { message: 'Document number is required' })
    .max(191, { message: 'Document number must not exceed 191 characters' }),

  issue_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === '') return null;
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Issue date must be a valid date');
      }
      return date.toISOString().split('T')[0];
    }),

  expiry_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === '') return null;
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Expiry date must be a valid date');
      }
    
      return date.toISOString().split('T')[0];
    }),
    
  file: z
    .string({ required_error: 'File is required' })
    .min(1, 'File is required'),

  notes: z 
    .string()
    .max(1000, { message: 'Notes must not exceed 1000 characters' })
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

// Update Staff Document Schema
const updateStaffDocumentSchema = z.object({
  staff_id: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
      message: 'Staff ID must be a valid positive number',
    })
    .optional(),

  document_type: z
    .enum(['passport', 'license', 'certificate', 'id_card', 'other'], {
      invalid_type_error: 'Document type must be passport, license, certificate, id_card, or other',
    })
    .optional(),

  document_number: z
    .string()
    .max(191, { message: 'Document number must not exceed 191 characters' })
    .optional(),

  issue_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === '') return null;
      
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Issue date must be a valid date');
      }
      
      return date.toISOString().split('T')[0];
    }),

  expiry_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === '') return null;
      
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Expiry date must be a valid date');
      }
      
      return date.toISOString().split('T')[0];
    }),

  file: z
    .string()
    .optional(),

  notes: z
    .string()
    .max(1000, { message: 'Notes must not exceed 1000 characters' })
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

module.exports = {
  storeStaffDocumentSchema,
  updateStaffDocumentSchema
};
