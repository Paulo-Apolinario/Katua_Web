const { z } = require('zod');

// Store Zone Schema
const storeZoneSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(191, { message: 'Name must not exceed 191 characters' }),

  area_names: z
    .string()
    .min(1, { message: 'Area names are required' })
    .max(500, { message: 'Area names must not exceed 500 characters' }),

  staff_id: z
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

  zone_type: z
    .string()
    .max(191, { message: 'Zone type must not exceed 191 characters' })
    .nullable()
    .optional(),

  description: z.string().nullable().optional(),

  status: z
    .enum(['active', 'inactive'], {
      required_error: 'Status is required',
      invalid_type_error: 'Status must be either active or inactive',
    })
    .default('active'),
});

// Update Zone Schema
const updateZoneSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(191, { message: 'Name must not exceed 191 characters' })
    .optional(),

  area_names: z
    .string()
    .min(1, { message: 'Area names are required' })
    .max(500, { message: 'Area names must not exceed 500 characters' })
    .optional(),

  staff_id: z
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

  zone_type: z
    .string()
    .max(191, { message: 'Zone type must not exceed 191 characters' })
    .nullable()
    .optional(),

  description: z.string().nullable().optional(),

  status: z
    .enum(['active', 'inactive'], {
      required_error: 'Status is required',
      invalid_type_error: 'Status must be either active or inactive',
    })
    .default('active'),
});

module.exports = {
  storeZoneSchema,
  updateZoneSchema,
};
