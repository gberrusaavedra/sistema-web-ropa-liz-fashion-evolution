async function guardarPrendaConfeccion(e) {
    e.preventDefault();
    const { token } = getSession();
    const id = document.getElementById('confPrendaId').value;
    const modelo = document.getElementById('confModelo').value.trim();
    const precio = parseFloat(document.getElementById('confPrecio').value);
    const colores = document.getElementById('confColores').value.split(',').map(c => c.trim()).filter(Boolean);
    const tallas = document.getElementById('confTallas').value.split(',').map(t => t.trim()).filter(Boolean);

    const urlInput = document.getElementById('confImagenUrl');
    if (urlInput && urlInput.value.trim()) {
        const extraUrls = urlInput.value.split(',').map(u => u.trim()).filter(Boolean);
        tempConfeccionImagenes.push(...extraUrls);
        urlInput.value = '';
    }

    const confActual = obtenerConfigFechasConfeccion();
    const fechaInicio = document.getElementById('confFechaInicio').value;
    const fechaFin = document.getElementById('confFechaFin').value;

    const imagenesFinales = tempConfeccionImagenes.length > 0
        ? [...tempConfeccionImagenes]
        : ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500'];

    try {
        if (fechaInicio && fechaFin) {
            await fetch(`${API_URL}/confeccion/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    comunicado: confActual.comunicado
                })
            });
        }

        const url = id ? `${API_URL}/confeccion/prendas/${id}` : `${API_URL}/confeccion/prendas`;
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                modelo,
                precio,
                colores,
                tallas,
                imagen: imagenesFinales[0],
                imagenes: imagenesFinales
            })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);

        await sincronizarDatosConfeccionDB();
        showToast('¡Fechas y prenda de confección guardadas en Neon!', 'success');
        resetFormAdminConfeccion();
        cambiarTabConfeccion('catalogo');
    } catch (err) {
        showToast('Error al guardar: ' + err.message, 'error');
    }
}