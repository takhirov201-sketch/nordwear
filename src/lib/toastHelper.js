import { toast } from 'react-toastify'

const DEFAULT_OPTS = { autoClose: 1800, hideProgressBar: true }

export function toastSuccess(message, opts = {}) {
  toast.dismiss()
  toast.success(message, { ...DEFAULT_OPTS, ...opts })
}

export function toastInfo(message, opts = {}) {
  toast.dismiss()
  toast.info(message, { ...DEFAULT_OPTS, ...opts })
}

export function toastWarning(message, opts = {}) {
  toast.dismiss()
  toast.warning(message, { ...DEFAULT_OPTS, ...opts })
}

export function toastError(message, opts = {}) {
  toast.dismiss()
  toast.error(message, { ...DEFAULT_OPTS, ...opts })
}

export default {
  success: toastSuccess,
  info: toastInfo,
  warning: toastWarning,
  error: toastError,
}
