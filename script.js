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

const CATEGORIES = ['Todos', 'Polos/Camisetas', 'Blusas', 'Polos/Manga Larga','Cafeneras', 'Polos/Bordados','Polos/Manga 3/4', 'Vestidos', 'Faldas'];
const SIZES = ['Todas', 'S', 'M', 'L', 'XL', 'XXL'];
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

function loginWithSocial(provider) {
    const demoUser = {
        id: Date.now(),
        nombre: provider === 'Google' ? 'Usuario Google' : 'Usuario Facebook',
        email: `usuario_${provider.toLowerCase()}@lizfashion.com`,
        rol: 'cliente'
    };
    
    localStorage.setItem('rs_token', 'social_token_' + Date.now());
    localStorage.setItem('rs_usuario', JSON.stringify(demoUser));
    closeAuthModal();
    updateAuthUI();
    applyFilters();
    showToast(`¡Bienvenido a LIZ FASHION EVOLUTION con ${provider}!`, 'success');
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

async function handleImageFilesSelection(e) {
    const files = Array.from(e.target.files);
    tempUploadedImages = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            reader.readAsDataURL(file);
        });
        tempUploadedImages.push(base64);
    }

    renderDynamicVariantsInputs();
}

function renderDynamicVariantsInputs(existingVariants = null) {
    const container = document.getElementById('dynamicImageVariantsContainer');
    if (!container) return;

    if (tempUploadedImages.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400 italic">Sube o selecciona imágenes para configurar el stock y color de cada una.</div>`;
        return;
    }

    container.innerHTML = tempUploadedImages.map((imgSrc, idx) => {
        const existingVar = existingVariants && existingVariants[idx] ? existingVariants[idx] : null;
        
        const v = {
            color: existingVar ? (existingVar.color || '') : (idx === 0 ? 'Corinto' : idx === 1 ? 'Negro' : idx === 2 ? 'Rojo' : 'Beige'),
            salePrice: existingVar ? (existingVar.salePrice ?? '') : '',
            stockBySize: {
                S: existingVar?.stockBySize?.S ?? 0,
                M: existingVar?.stockBySize?.M ?? 0,
                L: existingVar?.stockBySize?.L ?? 0,
                XL: existingVar?.stockBySize?.XL ?? 0,
                XXL: existingVar?.stockBySize?.XXL ?? 0
            }
        };

        return `
            <div class="bg-white p-3 rounded-xl border border-slate-200 space-y-2 variant-row relative" data-index="${idx}">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <img src="${imgSrc}" class="w-12 h-14 object-cover rounded-lg border shrink-0">
                        <div class="flex-1 grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-[10px] font-bold text-slate-500">Color Imagen #${idx + 1}</label>
                                <input type="text" class="variant-color w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" value="${v.color}" placeholder="Ej. Negro">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-slate-500">Precio Opcional (S/)</label>
                                <input type="number" step="0.10" class="variant-price w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" value="${v.salePrice}" placeholder="Opcional">
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="eliminarImagenPrenda(${idx})" class="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition-colors cursor-pointer" title="Eliminar imagen vendida">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                <div>
                    <span class="text-[10px] font-bold text-slate-500 block mb-1">Stock por Talla (Imagen #${idx + 1}):</span>
                    <div class="grid grid-cols-5 gap-1 text-center">
                        <div>
                            <span class="text-[9px] text-slate-400">S</span>
                            <input type="number" min="0" class="v-stock-s w-full px-1 py-1 bg-slate-50 border rounded text-center text-xs font-bold" value="${v.stockBySize.S}">
                        </div>
                        <div>
                            <span class="text-[9px] text-slate-400">M</span>
                            <input type="number" min="0" class="v-stock-m w-full px-1 py-1 bg-slate-50 border rounded text-center text-xs font-bold" value="${v.stockBySize.M}">
                        </div>
                        <div>
                            <span class="text-[9px] text-slate-400">L</span>
                            <input type="number" min="0" class="v-stock-l w-full px-1 py-1 bg-slate-50 border rounded text-center text-xs font-bold" value="${v.stockBySize.L}">
                        </div>
                        <div>
                            <span class="text-[9px] text-slate-400">XL</span>
                            <input type="number" min="0" class="v-stock-xl w-full px-1 py-1 bg-slate-50 border rounded text-center text-xs font-bold" value="${v.stockBySize.XL}">
                        </div>
                        <div>
                            <span class="text-[9px] text-slate-400">XXL</span>
                            <input type="number" min="0" class="v-stock-xxl w-full px-1 py-1 bg-slate-50 border rounded text-center text-xs font-bold" value="${v.stockBySize.XXL}">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

function eliminarImagenPrenda(index) {
    if (tempUploadedImages.length <= 1) {
        showToast('La prenda debe conservar al menos una imagen', 'warning');
        return;
    }
    
    tempUploadedImages.splice(index, 1);
    
    const variantRows = document.querySelectorAll('.variant-row');
    let currentVariants = [];
    variantRows.forEach((row, rIdx) => {
        if (rIdx !== index) {
            currentVariants.push({
                color: row.querySelector('.variant-color').value,
                salePrice: row.querySelector('.variant-price').value,
                stockBySize: {
                    S: parseInt(row.querySelector('.v-stock-s').value) || 0,
                    M: parseInt(row.querySelector('.v-stock-m').value) || 0,
                    L: parseInt(row.querySelector('.v-stock-l').value) || 0,
                    XL: parseInt(row.querySelector('.v-stock-xl').value) || 0,
                    XXL: parseInt(row.querySelector('.v-stock-xxl')?.value) || 0
                }
            });
        }
    });

    renderDynamicVariantsInputs(currentVariants.length > 0 ? currentVariants : null);
    showToast('Imagen eliminada de la lista', 'warning');
}

function openProductFormModal(product = null) {
    const modal = document.getElementById('productFormModal');
    if (!modal) return;

    document.getElementById('formProductId').value = product ? product.id : '';
    document.getElementById('productFormTitle').textContent = product ? 'Editar Prenda' : 'Subir Nueva Prenda';
    document.getElementById('formName').value = product ? (product.name || '') : '';
    document.getElementById('formCategory').value = product ? (product.category || 'Polos/Camisetas') : 'Polos/Camisetas';
    document.getElementById('formTag').value = product ? (product.tag || 'Normal') : 'Normal';
    document.getElementById('formSalePrice').value = product ? product.salePrice : '';
    document.getElementById('formRegularPrice').value = product ? product.regularPrice : '';
    document.getElementById('formDescription').value = product ? (product.description || '') : '';
    document.getElementById('formMaterial').value = product ? (product.material || '') : '';
    
    tempUploadedImages = product && product.images ? [...product.images] : (product ? [product.image] : []);
    renderDynamicVariantsInputs(product ? product.variantDetails : null);

    document.getElementById('formImageUrl').value = product && product.images ? product.images.join(', ') : '';
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
    
    const imageUrlInput = document.getElementById('formImageUrl').value.trim();
    if (imageUrlInput && tempUploadedImages.length === 0) {
        tempUploadedImages = imageUrlInput.split(',').map(u => u.trim()).filter(Boolean);
    }

    if (tempUploadedImages.length === 0) {
        tempUploadedImages = ['https://placehold.co/600x750/1e293b/ffffff?text=Prenda'];
    }

    const variantRows = document.querySelectorAll('.variant-row');
    let variantDetails = [];
    let allColores = [];

    variantRows.forEach((row) => {
        const color = row.querySelector('.variant-color').value.trim() || 'Único';
        const priceInput = row.querySelector('.variant-price').value;
        const s = parseInt(row.querySelector('.v-stock-s').value) || 0;
        const m = parseInt(row.querySelector('.v-stock-m').value) || 0;
        const l = parseInt(row.querySelector('.v-stock-l').value) || 0;
        const xl = parseInt(row.querySelector('.v-stock-xl').value) || 0;
        const xxl = parseInt(row.querySelector('.v-stock-xxl')?.value) || 0;

        allColores.push(color);
        variantDetails.push({
            color,
            salePrice: priceInput ? parseFloat(priceInput) : null,
            stockBySize: { S: s, M: m, L: l, XL: xl, XXL: xxl }
        });
    });

    if (variantDetails.length === 0) {
        variantDetails.push({
            color: 'Corinto',
            salePrice: null,
            stockBySize: { S: 2, M: 3, L: 2, XL: 1, XXL: 0 }
        });
        allColores = ['Corinto', 'Negro', 'Rojo'];
    }

    const aggregatedStock = variantDetails.reduce((acc, v) => {
        acc.S += v.stockBySize.S;
        acc.M += v.stockBySize.M;
        acc.L += v.stockBySize.L;
        acc.XL += v.stockBySize.XL;
        acc.XXL += (v.stockBySize.XXL || 0);
        return acc;
    }, { S: 0, M: 0, L: 0, XL: 0, XXL: 0 });

    const tagVal = document.getElementById('formTag').value;
    const baseSalePrice = parseFloat(document.getElementById('formSalePrice').value) || 0;
    const regularPriceVal = tagVal === 'Normal' ? baseSalePrice : (parseFloat(document.getElementById('formRegularPrice').value) || baseSalePrice);

    const payload = {
        titulo: document.getElementById('formName').value.trim(),
        categoria: document.getElementById('formCategory').value,
        etiqueta: tagVal,
        precio_remate: baseSalePrice,
        precio_original: regularPriceVal,
        stock_by_size: aggregatedStock,
        variant_details: variantDetails,
        material: document.getElementById('formMaterial').value.trim(),
        colores: [...new Set(allColores)],
        descripcion: document.getElementById('formDescription').value.trim(),
        imagen_url: tempUploadedImages[0],
        imagenes: tempUploadedImages
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
            showToast(id ? 'Prenda actualizada con éxito' : '¡Nueva prenda publicada con stock por imagen!', 'success');
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

        let tagBadgeClass = "bg-slate-900 text-white";
        if (product.tag === 'Remate Final') tagBadgeClass = "bg-rose-600 text-white";
        if (product.tag === 'Oferta Flash') tagBadgeClass = "bg-amber-500 text-slate-950";
        if (product.tag === '2x1') tagBadgeClass = "bg-indigo-600 text-white";
        if (product.tag === 'Últimas Tallas') tagBadgeClass = "bg-rose-700 text-white";

        return `
            <article class="group bg-white rounded-2xl border border-slate-200/95 shadow-xs hover:shadow-xl hover:border-rose-200 transition-all duration-300 flex flex-col">
                <div class="relative w-full h-80 sm:h-96 bg-slate-100 overflow-hidden group/img shrink-0">
                    <div id="slider-${product.id}" class="h-full flex transition-transform duration-300 ease-out" style="width: ${imagesList.length * 100}%; transform: translateX(-${(currentImgIdx * (100 / imagesList.length))}%);">
                        ${imagesList.map((imgUrl, imgIdx) => `
                            <div class="h-full relative bg-slate-100" style="width: ${100 / imagesList.length}%;">
                                <img src="${imgUrl}" alt="${product.name} - ${imgIdx}" loading="lazy" onerror="this.src='https://placehold.co/600x750/1e293b/ffffff?text=${encodeURIComponent(product.name)}'" class="w-full h-full object-cover object-center cursor-pointer">
                            </div>
                        `).join('')}
                    </div>

                    ${imagesList.length > 1 ? `
                        <button type="button" onclick="event.stopPropagation(); slideImage(${product.id}, -1)" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer z-10">❮</button>
                        <button type="button" onclick="event.stopPropagation(); slideImage(${product.id}, 1)" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer z-10">❯</button>
                    ` : ''}

                    <div class="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none z-20">
                        ${discountPct > 0 ? `<span class="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">-${discountPct}% OFF</span>` : ''}
                        ${product.tag !== 'Normal'
                            ? `<span class="${tagBadgeClass} text-[11px] font-extrabold px-2.5 py-0.5 rounded-md shadow-sm uppercase">${product.tag}</span>`
                            : `<span class="bg-slate-900/85 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase">Nueva Colección</span>`}
                    </div>
                    ${isLowStock ? `<div class="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 pointer-events-none z-20"><span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>¡ÚLTIMAS ${totalStock} UNIDADES!</div>` : ''}
                </div>

                <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">${product.category}</span>
                            <span class="text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">CÓD: ${productCode}</span>
                        </div>
                        <h3 class="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">${product.name}</h3>
                    </div>
                   ${product.description ? `<p class="text-xs text-slate-600 mt-1 mb-2">${product.description}</p>` : ''}
                    <div class="flex items-baseline gap-2">
                        <span class="text-xl sm:text-2xl font-black ${discountPct > 0 ? 'text-rose-600' : 'text-slate-900'}">${formatPrice(currentSalePrice)}</span>
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
                            <span class="text-[11px] font-bold text-slate-500">Tallas en Stock:</span>
                        </div>
                        <div class="grid grid-cols-5 gap-1">
                            ${['S', 'M', 'L', 'XL', 'XXL'].map(sz => {
                                const qty = currentStockMap[sz] || 0;
                                const outOfStock = qty <= 0;
                                const isSelected = selectedSize === sz && !outOfStock;
                                return `
                                    <button type="button" ${outOfStock ? 'disabled' : `onclick="selectCardSize(${product.id}, '${sz}')"`}
                                        class="py-1.5 px-1 rounded-lg text-[10px] sm:text-xs font-extrabold border transition-all flex flex-col items-center justify-center ${
                                            outOfStock ? 'bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed' :
                                            isSelected ? 'bg-slate-900 text-white border-slate-900 cursor-pointer' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-900 cursor-pointer'
                                        }">
                                        <span>${sz}</span>
                                        <span class="text-[9px] opacity-80">(${qty})</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div>
                        <span class="block text-[11px] font-bold text-slate-500 mb-1.5">Colores Disponibles / Activos:</span>
                        <div class="flex flex-wrap gap-1.5">
                            ${allColorsList.map(cObj => {
                                const isActive = currentImgIdx === cObj.index;
                                return `
                                    <button type="button" onclick="jumpToColorImage(${product.id}, ${cObj.index})" 
                                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                            isActive 
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-1 ring-rose-400' 
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-rose-400 hover:text-rose-600'
                                        }">
                                        🎨 <span>${cObj.name}</span>
                                    </button>
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

function jumpToColorImage(productId, imgIndex) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const imagesList = product.images && product.images.length > 0 ? product.images : [product.image];
    if (imgIndex < 0 || imgIndex >= imagesList.length) return;

    sliderIndexes[productId] = imgIndex;
    const slider = document.getElementById(`slider-${productId}`);
    if (slider) {
        slider.style.transform = `translateX(-${imgIndex * (100 / imagesList.length)}%)`;
    }
    applyFilters();
}

// =====================================================================
// 6. CARRITO, WHATSAPP Y UTILIDADES
// =====================================================================
function addToCart(productId, explicitSize = null) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    
    const rawImgIdx = sliderIndexes[productId] || 0;
    const currentImgIdx = rawImgIdx < (product.images?.length || 1) ? rawImgIdx : 0;
    const currentStockMap = (product.variantDetails && product.variantDetails[currentImgIdx]) 
        ? product.variantDetails[currentImgIdx].stockBySize 
        : product.stockBySize;

    const size = explicitSize || state.selectedSizesPerCard[productId] || getFirstAvailableSize(product, currentImgIdx);
    
    let color = 'Único';
    if (product.variantDetails && product.variantDetails[currentImgIdx] && product.variantDetails[currentImgIdx].color) {
        color = product.variantDetails[currentImgIdx].color;
    } else if (product.colors && product.colors[currentImgIdx]) {
        color = product.colors[currentImgIdx];
    }

    const availableStock = currentStockMap[size] || 0;
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
    const rawImgIdx = sliderIndexes[productId] || 0;
    let col = 'Único';
    if (p.variantDetails && p.variantDetails[rawImgIdx] && p.variantDetails[rawImgIdx].color) {
        col = p.variantDetails[rawImgIdx].color;
    } else if (p.colors && p.colors[rawImgIdx]) {
        col = p.colors[rawImgIdx];
    }
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

    const currentIdx = sliderIndexes[productId];
    slider.style.transform = `translateX(-${currentIdx * (100 / totalImages)}%)`;

    applyFilters();
}

async function fetchOfferTime() {
    let targetTime = localStorage.getItem('liz_offer_end');
    
    if (targetTime && Number(targetTime) > new Date().getTime()) {
        startCountdown(Number(targetTime));
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${API_URL}/oferta-tiempo`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data && data.offer_end_time && Number(data.offer_end_time) > new Date().getTime()) {
                targetTime = Number(data.offer_end_time);
                localStorage.setItem('liz_offer_end', targetTime);
                startCountdown(Number(targetTime));
                return;
            }
        }
    } catch (err) {
        console.warn('Render está despertando o sin conexión. Usando horario local.');
    }

    if (!targetTime || Number(targetTime) <= new Date().getTime()) {
        targetTime = new Date().getTime() + (24 * 60 * 60 * 1000);
        localStorage.setItem('liz_offer_end', targetTime);
        startCountdown(Number(targetTime));
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

document.addEventListener('DOMContentLoaded', async () => {
    updateAuthUI();
    
    const { user } = getSession();
    if (!user) {
        openAuthModal();
        const subtitle = document.getElementById('authModalSubtitle');
        if (subtitle) {
            subtitle.textContent = "Debes iniciar sesión o registrarte para acceder a la web";
            subtitle.classList.add('text-rose-600', 'font-bold');
        }
    }

    const fileInput = document.getElementById('formImageFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleImageFilesSelection);
    }

    const confFileInput = document.getElementById('confImagenFile');
    if (confFileInput) {
        confFileInput.addEventListener('change', handleConfeccionFilesSelection);
    }

    renderFilterControls();
    await fetchProductsFromDB();
    fetchOfferTime();
});

// =====================================================================
// MÓDULO DE PEDIDOS DE CONFECCIÓN, GESTIÓN DE IMÁGENES Y REPORTE (NEON DB)
// =====================================================================
let tempConfeccionImagenes = [];
const confSliderIndexes = {};
let confeccionPrendasCache = [];
let confeccionConfigCache = {
    inicio: new Date().toISOString().slice(0, 16),
    fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    comunicado: '¡Bienvenidos a nuestra campaña de confección personalizada! Selecciona tu modelo favorito, color y talla dentro del plazo indicado.'
};
let confeccionPedidosCache = [];

async function sincronizarDatosConfeccionDB() {
    try {
        const [resConfig, resPrendas] = await Promise.all([
            fetch(`${API_URL}/confeccion/config`),
            fetch(`${API_URL}/confeccion/prendas`)
        ]);

        if (resConfig.ok) {
            const cfg = await resConfig.json();
            if (cfg && cfg.fecha_inicio && cfg.fecha_fin) {
                confeccionConfigCache = {
                    inicio: cfg.fecha_inicio,
                    fin: cfg.fecha_fin,
                    comunicado: cfg.comunicado || ''
                };
            }
        }

        if (resPrendas.ok) {
            const lista = await resPrendas.json();
            if (Array.isArray(lista)) {
                confeccionPrendasCache = lista.map(p => {
                    const cols = typeof p.colores === 'string' ? JSON.parse(p.colores) : (p.colores || []);
                    const tlls = typeof p.tallas === 'string' ? JSON.parse(p.tallas) : (p.tallas || []);
                    const imgs = typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : (p.imagenes || []);
                    return {
                        id: p.id,
                        modelo: p.modelo,
                        precio: Number(p.precio),
                        colores: cols,
                        tallas: tlls,
                        imagen: p.imagen || (imgs[0] || ''),
                        imagenes: Array.isArray(imgs) && imgs.length > 0 ? imgs : (p.imagen ? [p.imagen] : [])
                    };
                });
            }
        }
    } catch (err) {
        console.warn('Error sincronizando módulo de confección con Neon:', err.message);
    }
}

async function abrirModuloConfeccion() {
    const modal = document.getElementById('confeccionModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        cambiarTabConfeccion('catalogo');
        verificarPermisosAdminConfeccionTabs();
        await sincronizarDatosConfeccionDB();
        renderizarBannerPeriodoConfeccion();
        renderCatalogoConfeccion();
        verificarPermisosAdminConfeccionTabs();
        lucide.createIcons();
    }
}

function cerrarModuloConfeccion() {
    const modal = document.getElementById('confeccionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function verificarPermisosAdminConfeccionTabs() {
    const { isAdmin } = getSession();
    const btnAdmin = document.getElementById('tabBtnAdmin');
    const btnReporte = document.getElementById('tabBtnReporte');
    const badgeRol = document.getElementById('badgeRolConfeccion');
    const btnEditarFechasCat = document.getElementById('btnEditarFechasCatalogoAdmin');
    const panelEditarFechas = document.getElementById('panelEditarFechasCatalogo');

    if (isAdmin) {
        if (btnAdmin) btnAdmin.classList.remove('hidden');
        if (btnReporte) btnReporte.classList.remove('hidden');
        if (btnEditarFechasCat) {
            btnEditarFechasCat.classList.remove('hidden');
            btnEditarFechasCat.classList.add('inline-flex');
        }
        if (badgeRol) {
            badgeRol.textContent = 'Modo Administrador';
            badgeRol.className = 'text-xs font-extrabold text-slate-950 bg-amber-400 px-3 py-1 rounded-full shadow-2xs';
        }
        
        const configFechas = obtenerConfigFechasConfeccion();
        const inputInicio = document.getElementById('confFechaInicio');
        const inputFin = document.getElementById('confFechaFin');
        if (inputInicio && configFechas.inicio) inputInicio.value = configFechas.inicio;
        if (inputFin && configFechas.fin) inputFin.value = configFechas.fin;
    } else {
        if (btnAdmin) btnAdmin.classList.add('hidden');
        if (btnReporte) btnReporte.classList.add('hidden');
        if (btnEditarFechasCat) {
            btnEditarFechasCat.classList.add('hidden');
            btnEditarFechasCat.classList.remove('inline-flex');
        }
        if (panelEditarFechas) panelEditarFechas.classList.add('hidden');
        if (badgeRol) {
            badgeRol.textContent = 'Vista Cliente';
            badgeRol.className = 'text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full';
        }
    }
    lucide.createIcons();
}

function togglePanelEditarFechasCatalogo(forceState = null) {
    const panel = document.getElementById('panelEditarFechasCatalogo');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    const show = forceState !== null ? forceState : isHidden;

    if (show) {
        const conf = obtenerConfigFechasConfeccion();
        const qInicio = document.getElementById('quickConfFechaInicio');
        const qFin = document.getElementById('quickConfFechaFin');
        const qCom = document.getElementById('quickConfComunicado');
        if (qInicio) qInicio.value = conf.inicio || '';
        if (qFin) qFin.value = conf.fin || '';
        if (qCom) qCom.value = conf.comunicado || '';
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
    lucide.createIcons();
}

async function guardarFechasYComunicadoRapido(e) {
    e.preventDefault();
    const { token } = getSession();
    const inicio = document.getElementById('quickConfFechaInicio').value;
    const fin = document.getElementById('quickConfFechaFin').value;
    const comunicado = document.getElementById('quickConfComunicado').value.trim();

    if (!inicio || !fin) {
        showToast('Debes completar ambas fechas', 'warning');
        return;
    }

    const comunicadoFinal = comunicado || '¡Bienvenidos a nuestra campaña de confección personalizada! Selecciona tu modelo favorito, color y talla dentro del plazo indicado.';

    try {
        const res = await fetch(`${API_URL}/confeccion/config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fecha_inicio: inicio,
                fecha_fin: fin,
                comunicado: comunicadoFinal
            })
        });

        if (!res.ok) throw new Error('Error al guardar en base de datos');

        confeccionConfigCache = { inicio, fin, comunicado: comunicadoFinal };

        const formInicio = document.getElementById('confFechaInicio');
        const formFin = document.getElementById('confFechaFin');
        if (formInicio) formInicio.value = inicio;
        if (formFin) formFin.value = fin;

        togglePanelEditarFechasCatalogo(false);
        renderizarBannerPeriodoConfeccion();
        renderCatalogoConfeccion();
        showToast('¡Fechas y Comunicado Oficial guardados en Neon!', 'success');
    } catch (err) {
        showToast('Error al guardar configuración: ' + err.message, 'error');
    }
}

async function cambiarTabConfeccion(tab) {
    const secCat = document.getElementById('seccionTabCatalogo');
    const secAdm = document.getElementById('seccionTabAdmin');
    const secRep = document.getElementById('seccionTabReporte');

    const btnCat = document.getElementById('tabBtnCatalogo');
    const btnAdm = document.getElementById('tabBtnAdmin');
    const btnRep = document.getElementById('tabBtnReporte');

    secCat.classList.add('hidden');
    secAdm.classList.add('hidden');
    secRep.classList.add('hidden');

    const inactiveTabClass = "px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200/80 transition border border-slate-200 cursor-pointer";
    const activeTabClass = "px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer";

    btnCat.className = inactiveTabClass;
    if (btnAdm) btnAdm.className = inactiveTabClass;
    if (btnRep) btnRep.className = inactiveTabClass;

    if (tab === 'catalogo') {
        secCat.classList.remove('hidden');
        btnCat.className = activeTabClass;
        renderizarBannerPeriodoConfeccion();
        renderCatalogoConfeccion();
    } else if (tab === 'admin') {
        secAdm.classList.remove('hidden');
        if (btnAdm) btnAdm.className = activeTabClass;
        const conf = obtenerConfigFechasConfeccion();
        if (document.getElementById('confFechaInicio')) document.getElementById('confFechaInicio').value = conf.inicio;
        if (document.getElementById('confFechaFin')) document.getElementById('confFechaFin').value = conf.fin;
        renderGaleriaPreviewConfeccion();
    } else if (tab === 'reporte') {
        secRep.classList.remove('hidden');
        if (btnRep) btnRep.className = activeTabClass;
        await renderReporteClientes();
    }
    lucide.createIcons();
}

function obtenerConfigFechasConfeccion() {
    return confeccionConfigCache;
}

function renderizarBannerPeriodoConfeccion() {
    const lblFechas = document.getElementById('lblPeriodoFechas');
    const lblEstado = document.getElementById('lblEstadoPeriodo');
    const banner = document.getElementById('confeccionPeriodoBanner');
    const txtComunicado = document.getElementById('textoComunicadoOficial');
    const cuadroComunicado = document.getElementById('cuadroComunicadoOficial');
    if (!lblFechas || !lblEstado) return;

    const conf = obtenerConfigFechasConfeccion();
    const ahora = new Date().getTime();
    const fInicio = new Date(conf.inicio).getTime();
    const fFin = new Date(conf.fin).getTime();

    if (txtComunicado && cuadroComunicado) {
        if (conf.comunicado && conf.comunicado.trim() !== '') {
            txtComunicado.textContent = conf.comunicado;
            cuadroComunicado.classList.remove('hidden');
        } else {
            cuadroComunicado.classList.add('hidden');
        }
    }

    const formatF = (dStr) => {
        const d = new Date(dStr);
        return isNaN(d) ? dStr : d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    };

    lblFechas.textContent = `Del ${formatF(conf.inicio)} al ${formatF(conf.fin)}`;

    if (ahora < fInicio) {
        lblEstado.textContent = '⏳ PRÓXIMAMENTE';
        lblEstado.className = 'bg-amber-500 text-slate-950 font-black px-3 py-1.5 rounded-xl uppercase text-[11px] tracking-wider shadow-2xs';
        if (banner) banner.className = "bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm";
    } else if (ahora >= fInicio && ahora <= fFin) {
        lblEstado.textContent = '🟢 PEDIDOS ABIERTOS';
        lblEstado.className = 'bg-emerald-600 text-white font-black px-3 py-1.5 rounded-xl uppercase text-[11px] tracking-wider shadow-2xs';
        if (banner) banner.className = "bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm";
    } else {
        lblEstado.textContent = '🔴 PLAZO CULMINADO (CERRADO)';
        lblEstado.className = 'bg-rose-600 text-white font-black px-3 py-1.5 rounded-xl uppercase text-[11px] tracking-wider shadow-2xs';
        if (banner) banner.className = "bg-rose-50/70 border border-rose-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm";
    }
    lucide.createIcons();
}

function obtenerPrendasConfeccion() {
    return confeccionPrendasCache;
}

async function handleConfeccionFilesSelection(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            reader.readAsDataURL(file);
        });
        tempConfeccionImagenes.push(base64);
    }
    e.target.value = '';
    renderGaleriaPreviewConfeccion();
}

function agregarEnlacesConfeccion() {
    const input = document.getElementById('confImagenUrl');
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) {
        showToast('Ingresa uno o más enlaces separados por coma', 'warning');
        return;
    }
    const urls = raw.split(',').map(u => u.trim()).filter(Boolean);
    tempConfeccionImagenes.push(...urls);
    input.value = '';
    renderGaleriaPreviewConfeccion();
    showToast(`${urls.length} imagen(es) agregada(s) a la galería`, 'success');
}

function eliminarImagenConfeccion(index) {
    tempConfeccionImagenes.splice(index, 1);
    renderGaleriaPreviewConfeccion();
    showToast('Imagen eliminada de la vista previa', 'warning');
}

function renderGaleriaPreviewConfeccion() {
    const container = document.getElementById('confGaleriaPreviewContainer');
    if (!container) return;

    if (tempConfeccionImagenes.length === 0) {
        container.innerHTML = `<div class="text-[11px] text-slate-400 italic">No hay imágenes cargadas todavía.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] font-extrabold text-slate-800">Galería (${tempConfeccionImagenes.length} foto${tempConfeccionImagenes.length > 1 ? 's' : ''}):</span>
            <span class="text-[10px] text-rose-600 font-bold">La primera imagen será la portada</span>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            ${tempConfeccionImagenes.map((src, idx) => `
                <div class="relative group rounded-xl overflow-hidden border-2 ${idx === 0 ? 'border-rose-600' : 'border-slate-200'} bg-white shadow-xs aspect-square">
                    <img src="${src}" alt="Foto ${idx + 1}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/300x300/1e293b/ffffff?text=Foto+${idx + 1}'">
                    ${idx === 0 ? `<span class="absolute bottom-1 left-1 bg-slate-900/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded">Portada</span>` : ''}
                    <button type="button" onclick="eliminarImagenConfeccion(${idx})" class="absolute top-1 right-1 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105" title="Eliminar imagen">
                        ✕
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function resetFormAdminConfeccion() {
    const form = document.getElementById('formAdminConfeccion');
    if (form) form.reset();
    const idInput = document.getElementById('confPrendaId');
    if (idInput) idInput.value = '';
    tempConfeccionImagenes = [];
    renderGaleriaPreviewConfeccion();
}

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

        if (!res.ok) throw new Error('Error al guardar la prenda en Neon');

        await sincronizarDatosConfeccionDB();
        showToast('¡Fechas y prenda de confección guardadas en Neon!', 'success');
        resetFormAdminConfeccion();
        cambiarTabConfeccion('catalogo');
    } catch (err) {
        showToast('Error al guardar: ' + err.message, 'error');
    }
}

function slideConfeccionImage(prendaId, direction) {
    const prendas = obtenerPrendasConfeccion();
    const p = prendas.find(item => item.id == prendaId);
    if (!p || !p.imagenes || p.imagenes.length <= 1) return;

    if (confSliderIndexes[prendaId] === undefined) confSliderIndexes[prendaId] = 0;
    confSliderIndexes[prendaId] += direction;

    if (confSliderIndexes[prendaId] >= p.imagenes.length) confSliderIndexes[prendaId] = 0;
    if (confSliderIndexes[prendaId] < 0) confSliderIndexes[prendaId] = p.imagenes.length - 1;

    renderCatalogoConfeccion();
}

function jumpConfeccionImage(prendaId, index) {
    confSliderIndexes[prendaId] = index;
    renderCatalogoConfeccion();
}

function renderCatalogoConfeccion() {
    const grid = document.getElementById('catalogoConfeccionGrid');
    if (!grid) return;
    const prendas = obtenerPrendasConfeccion();
    const { isAdmin } = getSession();

    if (prendas.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs sm:text-sm">
                Aún no hay modelos publicados en el catálogo de confección.
            </div>
        `;
        return;
    }

    const conf = obtenerConfigFechasConfeccion();
    const ahora = new Date().getTime();
    const fInicio = new Date(conf.inicio).getTime();
    const fFin = new Date(conf.fin).getTime();
    const plazoVencido = ahora > fFin || ahora < fInicio;

    grid.innerHTML = prendas.map(p => {
        const colorOpts = p.colores.map(c => `<option value="${c}">${c}</option>`).join('');
        const tallaOpts = p.tallas.map(t => `<option value="${t}">${t}</option>`).join('');
        const imgs = p.imagenes && p.imagenes.length > 0 ? p.imagenes : [p.imagen];
        const rawIdx = confSliderIndexes[p.id] || 0;
        const currentIdx = rawIdx < imgs.length ? rawIdx : 0;

        return `
            <div class="bg-white border border-slate-200 hover:border-rose-200 rounded-2xl p-4 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                    <!-- Carrusel interactivo con flechas y contador -->
                    <div class="relative group/confimg mb-2">
                        <img src="${imgs[currentIdx]}" alt="${p.modelo}" class="w-full h-48 object-cover rounded-xl border border-slate-100 transition-all" onerror="this.src='https://placehold.co/500x500/1e293b/ffffff?text=Prenda'">
                        ${imgs.length > 1 ? `
                            <button type="button" onclick="slideConfeccionImage(${p.id}, -1)" class="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow cursor-pointer transition">❮</button>
                            <button type="button" onclick="slideConfeccionImage(${p.id}, 1)" class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow cursor-pointer transition">❯</button>
                            <span class="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">${currentIdx + 1} / ${imgs.length}</span>
                        ` : ''}
                    </div>

                    <!-- Miniaturas interactivas si tiene más de 1 imagen -->
                    ${imgs.length > 1 ? `
                        <div class="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1">
                            ${imgs.map((thumb, tIdx) => `
                                <button type="button" onclick="jumpConfeccionImage(${p.id}, ${tIdx})" class="w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition ${tIdx === currentIdx ? 'border-rose-600 scale-105 shadow-xs' : 'border-slate-200 opacity-70 hover:opacity-100'}">
                                    <img src="${thumb}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=${tIdx + 1}'">
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}

                    <h5 class="font-bold text-slate-900 text-sm mb-1">${p.modelo}</h5>
                    <p class="text-rose-600 font-black text-lg mb-3">S/ ${p.precio.toFixed(2)}</p>
                    
                    <div class="space-y-2 mb-3">
                        <div>
                            <label class="text-[11px] font-bold text-slate-600 block mb-0.5">Color:</label>
                            <select id="select-color-${p.id}" ${plazoVencido && !isAdmin ? 'disabled' : ''} class="w-full p-2 text-xs bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl outline-none font-semibold text-slate-800">${colorOpts}</select>
                        </div>
                        <div>
                            <label class="text-[11px] font-bold text-slate-600 block mb-0.5">Talla:</label>
                            <select id="select-talla-${p.id}" ${plazoVencido && !isAdmin ? 'disabled' : ''} class="w-full p-2 text-xs bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl outline-none font-semibold text-slate-800">${tallaOpts}</select>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-2">
                    ${plazoVencido && !isAdmin ? `
                        <div class="bg-rose-50 text-rose-700 font-bold text-xs p-2.5 rounded-xl text-center border border-rose-200">
                            ⛔ Plazo de pedidos culminado
                        </div>
                    ` : `
                        <button onclick="descargarPDFConfeccion(${p.id})" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                            <i class="fas fa-file-pdf text-rose-400"></i> Descargar Orden PDF
                        </button>
                        <button onclick="consultarConfeccionWhatsApp(${p.id})" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                            <i class="fab fa-whatsapp"></i> Separar por WhatsApp
                        </button>
                    `}

                    ${isAdmin ? `
                    <div class="flex gap-1.5 pt-2 border-t border-slate-100 mt-2">
                        <button onclick="editarPrendaConfeccion(${p.id})" class="flex-1 py-1.5 bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white text-xs font-bold rounded-lg transition cursor-pointer">Editar</button>
                        <button onclick="eliminarPrendaConfeccion(${p.id})" class="flex-1 py-1.5 bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white text-xs font-bold rounded-lg transition cursor-pointer">Eliminar</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function editarPrendaConfeccion(id) {
    const prendas = obtenerPrendasConfeccion();
    const p = prendas.find(item => item.id == id);
    if (!p) return;

    document.getElementById('confPrendaId').value = p.id;
    document.getElementById('confModelo').value = p.modelo;
    document.getElementById('confPrecio').value = p.precio;
    document.getElementById('confColores').value = p.colores.join(', ');
    document.getElementById('confTallas').value = p.tallas.join(', ');
    document.getElementById('confImagenUrl').value = '';

    tempConfeccionImagenes = p.imagenes && p.imagenes.length > 0 ? [...p.imagenes] : (p.imagen ? [p.imagen] : []);
    cambiarTabConfeccion('admin');
}

async function eliminarPrendaConfeccion(id) {
    if (!confirm('¿Deseas eliminar esta prenda de confección?')) return;
    const { token } = getSession();

    try {
        const res = await fetch(`${API_URL}/confeccion/prendas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No se pudo eliminar');
        await sincronizarDatosConfeccionDB();
        renderCatalogoConfeccion();
        showToast('Prenda eliminada de Neon', 'warning');
    } catch (err) {
        showToast('Error al eliminar: ' + err.message, 'error');
    }
}

async function registrarPedidoClienteEnReporte(pedido) {
    try {
        await fetch(`${API_URL}/confeccion/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });
    } catch (err) {
        console.warn('No se pudo guardar el pedido en Neon:', err.message);
    }
}

async function renderReporteClientes() {
    const tbody = document.getElementById('tablaReporteClientesBody');
    if (!tbody) return;
    const { token } = getSession();

    try {
        const res = await fetch(`${API_URL}/confeccion/pedidos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            confeccionPedidosCache = await res.json();
        }
    } catch (err) {
        console.warn('Error cargando reporte:', err.message);
    }

    if (!confeccionPedidosCache || confeccionPedidosCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">No hay pedidos de confección registrados todavía.</td></tr>`;
        return;
    }

    tbody.innerHTML = confeccionPedidosCache.map((ped) => `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-3 font-mono font-bold text-slate-900">${ped.orden}</td>
            <td class="p-3 text-slate-600">${ped.fecha}</td>
            <td class="p-3 font-bold text-slate-800">${ped.modelo}</td>
            <td class="p-3 text-slate-600">${ped.color}</td>
            <td class="p-3 font-bold">${ped.talla}</td>
            <td class="p-3 font-black text-rose-600">S/ ${Number(ped.precio).toFixed(2)}</td>
            <td class="p-3 text-center">
                <button onclick="eliminarItemReporte(${ped.id})" class="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition cursor-pointer" title="Eliminar registro">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function limpiarReporteClientes() {
    if (!confirm('¿Estás seguro de vaciar el reporte de pedidos de clientes?')) return;
    const { token } = getSession();
    try {
        await fetch(`${API_URL}/confeccion/pedidos`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        confeccionPedidosCache = [];
        await renderReporteClientes();
        showToast('Reporte limpiado en Neon', 'warning');
    } catch (err) {
        showToast('Error al limpiar reporte', 'error');
    }
}

async function eliminarItemReporte(id) {
    const { token } = getSession();
    try {
        await fetch(`${API_URL}/confeccion/pedidos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        await renderReporteClientes();
        showToast('Registro eliminado del reporte', 'warning');
    } catch (err) {
        showToast('Error al eliminar registro', 'error');
    }
}

function consultarConfeccionWhatsApp(id) {
    const conf = obtenerConfigFechasConfeccion();
    const ahora = new Date().getTime();
    if (ahora > new Date(conf.fin).getTime() || ahora < new Date(conf.inicio).getTime()) {
        showToast('El plazo para realizar pedidos de confección ha finalizado.', 'error');
        return;
    }

    const prendas = obtenerPrendasConfeccion();
    const prenda = prendas.find(p => p.id == id);
    if (!prenda) return;

    const colorSeleccionado = document.getElementById(`select-color-${id}`).value;
    const tallaSeleccionada = document.getElementById(`select-talla-${id}`).value;
    const nroOrden = `CONF-${Math.floor(100000 + Math.random() * 900000)}`;

    registrarPedidoClienteEnReporte({
        orden: nroOrden,
        fecha: `${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`,
        modelo: prenda.modelo,
        color: colorSeleccionado,
        talla: tallaSeleccionada,
        precio: prenda.precio
    });

    const mensaje = `Hola *LIZ FASHION EVOLUTION*, quiero separar / ordenar la siguiente prenda de confección:\n\n` +
                    `🧾 *N° Orden:* ${nroOrden}\n` +
                    `🧥 *Modelo:* ${prenda.modelo}\n` +
                    `🎨 *Color:* ${colorSeleccionado}\n` +
                    `📏 *Talla:* ${tallaSeleccionada}\n` +
                    `💰 *Precio:* S/ ${prenda.precio.toFixed(2)}\n\n` +
                    `Quedo a la espera de la confirmación para coordinar el pago.`;

    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(mensaje)}`, '_blank');
    showToast('¡Solicitud enviada a WhatsApp y registrada!', 'success');
}

function descargarPDFConfeccion(id) {
    const conf = obtenerConfigFechasConfeccion();
    const ahora = new Date().getTime();
    if (ahora > new Date(conf.fin).getTime() || ahora < new Date(conf.inicio).getTime()) {
        showToast('El plazo para generar órdenes de confección ha finalizado.', 'error');
        return;
    }

    const prendas = obtenerPrendasConfeccion();
    const prenda = prendas.find(p => p.id == id);
    if (!prenda) return;

    const colorSeleccionado = document.getElementById(`select-color-${id}`).value;
    const tallaSeleccionada = document.getElementById(`select-talla-${id}`).value;
    const nroOrden = `CONF-${Math.floor(100000 + Math.random() * 900000)}`;
    const fechaActual = `${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`;

    registrarPedidoClienteEnReporte({
        orden: nroOrden,
        fecha: fechaActual,
        modelo: prenda.modelo,
        color: colorSeleccionado,
        talla: tallaSeleccionada,
        precio: prenda.precio
    });

    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        alert('Librería jsPDF no detectada.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIZ FASHION EVOLUTION', 15, 22);
    
    doc.setFontSize(10);
    doc.text('COMPROBANTE DE PEDIDO DE CONFECCIÓN', 125, 22);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fechaActual}`, 15, 45);
    doc.text(`N° de Orden: ${nroOrden}`, 135, 45);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 50, 195, 50);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalles de la Prenda Solicitada:', 15, 60);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Modelo:`, 15, 72);
    doc.setFont('helvetica', 'bold');
    doc.text(`${prenda.modelo}`, 40, 72);

    doc.setFont('helvetica', 'normal');
    doc.text(`Color Elegido:`, 15, 82);
    doc.setFont('helvetica', 'bold');
    doc.text(`${colorSeleccionado}`, 45, 82);

    doc.setFont('helvetica', 'normal');
    doc.text('Talla:', 15, 92);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tallaSeleccionada}`, 40, 92);

    doc.setFont('helvetica', 'normal');
    doc.text('Precio Unitario:', 15, 102);
    doc.setFont('helvetica', 'bold');
    doc.text(`S/ ${prenda.precio.toFixed(2)}`, 48, 102);

    try {
        const imgs = prenda.imagenes && prenda.imagenes.length > 0 ? prenda.imagenes : [prenda.imagen];
        const currentIdx = confSliderIndexes[prenda.id] || 0;
        doc.addImage(imgs[currentIdx] || prenda.imagen, 'JPEG', 120, 58, 70, 70);
    } catch (err) {
        console.warn('Imagen omitida en PDF por políticas de CORS.');
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 145, 195, 145);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('¡Gracias por confiar en Liz Fashion Evolution!', 15, 155);
    doc.text('Comparte este PDF con nuestro asesor para coordinar tu confección.', 15, 162);

    doc.save(`Orden_Confeccion_${prenda.modelo.substring(0, 10).trim()}.pdf`);
    showToast('¡PDF generado y registrado en reporte!', 'success');
}

// =====================================================================
// MÓDULO DE PAGOS YAPE Y PLIN (VALIDACIÓN, DUPLICADOS Y ADMINISTRADOR)
// =====================================================================
let selectedPaymentMethod = 'Yape';
let voucherBase64Temp = '';

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    const btnYape = document.getElementById('btnPayYape');
    const btnPlin = document.getElementById('btnPayPlin');
    const lbl = document.getElementById('paymentMethodLabel');

    if (lbl) lbl.textContent = method;

    if (method === 'Yape') {
        if (btnYape) btnYape.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-purple-500 bg-purple-50 text-purple-700";
        if (btnPlin) btnPlin.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-slate-200 bg-white text-slate-700";
    } else {
        if (btnPlin) btnPlin.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-blue-500 bg-blue-50 text-blue-700";
        if (btnYape) btnYape.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-slate-200 bg-white text-slate-700";
    }
}

function procederPagoYapePlin() {
    if (state.cart.length === 0) {
        showToast('Tu bolsa está vacía', 'warning');
        return;
    }
    let total = 0;
    state.cart.forEach(item => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        if (p) total += p.salePrice * item.qty;
    });

    const titleEl = document.getElementById('voucherModalTitle');
    const totalEl = document.getElementById('voucherTotalPagar');
    if (titleEl) titleEl.textContent = `Validar Pago por ${selectedPaymentMethod}`;
    if (totalEl) totalEl.textContent = `Total a Pagar: ${formatPrice(total)}`;
    
    const modal = document.getElementById('voucherModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeVoucherModal() {
    const modal = document.getElementById('voucherModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function generarHashImagen(base64Str) {
    const msgBuffer = new TextEncoder().encode(base64Str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const voucherInput = document.getElementById('voucherFile');
    if (voucherInput) {
        voucherInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                voucherBase64Temp = evt.target.result;
                const prev = document.getElementById('voucherPreviewImg');
                const cont = document.getElementById('voucherPreviewContainer');
                if (prev && cont) {
                    prev.src = voucherBase64Temp;
                    cont.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        });
    }
});

async function handleSubirVoucher(e) {
    e.preventDefault();
    if (!voucherBase64Temp) {
        showToast('Sube la captura de tu voucher', 'error');
        return;
    }

    let total = 0;
    state.cart.forEach(item => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        if (p) total += p.salePrice * item.qty;
    });

    const ordenCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const hashImagen = await generarHashImagen(voucherBase64Temp);
    const { user } = getSession();

    try {
        const res = await fetch(`${API_URL}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orden: ordenCode,
                cliente: user ? user.nombre : 'Cliente Invitado',
                total,
                metodo: selectedPaymentMethod,
                imagen_voucher: voucherBase64Temp,
                hash_imagen: hashImagen
            })
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'Este comprobante ya fue utilizado anteriormente.', 'error');
            return;
        }

        showToast('¡Voucher enviado con éxito para validación!', 'success');
        closeVoucherModal();
        toggleCartDrawer(false);

        let msg = `🛍️ *NUEVO PAGO POR ${selectedPaymentMethod.toUpperCase()}* 🛍️\n`;
        msg += `🧾 *Orden:* ${ordenCode}\n`;
        msg += `👤 *Cliente:* ${user ? user.nombre : 'Cliente Invitado'}\n`;
        msg += `💰 *Total Pagado:* ${formatPrice(total)}\n`;
        msg += `✅ *Estado:* Voucher subido correctamente, pendiente de validación.\n\n`;
        msg += `¡Acabo de realizar el pago y subir mi captura para coordinar el envío!`;

        state.cart = [];
        renderCart();

        window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err) {
        showToast('Error al conectar con el servidor', 'error');
    }
}

async function abrirAdminVouchersModal() {
    const modal = document.getElementById('adminVouchersModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    await renderTablaAdminVouchers();
}

async function openAdminVouchersModal() {
    await abrirAdminVouchersModal();
}

function closeAdminVouchersModal() {
    const modal = document.getElementById('adminVouchersModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function renderTablaAdminVouchers() {
    const tbody = document.getElementById('tablaAdminVouchersBody');
    if (!tbody) return;
    const { token } = getSession();

    try {
        const res = await fetch(`${API_URL}/pagos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar pagos');
        const pagos = await res.json();

        if (pagos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">No hay pagos registrados con Yape o Plin.</td></tr>`;
            return;
        }

        tbody.innerHTML = pagos.map(p => `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3 font-mono font-bold">${p.orden}</td>
                <td class="p-3 font-bold text-slate-800">${p.cliente}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.metodo === 'Yape' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${p.metodo}</span></td>
                <td class="p-3 font-black text-rose-600">S/ ${Number(p.total).toFixed(2)}</td>
                <td class="p-3 text-center">
                    <a href="${p.imagen_voucher}" target="_blank" class="inline-block">
                        <img src="${p.imagen_voucher}" class="w-12 h-12 object-cover rounded-lg border hover:scale-110 transition shadow-xs" title="Ver comprobante completo">
                    </a>
                </td>
                <td class="p-3 text-center">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black ${p.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}">${p.estado}</span>
                </td>
                <td class="p-3 text-center flex items-center justify-center gap-1.5">
                    <button onclick="cambiarEstadoPago(${p.id}, 'Aprobado')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] cursor-pointer">Aprobar</button>
                    <button onclick="cambiarEstadoPago(${p.id}, 'Rechazado')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white font-bold rounded-lg text-[10px] cursor-pointer">Rechazar</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-rose-500">Error al cargar la lista de pagos.</td></tr>`;
    }
}

async function cambiarEstadoPago(id, estado) {
    const { token } = getSession();
    try {
        const res = await fetch(`${API_URL}/pagos/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado })
        });

        if (res.ok) {
            const pagoActualizado = await res.json();
            showToast(`Pago marcado como ${estado}`, 'success');
            await renderTablaAdminVouchers();

            // Notificar por WhatsApp al cliente de forma automática
            let iconoEstado = estado === 'Aprobado' ? '✅ ¡PAGO APROBADO!' : '❌ ¡PAGO RECHAZADO / OBSERVADO!';
            let mensajeWhatsApp = `Hola *${pagoActualizado.cliente}*,\n\n` +
                                  `Te saludamos de *LIZ FASHION EVOLUTION*.\n` +
                                  `📌 *Estado de tu orden (${pagoActualizado.orden}):* ${iconoEstado}\n` +
                                  `💳 *Método:* ${pagoActualizado.metodo} (S/ ${Number(pagoActualizado.total).toFixed(2)})\n\n`;

            if (estado === 'Aprobado') {
                mensajeWhatsApp += `¡Tu comprobante ha sido validado con éxito! Estamos procediendo con el despacho de tu pedido. ¡Gracias por tu compra! 🎉`;
            } else {
                mensajeWhatsApp += `Lamentablemente tu comprobante no pudo ser validado (imagen borrosa o monto incorrecto). Por favor, comunícate con nosotros para solucionarlo.`;
            }

            window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank');
        } else {
            showToast('Error al actualizar estado', 'error');
        }
    } catch (err) {
        showToast('Error de conexión al actualizar estado', 'error');
    }
}
