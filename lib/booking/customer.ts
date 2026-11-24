// lib/booking/customer.ts
//
// Field-level validation for the public booking form, so each field can show
// its own message as the customer types instead of one error on submit.

export interface CustomerInput {
  name: string
  email: string
  phone: string
}

export type CustomerErrors = Partial<Record<keyof CustomerInput, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateCustomer(input: CustomerInput): CustomerErrors {
  const errors: CustomerErrors = {}
  if (input.name.trim().length < 2) errors.name = 'Enter your full name.'
  if (!EMAIL.test(input.email.trim())) errors.email = 'Enter a valid email, like name@example.com.'
  const digits = input.phone.replace(/\D/g, '')
  if (input.phone.trim() && (digits.length < 7 || digits.length > 15)) errors.phone = 'Enter a valid phone number.'
  return errors
}
