import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FaUsers, FaUpload, FaEdit, FaTrash, FaCheck, FaTimes, FaChartBar, FaPlus } from 'react-icons/fa'
import { AiOutlineProduct } from 'react-icons/ai'
import { getProducts } from '../store/thunks/getProductsThunk'
import { deleteProductThunk } from '../store/thunks/deleteProductThunk'
import { createProductThunk } from '../store/thunks/createProductThunk'
import { updateProductThunk } from '../store/thunks/updateProductThunk'
import { createProductValidate } from '../validations/createProductValidate'
import { selectSortedProducts, selectProductsLoading } from '../store/slices/productSlice'
import { toastSuccess, toastError } from '../lib/toastHelper'
import api from '../api/api'
import {
  translateProductName,
  translateProductColor,
  translateProductCategory,
  translateAudience,
  translateCategorySlug,
  buildCategoryLabels,
  PRODUCT_LANGS,
} from '../utils/productTranslator'

const ITEMS_PER_PAGE = 8

function AdminDashboard() {
  const { t } = useTranslation()
  const products = useSelector(selectSortedProducts)
  const loading = useSelector(selectProductsLoading)
  const dispatch = useDispatch()
  const formRef = useRef(null)

  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null)
  const [deleteModalProduct, setDeleteModalProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [selectedTableCategory, setSelectedTableCategory] = useState('all')
  const [usersCount, setUsersCount] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const emptyI18n = () =>
    PRODUCT_LANGS.reduce((acc, lang) => {
      acc[lang] = { name: '', color: '', category: '', description: '' }
      return acc
    }, {})

  const initialFormState = {
    price: '',
    category: '',
    size: 'S,M,L,XL',
    sizesStock: { S: 5, M: 10, L: 8, XL: 2 },
    image: '',
    images: [],
    stock: '25',
    forWho: 'Barchaga',
    i18n: emptyI18n(),
  }

  const [form, setForm] = useState(initialFormState)
  const [formLang, setFormLang] = useState('uz')
  const [errors, setErrors] = useState({})
  const [customSizeInput, setCustomSizeInput] = useState('')
  const [imageUrlInput, setImageUrlInput] = useState('')

  // per-language text fields live under form.i18n[lang]
  const handleI18nChange = (lang, field, value) => {
    setForm((f) => ({
      ...f,
      i18n: { ...f.i18n, [lang]: { ...f.i18n?.[lang], [field]: value } },
    }))
    const errorKey = `${field}_${lang}`
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: null }))
    }
  }

  const langField = (lang, field) => form.i18n?.[lang]?.[field] ?? ''

  // a language tab is incomplete when any required field is still empty
  const isLangIncomplete = (lang) =>
    ['name', 'color', 'category'].some((field) => !String(langField(lang, field)).trim())

  const handleApplyPreset = (presetType) => {
    let presetObj = {}
    if (presetType === 'clothes') {
      presetObj = { XXS: 3, XS: 5, S: 10, M: 15, L: 12, XL: 8, XXL: 4, XXXL: 2, '4XL': 0 }
    } else if (presetType === 'shoes') {
      presetObj = { '36': 4, '37': 6, '38': 10, '39': 12, '40': 15, '41': 12, '42': 8, '43': 5, '44': 3, '45': 0 }
    }
    const total = Object.values(presetObj).reduce((sum, v) => sum + Number(v || 0), 0)
    setForm((f) => ({
      ...f,
      sizesStock: presetObj,
      stock: String(total),
      size: Object.keys(presetObj).join(','),
    }))
  }

  const handleSizeStockChange = (sizeKey, val) => {
    const qty = Math.max(0, parseInt(val, 10) || 0)
    const updated = { ...(form.sizesStock || {}), [sizeKey]: qty }
    const total = Object.values(updated).reduce((sum, v) => sum + Number(v || 0), 0)
    setForm((f) => ({
      ...f,
      sizesStock: updated,
      stock: String(total),
      size: Object.keys(updated).join(','),
    }))
  }

  const handleRemoveSizeKey = (sizeKey) => {
    const updated = { ...(form.sizesStock || {}) }
    delete updated[sizeKey]
    const total = Object.values(updated).reduce((sum, v) => sum + Number(v || 0), 0)
    setForm((f) => ({
      ...f,
      sizesStock: updated,
      stock: String(total),
      size: Object.keys(updated).join(','),
    }))
  }

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim()
    if (!trimmed) return
    const updated = { ...(form.sizesStock || {}), [trimmed]: 5 }
    const total = Object.values(updated).reduce((sum, v) => sum + Number(v || 0), 0)
    setForm((f) => ({
      ...f,
      sizesStock: updated,
      stock: String(total),
      size: Object.keys(updated).join(','),
    }))
    setCustomSizeInput('')
  }

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('nordwear_custom_categories')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [deletedCategories, setDeletedCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('nordwear_deleted_categories')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')

  const availableCategories = useMemo(() => {
    const existingFromProducts = products.map((p) => p.category).filter(Boolean)
    const defaults = ['sweater', 'trousers', 'polo', 'jacket', 'hoodie', 'futbolka', 'poyabzal', 'aksessuar']
    const all = Array.from(new Set([...defaults, ...existingFromProducts, ...customCategories]))
    return all.filter((c) => Boolean(c) && !deletedCategories.includes(c)).sort()
  }, [products, customCategories, deletedCategories])

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim()
    if (!trimmed) return

    if (deletedCategories.includes(trimmed)) {
      const updatedDel = deletedCategories.filter((c) => c !== trimmed)
      setDeletedCategories(updatedDel)
      localStorage.setItem('nordwear_deleted_categories', JSON.stringify(updatedDel))
    }

    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed]
      setCustomCategories(updated)
      localStorage.setItem('nordwear_custom_categories', JSON.stringify(updated))
    }
    setForm((f) => ({ ...f, category: trimmed }))
    setIsAddingNewCategory(false)
    setNewCategoryInput('')
    toastSuccess(t('admin.toast.categoryCreated', { name: trimmed }))
  }

  const handleDeleteCategory = (catToDelete) => {
    const updatedDeleted = Array.from(new Set([...deletedCategories, catToDelete]))
    setDeletedCategories(updatedDeleted)
    localStorage.setItem('nordwear_deleted_categories', JSON.stringify(updatedDeleted))

    if (customCategories.includes(catToDelete)) {
      const updatedCustom = customCategories.filter((c) => c !== catToDelete)
      setCustomCategories(updatedCustom)
      localStorage.setItem('nordwear_custom_categories', JSON.stringify(updatedCustom))
    }

    if (form.category === catToDelete) {
      setForm((f) => ({ ...f, category: '' }))
    }
    toastSuccess(t('admin.toast.categoryDeleted', { name: catToDelete }))
  }

  useEffect(() => {
    dispatch(getProducts())

    // /stats returns counts only — the old /users call shipped every account
    // (including password hashes) to the browser just to show a number
    const fetchUsers = async () => {
      try {
        const response = await api.get('/stats')
        setUsersCount(Number(response.data?.usersCount) || 0)
      } catch (error) {
        console.warn('Stats fetch failed:', error)
        setUsersCount(0)
      }
    }

    fetchUsers()
  }, [dispatch])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        (product.name || '').toLowerCase().includes(normalizedSearch) ||
        (product.category || '').toLowerCase().includes(normalizedSearch) ||
        (product.color || '').toLowerCase().includes(normalizedSearch)
      const matchesFilter = filterMode === 'all' ? true : Number(product.stock ?? 0) === 0
      const matchesCategory =
        selectedTableCategory === 'all' ? true : (product.category || '') === selectedTableCategory

      return matchesSearch && matchesFilter && matchesCategory
    })
  }, [products, searchTerm, filterMode, selectedTableCategory])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteProductThunk(id)).unwrap()
      if (editingId === id) {
        cancelEdit()
      }
      toastSuccess(t('toast.productDeleted'))
    } catch (err) {
      console.error('Delete failed', err)
      toastError(t('toast.errorDeleting', { error: t(typeof err === 'string' ? err : 'toast.genericError') }))
    }
  }

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }))
    }
  }

  const MAX_IMAGES = 5

  const compressImageFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDimension = 800

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75)
          resolve(compressedDataUrl)
        }
        img.onerror = () => resolve(e.target.result)
        img.src = e.target.result
      }
      reader.onerror = () => resolve('/logo.png')
      reader.readAsDataURL(file)
    })
  }

  const handleMultiFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if ((form.images || []).length >= MAX_IMAGES) {
      toastError(t('admin.toast.maxImages', { max: MAX_IMAGES }))
      return
    }

    const availableSlots = MAX_IMAGES - (form.images || []).length
    const filesToProcess = files.slice(0, availableSlots)

    for (const file of filesToProcess) {
      const compressedUrl = await compressImageFile(file)
      const finalUrl = compressedUrl.startsWith('data:image')
        ? compressedUrl
        : compressedUrl

      setForm((prevForm) => {
        const existing = prevForm.images || []
        if (existing.length >= MAX_IMAGES) return prevForm
        const nextImages = [...existing, finalUrl]
        return {
          ...prevForm,
          images: nextImages,
          image: nextImages[0] || '',
        }
      })
    }
  }

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim()
    if (!trimmed) return
    if ((form.images || []).length >= MAX_IMAGES) {
      toastError(t('admin.toast.maxImages', { max: MAX_IMAGES }))
      return
    }

    setForm((f) => {
      const nextImages = [...(f.images || []), trimmed]
      return {
        ...f,
        images: nextImages,
        image: nextImages[0] || '',
      }
    })
    setImageUrlInput('')
  }

  const handleRemoveImageIndex = (indexToRemove) => {
    setForm((f) => {
      const nextImages = (f.images || []).filter((_, idx) => idx !== indexToRemove)
      return {
        ...f,
        images: nextImages,
        image: nextImages[0] || '',
      }
    })
  }

  const handleMoveImage = (index, direction) => {
    setForm((f) => {
      const currentImages = [...(f.images || [])]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= currentImages.length) return f

      const temp = currentImages[index]
      currentImages[index] = currentImages[targetIndex]
      currentImages[targetIndex] = temp

      return {
        ...f,
        images: currentImages,
        image: currentImages[0] || '',
      }
    })
  }

  const startEdit = (product) => {
    setEditingId(product.id)
    let sizesStockObj = product.sizesStock
    if (!sizesStockObj || Object.keys(sizesStockObj).length === 0) {
      const arr = Array.isArray(product.size) ? product.size : (product.size || '').split(',')
      sizesStockObj = {}
      const fallbackQty = Math.max(1, Math.floor((product.stock || 10) / (arr.length || 1)))
      arr.forEach((s) => {
        const cleanName = typeof s === 'string' ? s.replace(/^!/, '').trim() : String(s)
        if (cleanName) sizesStockObj[cleanName] = fallbackQty
      })
    }
    const total = Object.values(sizesStockObj).reduce((sum, v) => sum + Number(v || 0), 0)

    const imgList = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image ? [product.image] : []

    // products created before per-language fields only have flat values:
    // seed every tab from them so nothing is lost on save
    const categoryLabels = buildCategoryLabels(products)
    const nextI18n = PRODUCT_LANGS.reduce((acc, lang) => {
      const saved = product.i18n?.[lang] || {}
      acc[lang] = {
        name: saved.name || product.name || '',
        color: saved.color || product.color || '',
        category: saved.category || translateCategorySlug(product.category, categoryLabels) || product.category || '',
        description: saved.description || product.description || '',
      }
      return acc
    }, {})

    setForm({
      price: product.price !== undefined && product.price !== null ? String(product.price) : '',
      category: product.category || '',
      size: Object.keys(sizesStockObj).join(','),
      sizesStock: sizesStockObj,
      image: imgList[0] || '',
      images: imgList,
      stock: String(total),
      forWho: product.forWho || product.gender || 'Barchaga',
      i18n: nextI18n,
    })
    setFormLang('uz')
    setErrors({})

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(initialFormState)
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = createProductValidate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) {
      // jump to the first language tab that still has an empty field
      const incomplete = PRODUCT_LANGS.find((lang) =>
        Object.keys(v).some((key) => key.endsWith(`_${lang}`)),
      )
      if (incomplete) setFormLang(incomplete)
      toastError(t('toast.checkFields'))
      return
    }

    const sizesStockObj = form.sizesStock || {}
    const sizeArray = Object.keys(sizesStockObj)
    const computedTotalStock = Object.values(sizesStockObj).reduce((sum, v) => sum + Number(v || 0), 0)

    const finalImages = (form.images && form.images.length > 0)
      ? form.images
      : (form.image ? [form.image] : ['/logo.png'])

    const i18nPayload = PRODUCT_LANGS.reduce((acc, lang) => {
      const entry = form.i18n?.[lang] || {}
      acc[lang] = {
        name: String(entry.name || '').trim(),
        color: String(entry.color || '').trim(),
        category: String(entry.category || '').trim(),
        description: String(entry.description || '').trim(),
      }
      return acc
    }, {})

    // flat fields mirror the Uzbek values: they stay the canonical values used
    // by legacy code paths, admin search and anything without translations
    const base = i18nPayload.uz

    const payload = {
      name: base.name,
      price: Number(form.price),
      category: form.category.trim(),
      color: base.color,
      description: base.description,
      i18n: i18nPayload,
      image: finalImages[0],
      images: finalImages,
      size: sizeArray.length > 0 ? sizeArray : ['M', 'L', 'XL'],
      sizesStock: sizesStockObj,
      stock: computedTotalStock,
      forWho: form.forWho || 'Barchaga',
    }

    if (editingId) {
      payload.id = String(editingId)
    }

    try {
      if (editingId) {
        await dispatch(updateProductThunk(payload)).unwrap()
        toastSuccess(t('toast.productUpdated'), { autoClose: 2200 })
      } else {
        await dispatch(createProductThunk(payload)).unwrap()
        toastSuccess(t('toast.productAdded'), { autoClose: 2200 })
      }
      setForm(initialFormState)
      setEditingId(null)
      setErrors({})
      dispatch(getProducts())
    } catch (err) {
      console.error('Submit product failed:', err)
      toastError(t('toast.errorSaving', { error: t(typeof err === 'string' ? err : 'toast.genericError') }))
    }
  }

  const stats = useMemo(() => {
    const totalCount = products.length
    const totalStock = products.reduce((acc, p) => acc + Number(p.stock || 0), 0)
    const outOfStockCount = products.filter((p) => Number(p.stock || 0) === 0).length
    const totalValue = products.reduce((acc, p) => acc + Number(p.price || 0) * Number(p.stock || 0), 0)
    return { totalCount, totalStock, outOfStockCount, totalValue }
  }, [products])

  return (
    <main className="admin-page">
      {/* Top Header Shell */}
      <section className="admin-summary-shell">
        <div className="admin-summary-main">
          <div className="admin-summary-badge">{t('admin.panelBadge')}</div>
          <h1 className="admin-summary-title">{t('admin.title')}</h1>
        </div>

        <div className="admin-summary-cards">
          <div className="admin-summary-card">
            <div className="admin-summary-card-icon">
              <FaUsers />
            </div>
            <div className="admin-summary-card-label">{t('admin.users')}</div>
            <div className="admin-summary-card-value">{usersCount}</div>
          </div>

          <div className="admin-summary-card">
            <div className="admin-summary-card-icon">
              <AiOutlineProduct />
            </div>
            <div className="admin-summary-card-label">{t('admin.products')}</div>
            <div className="admin-summary-card-value">{products.length}</div>
          </div>
        </div>
      </section>

      {/* Main Grid: Form Left, List/Table Right */}
      <section className="admin-products">
        <div className="admin-products-grid">
          {/* Left Panel: Form */}
          <div className="admin-card admin-form-card" ref={formRef}>
            <div className="admin-form-header">
              <div>
                <h3 className="admin-form-title">
                  {editingId ? t('admin.form.editTitle') : t('admin.form.addTitle')}
                </h3>
                <p className="admin-form-subtitle">
                  {t('admin.form.subtitle')}
                </p>
              </div>
              <div className="admin-form-header-action">
                {editingId ? (
                  <button type="button" className="admin-pill-badge-btn" onClick={cancelEdit}>
                    <FaTimes style={{ marginRight: 5 }} /> {t('admin.form.cancelEdit')}
                  </button>
                ) : (
                  <button type="button" className="admin-pill-badge-btn" onClick={cancelEdit}>
                    <FaPlus style={{ marginRight: 5 }} /> {t('admin.form.newBtn')}
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="admin-product-form">
              {/* Per-language text: the shop switches these with the UI language */}
              <div className="admin-lang-section">
                <div className="admin-lang-tabs-row">
                  <span className="admin-lang-tabs-hint">{t('admin.form.langHint')}</span>
                  <div className="admin-lang-tabs">
                    {PRODUCT_LANGS.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className={`admin-lang-tab ${formLang === lang ? 'active' : ''} ${isLangIncomplete(lang) ? 'incomplete' : 'filled'}`}
                        onClick={() => setFormLang(lang)}
                      >
                        {lang.toUpperCase()}
                        {isLangIncomplete(lang)
                          ? <span className="admin-lang-dot" aria-hidden="true">•</span>
                          : <FaCheck className="admin-lang-check" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label>{t('admin.form.name')} ({formLang.toUpperCase()})</label>
                  <input
                    type="text"
                    placeholder={t('admin.form.namePlaceholder')}
                    value={langField(formLang, 'name')}
                    onChange={(e) => handleI18nChange(formLang, 'name', e.target.value)}
                  />
                  {errors[`name_${formLang}`] && (
                    <div className="form-error">{t(errors[`name_${formLang}`])}</div>
                  )}
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label>{t('admin.form.color')} ({formLang.toUpperCase()})</label>
                    <input
                      type="text"
                      placeholder={t('admin.form.colorPlaceholder')}
                      value={langField(formLang, 'color')}
                      onChange={(e) => handleI18nChange(formLang, 'color', e.target.value)}
                    />
                    {errors[`color_${formLang}`] && (
                      <div className="form-error">{t(errors[`color_${formLang}`])}</div>
                    )}
                  </div>

                  <div className="form-field">
                    <label>{t('admin.form.categoryLabel')} ({formLang.toUpperCase()})</label>
                    <input
                      type="text"
                      placeholder={t('admin.form.categoryLabelPlaceholder')}
                      value={langField(formLang, 'category')}
                      onChange={(e) => handleI18nChange(formLang, 'category', e.target.value)}
                    />
                    {errors[`category_${formLang}`] && (
                      <div className="form-error">{t(errors[`category_${formLang}`])}</div>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <label>{t('admin.form.description')} ({formLang.toUpperCase()})</label>
                  <textarea
                    placeholder={t('admin.form.descriptionPlaceholder')}
                    value={langField(formLang, 'description')}
                    onChange={(e) => handleI18nChange(formLang, 'description', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>{t('admin.form.price')}</label>
                <input
                  type="number"
                  placeholder={t('admin.form.pricePlaceholder')}
                  value={form.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                />
                {errors.price && <div className="form-error">{t(errors.price)}</div>}
              </div>

              {/* Category & ForWho (2 Columns) */}
              <div className="form-row-2">
                <div className="form-field">
                  <div className="field-label-row">
                    <label>{t('admin.form.category')}</label>
                    <button
                      type="button"
                      className="btn-add-cat-inline"
                      onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                    >
                      {t('admin.form.newInlineCatBtn')}
                    </button>
                  </div>

                  {isAddingNewCategory ? (
                    <div className="inline-add-category-row">
                      <input
                        type="text"
                        placeholder={t('admin.form.categoryPlaceholder')}
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className="btn-save-cat" onClick={handleAddCategory} title={t('admin.actions.save')}>
                        <FaCheck />
                      </button>
                      <button
                        type="button"
                        className="btn-cancel-cat"
                        onClick={() => {
                          setIsAddingNewCategory(false)
                          setNewCategoryInput('')
                        }}
                        title={t('admin.actions.cancel')}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={form.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsAddingNewCategory(true)
                        } else {
                          handleChange('category', e.target.value)
                        }
                      }}
                    >
                      <option value="">{t('admin.form.selectCategoryPlaceholder')}</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {translateProductCategory(cat)}
                        </option>
                      ))}
                      <option value="__NEW__">{t('admin.form.createCategoryOption')}</option>
                    </select>
                  )}
                  {errors.category && <div className="form-error">{t(errors.category)}</div>}
                </div>

                <div className="form-field">
                  <label>{t('admin.form.forWho')}</label>
                  <select
                    value={form.forWho}
                    onChange={(e) => handleChange('forWho', e.target.value)}
                  >
                    <option value="Barchaga">{t('admin.form.forAll')}</option>
                    <option value="Erkaklar">{t('admin.form.forMen')}</option>
                    <option value="Ayollar">{t('admin.form.forWomen')}</option>
                    <option value="Bolalar">{t('admin.form.forKids')}</option>
                  </select>
                </div>
              </div>

              {/* Size & Stock Inventory Management Section */}
              <div className="admin-size-stock-section">
                <div className="size-section-header">
                  <label className="size-section-label">
                    {t('admin.form.sizeAndStockTitle', { count: form.stock || 0 })}
                  </label>
                  <div className="size-template-preset-btns">
                    <button
                      type="button"
                      className="btn-preset-template"
                      onClick={() => handleApplyPreset('clothes')}
                    >
                      {t('admin.form.clothesPreset')}
                    </button>
                    <button
                      type="button"
                      className="btn-preset-template"
                      onClick={() => handleApplyPreset('shoes')}
                    >
                      {t('admin.form.shoesPreset')}
                    </button>
                  </div>
                </div>

                {/* Per-Size Stock Grid */}
                <div className="size-stock-inputs-grid">
                  {Object.entries(form.sizesStock || {}).map(([sz, qty]) => (
                    <div key={sz} className="size-stock-item-box">
                      <div className="size-badge-title">{sz}</div>
                      <input
                        type="number"
                        min="0"
                        className="size-stock-qty-input"
                        value={qty}
                        onChange={(e) => handleSizeStockChange(sz, e.target.value)}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        className="btn-remove-size-item"
                        onClick={() => handleRemoveSizeKey(sz)}
                        title={t('admin.actions.removeSize', { size: sz })}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Custom Size Add Row */}
                <div className="add-custom-size-row">
                  <input
                    type="text"
                    placeholder={t('admin.form.addSizePlaceholder')}
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-add-custom-size"
                    onClick={handleAddCustomSize}
                  >
                    {t('admin.form.addSizeBtn')}
                  </button>
                </div>
              </div>

              {/* Multi-Image Upload & Management Section */}
              <div className="form-field admin-image-upload-section">
                <label className="section-title-label">
                  🖼 {t('admin.form.imageUploadTitle', { count: form.images?.length || 0, max: MAX_IMAGES })}
                </label>

                {/* Option 1: File Upload */}
                <div className="upload-option-block">
                  <span className="upload-option-hint">📁 {t('admin.form.fileUploadHint')}</span>
                  <label className={`file-upload-btn ${(form.images?.length || 0) >= MAX_IMAGES ? 'disabled' : ''}`}>
                    <FaUpload style={{ marginRight: 8 }} /> {t('admin.form.chooseFileBtn')}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={(form.images?.length || 0) >= MAX_IMAGES}
                      onChange={handleMultiFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Option 2: URL Link */}
                <div className="upload-option-block" style={{ marginTop: 10 }}>
                  <span className="upload-option-hint">🔗 {t('admin.form.imageUrlHint')}</span>
                  <div className="add-url-image-input-group">
                    <input
                      type="text"
                      className="url-image-input"
                      placeholder={t('admin.form.urlPlaceholder')}
                      value={imageUrlInput}
                      disabled={(form.images?.length || 0) >= MAX_IMAGES}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-add-url-img"
                      disabled={(form.images?.length || 0) >= MAX_IMAGES}
                      onClick={handleAddImageUrl}
                    >
                      {t('admin.form.addUrlBtn')}
                    </button>
                  </div>
                </div>

                {/* Thumbnails Gallery List with Reordering Controls (Move Left / Right) */}
                {form.images?.length > 0 && (
                  <div className="multi-image-preview-grid">
                    {form.images.map((imgUrl, idx) => (
                      <div key={idx} className="multi-image-preview-card">
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                        <span className="img-index-badge">{idx + 1}</span>

                        <div className="img-action-overlay">
                          {idx > 0 && (
                            <button
                              type="button"
                              className="btn-img-move"
                              onClick={() => handleMoveImage(idx, -1)}
                              title={t('admin.form.moveLeft')}
                            >
                              ‹
                            </button>
                          )}
                          {idx < form.images.length - 1 && (
                            <button
                              type="button"
                              className="btn-img-move"
                              onClick={() => handleMoveImage(idx, 1)}
                              title={t('admin.form.moveRight')}
                            >
                              ›
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-remove-thumb"
                            onClick={() => handleRemoveImageIndex(idx)}
                            title={t('admin.form.deletePhoto')}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.image && <div className="form-error">{t(errors.image)}</div>}
              </div>

              {/* Submit and Cancel buttons */}
              <div className="form-submit-actions">
                <button type="submit" className="btn-admin-submit">
                  {editingId ? (
                    <>
                      <FaEdit style={{ marginRight: 6 }} /> {t('admin.form.submitUpdate')}
                    </>
                  ) : (
                    <>
                      <FaPlus style={{ marginRight: 6 }} /> {t('admin.form.submitAdd')}
                    </>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    className="btn-admin-cancel"
                    onClick={cancelEdit}
                  >
                    {t('admin.form.cancelEdit')}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Panel: Product List & Table */}
          <div className="admin-card admin-table-card">
            <div className="admin-table-header">
              <div>
                <h2 className="admin-table-title">{t('admin.table.listTitle')}</h2>
                <p className="admin-table-subtitle">
                  {t('admin.table.listSubtitle')}
                </p>
              </div>
              <button
                type="button"
                className="admin-stats-toggle-btn"
                onClick={() => setShowStats(!showStats)}
              >
                <FaChartBar style={{ marginRight: 6 }} /> {t('admin.stats')}
              </button>
            </div>

            {/* Statistics Drawer/Card */}
            {showStats && (
              <div className="admin-stats-panel">
                <div className="stats-panel-item">
                  <span className="stats-label">{t('admin.statsPanel.totalProducts')}</span>
                  <span className="stats-val">{stats.totalCount} {t('admin.statsPanel.itemsUnit')}</span>
                </div>
                <div className="stats-panel-item">
                  <span className="stats-label">{t('admin.statsPanel.totalStockUnits')}</span>
                  <span className="stats-val">{stats.totalStock} {t('admin.statsPanel.itemsUnit')}</span>
                </div>
                <div className="stats-panel-item">
                  <span className="stats-label">{t('admin.statsPanel.outOfStockItems')}</span>
                  <span className="stats-val danger-text">{stats.outOfStockCount} {t('admin.statsPanel.itemsUnit')}</span>
                </div>
                <div className="stats-panel-item">
                  <span className="stats-label">{t('admin.statsPanel.totalStockValue')}</span>
                  <span className="stats-val">
                    {stats.totalValue.toLocaleString('uz-UZ')} {t('admin.statsPanel.currencyUnit')}
                  </span>
                </div>
              </div>
            )}

            {/* Toolbar: Search + Filter Pills */}
            <div className="admin-table-toolbar">
              <input
                type="text"
                className="admin-search-input"
                placeholder={t('admin.table.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />

              <div className="admin-filter-group">
                <button
                  type="button"
                  className={`admin-filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setFilterMode('all')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.filter.all')}
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${filterMode === 'soldout' ? 'active' : ''}`}
                  onClick={() => {
                    setFilterMode('soldout')
                    setCurrentPage(1)
                  }}
                >
                  {t('admin.filter.soldout')}
                </button>
              </div>
            </div>

            {/* Category Filter & Delete Strip on Right Panel */}
            <div className="admin-category-filter-strip">
              <span className="admin-category-strip-label">{t('admin.table.categoryManagement')}:</span>
              <div className="admin-category-pills">
                <span
                  className={`admin-cat-pill-wrapper ${selectedTableCategory === 'all' ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="admin-cat-pill-btn"
                    onClick={() => {
                      setSelectedTableCategory('all')
                      setCurrentPage(1)
                    }}
                  >
                    {t('admin.filter.all')} ({availableCategories.length})
                  </button>
                </span>

                {availableCategories.map((cat) => (
                  <span
                    key={cat}
                    className={`admin-cat-pill-wrapper ${selectedTableCategory === cat ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="admin-cat-pill-btn"
                      onClick={() => {
                        setSelectedTableCategory(cat)
                        setCurrentPage(1)
                      }}
                    >
                      {translateProductCategory(cat)}
                    </button>
                    <button
                      type="button"
                      className="admin-cat-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteCat(cat)
                      }}
                      title={t('admin.actions.deleteCategory', { name: cat })}
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {loading && <p className="admin-loading">{t('admin.table.loading')}</p>}

            {!loading && filteredProducts.length === 0 && (
              <div className="admin-empty-state">{t('admin.table.noProducts')}</div>
            )}

            {/* Desktop Table View (>= 768px) */}
            {!loading && filteredProducts.length > 0 && (
              <div className="admin-desktop-table">
                <div className="admin-table-wrapper">
                  <table className="admin-products-table">
                    <thead>
                      <tr>
                        <th>{t('admin.table.id')}</th>
                        <th>{t('admin.table.name')}</th>
                        <th>{t('admin.table.category')}</th>
                        <th>{t('admin.table.color')}</th>
                        <th>{t('admin.table.gender')}</th>
                        <th>{t('admin.table.price')}</th>
                        <th>{t('admin.table.stock')}</th>
                        <th>{t('admin.table.image')}</th>
                        <th style={{ textAlign: 'right' }}>{t('admin.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((p, idx) => (
                        <tr key={p.id} className={editingId === p.id ? 'row-editing' : ''}>
                          <td className="td-id" title={`ID: ${p.id}`}>
                            {((currentPage - 1) * ITEMS_PER_PAGE) + idx + 1}
                          </td>
                          <td className="td-name">
                            <strong>{translateProductName(p)}</strong>
                          </td>
                          <td className="td-muted">{translateProductCategory(p) || '—'}</td>
                          <td className="td-muted">{translateProductColor(p) || '—'}</td>
                          <td className="td-muted">{translateAudience(p.forWho || p.gender)}</td>
                          <td className="td-price">
                            <strong>
                              {Number(p.price || 0).toLocaleString('uz-UZ').replace(/,/g, ' ')} {t('admin.statsPanel.currencyUnit')}
                            </strong>
                          </td>
                          <td className="td-stock">
                            <div className="table-stock-total">
                              <strong>{p.stock ?? 0} {t('admin.statsPanel.itemsUnit')}</strong>
                            </div>
                            {p.sizesStock && Object.keys(p.sizesStock).length > 0 && (
                              <div className="table-sizes-breakdown">
                                {Object.entries(p.sizesStock).map(([sz, qty]) => (
                                  <span
                                    key={sz}
                                    className={`size-qty-chip ${qty === 0 ? 'out' : ''}`}
                                    title={qty === 0 ? t('admin.table.sizeSoldOut', { size: sz }) : t('admin.table.sizeQty', { size: sz, qty })}
                                  >
                                    {sz}: {qty}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="td-img">
                            <img
                              src={p.image || '/logo.png'}
                              alt={p.name}
                              className="table-thumb"
                            />
                          </td>
                          <td className="td-actions">
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="btn-table-edit"
                                onClick={() => startEdit(p)}
                              >
                                <FaEdit style={{ marginRight: 4 }} /> {t('admin.table.edit')}
                              </button>
                              <button
                                type="button"
                                className="btn-table-delete"
                                onClick={() => setDeleteModalProduct(p)}
                                title={t('admin.table.delete')}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mobile Cards View (< 768px, matching Screenshot 5!) */}
            {!loading && filteredProducts.length > 0 && (
              <div className="admin-mobile-cards">
                {paginatedProducts.map((p) => (
                  <div
                    key={p.id}
                    className={`admin-mobile-card ${editingId === p.id ? 'row-editing' : ''}`}
                  >
                    <div className="mobile-card-top">
                      <img
                        src={p.image || '/logo.png'}
                        alt={p.name}
                        className="mobile-card-thumb"
                      />
                      <div className="mobile-card-info">
                        <div className="mobile-card-title">{translateProductName(p)}</div>
                        <div className="mobile-card-meta">
                          {translateProductCategory(p) || '—'} · {translateProductColor(p) || '—'} · {translateAudience(p.forWho || p.gender)}
                        </div>
                        {p.sizesStock && Object.keys(p.sizesStock).length > 0 && (
                          <div className="mobile-card-sizes-breakdown">
                            {Object.entries(p.sizesStock).map(([sz, qty]) => (
                              <span
                                key={sz}
                                className={`size-qty-chip ${qty === 0 ? 'out' : ''}`}
                                title={qty === 0 ? t('admin.table.sizeSoldOut', { size: sz }) : t('admin.table.sizeQty', { size: sz, qty })}
                              >
                                {sz}: {qty}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="mobile-card-stock-badge">{p.stock ?? 0} {t('admin.statsPanel.itemsUnit')}</span>
                    </div>

                    <div className="mobile-card-bottom">
                      <div className="mobile-card-price">
                        {Number(p.price || 0).toLocaleString('uz-UZ').replace(/,/g, ' ')} {t('admin.statsPanel.currencyUnit')}
                      </div>
                      <div className="mobile-card-actions">
                        <button
                          type="button"
                          className="btn-table-edit"
                          onClick={() => startEdit(p)}
                        >
                          <FaEdit style={{ marginRight: 4 }} /> {t('admin.table.edit')}
                        </button>
                        <button
                          type="button"
                          className="btn-table-delete"
                          onClick={() => setDeleteModalProduct(p)}
                          title={t('admin.table.delete')}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Footer */}
            {!loading && filteredProducts.length > 0 && (
              <div className="admin-pagination-bar">
                <div className="pagination-info">
                  {t('admin.pagination.info', { current: currentPage, total: totalPages })}
                </div>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-pagination"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    {t('admin.pagination.prev')}
                  </button>
                  <button
                    type="button"
                    className="btn-pagination"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  >
                    {t('admin.pagination.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Confirmation Modal for Category Deletion */}
      {confirmDeleteCat && (
        <div className="admin-modal-overlay" onClick={() => setConfirmDeleteCat(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-icon warning">
              <FaTrash />
            </div>
            <h3 className="admin-modal-title">{t('admin.modal.deleteCategoryTitle')}</h3>
            <p className="admin-modal-text">
              {t('admin.modal.deleteCategoryText', { name: confirmDeleteCat })}
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setConfirmDeleteCat(null)}
              >
                {t('admin.actions.cancel')}
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={() => {
                  handleDeleteCategory(confirmDeleteCat)
                  if (selectedTableCategory === confirmDeleteCat) {
                    setSelectedTableCategory('all')
                  }
                  setConfirmDeleteCat(null)
                }}
              >
                {t('admin.actions.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Product Delete Confirmation Modal (Matching Screenshot 1!) */}
      {deleteModalProduct && createPortal(
        <div className="admin-confirm-modal-overlay" onClick={() => setDeleteModalProduct(null)}>
          <div className="admin-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-confirm-modal-icon-wrap">
              <FaTrash />
            </div>
            <h3>{t('admin.modal.deleteProductTitle')}</h3>
            <p>
              {t('admin.modal.deleteProductText', { name: translateProductName(deleteModalProduct) })}
            </p>
            <div className="admin-confirm-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDeleteModalProduct(null)}
              >
                {t('admin.actions.cancel')}
              </button>
              <button
                type="button"
                className="btn-modal-confirm-delete"
                onClick={async () => {
                  const targetId = deleteModalProduct.id
                  setDeleteModalProduct(null)
                  await handleDelete(targetId)
                }}
              >
                {t('admin.actions.confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  )
}

export default AdminDashboard
