export const handleImageChange = async (e, setForm) => {
    const file = e.target.files?.[0]
    if (!file) return

    const image = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    const width = Math.min(300, image.width)

    canvas.width = width
    canvas.height = (image.height * width) / image.width
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

    setForm(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.5) }))
}
