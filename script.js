// =====================================================================
// 1. CONFIGURACIÓN GLOBAL Y CONEXIÓN A RENDER / NEON
// =====================================================================
const API_URL = "https://sistema-web-ropa-liz-fashion-evolution.onrender.com/api";
const EXCHANGE_RATE = 0.27; // 1 PEN = 0.27 USD aprox.
const WHATSAPP_PHONE = "931598799";

let PRODUCTS = [
    {
        id: 1,
        name: "Casaca Bomber Impermeable Urbana",
        category: "Casacas/Abrigos",
        tag: "Remate Final",
        regularPrice: 189.90,
        salePrice: 56.90,
        image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
        stockBySize: { S: 1, M: 2, L: 0, XL: 1 },
        maxInitialStock: 15,
        material: "100% Poliéster repelente al agua con forro térmico acolchado.",
        description: "Casaca ligera cortavientos ideal para media estación. Corte slim fit con cierres metálicos reforzados."
    }
];

let state = {
    currency: 'PEN',
    category: 'Todos',
    promoTag: 'Todos',
    size: 'Todas',
    searchQuery: '',
    sortBy: 'featured',
    selectedSizesPerCard: {},
    selectedColorsPerCard: {},
    cart: [],
    isRegisterMode: false
};

const CATEGORIES = ['Todos', 'Polos/Camisetas', 'Pantalones/Jeans', 'Casacas/Abrigos', 'Vestidos', 'Faldas'];
const SIZES = ['Todas', 'S', 'M', 'L', 'XL'];
const PROMO_TAGS = ['Todos', 'Normal', 'Remate Final', 'Oferta Flash', 'Últimas Tallas', '2x1'];

// =====================================================================
// 2. AUTENTICACIÓN Y ROLES
// =====================================================================
function getSession() {
    const token = localStorage.getItem('rs_token');
    const user = JSON.parse(localStorage.getItem('rs_usuario') || 'null');
    return { token, user, isAdmin: user && user.rol === 'admin' };
}

function updateAuthUI() {
    const { user, isAdmin } = getSession();
    const btnAuth = document.getElementById('btnHeaderAuth');
    const btnLogout = document.getElementById('btnHeaderLogout');
    const userLabel = document.getElementById('headerUserLabel');
    const userRole = document.getElementById('headerUserRole');
    const userAvatar = document.getElementById('headerUserAvatar');
    const adminBar = document.getElementById('adminControlBar');

    if (user) {
        const firstName = user.nombre.split(' ')[0];
        userLabel.textContent = firstName;
        userRole.textContent = isAdmin ? 'Administrador' : 'Cliente';
        userRole.className = isAdmin 
            ? 'text-[9px] font-extrabold uppercase tracking-wider text-amber-600' 
            : 'text-[9px] font-bold uppercase tracking-wider text-emerald-600';
        userAvatar.textContent = firstName.charAt(0).toUpperCase();
        userAvatar.className = isAdmin
            ? 'w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0'
            : 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0';
        
        btnAuth.onclick = null;
        btnAuth.classList.remove('cursor-pointer', 'hover:bg-slate-200/80');
        btnLogout.classList.remove('hidden');
        btnLogout.classList.add('flex');
        adminBar.classList.toggle('hidden', !isAdmin);
    } else {
        userLabel.textContent = "Mi Cuenta";
        userRole.textContent = "Ingresar";
        userRole.className = 'text-[9px] font-bold uppercase tracking-wider text-slate-400';
        userAvatar.innerHTML = `<i data-lucide="user" class="w-3.5 h-3.5"></i>`;
        userAvatar.className = 'w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-[11px] shrink-0';
        
        btnAuth.onclick = openAuthModal;
        btnAuth.classList.add('cursor-pointer', 'hover:bg-slate-200/80');
        btnLogout.classList.add('hidden');
        btnLogout.classList.remove('flex');
        adminBar.classList.add('hidden');
    }
    lucide.createIcons();
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function toggleAuthMode() {
    state.isRegisterMode = !state.isRegisterMode;
    document.getElementById('authModalTitle').textContent = state.isRegisterMode ? 'Crear Cuenta Cliente' : 'Iniciar Sesión';
    document.getElementById('authModalSubtitle').textContent = state.isRegisterMode ? 'Regístrate para guardar tus pedidos' : 'Ingresa como Administrador o Cliente';
    document.getElementById('authNameGroup').classList.toggle('hidden', !state.isRegisterMode);
    document.getElementById('authSecretGroup').classList.toggle('hidden', !state.isRegisterMode);
    document.getElementById('authSubmitBtn').textContent = state.isRegisterMode ? 'Registrarme' : 'Entrar Ahora';
    document.getElementById('authToggleBtn').textContent = state.isRegisterMode ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres cliente nuevo? Crea tu cuenta aquí';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const nombre = document.getElementById('authName').value.trim();
    const palabra_secreta = document.getElementById('authSecret').value.trim();

    const endpoint = state.isRegisterMode ? '/registro' : '/login';
    const payload = state.isRegisterMode ? { nombre, email, password, palabra_secreta } : { email, password };

    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Credenciales incorrectas', 'error');
            return;
        }

        localStorage.setItem('rs_token', data.token);
        localStorage.setItem('rs_usuario', JSON.stringify(data.usuario));
        closeAuthModal();
        updateAuthUI();
        applyFilters();
        showToast(`¡Bienvenido, ${data.usuario.nombre}!`, 'success');
    } catch (err) {
        showToast('No se pudo conectar con el servidor.', 'error');
    }
}

function logoutUser() {
    if (confirm('¿Deseas cerrar tu sesión actual?')) {
        localStorage.removeItem('rs_token');
        localStorage.removeItem('rs_usuario');
        updateAuthUI();
        applyFilters();
        showToast('Sesión cerrada', 'warning');
    }
}

// =====================================================================
// 3. SINCRONIZACIÓN CRUD CON NEON Y GESTIÓN DE PRODUCTOS
// =====================================================================
async function fetchProductsFromDB() {
    try {
        const res = await fetch(`${API_URL}/productos`);
        if (!res.ok) throw new Error('Error al obtener productos');
        const dbProducts = await res.json();

        if (Array.isArray(dbProducts) && dbProducts.length > 0) {
            PRODUCTS = dbProducts.map((p, idx) => {
                const parsedStock = typeof p.stock_by_size === 'string' 
                    ? JSON.parse(p.stock_by_size) 
                    : (p.stock_by_size || { S: 2, M: 3, L: 2, XL: 1 });
                const total = Object.values(parsedStock).reduce((a, b) => a + b, 0);

                const parsedColors = p.colores
                    ? (Array.isArray(p.colores) ? p.colores : String(p.colores).split(',').map(c => c.trim()).filter(Boolean))
                    : ['Corinto', 'Negro', 'Rojo', 'Beige', 'Blanco'];

                const parsedImages = p.imagenes
                    ? (Array.isArray(p.imagenes) ? p.imagenes : JSON.parse(p.imagenes || '[]'))
                    : [p.imagen_url];

                return {
                    id: p.id,
                    code: `LIZ-${String(p.id).padStart(4, '0')}`,
                    name: p.titulo,
                    category: p.categoria,
                    tag: p.etiqueta || 'Remate Final',
                    regularPrice: Number(p.precio_original),
                    salePrice: Number(p.precio_remate),
                    image: p.imagen_url,
                    images: parsedImages.length > 0 ? parsedImages : [p.imagen_url],
                    stockBySize: parsedStock,
                    colors: parsedColors,
                    maxInitialStock: Math.max(total + 5, 15),
                    material: p.material || 'Algodón seleccionado de exportación.',
                    description: p.descripcion || 'Prenda en liquidación de temporada hasta agotar stock.',
                    featuredRank: idx + 1
                };
            });
        }
    } catch (err) {
        console.warn('Usando catálogo local temporal mientras responde Render:', err.message);
    }

    PRODUCTS.forEach(p => {
        if (!state.selectedSizesPerCard[p.id]) {
            state.selectedSizesPerCard[p.id] = getFirstAvailableSize(p);
        }
        if (!state.selectedColorsPerCard[p.id]) {
            state.selectedColorsPerCard[p.id] = (p.colors && p.colors[0]) || 'Único';
        }
    });

    applyFilters();
    updateGlobalStockCounter();
}

function toggleOfferFields() {
    const tagElem = document.getElementById('formTag');
    if (!tagElem) return;
    const isNormal = tagElem.value === 'Normal';
    const regGroup = document.getElementById('regularPriceGroup');
    const saleLabel = document.getElementById('labelSalePrice');
    if (regGroup) regGroup.classList.toggle('hidden', isNormal);
    if (saleLabel) saleLabel.textContent = isNormal ? 'Precio Normal (S/) *' : 'Precio Remate (S/) *';
}

function openProductFormModal(product = null) {
    const modal = document.getElementById('productFormModal');
    if (!modal) return;

    document.getElementById('formProductId').value = product ? product.id : '';
    document.getElementById('productFormTitle').textContent = product ? 'Editar Prenda' : 'Subir Nueva Prenda';
    document.getElementById('formCategory').value = product ? product.categoria : 'Polos/Camisetas';
    document.getElementById('formTag').value = product ? product.tag : 'Normal';
    document.getElementById('formSalePrice').value = product ? product.salePrice : '';
    document.getElementById('formRegularPrice').value = product ? product.regularPrice : '';
    
    // Corregido: uso de stockS en lugar de stocksS para evitar el error nulo
    document.getElementById('stockS').value = product && product.stockBySize ? (product.stockBySize.S || 0) : 2;
    document.getElementById('stockM').value = product && product.stockBySize ? (product.stockBySize.M || 0) : 3;
    document.getElementById('stockL').value = product && product.stockBySize ? (product.stockBySize.L || 0) : 2;
    document.getElementById('stockXL').value = product && product.stockBySize ? (product.stockBySize.XL || 0) : 1;
    
    const colorsInput = document.getElementById('formColors');
    if (colorsInput) {
        colorsInput.value = product && product.colors ? product.colors.join(', ') : 'Corinto, Negro, Rojo, Beige';
    }
    
    document.getElementById('formDescription').value = product ? product.description : '';
    document.getElementById('formImageUrl').value = product ? product.image : '';

    const fileInput = document.getElementById('formImageFile');
    if (fileInput) fileInput.value = '';

    toggleOfferFields();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeProductFormModal() {
    const modal = document.getElementById('productFormModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function editProductById(id) {
    const product = PRODUCTS.find(p => String(p.id) === String(id));
    if (product) {
        openProductFormModal(product);
    } else {
        showToast('No se encontró la prenda para editar', 'error');
    }
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const { token } = getSession();
    const id = document.getElementById('formProductId').value;
    
    const imageFileInput = document.getElementById('formImageFile');
    const imageUrlInput = document.getElementById('formImageUrl').value.trim();

    let imagesArray = [];

    if (imageUrlInput) {
        imagesArray = imageUrlInput.split(',').map(url => url.trim()).filter(Boolean);
    }

    if (imageFileInput && imageFileInput.files && imageFileInput.files.length > 0) {
        const files = Array.from(imageFileInput.files);
        const base64Promises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
        });
        const uploadedBase64s = await Promise.all(base64Promises);
        imagesArray = imagesArray.concat(uploadedBase64s);
    }

    if (imagesArray.length === 0) {
        imagesArray = ['https://placehold.co/600x750/1e293b/ffffff?text=Prenda'];
    }

    // Corregido: lectura de stockS (sin doble 's')
    const stock_by_size = {
        S: parseInt(document.getElementById('stockS').value) || 0,
        M: parseInt(document.getElementById('stockM').value) || 0,
        L: parseInt(document.getElementById('stockL').value) || 0,
        XL: parseInt(document.getElementById('stockXL').value) || 0
    };

    const tagVal = document.getElementById('formTag').value;
    const salePriceVal = parseFloat(document.getElementById('formSalePrice').value);
    const regularPriceVal = tagVal === 'Normal'
        ? salePriceVal
        : (parseFloat(document.getElementById('formRegularPrice').value) || salePriceVal);

    const colorsInput = document.getElementById('formColors');
    const coloresArray = colorsInput ? colorsInput.value.split(',').map(c => c.trim()).filter(Boolean) : ['Corinto', 'Negro', 'Rojo'];

    const payload = {
        titulo: document.getElementById('formName').value.trim(),
        categoria: document.getElementById('formCategory').value,
        etiqueta: tagVal,
        precio_remate: salePriceVal,
        precio_original: regularPriceVal,
        stock_by_size,
        material: document.getElementById('formMaterial').value.trim(),
        colores: coloresArray,
        descripcion: document.getElementById('formDescription').value.trim(),
        imagen_url: imagesArray[0],
        imagenes: imagesArray
    };

    const url = id ? `${API_URL}/productos/${id}` : `${API_URL}/productos`;
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeProductFormModal();
            showToast(id ? 'Prenda actualizada en Neon' : '¡Nueva prenda publicada!', 'success');
            await fetchProductsFromDB();
        } else {
            const err = await res.json();
            showToast(err.error || 'Error al guardar', 'error');
        }
    } catch (err) {
        showToast('Error de conexión con el servidor', 'error');
    }
}

async function deleteProductById(id) {
    if (!confirm('¿Estás seguro de eliminar esta prenda permanentemente?')) return;
    const { token } = getSession();

    try {
        const res = await fetch(`${API_URL}/productos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast('Prenda eliminada del catálogo', 'warning');
            await fetchProductsFromDB();
        } else {
            showToast('No se pudo eliminar la prenda', 'error');
        }
    } catch (err) {
        showToast('Error de red al eliminar', 'error');
    }
}

// =====================================================================
// 4. FORMATO Y CÁLCULOS
// =====================================================================
function formatPrice(penAmount) {
    if (state.currency === 'USD') {
        return `$ ${(penAmount * EXCHANGE_RATE).toFixed(2)}`;
    }
    return `S/ ${penAmount.toFixed(2)}`;
}

function getDiscountPercent(regular, sale) {
    return Math.round(((regular - sale) / regular) * 100);
}

function getTotalStock(product) {
    return Object.values(product.stockBySize).reduce((sum, val) => sum + val, 0);
}

function getFirstAvailableSize(product) {
    for (const sz of ['S', 'M', 'L', 'XL']) {
        if (product.stockBySize[sz] > 0) return sz;
    }
    return 'M';
}

// =====================================================================
// 5. FILTROS Y RENDERIZADO DEL CATÁLOGO
// =====================================================================
function renderFilterControls() {
    const catContainer = document.getElementById('categoryFilters');
    const promoContainer = document.getElementById('promoFilters');
    const sizeContainer = document.getElementById('sizeFilters');

    if (catContainer) {
        catContainer.innerHTML = CATEGORIES.map(cat => `
            <button onclick="setCategory('${cat}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                state.category === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }">${cat}</button>
        `).join('');
    }

    if (promoContainer) {
        promoContainer.innerHTML = `<span class="text-xs font-bold text-slate-400 uppercase mr-1">Etiqueta:</span>` + PROMO_TAGS.map(tag => {
            const icons = { 'Remate Final': '🔥 ', 'Oferta Flash': '⚡ ', 'Últimas Tallas': '⏳ ', '2x1': '🎁 ' };
            return `
                <button onclick="setPromoTag('${tag}')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    state.promoTag === tag ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                }">${icons[tag] || ''}${tag === 'Remate Final' ? 'Remate Final (-70%)' : tag}</button>
            `;
        }).join('');
    }

    if (sizeContainer) {
        sizeContainer.innerHTML = `<span class="text-[11px] font-bold text-slate-500 px-2">Talla:</span>` + SIZES.map(sz => `
            <button onclick="setSizeFilter('${sz}')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                state.size === sz ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }">${sz}</button>
        `).join('');
    }
}

function setCategory(cat) { state.category = cat; renderFilterControls(); applyFilters(); }
function setPromoTag(tag) { state.promoTag = tag; renderFilterControls(); applyFilters(); }
function setSizeFilter(sz) { state.size = sz; renderFilterControls(); applyFilters(); }

function quickFilterTag(tag) {
    state.promoTag = tag; state.category = 'Todos'; state.size = 'Todas';
    renderFilterControls(); applyFilters();
    const catalogElem = document.getElementById('catalogo');
    if (catalogElem) catalogElem.scrollIntoView({ behavior: 'smooth' });
}

function setCurrency(curr) {
    state.currency = curr;
    const btnPEN = document.getElementById('btnCurrencyPEN');
    const btnUSD = document.getElementById('btnCurrencyUSD');
    if (btnPEN) btnPEN.className = curr === 'PEN' ? "px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-sm cursor-pointer" : "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800 cursor-pointer";
    if (btnUSD) btnUSD.className = curr === 'USD' ? "px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-sm cursor-pointer" : "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800 cursor-pointer";
    applyFilters();
    renderCart();
}

function resetAllFilters() {
    state.category = 'Todos'; state.promoTag = 'Todos'; state.size = 'Todas'; state.searchQuery = ''; state.sortBy = 'featured';
    const sDesc = document.getElementById('searchInputDesktop');
    const sMob = document.getElementById('searchInputMobile');
    const sSort = document.getElementById('sortSelect');
    const clearDesc = document.getElementById('clearSearchDesktop');
    
    if (sDesc) sDesc.value = '';
    if (sMob) sMob.value = '';
    if (sSort) sSort.value = 'featured';
    if (clearDesc) clearDesc.classList.add('hidden');
    renderFilterControls();
    applyFilters();
}

function applyFilters() {
    const sortSelect = document.getElementById('sortSelect');
    state.sortBy = sortSelect ? sortSelect.value : 'featured';
    const desktopVal = document.getElementById('searchInputDesktop')?.value || '';
    const mobileVal = document.getElementById('searchInputMobile')?.value || '';
    state.searchQuery = (desktopVal || mobileVal || state.searchQuery || '');
    const query = state.searchQuery.trim().toLowerCase();

    let filtered = PRODUCTS.filter(p => {
        if (state.category !== 'Todos' && p.category !== state.category) return false;
        if (state.promoTag !== 'Todos' && p.tag !== state.promoTag) return false;
        if (state.size !== 'Todas' && (!p.stockBySize[state.size] || p.stockBySize[state.size] <= 0)) return false;
        if (query && !p.name.toLowerCase().includes(query) && !p.category.toLowerCase().includes(query) && !(p.material || '').toLowerCase().includes(query)) return false;
        return true;
    });
    filtered.sort((a, b) => {
        if (state.sortBy === 'price-asc') return a.salePrice - b.salePrice;
        if (state.sortBy === 'price-desc') return b.salePrice - a.salePrice;
        if (state.sortBy === 'discount-desc') return getDiscountPercent(b.regularPrice, b.salePrice) - getDiscountPercent(a.regularPrice, a.salePrice);
        if (state.sortBy === 'stock-asc') return getTotalStock(a) - getTotalStock(b);
        return (a.featuredRank || a.id) - (b.featuredRank || b.id);
    });

    const isFiltered = state.category !== 'Todos' || state.promoTag !== 'Todos' || state.size !== 'Todas' || query !== '';
    const filterSummary = document.getElementById('activeFilterSummary');
    const resultsCount = document.getElementById('resultsCount');
    if (filterSummary) filterSummary.classList.toggle('hidden', !isFiltered);
    if (resultsCount) resultsCount.textContent = filtered.length;

    renderProductGrid(filtered);
}

function renderProductGrid(productsList) {
    const grid = document.getElementById('productGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;
    const { isAdmin } = getSession();

    if (productsList.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = productsList.map(product => {
        const discountPct = getDiscountPercent(product.regularPrice, product.salePrice);
        const totalStock = getTotalStock(product);
        const stockPercent = Math.min(100, Math.max(10, Math.round((totalStock / product.maxInitialStock) * 100)));
        const selectedSize = state.selectedSizesPerCard[product.id];
        const isLowStock = totalStock <= 4;
        const productCode = product.code || `LIZ-${String(product.id).padStart(4, '0')}`;
        const productColors = product.colors && product.colors.length ? product.colors : ['Corinto', 'Negro', 'Rojo', 'Beige'];
        const selectedColor = state.selectedColorsPerCard[product.id] || productColors[0];
        
        const imagesList = product.images && Array.isArray(product.images) && product.images.length > 0 
            ? product.images 
            : [product.image];

        let tagBadgeClass = "bg-slate-900 text-white";
        if (product.tag === 'Remate Final') tagBadgeClass = "bg-rose-600 text-white";
        if (product.tag === 'Oferta Flash') tagBadgeClass = "bg-amber-500 text-slate-950";
        if (product.tag === '2x1') tagBadgeClass = "bg-indigo-600 text-white";
        if (product.tag === 'Últimas Tallas') tagBadgeClass = "bg-rose-700 text-white";

        return `
            <article class="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-rose-200 transition-all duration-300 flex flex-col">
                <div class="relative aspect-[4/5] bg-slate-100 overflow-hidden group/img">
                    <div id="slider-${product.id}" class="w-full h-full flex transition-transform duration-300 ease-out" style="transform: translateX(0%);">
                        ${imagesList.map(imgUrl => `
                            <img src="${imgUrl}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/600x750/1e293b/ffffff?text=${encodeURIComponent(product.name)}'" class="w-full h-full object-cover object-center shrink-0 cursor-pointer" onclick="openQuickView(${product.id})">
                        `).join('')}
                    </div>

                    ${imagesList.length > 1 ? `
                        <button type="button" onclick="event.stopPropagation(); slideImage(${product.id}, -1)" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer z-10">❮</button>
                        <button type="button" onclick="event.stopPropagation(); slideImage(${product.id}, 1)" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer z-10">❯</button>
                    ` : ''}

                    <div class="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none">
                        ${discountPct > 0 ? `<span class="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">-${discountPct}% OFF</span>` : ''}
                        ${product.tag !== 'Normal'
                            ? `<span class="${tagBadgeClass} text-[11px] font-extrabold px-2.5 py-0.5 rounded-md shadow-sm uppercase">${product.tag}</span>`
                            : `<span class="bg-slate-900/85 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase">Nueva Colección</span>`}
                    </div>
                    ${isLowStock ? `<div class="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 pointer-events-none"><span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>¡ÚLTIMAS ${totalStock} UNIDADES!</div>` : ''}
                </div>

                <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">${product.category}</span>
                            <span class="text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">CÓD: ${productCode}</span>
                        </div>
                        <h3 onclick="openQuickView(${product.id})" class="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 hover:text-rose-600 cursor-pointer">${product.name}</h3>
                    </div>

                    <div class="flex items-baseline gap-2">
                        <span class="text-xl sm:text-2xl font-black ${discountPct > 0 ? 'text-rose-600' : 'text-slate-900'}">${formatPrice(product.salePrice)}</span>
                        ${discountPct > 0 ? `<span class="text-xs sm:text-sm text-slate-400 line-through">${formatPrice(product.regularPrice)}</span>` : ''}
                    </div>

                    <div class="space-y-1">
                        <div class="flex justify-between text-[11px] font-semibold">
                            <span class="${isLowStock ? 'text-rose-600 font-bold' : 'text-slate-500'}">${isLowStock ? `¡Quedan solo ${totalStock}!` : `Stock: ${totalStock} und.`}</span>
                            <span class="text-slate-400">${100 - stockPercent}% vendido</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full rounded-full ${isLowStock ? 'bg-rose-600' : 'bg-amber-500'}" style="width: ${stockPercent}%"></div>
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[11px] font-bold text-slate-500">Elige talla:</span>
                            <button onclick="openQuickView(${product.id})" class="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer">Ver detalles</button>
                        </div>
                        <div class="grid grid-cols-4 gap-1.5">
                            ${['S', 'M', 'L', 'XL'].map(sz => {
                                const qty = product.stockBySize[sz] || 0;
                                const outOfStock = qty <= 0;
                                const isSelected = selectedSize === sz && !outOfStock;
                                return `
                                    <button type="button" ${outOfStock ? 'disabled' : `onclick="selectCardSize(${product.id}, '${sz}')"`}
                                        class="py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                                            outOfStock ? 'bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed' :
                                            isSelected ? 'bg-slate-900 text-white border-slate-900 cursor-pointer' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-900 cursor-pointer'
                                        }">${sz}</button>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div>
                        <span class="block text-[11px] font-bold text-slate-500 mb-1.5">Elige color:</span>
                        <div class="flex flex-wrap gap-1.5">
                            ${productColors.map(col => `
                                <button type="button" onclick="selectCardColor(${product.id}, '${col.replace(/'/g, "\\'")}')"
                                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                        selectedColor === col
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-rose-400'
                                    }">${col}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="pt-2 flex items-center gap-2">
                        <button onclick="addToCart(${product.id})" class="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer">
                            <i data-lucide="shopping-bag" class="w-4 h-4"></i> Agregar
                        </button>
                        <button onclick="inquireSingleProductWhatsApp(${product.id})" class="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 rounded-xl transition-colors cursor-pointer" title="Consultar por WhatsApp">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                        </button>
                    </div>

                    ${isAdmin ? `
                        <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                            <button onclick="editProductById(${product.id})" class="bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Editar
                            </button>
                            <button onclick="deleteProductById(${product.id})" class="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Borrar
                            </button>
                        </div>
                    ` : ''}
                </div>
            </article>
        `;
    }).join('');
    lucide.createIcons();
}

function selectCardSize(productId, size) {
    state.selectedSizesPerCard[productId] = size;
    applyFilters();
}

function selectCardColor(productId, color) {
    state.selectedColorsPerCard[productId] = color;
    applyFilters();
}

// =====================================================================
// 6. CARRITO, WHATSAPP Y UTILIDADES
// =====================================================================
function addToCart(productId, explicitSize = null, explicitColor = null) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const size = explicitSize || state.selectedSizesPerCard[productId] || getFirstAvailableSize(product);
    const color = explicitColor || state.selectedColorsPerCard[productId] || (product.colors && product.colors[0]) || 'Único';
    const availableStock = product.stockBySize[size] || 0;

    if (availableStock <= 0) return showToast('Talla agotada', 'error');

    const existing = state.cart.find(i => i.productId === productId && i.size === size && i.color === color);
    if (existing) {
        existing.qty += 1;
    } else {
        state.cart.push({ productId, size, color, qty: 1 });
    }
    renderCart();
    showToast(`Agregado: ${product.name} (${color} - Talla ${size})`, 'success');
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;
    const totalItems = state.cart.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById('headerCartBadge').textContent = totalItems;
    document.getElementById('drawerItemCountText').textContent = `${totalItems} prendas seleccionadas`;

    if (state.cart.length === 0) {
        document.getElementById('cartDrawerFooter').classList.add('hidden');
        document.getElementById('cartSavingsBanner').classList.add('hidden');
        container.innerHTML = `<div class="text-center py-12 text-slate-400 text-sm">Tu bolsa está vacía</div>`;
        return;
    }

    document.getElementById('cartDrawerFooter').classList.remove('hidden');
    document.getElementById('cartSavingsBanner').classList.remove('hidden');

    let regTotal = 0, saleTotal = 0;
    container.innerHTML = state.cart.map((item, idx) => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        if (!p) return '';
        const code = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
        regTotal += p.regularPrice * item.qty;
        saleTotal += p.salePrice * item.qty;
        return `
            <div class="flex gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <img src="${p.image}" class="w-16 h-20 object-cover rounded-xl">
                <div class="flex-1">
                    <span class="text-[10px] font-black text-slate-500 uppercase">CÓD: ${code}</span>
                    <h4 class="font-bold text-xs text-slate-900">${p.name}</h4>
                    <span class="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold inline-block mt-0.5">Color: ${item.color || 'Único'} | Talla: ${item.size} | Cant: ${item.qty}</span>
                    <div class="text-sm font-black text-rose-600 mt-1">${formatPrice(p.salePrice * item.qty)}</div>
                </div>
                <button onclick="state.cart.splice(${idx},1); renderCart();" class="text-slate-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `;
    }).join('');

    const savings = regTotal - saleTotal;
    document.getElementById('cartTotalSavings').textContent = formatPrice(savings);
    document.getElementById('cartRegularSubtotal').textContent = formatPrice(regTotal);
    document.getElementById('cartDiscountAmount').textContent = `- ${formatPrice(savings)}`;
    document.getElementById('cartFinalTotal').textContent = formatPrice(saleTotal);
    lucide.createIcons();
}

function toggleCartDrawer(open) {
    document.getElementById('cartDrawerBackdrop').classList.toggle('hidden', !open);
    document.getElementById('cartDrawer').classList.toggle('translate-x-full', !open);
}

function sendOrderToWhatsApp() {
    if (state.cart.length === 0) return;
    const orderCode = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
    let msg = `🔥 *PEDIDO LIZ FASHION EVOLUTION* 🔥\n`;
    msg += `🧾 *Código de Orden:* ${orderCode}\n\n`;
    let total = 0;
    state.cart.forEach((item, i) => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        const prodCode = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
        total += p.salePrice * item.qty;
        msg += `${i + 1}. *[${prodCode}] ${p.name}*\n`;
        msg += `   • Color: *${item.color || 'Único'}* | Talla: *${item.size}* | Cant: *${item.qty}*\n`;
        msg += `   • Subtotal: ${formatPrice(p.salePrice * item.qty)}\n`;
    });
    msg += `\n💰 *TOTAL: ${formatPrice(total)}*`;
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
}

function inquireSingleProductWhatsApp(productId) {
    const p = PRODUCTS.find(prod => prod.id === productId);
    const prodCode = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
    const sz = state.selectedSizesPerCard[productId] || 'M';
    const col = state.selectedColorsPerCard[productId] || (p.colors && p.colors[0]) || 'Único';
    const msg = `Hola *LIZ FASHION EVOLUTION*, quiero separar/consultar:\n• *Código Producto:* ${prodCode}\n• *Prenda:* ${p.name}\n• *Color:* ${col}\n• *Talla:* ${sz}\n• *Precio:* ${formatPrice(p.salePrice)}\n¿Sigue disponible?`;
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    const color = type === 'error' ? 'text-rose-400' : type === 'warning' ? 'text-amber-400' : 'text-emerald-400';
    toast.className = 'bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold pointer-events-auto';
    toast.innerHTML = `<i data-lucide="info" class="w-4 h-4 ${color}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 3000);
}

function updateGlobalStockCounter() {
    const counter = document.getElementById('totalStockCounter');
    if (!counter) return;
    const total = PRODUCTS.reduce((sum, p) => sum + getTotalStock(p), 0);
    counter.textContent = total;
}

// Control del carrusel por tarjeta
const sliderIndexes = {};
function slideImage(productId, direction) {
    const slider = document.getElementById(`slider-${productId}`);
    if (!slider) return;
    const totalImages = slider.children.length;
    if (totalImages <= 1) return;

    if (!sliderIndexes[productId]) sliderIndexes[productId] = 0;
    sliderIndexes[productId] += direction;

    if (sliderIndexes[productId] >= totalImages) sliderIndexes[productId] = 0;
    if (sliderIndexes[productId] < 0) sliderIndexes[productId] = totalImages - 1;

    slider.style.transform = `translateX(-${sliderIndexes[productId] * 100}%)`;
}

// =====================================================================
// CONTROL Y EDICIÓN DEL RELOJ DE OFERTA FLASH DESDE EL PANEL ADMIN
// =====================================================================
async function fetchOfferTime() {
    try {
        const res = await fetch(`${API_URL}/oferta-tiempo`);
        const data = await res.json();
        if (data && data.offer_end_time) {
            startCountdown(Number(data.offer_end_time));
        } else {
            startCountdown(new Date().getTime() + 24 * 60 * 60 * 1000);
        }
    } catch (err) {
        console.error('Error al obtener tiempo de oferta:', err);
    }
}

function startCountdown(endTime) {
    const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
            clearInterval(timer);
            const container = document.getElementById('countdownContainer');
            if (container) {
                container.innerHTML = "<span class='text-rose-500 font-bold col-span-4 py-2'>¡OFERTA FLASH FINALIZADA!</span>";
            }
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (document.getElementById('cd-days')) document.getElementById('cd-days').innerText = String(days).padStart(2, '0');
        if (document.getElementById('cd-hours')) document.getElementById('cd-hours').innerText = String(hours).padStart(2, '0');
        if (document.getElementById('cd-minutes')) document.getElementById('cd-minutes').innerText = String(minutes).padStart(2, '0');
        if (document.getElementById('cd-seconds')) document.getElementById('cd-seconds').innerText = String(seconds).padStart(2, '0');
    }, 1000);
}

function openTimerModal() {
    const modal = document.getElementById('timerModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeTimerModal() {
    const modal = document.getElementById('timerModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function saveOfferEndTime(e) {
    e.preventDefault();
    const inputVal = document.getElementById('offerEndInput').value;
    if (!inputVal) return;

    const offer_end_time = new Date(inputVal).getTime();
    const { token } = getSession();

    try {
        const res = await fetch(`${API_URL}/oferta-tiempo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ offer_end_time })
        });

        if (!res.ok) throw new Error('No se pudo guardar la fecha');
        
        showToast('¡Horario de oferta actualizado!', 'success');
        closeTimerModal();
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        showToast('Error al actualizar: ' + err.message, 'error');
    }
}

// INICIALIZACIÓN
window.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    renderFilterControls();
    renderCart();
    fetchProductsFromDB();
    fetchOfferTime();
});
// Abrir / Cerrar Modal de Pedidos Manuales
function openOrderManagerModal() {
    document.getElementById('orderManagerModal').classList.remove('hidden');
    document.getElementById('orderManagerModal').classList.add('flex');
    renderManualOrders();
}

function closeOrderManagerModal() {
    document.getElementById('orderManagerModal').classList.add('hidden');
    document.getElementById('orderManagerModal').classList.remove('flex');
}

// Guardar Pedido Manual
function handleSaveManualOrder(e) {
    e.preventDefault();
    const newOrder = {
        id: 'PED-' + Math.floor(1000 + Math.random() * 9000),
        client: document.getElementById('manClientName').value,
        product: document.getElementById('manProductName').value,
        size: document.getElementById('manProductSize').value,
        color: document.getElementById('manProductColor').value,
        price: parseFloat(document.getElementById('manProductPrice').value).toFixed(2),
        image: document.getElementById('manProductImg').value || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        date: new Date().toLocaleDateString()
    };

    let orders = JSON.parse(localStorage.getItem('liz_manual_orders') || '[]');
    orders.unshift(newOrder);
    localStorage.setItem('liz_manual_orders', JSON.stringify(orders));

    e.target.reset();
    renderManualOrders();
    showToast('¡Pedido registrado y stock separado con éxito!');
}

// Renderizar listado de pedidos en el modal
function renderManualOrders() {
    const container = document.getElementById('manualOrdersList');
    let orders = JSON.parse(localStorage.getItem('liz_manual_orders') || '[]');

    if (orders.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No hay pedidos registrados todavía.</p>`;
        return;
    }

    container.innerHTML = orders.map(o => `
        <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs gap-3">
            <img src="${o.image}" alt="" class="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-rose-600">${o.id}</span>
                    <h5 class="font-extrabold text-slate-900 text-xs truncate">${o.product}</h5>
                </div>
                <p class="text-[11px] text-slate-500">Cliente: <strong>${o.client}</strong> | Talla: <span class="text-rose-600 font-bold">${o.size}</span> | Color: <span class="font-bold">${o.color}</span></p>
                <p class="text-xs font-black text-slate-900">S/ ${o.price}</p>
            </div>
            <div class="flex flex-col gap-1.5 shrink-0">
                <button onclick="sendManualOrderWhatsApp('${o.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer" title="Enviar por WhatsApp">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                </button>
                <button onclick="downloadOrderPDF('${o.id}')" class="bg-slate-900 hover:bg-rose-600 text-white p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer" title="Descargar PDF">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

// Enviar Pedido Individual por WhatsApp
function sendManualOrderWhatsApp(orderId) {
    let orders = JSON.parse(localStorage.getItem('liz_manual_orders') || '[]');
    let o = orders.find(item => item.id === orderId);
    if (!o) return;

    const message = `🛍️ *PEDIDO SEPARADO - LIZ FASHION EVOLUTION*\n\n` +
                    `📌 *Código:* ${o.id}\n` +
                    `👤 *Cliente:* ${o.client}\n` +
                    `👗 *Prenda:* ${o.product}\n` +
                    `📏 *Talla:* ${o.size}\n` +
                    `🎨 *Color:* ${o.color}\n` +
                    `💰 *Precio:* S/ ${o.price}\n\n` +
                    `¡Hola! Deseo confirmar la separación de esta prenda.`;

    window.open(`https://wa.me/51931598799?text=${encodeURIComponent(message)}`, '_blank');
}

// Descargar PDF del Pedido (Comprobante con diseño limpio)
function downloadOrderPDF(orderId) {
    let orders = JSON.parse(localStorage.getItem('liz_manual_orders') || '[]');
    let o = orders.find(item => item.id === orderId);
    if (!o) return;

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        // Carga dinámica de jsPDF si no estuviera enlazado
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => generatePDFDocument(o);
        document.head.appendChild(script);
    } else {
        generatePDFDocument(o);
    }
}

function generatePDFDocument(o) {
    const doc = new window.jspdf.jsPDF();
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LIZ FASHION EVOLUTION - COMPROBANTE DE PEDIDO', 14, 22);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text(`Código de Reserva: ${o.id}`, 14, 45);
    doc.text(`Fecha: ${o.date}`, 14, 52);

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 58, 196, 58);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalles del Artículo:', 14, 70);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`• Cliente: ${o.client}`, 18, 80);
    doc.text(`• Prenda: ${o.product}`, 18, 88);
    doc.text(`• Talla Seleccionada: ${o.size}`, 18, 96);
    doc.text(`• Color: ${o.color}`, 18, 104);
    doc.text(`• Precio Total: S/ ${o.price}`, 18, 112);

    doc.setFillColor(255, 241, 242);
    doc.roundedRect(14, 130, 182, 25, 3, 3, 'F');
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.text('¡Stock separado por 30 minutos!', 18, 1425 / 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Presenta este comprobante o envíalo por WhatsApp para concretar tu entrega.', 18, 1505 / 10);

    doc.save(`Pedido_${o.id}.pdf`);
}