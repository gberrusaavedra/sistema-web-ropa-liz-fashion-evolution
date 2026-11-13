// =====================================================================
// 1. CONFIGURACIÓN GLOBAL Y CONEXIÓN A RENDER / NEON
// =====================================================================
const API_URL = "https://sistema-web-ropa-liz-fashion-evolution.onrender.com/api"; // <-- PEGA AQUÍ TU URL DE RENDER
const EXCHANGE_RATE = 0.27; // 1 PEN = 0.27 USD aprox.
const WHATSAPP_PHONE = "931598799";

// Catálogo dinámico cargado desde Neon (con respaldo inicial por si Render está despertando)
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
    cart: [],
    isRegisterMode: false
};

const CATEGORIES = ['Todos', 'Polos/Camisetas', 'Pantalones/Jeans', 'Casacas/Abrigos', 'Vestidos', 'Faldas'];
const SIZES = ['Todas', 'S', 'M', 'L', 'XL'];
const PROMO_TAGS = ['Todos', 'Normal', 'Remate Final', 'Oferta Flash', 'Últimas Tallas', '2x1'];

// =====================================================================
// 2. AUTENTICACIÓN Y ROLES (ADMINISTRADOR VS CLIENTE)
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
// 3. SINCRONIZACIÓN CRUD CON NEON (CARGAR, CREAR, EDITAR, ELIMINAR)
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

                return {
                    id: p.id,
                    name: p.titulo,
                    category: p.categoria,
                    tag: p.etiqueta || 'Remate Final',
                    regularPrice: Number(p.precio_original),
                    salePrice: Number(p.precio_remate),
                    image: p.imagen_url,
                    stockBySize: parsedStock,
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
    });

    applyFilters();
    updateGlobalStockCounter();
}

function toggleOfferFields() {
    const isNormal = document.getElementById('formTag').value === 'Normal';
    document.getElementById('regularPriceGroup').classList.toggle('hidden', isNormal);
    document.getElementById('labelSalePrice').textContent = isNormal ? 'Precio Normal (S/) *' : 'Precio Remate (S/) *';
}

function openProductFormModal(product = null) {
    document.getElementById('formProductId').value = product ? product.id : '';
    document.getElementById('productFormTitle').textContent = product ? 'Editar Prenda' : 'Subir Nueva Prenda';
    document.getElementById('formName').value = product ? product.name : '';
    document.getElementById('formCategory').value = product ? product.category : 'Polos/Camisetas';
    document.getElementById('formTag').value = product ? product.tag : 'Normal';
    document.getElementById('formSalePrice').value = product ? product.salePrice : '';
    document.getElementById('formRegularPrice').value = product ? product.regularPrice : '';
    document.getElementById('stockS').value = product ? (product.stockBySize.S || 0) : 2;
    document.getElementById('stockM').value = product ? (product.stockBySize.M || 0) : 3;
    document.getElementById('stockL').value = product ? (product.stockBySize.L || 0) : 2;
    document.getElementById('stockXL').value = product ? (product.stockBySize.XL || 0) : 1;
    document.getElementById('formMaterial').value = product ? product.material : '';
    document.getElementById('formDescription').value = product ? product.description : '';
    document.getElementById('formImageUrl').value = product ? product.image : '';
    document.getElementById('formImageFile').value = '';

    toggleOfferFields();

    const modal = document.getElementById('productFormModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeProductFormModal() {
    const modal = document.getElementById('productFormModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function editProductById(id) {
    const product = PRODUCTS.find(p => p.id === id);
    if (product) openProductFormModal(product);
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const { token } = getSession();
    const id = document.getElementById('formProductId').value;
    const fileInput = document.getElementById('formImageFile');
    let imagen_url = document.getElementById('formImageUrl').value.trim();

    if (fileInput.files.length > 0) {
        imagen_url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(fileInput.files[0]);
        });
    }

    if (!imagen_url) {
        showToast('Sube una imagen o pega un enlace válido.', 'warning');
        return;
    }

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

    const payload = {
        titulo: document.getElementById('formName').value.trim(),
        categoria: document.getElementById('formCategory').value,
        etiqueta: tagVal,
        precio_remate: salePriceVal,
        precio_original: regularPriceVal,
        stock_by_size,
        material: document.getElementById('formMaterial').value.trim(),
        descripcion: document.getElementById('formDescription').value.trim(),
        imagen_url
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
// 4. UTILIDADES DE FORMATO Y CÁLCULO
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
    document.getElementById('categoryFilters').innerHTML = CATEGORIES.map(cat => `
        <button onclick="setCategory('${cat}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            state.category === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
        }">${cat}</button>
    `).join('');

    document.getElementById('promoFilters').innerHTML = `<span class="text-xs font-bold text-slate-400 uppercase mr-1">Etiqueta:</span>` + PROMO_TAGS.map(tag => {
        const icons = { 'Remate Final': '🔥 ', 'Oferta Flash': '⚡ ', 'Últimas Tallas': '⏳ ', '2x1': '🎁 ' };
        return `
            <button onclick="setPromoTag('${tag}')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                state.promoTag === tag ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'
            }">${icons[tag] || ''}${tag === 'Remate Final' ? 'Remate Final (-70%)' : tag}</button>
        `;
    }).join('');

    document.getElementById('sizeFilters').innerHTML = `<span class="text-[11px] font-bold text-slate-500 px-2">Talla:</span>` + SIZES.map(sz => `
        <button onclick="setSizeFilter('${sz}')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            state.size === sz ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
        }">${sz}</button>
    `).join('');
}

function setCategory(cat) { state.category = cat; renderFilterControls(); applyFilters(); }
function setPromoTag(tag) { state.promoTag = tag; renderFilterControls(); applyFilters(); }
function setSizeFilter(sz) { state.size = sz; renderFilterControls(); applyFilters(); }

function quickFilterTag(tag) {
    state.promoTag = tag; state.category = 'Todos'; state.size = 'Todas';
    renderFilterControls(); applyFilters();
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
}

function setCurrency(curr) {
    state.currency = curr;
    document.getElementById('btnCurrencyPEN').className = curr === 'PEN' ? "px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-sm cursor-pointer" : "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800 cursor-pointer";
    document.getElementById('btnCurrencyUSD').className = curr === 'USD' ? "px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-sm cursor-pointer" : "px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800 cursor-pointer";
    applyFilters();
    renderCart();
}

function resetAllFilters() {
    state.category = 'Todos'; state.promoTag = 'Todos'; state.size = 'Todas'; state.searchQuery = ''; state.sortBy = 'featured';
    document.getElementById('searchInputDesktop').value = '';
    document.getElementById('searchInputMobile').value = '';
    document.getElementById('sortSelect').value = 'featured';
    document.getElementById('clearSearchDesktop').classList.add('hidden');
    renderFilterControls();
    applyFilters();
}

function applyFilters() {
    state.sortBy = document.getElementById('sortSelect').value;
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
    document.getElementById('activeFilterSummary').classList.toggle('hidden', !isFiltered);
    document.getElementById('resultsCount').textContent = filtered.length;

    renderProductGrid(filtered);
}

function renderProductGrid(productsList) {
    const grid = document.getElementById('productGrid');
    const emptyState = document.getElementById('emptyState');
    const { isAdmin } = getSession();

    if (productsList.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    grid.innerHTML = productsList.map(product => {
        const discountPct = getDiscountPercent(product.regularPrice, product.salePrice);
        const totalStock = getTotalStock(product);
        const stockPercent = Math.min(100, Math.max(10, Math.round((totalStock / product.maxInitialStock) * 100)));
        const selectedSize = state.selectedSizesPerCard[product.id];
        const isLowStock = totalStock <= 4;

        let tagBadgeClass = "bg-slate-900 text-white";
        if (product.tag === 'Remate Final') tagBadgeClass = "bg-rose-600 text-white";
        if (product.tag === 'Oferta Flash') tagBadgeClass = "bg-amber-500 text-slate-950";
        if (product.tag === '2x1') tagBadgeClass = "bg-indigo-600 text-white";
        if (product.tag === 'Últimas Tallas') tagBadgeClass = "bg-rose-700 text-white";

        return `
            <article class="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-rose-200 transition-all duration-300 flex flex-col">
                <div class="relative aspect-[4/5] bg-slate-100 overflow-hidden cursor-pointer" onclick="openQuickView(${product.id})">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/600x750/1e293b/ffffff?text=${encodeURIComponent(product.name)}'" class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                     ${discountPct > 0 ? `<span class="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">-${discountPct}% OFF</span>` : ''}
                     ${product.tag !== 'Normal'
                         ? `<span class="${tagBadgeClass} text-[11px] font-extrabold px-2.5 py-0.5 rounded-md shadow-sm uppercase">${product.tag}</span>`
                         : `<span class="bg-slate-900/85 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase">Nueva Colección</span>`}
                 </div>
                    ${isLowStock ? `<div class="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>¡ÚLTIMAS ${totalStock} UNIDADES!</div>` : ''}
                </div>

                <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">${product.category}</div>
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

                    <div class="pt-2 flex items-center gap-2">
                        <button onclick="addToCart(${product.id})" class="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer">
                            <i data-lucide="shopping-bag" class="w-4 h-4"></i> Agregar
                        </button>
                        <button onclick="inquireSingleProductWhatsApp(${product.id})" class="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 rounded-xl transition-colors cursor-pointer" title="Consultar por WhatsApp">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <!-- CONTROLES EXCLUSIVOS DEL ADMINISTRADOR -->
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

// =====================================================================
// 6. VISTA RÁPIDA, CARRITO Y WHATSAPP
// =====================================================================
let modalSelectedSize = null;

function openQuickView(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    modalSelectedSize = state.selectedSizesPerCard[product.id] || getFirstAvailableSize(product);

    const discountPct = getDiscountPercent(product.regularPrice, product.salePrice);
    document.getElementById('quickViewContent').innerHTML = `
        <div class="relative bg-slate-100 aspect-[4/5] md:h-full">
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover">
            <span class="absolute top-4 left-4 bg-rose-600 text-white text-sm font-black px-3 py-1 rounded-xl">-${discountPct}% OFF</span>
        </div>
        <div class="p-6 sm:p-8 flex flex-col justify-between space-y-4">
            <div class="space-y-3">
                <span class="text-xs font-bold uppercase text-rose-600">${product.category}</span>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900">${product.name}</h2>
                <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3.5">
                    <div class="text-xs text-slate-500 line-through">Antes: ${formatPrice(product.regularPrice)}</div>
                    <div class="text-2xl font-black text-rose-600">${formatPrice(product.salePrice)}</div>
                </div>
                <p class="text-sm text-slate-600">${product.description}</p>
                <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600"><strong>Material:</strong> ${product.material}</div>
            </div>
            <button onclick="addToCart(${product.id}, '${modalSelectedSize}'); closeQuickView(); toggleCartDrawer(true);" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                <i data-lucide="shopping-bag" class="w-5 h-5"></i> Agregar al Pedido
            </button>
        </div>
    `;
    const modal = document.getElementById('quickViewModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    lucide.createIcons();
}

function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
}
document.getElementById('quickViewModal').addEventListener('click', closeQuickView);

function addToCart(productId, explicitSize = null) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const size = explicitSize || state.selectedSizesPerCard[productId] || getFirstAvailableSize(product);
    const availableStock = product.stockBySize[size] || 0;

    if (availableStock <= 0) return showToast('Talla agotada', 'error');

    const existing = state.cart.find(i => i.productId === productId && i.size === size);
    if (existing) {
        if (existing.qty >= availableStock) return showToast(`Stock máximo: ${availableStock} und.`, 'warning');
        existing.qty += 1;
    } else {
        state.cart.push({ productId, size, qty: 1 });
    }
    renderCart();
    showToast(`Agregado: ${product.name} (Talla ${size})`, 'success');
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
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
        regTotal += p.regularPrice * item.qty;
        saleTotal += p.salePrice * item.qty;
        return `
            <div class="flex gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <img src="${p.image}" class="w-16 h-20 object-cover rounded-xl">
                <div class="flex-1">
                    <h4 class="font-bold text-xs text-slate-900">${p.name}</h4>
                    <span class="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold">Talla: ${item.size} | Cant: ${item.qty}</span>
                    <div class="text-sm font-black text-rose-600 mt-1">${formatPrice(p.salePrice * item.qty)}</div>
                </div>
                <button onclick="state.cart.splice(${idx},1); renderCart();" class="text-slate-400 hover:text-rose-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
    let msg = `🔥 *PEDIDO LIZ FASHION EVOLUTION* 🔥\n\n`;
    let total = 0;
    state.cart.forEach((item, i) => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        total += p.salePrice * item.qty;
        msg += `${i + 1}. *${p.name}* (Talla ${item.size}) x${item.qty} = ${formatPrice(p.salePrice * item.qty)}\n`;
    });
    msg += `\n💰 *TOTAL: ${formatPrice(total)}*`;
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
}

function inquireSingleProductWhatsApp(productId) {
    const p = PRODUCTS.find(prod => prod.id === productId);
    const sz = state.selectedSizesPerCard[productId] || 'M';
    const msg = `Hola *LIZ FASHION EVOLUTION*, me interesa: *${p.name}* (Talla ${sz}) a ${formatPrice(p.salePrice)}. ¿Sigue disponible?`;
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
}

function simulateCheckout() {
    state.cart = [];
    renderCart();
    toggleCartDrawer(false);
    document.getElementById('reservationCode').textContent = `#RMT-${Math.floor(1000 + Math.random() * 9000)}`;
    const modal = document.getElementById('orderSuccessModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function closeSuccessModal() {
    const modal = document.getElementById('orderSuccessModal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const color = type === 'error' ? 'text-rose-400' : type === 'warning' ? 'text-amber-400' : 'text-emerald-400';
    toast.className = 'bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold pointer-events-auto';
    toast.innerHTML = `<i data-lucide="info" class="w-4 h-4 ${color}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 3000);
}

let countdownInterval = null;

function getOfferEndTimestamp() {
    const saved = localStorage.getItem('liz_offer_end_time');
    if (saved) return parseInt(saved, 10);
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 1);
    defaultEnd.setHours(23, 59, 59, 0);
    return defaultEnd.getTime();
}

function openTimerModal() {
    const endTs = getOfferEndTimestamp();
    const dt = new Date(endTs - new Date().getTimezoneOffset() * 60000);
    document.getElementById('offerEndInput').value = dt.toISOString().slice(0, 16);
    const modal = document.getElementById('timerModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
}

function closeTimerModal() {
    const modal = document.getElementById('timerModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function saveOfferEndTime(e) {
    e.preventDefault();
    const val = document.getElementById('offerEndInput').value;
    if (!val) return;
    const targetTime = new Date(val).getTime();
    localStorage.setItem('liz_offer_end_time', targetTime.toString());
    closeTimerModal();
    startCountdownTimer();
    showToast('Horario de oferta actualizado correctamente', 'success');
}

function startCountdownTimer() {
    if (countdownInterval) clearInterval(countdownInterval);

    const updateClock = () => {
        const now = Date.now();
        const end = getOfferEndTimestamp();
        const diffSec = Math.max(0, Math.floor((end - now) / 1000));

        const days = Math.floor(diffSec / 86400);
        const hours = Math.floor((diffSec % 86400) / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = diffSec % 60;

        document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
    };

    updateClock();
    countdownInterval = setInterval(updateClock, 1000);
}
function updateGlobalStockCounter() {
    const total = PRODUCTS.reduce((sum, p) => sum + getTotalStock(p), 0);
    document.getElementById('totalStockCounter').textContent = total;
}

function setupSearchListeners() {
    const dInput = document.getElementById('searchInputDesktop');
    const mInput = document.getElementById('searchInputMobile');
    const clearBtn = document.getElementById('clearSearchDesktop');

    const onSearch = (val) => {
        state.searchQuery = val;
        dInput.value = val;
        mInput.value = val;
        clearBtn.classList.toggle('hidden', !val);
        applyFilters();
    };
    dInput.addEventListener('input', e => onSearch(e.target.value));
    mInput.addEventListener('input', e => onSearch(e.target.value));
    clearBtn.addEventListener('click', () => onSearch(''));
}

// ARRANQUE DE LA APLICACIÓN
window.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    renderFilterControls();
    renderCart();
    setupSearchListeners();
    startCountdownTimer();
    fetchProductsFromDB();
});
// =========================================================
// MÓDULO: PEDIDOS DE FABRICACIÓN (ADMIN Y CLIENTE)
// =========================================================
let fabModelos = [];
let fabCart = [];

async function openFabricacionModal() {
    const modal = document.getElementById('fabricacionModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const { user } = getSession();
    const isAdmin = user && user.rol === 'admin';
    document.getElementById('tabFabAdminModelo').classList.toggle('hidden', !isAdmin);
    document.getElementById('tabFabAdminPedidos').classList.toggle('hidden', !isAdmin);

    switchFabTab('cliente');
    await loadFabModelos();
    if (isAdmin) await loadFabAdminOrders();
    lucide.createIcons();
}

function closeFabricacionModal() {
    const modal = document.getElementById('fabricacionModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function switchFabTab(tab) {
    const views = {
        'cliente': 'viewFabCliente',
        'admin-modelo': 'viewFabAdminModelo',
        'admin-pedidos': 'viewFabAdminPedidos'
    };
    const tabs = {
        'cliente': 'tabFabCliente',
        'admin-modelo': 'tabFabAdminModelo',
        'admin-pedidos': 'tabFabAdminPedidos'
    };

    Object.keys(views).forEach(k => {
        document.getElementById(views[k]).classList.toggle('hidden', k !== tab);
        const btn = document.getElementById(tabs[k]);
        if (k === tab) {
            btn.classList.add('bg-white', 'text-slate-900', 'border', 'border-b-0', 'border-slate-200');
            btn.classList.remove('text-slate-600');
        } else {
            btn.classList.remove('bg-white', 'text-slate-900', 'border', 'border-b-0', 'border-slate-200');
            btn.classList.add('text-slate-600');
        }
    });
}

async function loadFabModelos() {
    const grid = document.getElementById('fabModelosGrid');
    grid.innerHTML = '<p class="text-xs text-slate-400 col-span-full">Cargando modelos disponibles para fabricación...</p>';
    try {
        const res = await fetch(`${API_URL}/fabricacion/modelos`);
        fabModelos = await res.json();
        renderFabModelos();
    } catch (err) {
        grid.innerHTML = '<p class="text-xs text-rose-600 col-span-full">Error al cargar modelos de fabricación.</p>';
    }
}

function renderFabModelos() {
    const grid = document.getElementById('fabModelosGrid');
    const { user } = getSession();
    const isAdmin = user && user.rol === 'admin';

    if (!fabModelos.length) {
        grid.innerHTML = '<div class="col-span-full text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">Aún no hay modelos publicados para fabricación en este lote.</div>';
        return;
    }

    const now = Date.now();
    grid.innerHTML = fabModelos.map(m => {
        const colores = Array.isArray(m.colores) ? m.colores : JSON.parse(m.colores || '[]');
        const tallas = Array.isArray(m.tallas) ? m.tallas : JSON.parse(m.tallas || '[]');
        const deadline = Number(m.fecha_limite);
        const expired = now > deadline;
        const fechaTexto = new Date(deadline).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        return `
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
            <div class="relative h-44 bg-slate-100">
                <img src="${m.imagen_url}" alt="${m.titulo}" class="w-full h-full object-cover">
                <span class="absolute top-2.5 left-2.5 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">${m.categoria}</span>
                ${isAdmin ? `<button type="button" onclick="deleteFabModel(${m.id})" class="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer">Eliminar</button>` : ''}
            </div>
            <div class="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between text-xs">
                <div>
                    <div class="flex items-start justify-between gap-2">
                        <h5 class="font-black text-slate-900 text-sm leading-snug">${m.titulo}</h5>
                        <span class="font-black text-rose-600 text-sm shrink-0">S/ ${Number(m.precio).toFixed(2)}</span>
                    </div>
                    ${m.descripcion ? `<p class="text-[11px] text-slate-500 mt-1">${m.descripcion}</p>` : ''}
                    <div class="mt-1.5 text-[11px] font-bold ${expired ? 'text-rose-600' : 'text-amber-600'}">
                        ${expired ? '⛔ Lote cerrado' : `⏳ Cierra: ${fechaTexto}`}
                    </div>
                </div>

                ${expired ? `
                    <div class="bg-rose-50 text-rose-700 font-bold text-center py-2 rounded-xl text-[11px]">Fecha límite vencida</div>
                ` : `
                    <div class="space-y-2 pt-2 border-t border-slate-100">
                        <div class="grid grid-cols-3 gap-1.5">
                            <select id="fabColor_${m.id}" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-semibold">
                                ${colores.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                            <select id="fabTalla_${m.id}" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-semibold">
                                ${tallas.map(t => `<option value="${t}">Talla ${t}</option>`).join('')}
                            </select>
                            <input type="number" id="fabQty_${m.id}" min="1" value="1" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold">
                        </div>
                        <button type="button" onclick="addToFabCart(${m.id})" class="w-full bg-slate-900 hover:bg-rose-600 text-white font-bold py-2 rounded-xl transition-colors cursor-pointer">
                            + Agregar al Pedido
                        </button>
                    </div>
                `}
            </div>
        </div>`;
    }).join('');
}

function addToFabCart(modelId) {
    const model = fabModelos.find(m => m.id === modelId);
    if (!model) return;
    const color = document.getElementById(`fabColor_${modelId}`).value;
    const talla = document.getElementById(`fabTalla_${modelId}`).value;
    const cantidad = Math.max(1, parseInt(document.getElementById(`fabQty_${modelId}`).value) || 1);

    const existing = fabCart.find(i => i.id === modelId && i.color === color && i.talla === talla);
    if (existing) {
        existing.cantidad += cantidad;
    } else {
        fabCart.push({
            id: model.id,
            titulo: model.titulo,
            categoria: model.categoria,
            precio: Number(model.precio),
            color,
            talla,
            cantidad,
            imagen_url: model.imagen_url
        });
    }
    renderFabCart();
    showToast('Prenda agregada a tu pedido de fabricación', 'success');
}

function removeFromFabCart(idx) {
    fabCart.splice(idx, 1);
    renderFabCart();
}

function renderFabCart() {
    const list = document.getElementById('fabCartList');
    const countEl = document.getElementById('fabCartCount');
    const totalEl = document.getElementById('fabCartTotal');

    const totalUnidades = fabCart.reduce((s, i) => s + i.cantidad, 0);
    const totalMonto = fabCart.reduce((s, i) => s + (i.precio * i.cantidad), 0);

    countEl.textContent = totalUnidades;
    totalEl.textContent = `S/ ${totalMonto.toFixed(2)}`;

    if (!fabCart.length) {
        list.innerHTML = '<p class="text-slate-400 italic">Aún no agregas prendas a tu pedido de fabricación.</p>';
        return;
    }

    list.innerHTML = fabCart.map((item, idx) => `
        <div class="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
            <div class="flex items-center gap-2.5">
                <img src="${item.imagen_url}" class="w-10 h-10 rounded-lg object-cover shrink-0">
                <div>
                    <p class="font-bold text-slate-900">${item.titulo} (${item.cantidad} und.)</p>
                    <p class="text-[11px] text-slate-500">Color: <strong>${item.color}</strong> • Talla: <strong>${item.talla}</strong> • S/ ${(item.precio * item.cantidad).toFixed(2)}</p>
                </div>
            </div>
            <button type="button" onclick="removeFromFabCart(${idx})" class="text-rose-600 hover:underline font-bold text-[11px] cursor-pointer">Quitar</button>
        </div>
    `).join('');
}

async function handleSaveFabModel(e) {
    e.preventDefault();
    const { token } = getSession();
    const titulo = document.getElementById('fabModTitulo').value.trim();
    const categoria = document.getElementById('fabModCategoria').value.trim();
    const precio = parseFloat(document.getElementById('fabModPrecio').value);
    const fechaVal = document.getElementById('fabModFechaLimite').value;
    const colores = document.getElementById('fabModColores').value.split(',').map(s => s.trim()).filter(Boolean);
    const tallas = document.getElementById('fabModTallas').value.split(',').map(s => s.trim()).filter(Boolean);
    const descripcion = document.getElementById('fabModDesc').value.trim();
    const fileInput = document.getElementById('fabModImgFile');
    let imagen_url = document.getElementById('fabModImgUrl').value.trim();

    if (fileInput.files && fileInput.files[0]) {
        imagen_url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        });
    }

    if (!imagen_url) {
        showToast('Sube una imagen o pega una URL válida', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/fabricacion/modelos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                titulo,
                categoria,
                precio,
                colores,
                tallas,
                imagen_url,
                fecha_limite: new Date(fechaVal).getTime(),
                descripcion
            })
        });
        if (res.ok) {
            e.target.reset();
            showToast('Modelo publicado para fabricación', 'success');
            await loadFabModelos();
            switchFabTab('cliente');
        } else {
            const err = await res.json();
            showToast(err.error || 'Error al guardar modelo', 'error');
        }
    } catch (err) {
        showToast('Error de conexión con el servidor', 'error');
    }
}

async function deleteFabModel(id) {
    if (!confirm('¿Eliminar este modelo de fabricación?')) return;
    const { token } = getSession();
    try {
        const res = await fetch(`${API_URL}/fabricacion/modelos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Modelo eliminado', 'success');
            await loadFabModelos();
        }
    } catch (err) {
        showToast('No se pudo eliminar', 'error');
    }
}

async function submitFabricacionOrder(e) {
    e.preventDefault();
    if (!fabCart.length) {
        showToast('Agrega al menos una prenda a tu pedido', 'error');
        return;
    }

    const cliente_nombre = document.getElementById('fabClientName').value.trim();
    const cliente_telefono = document.getElementById('fabClientPhone').value.trim();
    const notas = document.getElementById('fabClientNotes').value.trim();
    const total = fabCart.reduce((s, i) => s + (i.precio * i.cantidad), 0);

    try {
        const res = await fetch(`${API_URL}/fabricacion/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente_nombre, cliente_telefono, notas, items: fabCart, total })
        });
        const savedOrder = await res.json();
        if (!res.ok) {
            showToast(savedOrder.error || 'Error al registrar pedido', 'error');
            return;
        }

        // Construir mensaje de WhatsApp con fotos e información completa del pedido
        let msg = `🧵 *NUEVO PEDIDO DE FABRICACIÓN - LIZ FASHION EVOLUTION*\n`;
        msg += `📋 *Código:* ${savedOrder.codigo_pedido}\n`;
        msg += `👤 *Cliente:* ${cliente_nombre}\n`;
        msg += `📱 *WhatsApp:* ${cliente_telefono}\n`;
        if (notas) msg += `📝 *Notas:* ${notas}\n`;
        msg += `\n*DETALLE DEL PEDIDO TOTAL:*\n`;

        fabCart.forEach((item, idx) => {
            msg += `\n${idx + 1}. *${item.titulo}* (${item.categoria})\n`;
            msg += `   • Color: ${item.color} | Talla: ${item.talla} | Cant: ${item.cantidad}\n`;
            msg += `   • Subtotal: S/ ${(item.precio * item.cantidad).toFixed(2)}\n`;
            if (item.imagen_url && item.imagen_url.startsWith('http')) {
                msg += `   • Foto modelo: ${item.imagen_url}\n`;
            }
        });

        msg += `\n💰 *TOTAL PEDIDO FABRICACIÓN: S/ ${total.toFixed(2)}*`;

        const waUrl = `https://wa.me/51931598799?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');

        fabCart = [];
        renderFabCart();
        e.target.reset();
        showToast(`Pedido ${savedOrder.codigo_pedido} guardado y enviado a WhatsApp`, 'success');
    } catch (err) {
        showToast('Error de conexión con el servidor', 'error');
    }
}

async function loadFabAdminOrders() {
    const container = document.getElementById('fabAdminOrdersList');
    const { token } = getSession();
    try {
        const res = await fetch(`${API_URL}/fabricacion/pedidos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await res.json();
        if (!orders.length) {
            container.innerHTML = '<p class="text-slate-400">Aún no hay pedidos de fabricación registrados.</p>';
            return;
        }
        container.innerHTML = orders.map(o => {
            const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
            return `
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="font-black text-rose-600">${o.codigo_pedido}</span> •
                        <strong class="text-slate-900">${o.cliente_nombre}</strong> (${o.cliente_telefono})
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-black text-slate-900">S/ ${Number(o.total).toFixed(2)}</span>
                        <select onchange="updateFabOrderStatus(${o.id}, this.value)" class="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-[11px]">
                            <option value="Pendiente" ${o.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="En Fabricación" ${o.estado === 'En Fabricación' ? 'selected' : ''}>En Fabricación</option>
                            <option value="Entregado" ${o.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${items.map(it => `
                        <div class="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                            <img src="${it.imagen_url}" class="w-12 h-12 rounded-lg object-cover shrink-0">
                            <div>
                                <p class="font-bold text-slate-900">${it.titulo} x${it.cantidad}</p>
                                <p class="text-[11px] text-slate-500">Color: ${it.color} • Talla: ${it.talla}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        container.innerHTML = '<p class="text-rose-600">Error al cargar pedidos recibidos.</p>';
    }
}

async function updateFabOrderStatus(id, estado) {
    const { token } = getSession();
    await fetch(`${API_URL}/fabricacion/pedidos/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estado })
    });
    showToast('Estado del pedido actualizado', 'success');
}

// =========================================================
// CORRECCIÓN DEL BUSCADOR (DESKTOP Y MÓVIL)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    const desktopInput = document.getElementById('searchInputDesktop');
    const mobileInput = document.getElementById('searchInputMobile');
    const clearBtn = document.getElementById('clearSearchDesktop');

    function sincronizarYBuscar(valor) {
        if (desktopInput && desktopInput.value !== valor) desktopInput.value = valor;
        if (mobileInput && mobileInput.value !== valor) mobileInput.value = valor;

        if (clearBtn) {
            clearBtn.classList.toggle('hidden', valor.trim().length === 0);
        }

        if (typeof state !== 'undefined') {
            state.searchQuery = valor;
        }
        if (typeof applyFilters === 'function') {
            applyFilters();
        }
    }

    if (desktopInput) {
        desktopInput.addEventListener('input', (e) => sincronizarYBuscar(e.target.value));
    }
    if (mobileInput) {
        mobileInput.addEventListener('input', (e) => sincronizarYBuscar(e.target.value));
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            sincronizarYBuscar('');
            if (desktopInput) desktopInput.focus();
        });
    }
});