const { z } = require('zod');

const storeMaintenanceLogSchema = z.object({
  vehicle_id: z
    .string()
    .min(1, { message: 'Vehicle is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Vehicle ID must be a valid positive number',
    }),

  maintenance_date: z
    .string()
    .min(1, { message: 'Maintenance date is required' })
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: 'Maintenance date must be a valid date and not in the future' },
    ),

  maintenance_type: z
    .string()
    .min(1, { message: 'Maintenance type is required' })
    .max(191, { message: 'Maintenance type must not exceed 191 characters' }),
    
  cost: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val >= 0 && val <= 999999.99), {
      message: 'Cost must be a number between 0 and 999999.99',
    })
    .nullable()
    .optional(),

  location: z
    .string()
    .max(191, { message: 'Location must not exceed 191 characters' })
    .nullable()
    .optional(),

  performed_by: z
    .string()
    .max(191, { message: 'Performed by must not exceed 191 characters' })
    .nullable()
    .optional(),

  next_maintenance_date: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Next maintenance date must be a valid date',
    })
    .nullable()
    .optional(),

  file: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['completed', 'pending', 'scheduled','overdue'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be one of completed, pending, or scheduled',
  }).default('completed'),
});

const updateMaintenanceLogSchema = z.object({
  vehicle_id: z
    .string()
    .min(1, { message: 'Vehicle is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Vehicle ID must be a valid positive number',
    })
    .optional(),

  maintenance_date: z
    .string()
    .min(1, { message: 'Maintenance date is required' })
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: 'Maintenance date must be a valid date and not in the future' },
    )
    .optional(),

  maintenance_type: z
    .string()
    .min(1, { message: 'Maintenance type is required' })
    .max(191, { message: 'Maintenance type must not exceed 191 characters' })
    .optional(),
    
  cost: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val >= 0 && val <= 999999.99), {
      message: 'Cost must be a number between 0 and 999999.99',
    })
    .nullable()
    .optional(),

  location: z
    .string()
    .max(191, { message: 'Location must not exceed 191 characters' })
    .nullable()
    .optional(),

  performed_by: z
    .string()
    .max(191, { message: 'Performed by must not exceed 191 characters' })
    .nullable()
    .optional(),

  next_maintenance_date: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Next maintenance date must be a valid date',
    })
    .nullable()
    .optional(),

  file: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  
  status: z.enum(['completed', 'pending', 'scheduled','overdue'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be one of completed, pending, or scheduled',
  }).default('completed'),

});

module.exports = {
  storeMaintenanceLogSchema,
  updateMaintenanceLogSchema,
};
