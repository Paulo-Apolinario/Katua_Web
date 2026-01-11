const { z } = require('zod');

const wasteSchema = z.object({
  collected_date: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return '';
      return String(val);
    },
    z
      .string()
      .min(1, { message: 'Collected date is required' })
      .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
        message: 'Collected date must be in YYYY-MM-DD format',
      })
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, {
        message: 'Collection date must be a valid date',
      })
  ),

  time_slot: z
    .string()
    .max(50, { message: 'Time slot must not exceed 50 characters' })
    .transform((v) => (typeof v === 'string' ? v.trim() : v))
    .nullable()
    .optional(),

  quantity: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return '';
      return String(val); 
    },
    z
      .string()
      .min(1, { message: 'Quantity is required' })
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val), { message: 'Quantity must be a valid number' })
      .refine((val) => val >= 0, { message: 'Quantity must be at least 0' })
      .refine((val) => val <= 999999.99, {
        message: 'Quantity must not exceed 999999.99',
      })
  ),

  special_instructions: z
    .string()
    .max(1000, { message: 'Special instructions must not exceed 1000 characters' })
    .transform((v) => (typeof v === 'string' ? v.trim() : v))
    .nullable()
    .optional(),

  status: z.enum(['pending', 'collected', 'processed', 'cancelled'], {
    required_error: 'Status is required',
    invalid_type_error:
      'Status must be one of pending, collected, processed, cancelled',
  }),

  zone_id: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === null || val === '' || val === undefined) return null;
      return Number(val);
    })
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Zone ID must be a valid number or empty',
    })
    .nullable()
    .optional(),

  vehicle_id: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === null || val === '' || val === undefined) return null;
      return Number(val);
    })
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Vehicle ID must be a valid number or empty',
    })
    .nullable()
    .optional(),

  staff_id: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === null || val === '' || val === undefined) return null;
      return Number(val);
    })
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Staff ID must be a valid number or empty',
    })
    .nullable()
    .optional(),

  waste_type_id: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return '';
      return String(val); 
    },
    z
      .string()
      .min(1, { message: 'Waste type is required' })
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Waste type ID must be a valid positive number',
      })
  ),

  bin_id: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === null || val === '' || val === undefined) return null;
      return Number(val);
    })
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Bin ID must be a valid number or empty',
    })
    .nullable()
    .optional(),
});

module.exports = { wasteSchema };