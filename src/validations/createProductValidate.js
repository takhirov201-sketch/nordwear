import { PRODUCT_LANGS } from '../utils/productTranslator'

// Returns translation keys, not text, so messages follow the selected language.
export function createProductValidate(form) {
	const errors = {}
	const i18nFields = form.i18n || {}

	for (const lang of PRODUCT_LANGS) {
		const entry = i18nFields[lang] || {}
		if (!entry.name || !String(entry.name).trim()) {
			errors[`name_${lang}`] = 'admin.validation.nameRequired'
		}
		if (!entry.color || !String(entry.color).trim()) {
			errors[`color_${lang}`] = 'admin.validation.colorRequired'
		}
		if (!entry.category || !String(entry.category).trim()) {
			errors[`category_${lang}`] = 'admin.validation.categoryLabelRequired'
		}
	}

	if (form.price === undefined || form.price === null || String(form.price).trim() === '' || Number(form.price) <= 0) {
		errors.price = 'admin.validation.price'
	}
	if (!form.category || !String(form.category).trim()) {
		errors.category = 'admin.validation.category'
	}
	if (!form.sizesStock || Object.keys(form.sizesStock).length === 0) {
		errors.size = 'admin.validation.size'
	}
	if (form.stock === undefined || form.stock === null || String(form.stock).trim() === '' || Number(form.stock) < 0) {
		errors.stock = 'admin.validation.stock'
	}

	return errors
}
