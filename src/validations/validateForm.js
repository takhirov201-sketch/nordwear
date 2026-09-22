export default function validateForm(form) {
  const errors = {}
  const digitsOnlyPhone = (form.phone || '').replace(/[\s-]/g, '')
  if (!form.fullName || !form.fullName.trim()) errors.fullName = 'checkout.validation.fullName'
  if (!digitsOnlyPhone || !digitsOnlyPhone.startsWith('+998') || digitsOnlyPhone.length !== 13) errors.phone = 'checkout.validation.phone'
  if (!form.city || !form.city.trim()) errors.city = 'checkout.validation.city'
  if (!form.address || !form.address.trim()) errors.address = 'checkout.validation.address'
  return errors
}
