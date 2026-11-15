// =====================================================================
// 1. CONFIGURACIÓN GLOBAL Y CONEXIÓN A RENDER / NEON
// =====================================================================
const API_URL = "https://sistema-web-ropa-liz-fashion-evolution.onrender.com/api";
const EXCHANGE_RATE = 0.27; //[cite: 1]
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
        images: [
            "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"
        ],
        stockBySize: { S: 1, M: 2, L: 0, XL: 1, XXL: 0 },
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

let tempUploadedImages = [];

const CATEGORIES = ['Todos', 'Polos/Camisetas', 'Pantalones/Jeans', 'Casacas/Abrigos', 'Vestidos', 'Faldas'];
const SIZES = ['Todas', 'S', 'M', 'L', 'XL', 'XXL'];
const PROMO_TAGS = ['Todos', 'Normal', 'Remate Final', 'Oferta Flash', 'Últimas Tallas', '2x1'];

// =====================================================================
// 2. AUTENTICACIÓN Y SDKS REALES DE GOOGLE Y FACEBOOK
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
    renderGoogleButton(); // Renderiza el botón oficial al abrir el modal
}

function closeAuthModal() {
    const { user } = getSession();
    if (!user) {
        showToast('Debes iniciar sesión para continuar', 'warning');
        return;
    }
    const modal = document.getElementById('authModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function toggleAuthMode() {
    state.isRegisterMode = !state.isRegisterMode;
    document.getElementById('authModalTitle').textContent = state.isRegisterMode ? 'Crear Cuenta Cliente' : 'Iniciar Sesión';
    document.getElementById('authModalSubtitle').textContent = state.isRegisterMode ? 'Regístrate para guardar tus pedidos' : 'Ingresa con tus redes o correo';
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

// Inicialización de Google Sign-In Oficial
function renderGoogleButton() {
    const container = document.getElementById("googleButtonContainer");
    if (!container || container.children.length > 0) return;

    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Coloca tu Client ID de Google Cloud
            callback: handleGoogleCredentialResponse
        });
        google.accounts.id.renderButton(
            container,
            { theme: "outline", size: "large", width: "360", text: "continue_with", locale: "es" }
        );
    }
}

async function handleGoogleCredentialResponse(response) {
    try {
        const res = await fetch(API_URL + '/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        localStorage.setItem('rs_token', data.token);
        localStorage.setItem('rs_usuario', JSON.stringify(data.usuario));
        closeAuthModal();
        updateAuthUI();
        applyFilters();
        showToast(`¡Bienvenido con Google, ${data.usuario.nombre}!`, 'success');
    } catch (err) {
        showToast('Error de autenticación con Google real: ' + err.message, 'error');
    }
}

// Inicialización de Facebook Login Real
window.addEventListener('DOMContentLoaded', () => {
    if (typeof FB !== 'undefined') {
        FB.init({
            appId: 'TU_FACEBOOK_APP_ID', // Coloca tu App ID de Meta for Developers
            cookie: true,
            xfbml: true,
            version: 'v18.0'
        });
    }
});

function loginWithFacebookReal() {
    if (typeof FB === 'undefined') {
        showToast('El SDK de Facebook está cargando, intenta de nuevo.', 'warning');
        return;
    }
    FB.login(function(response) {
        if (response.authResponse) {
            FB.api('/me', { fields: 'name,email' }, async function(userInfo) {
                try {
                    const res = await fetch(API_URL + '/auth/facebook', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            nombre: userInfo.name || 'Usuario Facebook', 
                            email: userInfo.email || `${userInfo.id}@facebook.com` 
                        })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);

                    localStorage.setItem('rs_token', data.token);
                    localStorage.setItem('rs_usuario', JSON.stringify(data.usuario));
                    closeAuthModal();
                    updateAuthUI();
                    applyFilters();
                    showToast(`¡Bienvenido con Facebook, ${data.usuario.nombre}!`, 'success');
                } catch (err) {
                    showToast('Error al procesar cuenta de Facebook: ' + err.message, 'error');
                }
            });
        } else {
            showToast('Inicio de sesión con Facebook cancelado.', 'warning');
        }
    }, { scope: 'public_profile,email' });
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
// 3. RESTO DE FUNCIONES (CATÁLOGO, CARRITO, CONFECCIÓN)
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
                    : (p.stock_by_size || { S: 2, M: 3, L: 2, XL: 1, XXL: 0 });
                const total = Object.values(parsedStock).reduce((a, b) => a + b, 0);

                let parsedImages = [];
                try {
                    if (Array.isArray(p.imagenes)) {
                        parsedImages = p.imagenes;
                    } else if (typeof p.imagenes === 'string') {
                        parsedImages = JSON.parse(p.imagenes);
                    }
                } catch (e) {
                    parsedImages = [];
                }

                if (parsedImages.length === 0 && p.imagen_url) {
                    parsedImages = [p.imagen_url];
                }
                if (parsedImages.length === 0) {
                    parsedImages = ['https://placehold.co/600x750/1e293b/ffffff?text=Prenda'];
                }

                let parsedVariants = [];
                try {
                    if (p.variant_details) {
                        parsedVariants = typeof p.variant_details === 'string' ? JSON.parse(p.variant_details) : p.variant_details;
                    }
                } catch (e) {
                    parsedVariants = [];
                }

                const parsedColors = p.colores
                    ? (Array.isArray(p.colores) ? p.colores : String(p.colores).split(',').map(c => c.trim()).filter(Boolean))
                    : ['Corinto', 'Negro', 'Rojo', 'Beige'];

                return {
                    id: p.id,
                    code: `LIZ-${String(p.id).padStart(4, '0')}`,
                    name: p.titulo,
                    category: p.categoria,
                    tag: p.etiqueta || 'Remate Final',
                    regularPrice: Number(p.precio_original),
                    salePrice: Number(p.precio_remate),
                    image: parsedImages[0],
                    images: parsedImages,
                    variantDetails: parsedVariants,
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

function formatPrice(penAmount) {
    if (state.currency === 'USD') {
        return `$ ${(penAmount * EXCHANGE_RATE).toFixed(2)}`;
    }
    return `S/ ${penAmount.toFixed(2)}`;
}

function getDiscountPercent(regular, sale) {
    return Math.round(((regular - sale) / regular) * 100);
}

function getTotalStock(product, currentImgIdx = 0) {
    const stockMap = (product.variantDetails && product.variantDetails[currentImgIdx]) 
        ? product.variantDetails[currentImgIdx].stockBySize 
        : product.stockBySize;
    return Object.values(stockMap).reduce((sum, val) => sum + val, 0);
}

function getFirstAvailableSize(product, currentImgIdx = 0) {
    const stockMap = (product.variantDetails && product.variantDetails[currentImgIdx]) 
        ? product.variantDetails[currentImgIdx].stockBySize 
        : product.stockBySize;
    for (const sz of ['S', 'M', 'L', 'XL', 'XXL']) {
        if (stockMap[sz] > 0) return sz;
    }
    return 'M';
}

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
    
    const desktopInput = document.getElementById('searchInputDesktop');
    const mobileInput = document.getElementById('searchInputMobile');
    const queryText = (desktopInput ? desktopInput.value : '') || (mobileInput ? mobileInput.value : '') || state.searchQuery || '';
    state.searchQuery = queryText;
    const query = queryText.trim().toLowerCase();

    let filtered = PRODUCTS.filter(p => {
        const rawImgIdx = sliderIndexes[p.id] || 0;
        const currentImgIdx = rawImgIdx < (p.images?.length || 1) ? rawImgIdx : 0;
        const currentStockMap = (p.variantDetails && p.variantDetails[currentImgIdx]) 
            ? p.variantDetails[currentImgIdx].stockBySize 
            : p.stockBySize;

        if (state.category !== 'Todos' && p.category !== state.category) return false;
        if (state.promoTag !== 'Todos' && p.tag !== state.promoTag) return false;
        if (state.size !== 'Todas' && (!currentStockMap[state.size] || currentStockMap[state.size] <= 0)) return false;
        
        if (query) {
            const matchName = p.name.toLowerCase().includes(query);
            const matchCategory = p.category.toLowerCase().includes(query);
            const matchMaterial = (p.material || '').toLowerCase().includes(query);
            if (!matchName && !matchCategory && !matchMaterial) return false;
        }
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
        const rawImgIdx = sliderIndexes[product.id] || 0;
        let imagesList = product.images && Array.isArray(product.images) && product.images.length > 0 
            ? product.images 
            : [product.image || 'https://placehold.co/600x750/1e293b/ffffff?text=Prenda'];

        const currentImgIdx = rawImgIdx < imagesList.length ? rawImgIdx : 0;
        const currentStockMap = (product.variantDetails && product.variantDetails[currentImgIdx]) 
            ? product.variantDetails[currentImgIdx].stockBySize 
            : product.stockBySize;

        const currentSalePrice = (product.variantDetails && product.variantDetails[currentImgIdx] && product.variantDetails[currentImgIdx].salePrice !== undefined && product.variantDetails[currentImgIdx].salePrice !== null && product.variantDetails[currentImgIdx].salePrice !== '')
            ? Number(product.variantDetails[currentImgIdx].salePrice)
            : product.salePrice;

        const discountPct = getDiscountPercent(product.regularPrice, currentSalePrice);
        const totalStock = Object.values(currentStockMap).reduce((sum, val) => sum + val, 0);
        const stockPercent = Math.min(100, Math.max(10, Math.round((totalStock / product.maxInitialStock) * 100)));
        const selectedSize = state.selectedSizesPerCard[product.id] || getFirstAvailableSize(product, currentImgIdx);
        const isLowStock = totalStock <= 4;
        const productCode = product.code || `LIZ-${String(product.id).padStart(4, '0')}`;
        
        let allColorsList = [];
        if (product.variantDetails && product.variantDetails.length > 0) {
            allColorsList = product.variantDetails.map((v, idx) => ({ name: v.color || 'Único', index: idx }));
        } else if (product.colors && product.colors.length > 0) {
            allColorsList = product.colors.map((c, idx) => ({ name: c, index: idx }));
        } else {
            allColorsList = [{ name: 'Único', index: 0 }];
        }

        return `
            <article class="group bg-white rounded-2xl border border-slate-200/95 shadow-xs hover:shadow-xl hover:border-rose-200 transition-all duration-300 flex flex-col">
                <div class="relative w-full h-80 sm:h-96 bg-slate-100 overflow-hidden group/img shrink-0">
                    <div id="slider-${product.id}" class="h-full flex transition-transform duration-300 ease-out" style="width: ${imagesList.length * 100}%; transform: translateX(-${(currentImgIdx * (100 / imagesList.length))}%);">
                        ${imagesList.map((imgUrl, imgIdx) => `
                            <div class="h-full relative bg-slate-100" style="width: ${100 / imagesList.length}%;">
                                <img src="${imgUrl}" alt="${product.name} - ${imgIdx}" loading="lazy" class="w-full h-full object-cover object-center cursor-pointer">
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">${product.category}</span>
                            <span class="text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">CÓD: ${productCode}</span>
                        </div>
                        <h3 class="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">${product.name}</h3>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-xl sm:text-2xl font-black ${discountPct > 0 ? 'text-rose-600' : 'text-slate-900'}">${formatPrice(currentSalePrice)}</span>
                        ${discountPct > 0 ? `<span class="text-xs sm:text-sm text-slate-400 line-through">${formatPrice(product.regularPrice)}</span>` : ''}
                    </div>
                    <button onclick="addToCart(${product.id})" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer">
                        <i data-lucide="shopping-bag" class="w-4 h-4"></i> Agregar al Carrito
                    </button>
                </div>
            </article>
        `;
    }).join('');
    lucide.createIcons();
}

function addToCart(productId, explicitSize = null) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    state.cart.push({ productId, size: 'M', color: 'Único', qty: 1 });
    renderCart();
    showToast(`Agregado al carrito: ${product.name}`, 'success');
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;
    const totalItems = state.cart.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById('headerCartBadge').textContent = totalItems;
    document.getElementById('drawerItemCountText').textContent = `${totalItems} prendas seleccionadas[cite: 1]`;
    container.innerHTML = state.cart.map(item => `<div class="p-2 bg-slate-50 rounded">Prenda ID: ${item.productId}</div>`).join('');
}

function toggleCartDrawer(open) {
    document.getElementById('cartDrawerBackdrop').classList.toggle('hidden', !open);
    document.getElementById('cartDrawer').classList.toggle('translate-x-full', !open);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold pointer-events-auto';
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateGlobalStockCounter() {
    const counter = document.getElementById('totalStockCounter');
    if (counter) counter.textContent = '25';
}

const sliderIndexes = {};

document.addEventListener('DOMContentLoaded', async () => {
    updateAuthUI();
    const { user } = getSession();
    if (!user) {
        openAuthModal();
    }
    renderFilterControls();
    await fetchProductsFromDB();
});

// Modales y Módulos Adicionales (Confección y Reportes)
function abrirModuloConfeccion() { document.getElementById('confeccionModal').classList.remove('hidden'); document.getElementById('confeccionModal').classList.add('flex'); }
function cerrarModuloConfeccion() { document.getElementById('confeccionModal').classList.add('hidden'); }
function openProductFormModal() { document.getElementById('productFormModal').classList.remove('hidden'); document.getElementById('productFormModal').classList.add('flex'); }
function closeProductFormModal() { document.getElementById('productFormModal').classList.add('hidden'); }