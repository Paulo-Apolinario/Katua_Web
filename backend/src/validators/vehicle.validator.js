const { z } = require('zod');

// Store Vehicle Schema
const storeVehicleSchema = z.object({
  vehicle_number: z
    .string()
    .min(1, 'Vehicle number is required')
    .max(255, 'Vehicle number must be less than 255 characters'),

  vehicle_type: z
    .string()
    .min(1, 'Vehicle type is required')
    .max(255, 'Vehicle type must be less than 255 characters'),

  model_brand: z.string().max(255, 'Model/Brand must be less than 255 characters').optional().nullable(),

  zone_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Zone ID must be a positive number',
    }),

  staff_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Staff ID must be a positive number',
    }),

  capacity_kg: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (Number.isInteger(val) && val >= 0), {
      message: 'Capacity must be a positive integer',
    }),

  fuel_type: z.string().max(255, 'Fuel type must be less than 255 characters').optional().nullable(),

  fuel_efficiency: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (val >= 0 && val <= 999999.99), {
      message: 'Fuel efficiency must be between 0 and 999999.99',
    }),

  status: z.enum(['active', 'inactive', 'maintenance'], {
    errorMap: () => ({ message: 'Status must be active, inactive, or maintenance' }),
  }),

});

// Update Vehicle Schema
const updateVehicleSchema = z.object({
  vehicle_number: z
    .string()
    .min(1, 'Vehicle number is required')
    .max(255, 'Vehicle number must be less than 255 characters')
    .optional(),

  vehicle_type: z
    .string()
    .min(1, 'Vehicle type is required')
    .max(255, 'Vehicle type must be less than 255 characters')
    .optional(),

  model_brand: z.string().max(255, 'Model/Brand must be less than 255 characters')
    .optional()
    .nullable(),

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

  capacity_kg: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (Number.isInteger(val) && val >= 0), {
      message: 'Capacity must be a positive integer',
    })
    .nullable()
    .optional(),

  fuel_type: z.string().max(255).optional().nullable(),

  fuel_efficiency: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (val >= 0 && val <= 999999.99), {
      message: 'Fuel efficiency must be between 0 and 999999.99',
    }),

  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

module.exports = {
  storeVehicleSchema,
  updateVehicleSchema,
};
