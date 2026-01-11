const { z } = require('zod');

// Login Schema
const loginSchema = z.object({
  email: z.string()
    .nonempty("The email field is required.")
    .email('The email must be a valid email address.'),
  password: z.string()
    .nonempty("The password field is required.")
    .min(8, 'The password must be at least 8 characters.')
});

// Forgot Password Schema
const forgotPasswordSchema = z.object({
  email: z.string().email('The email must be a valid email address.')
});

// Reset Password Schema
const resetPasswordSchema = z.object({
  token: z.string()
    .nonempty("The token field is required.")
    .min(1, 'The token field is required.'),
  email: z.string()
    .nonempty("The email field is required.")
    .email('The email must be a valid email address.'),
  password: z.string({
    required_error: "The password field is required."
  }).min(8, 'The password must be at least 8 characters.'),
  password_confirmation: z.string({
    required_error: "The password confirmation field is required."
  }).min(8, 'The password confirmation must be at least 8 characters.')
}).refine((data) => data.password === data.password_confirmation, {
  message: "The password confirmation does not match.",
  path: ["password_confirmation"]
});

// Update Profile Schema
const updateProfileSchema = z.object({
  name: z.string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  email: z.string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  image: z.string().optional().nullable(),
});

// Update Password Schema
const updatePasswordSchema = z.object({
  current_password: z.string({
    required_error: "The current password field is required."
  })
    .min(1, 'The current password field is required.'),
  password: z.string({
    required_error: "The password field is required."
  })
    .min(8, 'The password must be at least 8 characters.'),
  password_confirmation: z.string({
    required_error: "The password confirmation field is required."
  })
    .min(8, 'The password confirmation must be at least 8 characters.')
}).refine((data) => data.password === data.password_confirmation, {
  message: "The password confirmation does not match.",
  path: ["password_confirmation"]
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updatePasswordSchema
};