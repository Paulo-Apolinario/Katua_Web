const { z } = require('zod');

// Store Staff Attendance Schema
const storeStaffAttendanceSchema = z.object({
  staff_id: z
    .string()
    .min(1, { message: 'Staff is required' })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Staff ID must be a valid positive number',
    }),

  route_id: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Route ID must be a valid positive number or empty',
    })
    .nullable()
    .optional(),

  attendance_date: z
    .string()
    .min(1, { message: 'Attendance date is required' })
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: 'Attendance date must be a valid date and not in the future' },
    )
    .transform((val) => new Date(val).toISOString()),

  role: z
    .string()
    .nullable()
    .optional(),

  attendance_status: z.enum(['present', 'absent', 'leave'], {
    required_error: 'Attendance status is required',
    invalid_type_error: 'Attendance status must be present, absent, or leave',
  }).default('present'),

  leave_type: z
    .enum(['sick', 'casual', 'other'], {
      invalid_type_error: 'Leave type must be sick, casual, or other',
    })
    .nullable()
    .optional(),

  check_in_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'Check-in time must be in HH:mm format (e.g., 22:46)',
    })

    .nullable()
    .optional()
    .transform((val, ctx) => {
      if (!val) return null;
      const date = ctx.parent?.attendance_date
        ? new Date(ctx.parent.attendance_date)
        : new Date();
      const [hours, minutes] = val.split(':');
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return date.toISOString();
    }),

  check_out_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'Check-out time must be in HH:mm format (e.g., 15:44)',
    })
    .nullable()
    .optional()
    .transform((val, ctx) => {
      if (!val) return null;
      const date = ctx.parent?.attendance_date
        ? new Date(ctx.parent.attendance_date)
        : new Date();
      const [hours, minutes] = val.split(':');
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return date.toISOString();
    }),
});

// Update Staff Attendance Schema
const updateStaffAttendanceSchema = z.object({
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
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === null || val === '' || val === undefined) return null;
      return Number(val);
    })
    .refine((val) => val === null || (!isNaN(val) && val > 0), {
      message: 'Route ID must be a valid number or empty',
    })
    .nullable()
    .optional(),

  attendance_date: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Attendance date must be a valid date',
    })
    .transform((val) => (val ? new Date(val).toISOString() : undefined))
    .optional(),

  role: z
    .string()
    .nullable()
    .optional(),

  attendance_status: z
    .enum(['present', 'absent', 'leave'], {
      invalid_type_error: 'Attendance status must be present, absent, or leave',
    })
    .optional(),

  leave_type: z
    .enum(['sick', 'casual', 'other'], {
      invalid_type_error: 'Leave type must be sick, casual, or other',
    })
    .nullable()
    .optional(),

  check_in_time: z
    .string()
    .nullable()
    .optional(),

  check_out_time: z
    .string()
    .nullable()
    .optional(),
});

module.exports = {
  storeStaffAttendanceSchema,
  updateStaffAttendanceSchema
};
