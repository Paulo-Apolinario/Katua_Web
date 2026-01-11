const { z } = require('zod');

// Assign to Route Schema
const storeAssignToRouteSchema = z.object({
  staff_id: z
    .string()
    .min(1, { message: 'Staff is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Staff ID must be a valid positive number',
    }),

  route_id: z
    .string()
    .min(1, { message: 'Route is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Route ID must be a valid positive number',
    }),

  vehicle_id: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Vehicle ID must be a valid positive number or empty',
    })
    .nullable()
    .optional(),

  role: z
    .string()
    .min(1, { message: 'Role is required' })
    .max(100, { message: 'Role must not exceed 100 characters' }),

  assignment_start_at: z.string()
    .min(1, { message: 'Attendance date is required' })
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Attendance date must be in YYYY-MM-DD format',
    })
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Attendance date must be a valid date',
    }),

  shift: z
    .string()
    .max(191, { message: 'Shift must not exceed 191 characters' })
    .nullable()
    .optional(),

  status: z
    .enum(['completed', 'pending', 'cancelled'], {
      required_error: 'Status is required',
      invalid_type_error: 'Status must be completed, pending, or cancelled',
    }),
});

// Update Assign to Route Schema
const updateAssignToRouteSchema = z.object({
    staff_id: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === '' || val === null || val === undefined || val === 'null') {
        throw new z.ZodError([{
          code: 'custom',
          message: 'Staff is required',
          path: ['staff_id']
        }]);
      }
      const num = Number(val);
      return isNaN(num) ? val : num;
    })
    .refine((val) => !isNaN(Number(val)), { message: 'Staff is required' })
    .refine((val) => Number(val) > 0, {
      message: 'Staff ID must be a valid positive number',
    })
    .transform((val) => Number(val))
    .optional(),

  route_id: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === '' || val === null || val === undefined || val === 'null') {
        throw new z.ZodError([{
          code: 'custom',
          message: 'Route is required',
          path: ['route_id']
        }]);
      }
      const num = Number(val);
      return isNaN(num) ? val : num;
    })
    .refine((val) => !isNaN(Number(val)), { message: 'Route is required' })
    .refine((val) => Number(val) > 0, {
      message: 'Route ID must be a valid positive number',
    })
    .transform((val) => Number(val))
    .optional(),
  
  vehicle_id: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === '' || val === null || val === undefined || val === 'null') {
        throw new z.ZodError([{
          code: 'custom',
          message: 'Vehicle is required',
          path: ['vehicle_id']
        }]);
      }
      const num = Number(val);
      return isNaN(num) ? val : num;
    })
    .refine((val) => !isNaN(Number(val)), { message: 'Vehicle is required' })
    .refine((val) => Number(val) > 0, {
      message: 'Vehicle ID must be a valid positive number',
    })
    .transform((val) => Number(val))
    .nullable()
    .optional(),

  role: z
    .string()
    .min(1, { message: 'Role is required' })
    .max(100, { message: 'Role must not exceed 100 characters' })
    .optional(),

  assignment_start_date: z
    .string()
    .min(1, { message: 'Assignment start date is required' })
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Assignment start date must be a valid date',
    })
    .transform((val) => {
      const date = new Date(val);
      return date.toISOString();
    })
    .optional(),

  shift: z
    .string()
    .max(191, { message: 'Shift must not exceed 191 characters' })
    .nullable()
    .optional(),

  status: z
    .enum(['completed', 'pending', 'cancelled'], {
      required_error: 'Status is required',
      invalid_type_error: 'Status must be completed, pending, or cancelled',
    })
    .optional(),
});

module.exports = {
  storeAssignToRouteSchema,
  updateAssignToRouteSchema
};

