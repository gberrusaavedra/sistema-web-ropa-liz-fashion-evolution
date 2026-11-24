// =====================================================================
// 1. CONFIGURACIÓN GLOBAL Y CONEXIÓN A RENDER / NEON
// =====================================================================
const API_URL = "https://sistema-web-ropa-liz-fashion-evolution.onrender.com/api";
const EXCHANGE_RATE = 0.27; // 1 PEN = 0.27 USD aprox.
const WHATSAPP_PHONE = "931598799";
const MIN_UNIDADES_MAYOR = 3; // Mínimo de unidades para activar el descuento por mayor

let PRODUCTS = [
    {
        id: 1,
        name: "Polo Manga 3/4",
        category: "Polos/Manga 3/4",
        tag: "Remate Final",
        regularPrice: 38.00,
        salePrice: 25.00,
        precioMayor: 20.00,
        image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
        images: [
            "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80"
        ],
        stockBySize: { S: 0, M: 0, L: 3, XL: 1, XXL: 0 },
        maxInitialStock: 10,
        material: "Algodón reactivo de exportación.",
        description: "Polo manga 3/4 con lazo y diseño exclusivo."
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
        
        if (!isAdmin) {
            btnAuth.onclick = openClientProfileModal;
            btnAuth.classList.add('cursor-pointer', 'hover:bg-slate-200/80');
            btnAuth.title = "Ver y editar mis datos de cliente";
        } else {
            btnAuth.onclick = null;
            btnAuth.classList.remove('cursor-pointer', 'hover:bg-slate-200/80');
            btnAuth.title = "Cuenta de Administrador";
        }
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
    document.getElementById('authModalSubtitle').textContent = state.isRegisterMode ? 'Regístrate para guardar tus pedidos y facilitar tus compras' : 'Ingresa como Administrador o Cliente';
    
    // Mostrar u ocultar campos adicionales de registro
    const phoneGroup = document.getElementById('authPhoneGroup');
    const phoneInput = document.getElementById('authPhone');
    
    phoneGroup.classList.toggle('hidden', !state.isRegisterMode);
    document.getElementById('authNameGroup').classList.toggle('hidden', !state.isRegisterMode);
    document.getElementById('authSecretGroup').classList.toggle('hidden', !state.isRegisterMode);
    
    // Evita que el navegador bloquee el inicio de sesión exigiendo un campo oculto
    if (phoneInput) {
        phoneInput.required = state.isRegisterMode;
    }
    
    document.getElementById('authSubmitBtn').textContent = state.isRegisterMode ? 'Registrarme' : 'Entrar Ahora';
    document.getElementById('authToggleBtn').textContent = state.isRegisterMode ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres cliente nuevo? Crea tu cuenta aquí';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    // Identificamos si el submit viene del formulario de registro o de login
    const isSignup = e.target.id === 'signupForm';

    const emailInput = document.getElementById(isSignup ? 'signupEmail' : 'loginUser');
    const passwordInput = document.getElementById(isSignup ? 'signupPassword' : 'loginPassword');
    const nameInput = document.getElementById('signupUser');
    const phoneInput = document.getElementById('signupPhone');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const nombre = nameInput ? nameInput.value.trim() : '';
    const telefono = phoneInput ? phoneInput.value.trim() : '';

    const endpoint = isSignup ? '/registro' : '/login';
    const payload = isSignup 
        ? { nombre, email, password, telefono, palabra_secreta: 'piura2026' } 
        : { email, password };

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
                const mayorBD = (p.precio_mayor !== null && p.precio_mayor !== undefined && p.precio_mayor !== '')
        ? Number(p.precio_mayor)
        : 0;
                return {
                    id: p.id,
                    code: `LIZ-${String(p.id).padStart(4, '0')}`,
                    name: p.titulo,
                    category: p.categoria,
                    tag: p.etiqueta || 'Remate Final',
                    regularPrice: Number(p.precio_original),
                    salePrice: Number(p.precio_remate),
                    precioMayor: mayorBD,
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
    const files = e && e.target && e.target.files ? Array.from(e.target.files) : [];
    const urlInput = document.getElementById('formImageUrl');

    if (files.length > 0) {
        const nuevosLinks = [];

        for (const file of files) {
            const linkGenerado = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (evt) => resolve(evt.target.result);
                reader.readAsDataURL(file);
            });
            nuevosLinks.push(linkGenerado);
        }

        const actuales = urlInput && urlInput.value.trim()
            ? urlInput.value.split(',').map(u => u.trim()).filter(Boolean)
            : [];

        tempUploadedImages = [...actuales, ...nuevosLinks];
        if (urlInput) {
            urlInput.value = tempUploadedImages.join(', ');
        }
        e.target.value = '';
    } else if (urlInput) {
        tempUploadedImages = urlInput.value
            .split(',')
            .map(u => u.trim())
            .filter(Boolean);
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

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('formProductId', product ? product.id : '');
    
    const titleEl = document.getElementById('productFormTitle');
    if (titleEl) titleEl.textContent = product ? 'Editar Prenda' : 'Subir Nueva Prenda';

    setVal('formName', product ? (product.name || '') : '');
    setVal('formCategory', product ? (product.category || 'Polos/Camisetas') : 'Polos/Camisetas');
    setVal('formTag', product ? (product.tag || 'Normal') : 'Normal');
    setVal('formSalePrice', product ? product.salePrice : '');
    setVal('formPrecioMayor', (product && product.precioMayor !== undefined && product.precioMayor !== null) ? product.precioMayor : 0);
    setVal('formRegularPrice', product ? product.regularPrice : '');
    setVal('formDescription', product ? (product.description || '') : '');
    setVal('formMaterial', product ? (product.material || '') : '');
    
    tempUploadedImages = product && product.images ? [...product.images] : (product ? [product.image] : []);
    renderDynamicVariantsInputs(product ? product.variantDetails : null);

    setVal('formImageUrl', product && product.images ? product.images.join(', ') : '');
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
    const rawMayor = document.getElementById('formPrecioMayor').value;
const parsedMayor = parseFloat(rawMayor);
const precioMayorVal = !isNaN(parsedMayor) ? parsedMayor : 0;
    const regularPriceVal = tagVal === 'Normal' ? baseSalePrice : (parseFloat(document.getElementById('formRegularPrice').value) || baseSalePrice);
const minMayorVal = Math.max(1, parseInt(document.getElementById('formMinMayor')?.value, 10) || MIN_UNIDADES_MAYOR);
    const payload = {
        titulo: document.getElementById('formName').value.trim(),
        categoria: document.getElementById('formCategory').value,
        etiqueta: tagVal,
        precio_remate: baseSalePrice,
        min_unidades_mayor: minMayorVal,
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
    
    let queryText = '';
    if (document.activeElement === desktopInput && desktopInput) {
        queryText = desktopInput.value;
        if (mobileInput) mobileInput.value = queryText;
    } else if (document.activeElement === mobileInput && mobileInput) {
        queryText = mobileInput.value;
        if (desktopInput) desktopInput.value = queryText;
    } else {
        queryText = (desktopInput ? desktopInput.value : '') || (mobileInput ? mobileInput.value : '') || state.searchQuery || '';
    }
    
    state.searchQuery = queryText;
    const query = queryText.trim().toLowerCase();

    let filtered = PRODUCTS.filter(p => {
        const rawImgIdx = sliderIndexes[p.id] || 0;
        const currentImgIdx = rawImgIdx < (p.images?.length || 1) ? rawImgIdx : 0;
        const currentStockMap = (p.variantDetails && p.variantDetails[currentImgIdx]) 
            ? p.variantDetails[currentImgIdx].stockBySize 
            : p.stockBySize;
            const { isAdmin: esAdminFiltro } = getSession();
        if (!esAdminFiltro && getTotalStock(p) <= 0) return false;

        if (state.category !== 'Todos' && p.category !== state.category) return false;
        if (state.promoTag !== 'Todos' && p.tag !== state.promoTag) return false;
        if (state.size !== 'Todas' && (!currentStockMap[state.size] || currentStockMap[state.size] <= 0)) return false;
        
        if (query) {
            const matchName = p.name.toLowerCase().includes(query);
            const matchCategory = p.category.toLowerCase().includes(query);
            const matchMaterial = (p.material || '').toLowerCase().includes(query);
            const matchCode = (p.code || '').toLowerCase().includes(query);
            const matchTag = (p.tag || '').toLowerCase().includes(query);
            if (!matchName && !matchCategory && !matchMaterial && !matchCode && !matchTag) return false;
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
<div ${imagesList.length > 1 ? `onmouseenter="slideImage(${product.id}, 1)"` : ''} class="relative w-full h-80 sm:h-96 bg-slate-100 overflow-hidden group/img shrink-0">
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
                    
                    <div class="flex flex-col">
                        <div class="flex items-baseline gap-2">
                            <span class="text-xl sm:text-2xl font-black ${discountPct > 0 ? 'text-rose-600' : 'text-slate-900'}">${formatPrice(currentSalePrice)}</span>
                            ${discountPct > 0 ? `<span class="text-xs sm:text-sm text-slate-400 line-through">${formatPrice(product.regularPrice)}</span>` : ''}
                        </div>
                        ${product.precioMayor ? `<span class="text-[11px] font-bold text-emerald-600">Por mayor (3+ unds): ${formatPrice(product.precioMayor)}</span>` : ''}
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
                        <!-- Control de cantidad rápido (- y +) -->
                        <div class="flex items-center bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shrink-0">
                            <button type="button" onclick="changeCardQty(${product.id}, -1)" class="px-2.5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-200 transition cursor-pointer">-</button>
                            <span id="qty-input-${product.id}" class="px-2 text-xs font-black text-slate-900">1</span>
                            <button type="button" onclick="changeCardQty(${product.id}, 1)" class="px-2.5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-200 transition cursor-pointer">+</button>
                        </div>

                        <!-- Botón Agregar con la cantidad seleccionada -->
                        <button onclick="addToCartWithQty(${product.id})" class="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer">
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
    openPostAddModal(product);
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

    const cantidadesPorProducto = {};
    state.cart.forEach(item => {
        cantidadesPorProducto[item.productId] = (cantidadesPorProducto[item.productId] || 0) + item.qty;
    });

    let regTotal = 0, saleTotal = 0;

    container.innerHTML = state.cart.map((item, idx) => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        if (!p) return '';
        const code = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
        
        regTotal += p.regularPrice * item.qty;

        const totalUnidadesEsteProducto = cantidadesPorProducto[item.productId];
        let precioAplicado = p.salePrice;
        let esPrecioMayor = false;
       const minReq = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
            const tienePrecioMayor = Number(p.precioMayor) > 0;
            if (tienePrecioMayor && totalUnidadesEsteProducto >= minReq) {
                precioAplicado = Number(p.precioMayor);
                esPrecioMayor = true;
            }

        saleTotal += precioAplicado * item.qty;

        return `
            <div class="flex gap-3 bg-white p-3 rounded-2xl border ${esPrecioMayor ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'}">
                <img src="${p.image}" class="w-16 h-20 object-cover rounded-xl">
                <div class="flex-1">
                    <span class="text-[10px] font-black text-slate-500 uppercase">CÓD: ${code}</span>
                    <h4 class="font-bold text-xs text-slate-900">${p.name}</h4>
                    <span class="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold inline-block mt-0.5">Color: ${item.color || 'Único'} | Talla: ${item.size} | Cant: ${item.qty}</span>
                    
                    ${esPrecioMayor 
                        ? `<span class="block text-[10px] font-extrabold text-rose-600 mt-1">🎉 ¡Descuento por mayor aplicado (Llevas ${totalUnidadesEsteProducto} unds)!</span>` 
                       : `<span class="block text-[10px] text-slate-400 mt-1">💡 Agrega ${minReq - totalUnidadesEsteProducto} unds más de este modelo para activar precio por mayor</span>`
                    }

                    <div class="text-sm font-black text-rose-600 mt-1">${formatPrice(precioAplicado * item.qty)} ${esPrecioMayor ? '<span class="text-[10px] font-bold text-rose-500">(Precio Mayor)</span>' : ''}</div>
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
    
    const cantidadesPorProducto = {};
    state.cart.forEach(item => {
        cantidadesPorProducto[item.productId] = (cantidadesPorProducto[item.productId] || 0) + item.qty;
    });

    state.cart.forEach((item, i) => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        const prodCode = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
        const minReq = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
        const tienePrecioMayor = Number(p.precioMayor) > 0;
        const totalUnidadesEsteProducto = cantidadesPorProducto[item.productId] || item.qty;
        const aplicaMayor = tienePrecioMayor && totalUnidadesEsteProducto >= minReq;
        let precioAplicado = aplicaMayor ? Number(p.precioMayor) : p.salePrice;
        total += precioAplicado * item.qty;
        msg += `${i + 1}. *[${prodCode}] ${p.name}*\n`;
        msg += `   • Color: *${item.color || 'Único'}* | Talla: *${item.size}* | Cant: *${item.qty}*\n`;
       msg += `   • Subtotal: ${formatPrice(precioAplicado * item.qty)} ${aplicaMayor ? '(Precio Mayor)' : ''}\n`;
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
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Consultamos siempre directamente al servidor de Neon la hora oficial de la oferta
        const res = await fetch(`${API_URL}/oferta-tiempo`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data && data.offer_end_time && Number(data.offer_end_time) > new Date().getTime()) {
                const targetTime = Number(data.offer_end_time);
                localStorage.setItem('liz_offer_end', targetTime);
                startCountdown(targetTime);
                return;
            }
        }
    } catch (err) {
        console.warn('Usando respaldo local por latencia de Render.');
    }

    // Si fallara la red, leemos el valor sincronizado del almacenamiento local del dispositivo
    let targetTime = localStorage.getItem('liz_offer_end');
    if (!targetTime || Number(targetTime) <= new Date().getTime()) {
        targetTime = new Date().getTime() + (24 * 60 * 60 * 1000);
        localStorage.setItem('liz_offer_end', targetTime);
    }
    startCountdown(Number(targetTime));
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
                       precioMayor: p.precio_mayor ? Number(p.precio_mayor) : 0,
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
            <span class="text-[11px] font-extrabold text-slate-800">Galería (${tempConfeccionImagenes.length} fotos):</span>
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
   const confMinMayorVal = Math.max(1, parseInt(document.getElementById('confMinMayor')?.value, 10) || MIN_UNIDADES_MAYOR);
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
                min_unidades_mayor: confMinMayorVal,
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
                    <div ${imgs.length > 1 ? `onmouseenter="slideConfeccionImage(${p.id}, 1)"` : ''} class="relative group/confimg mb-2">
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
                    <div class="mb-3">
                        <p class="text-rose-600 font-black text-lg">S/ ${p.precio.toFixed(2)}</p>
                        ${p.precioMayor ? `<span class="text-[11px] font-bold text-emerald-600">Por mayor (3+ unds): S/ ${p.precioMayor.toFixed(2)}</span>` : ''}
                    </div>
                    
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
                       <button onclick="agregarPrendaBolsaConfeccion(${p.id})" class="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <i class="fas fa-shopping-bag"></i> Agregar a Bolsa Confección
                    </button>
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
    if (document.getElementById('confMinMayor')) {
        document.getElementById('confMinMayor').value = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
    }
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
    const qrImage = document.getElementById('qrImageDisplay');
    const qrLabel = document.getElementById('qrMethodLabel');
    const submitBtn = document.getElementById('voucherSubmitBtn');

    if (lbl) lbl.textContent = method;

    if (method === 'Yape') {
        if (btnYape) btnYape.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-purple-500 bg-purple-50 text-purple-700";
        if (btnPlin) btnPlin.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-slate-200 bg-white text-slate-700";
        
        if (qrImage) qrImage.src = "img/yape.jpg";
        if (qrLabel) {
            qrLabel.textContent = "Yape Seleccionado";
            qrLabel.className = "text-xs font-black text-purple-700 mt-2 uppercase";
        }
        if (submitBtn) submitBtn.className = "w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md transition cursor-pointer";
    } else {
        if (btnPlin) btnPlin.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-blue-500 bg-blue-50 text-blue-700";
        if (btnYape) btnYape.className = "p-2.5 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border-slate-200 bg-white text-slate-700";
        
        if (qrImage) qrImage.src = "img/plin.jpg";
        if (qrLabel) {
            qrLabel.textContent = "Plin Seleccionado";
            qrLabel.className = "text-xs font-black text-blue-600 mt-2 uppercase";
        }
        if (submitBtn) submitBtn.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition cursor-pointer";
    }
}

function procederPagoYapePlin() {
    if (state.cart.length === 0) {
        showToast('Tu bolsa está vacía', 'warning');
        return;
    }
    
    const cantidadesPorProducto = {};
    state.cart.forEach(item => {
        cantidadesPorProducto[item.productId] = (cantidadesPorProducto[item.productId] || 0) + item.qty;
    });

    let total = 0;
    state.cart.forEach(item => {
        const p = PRODUCTS.find(prod => prod.id === item.productId);
        if (p) {
            const totalUnidadesEsteProducto = cantidadesPorProducto[item.productId];
                const minReq = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
        const tienePrecioMayor = Number(p.precioMayor) > 0;
        const precioAplicado = (tienePrecioMayor && totalUnidadesEsteProducto >= minReq) ? Number(p.precioMayor) : p.salePrice;
            total += precioAplicado * item.qty;
        }
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

async function generarHuellaVisualVoucher(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            const grises = [];
            for (let i = 0; i < data.length; i += 4) {
                grises.push(Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]));
            }
            const promedio = grises.reduce((a, b) => a + b, 0) / grises.length;
            resolve(grises.map(g => (g >= promedio ? '1' : '0')).join(''));
        };
        img.onerror = () => resolve('');
        img.src = base64Str;
    });
}

function obtenerHistorialComprobantesEstrictos() {
    try {
        return JSON.parse(localStorage.getItem('liz_vouchers_estrictos_v1') || '{"hashes":[],"huellas":[],"operaciones":[]}');
    } catch {
        return { hashes: [], huellas: [], operaciones: [] };
    }
}

function guardarComprobanteUsadoEstricto(hashImagen, huellaVisual, nroOperacion) {
    const hist = obtenerHistorialComprobantesEstrictos();
    if (hashImagen && !hist.hashes.includes(hashImagen)) hist.hashes.push(hashImagen);
    if (huellaVisual && !hist.huellas.includes(huellaVisual)) hist.huellas.push(huellaVisual);
    if (nroOperacion && !hist.operaciones.includes(nroOperacion)) hist.operaciones.push(nroOperacion);
    localStorage.setItem('liz_vouchers_estrictos_v1', JSON.stringify(hist));
}

async function validarAutenticidadVoucherYapePlin(base64Str, metodoEsperado, montoEsperado) {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
        return { valido: false, error: 'Solo se aceptan imágenes JPG o PNG.' };
    }

    // 1. Verificar formato vertical de captura de celular y tono morado característico de Yape
    const checkVisual = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.height <= img.width || img.height < 350) {
                resolve({ ok: false, motivo: 'Rechazado: la imagen no es una captura vertical de comprobante Yape/Plin.' });
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = 60;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 60, 100);
            const px = ctx.getImageData(0, 0, 60, 100).data;
            let morados = 0;
            const totalPx = 60 * 100;
            for (let i = 0; i < px.length; i += 4) {
                const r = px[i], g = px[i + 1], b = px[i + 2];
                // Detecta morado/violeta de Yape
                if (r >= 65 && r <= 185 && g <= 85 && b >= 75 && b <= 200 && b > g + 35) {
                    morados++;
                }
            }
            if ((morados / totalPx) < 0.15) {
                resolve({ ok: false, motivo: 'Rechazado: esta imagen no es una captura de Yape ni de Plin.' });
                return;
            }
            resolve({ ok: true });
        };
        img.onerror = () => resolve({ ok: false, motivo: 'No se pudo leer la imagen del comprobante.' });
        img.src = base64Str;
    });

    if (!checkVisual.ok) {
        return { valido: false, error: checkVisual.motivo };
    }

    // 2. OCR estricto del comprobante
    if (typeof Tesseract === 'undefined') {
        return { valido: false, error: 'No cargó Tesseract.js. Revisa la etiqueta <script> en index.html.' };
    }

    const ocrResult = await Tesseract.recognize(base64Str, 'spa');
    const rawText = ocrResult?.data?.text || '';
    const textoLimpio = rawText.replace(/\s+/g, ' ').trim();
    const textoLower = textoLimpio.toLowerCase();

    // Debe contener palabras clave reales del comprobante
    const tieneEstructura = /yapeaste|yapearon|transacci[oó]n|operaci[oó]n|destino/i.test(textoLimpio);
    if (!tieneEstructura) {
        return { valido: false, error: 'Rechazado: la imagen no muestra los datos de una transacción de Yape/Plin.' };
    }

    // Debe ir dirigido a "Liz Berru" o "Liz Ber*"
    const tieneDestinatario = /liz\s*ber(ru|\*|\b)/i.test(textoLimpio);
    if (!tieneDestinatario) {
        return { valido: false, error: 'Rechazado: el comprobante no está dirigido a Liz Berru / Liz Ber*.' };
    }

    // Validar método seleccionado (Yape o Plin)
    if (metodoEsperado === 'Plin') {
        if (!/plin/i.test(textoLimpio)) {
            return { valido: false, error: 'Rechazado: el comprobante no corresponde a Destino: Plin.' };
        }
    } else {
        if (!/yape/i.test(textoLimpio)) {
            return { valido: false, error: 'Rechazado: el comprobante no corresponde a Destino: Yape.' };
        }
        if (!/548/.test(textoLimpio) && !/c[oó]digo\s*de\s*seguridad/i.test(textoLimpio)) {
            return { valido: false, error: 'Rechazado: el comprobante de Yape no muestra los datos de seguridad/destino válidos.' };
        }
    }

    // Validar que exista número de operación
    const matchOp = textoLimpio.match(/(?:operaci[oó]n|n[ro°]+[^0-9]{0,15})\s*(\d{6,10})/i);
    if (!matchOp || !matchOp[1]) {
        return { valido: false, error: 'Rechazado: no se detecta el Nro. de operación del comprobante.' };
    }
    const nroOperacion = matchOp[1].trim();

    // Validar monto si se puede leer con claridad
    const matchMonto = textoLimpio.match(/s\/\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (matchMonto && matchMonto[1]) {
        const montoLeido = parseFloat(matchMonto[1].replace(',', '.'));
        if (!isNaN(montoLeido) && Math.abs(montoLeido - Number(montoEsperado)) > 0.05) {
            return {
                valido: false,
                error: `Rechazado: el monto del comprobante (S/ ${montoLeido.toFixed(2)}) no coincide con el total (S/ ${Number(montoEsperado).toFixed(2)}).`
            };
        }
    }

    // Validar fecha del día de hoy
    const ahora = new Date();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = String(ahora.getDate()).padStart(2, '0');
    const diaSinCero = String(ahora.getDate());
    const mes = meses[ahora.getMonth()];
    const anio = String(ahora.getFullYear());
    const regexFechaHoy = new RegExp(`(?:${dia}|${diaSinCero})\\s*${mes}\\.?\\s*${anio}`, 'i');
    if (!regexFechaHoy.test(textoLower)) {
        return { valido: false, error: 'Rechazado: la fecha del comprobante no corresponde a hoy.' };
    }

    return { valido: true, nroOperacion };
}

document.addEventListener('DOMContentLoaded', () => {
    const voucherInput = document.getElementById('voucherFile');
    if (voucherInput) {
        voucherInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (evt) => {
                const base64 = evt.target.result;
                const prev = document.getElementById('voucherPreviewImg');
                const cont = document.getElementById('voucherPreviewContainer');

                // Validar al instante apenas eligen la imagen
                const cantidadesPorProducto = {};
                state.cart.forEach(item => {
                    cantidadesPorProducto[item.productId] = (cantidadesPorProducto[item.productId] || 0) + item.qty;
                });
                let totalActual = 0;
                state.cart.forEach(item => {
                    const p = PRODUCTS.find(prod => String(prod.id) === String(item.productId));
                    if (!p) return;
                    const cantMod = cantidadesPorProducto[item.productId] || item.qty;
                   const minReq = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
                    const tienePrecioMayor = Number(p.precioMayor) > 0;
                    const precio = (tienePrecioMayor && cantMod >= minReq) ? Number(p.precioMayor) : Number(p.salePrice);
                    totalActual += precio * item.qty;
                });

                showToast('Verificando que sea un comprobante válido de Yape/Plin...', 'warning');
                const check = await validarAutenticidadVoucherYapePlin(base64, selectedPaymentMethod, totalActual);
                if (!check.valido) {
                    voucherBase64Temp = '';
                    e.target.value = '';
                    if (prev) prev.src = '';
                    if (cont) cont.classList.add('hidden');
                    showToast(check.error, 'error');
                    return;
                }

                const hashImagen = await generarHashImagen(base64);
                const huellaVisual = await generarHuellaVisualVoucher(base64);
                const usados = obtenerHistorialComprobantesEstrictos();
                if (
                    usados.hashes.includes(hashImagen) ||
                    (huellaVisual && usados.huellas.includes(huellaVisual)) ||
                    (check.nroOperacion && usados.operaciones.includes(check.nroOperacion))
                ) {
                    voucherBase64Temp = '';
                    e.target.value = '';
                    if (prev) prev.src = '';
                    if (cont) cont.classList.add('hidden');
                    showToast('Este comprobante o número de operación ya fue utilizado y no puede repetirse.', 'error');
                    return;
                }

                voucherBase64Temp = base64;
                if (prev && cont) {
                    prev.src = voucherBase64Temp;
                    cont.classList.remove('hidden');
                }
                showToast('Comprobante válido verificado.', 'success');
            };
            reader.readAsDataURL(file);
        });
    }
});

async function handleSubirVoucher(e) {
    e.preventDefault();
    if (!voucherBase64Temp) {
        showToast('Sube una captura válida de tu comprobante de Yape o Plin.', 'error');
        return;
    }

    const cantidadesPorProducto = {};
    state.cart.forEach(item => {
        cantidadesPorProducto[item.productId] = (cantidadesPorProducto[item.productId] || 0) + item.qty;
    });

    let total = 0;
    const detallesParaBD = [];

    state.cart.forEach(item => {
        const p = PRODUCTS.find(prod => String(prod.id) === String(item.productId));
        if (!p) return;

        const prodCode = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
        const totalUnidadesEsteProducto = cantidadesPorProducto[item.productId] || item.qty;
        const minReq = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
        const tienePrecioMayor = Number(p.precioMayor) > 0;
        const tieneDescuentoMayor = tienePrecioMayor && totalUnidadesEsteProducto >= minReq;
        const precioAplicado = tieneDescuentoMayor
            ? Number(p.precioMayor)
            : Number(p.salePrice);
        total += precioAplicado * item.qty;

        detallesParaBD.push({
            codigo: prodCode,
            titulo: p.name,
            precio_remate: precioAplicado,
            talla: item.size || 'Única',
            color: item.color || 'Único',
            cantidad: item.qty,
            imagen: p.image || p.imagen_url || ''
        });
    });

    if (detallesParaBD.length === 0) {
        showToast('No se encontraron prendas válidas en la bolsa.', 'error');
        return;
    }

    const submitBtn = document.getElementById('voucherSubmitBtn');
    const textoOriginalBtn = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validando comprobante...';
    }

    try {
        const validacion = await validarAutenticidadVoucherYapePlin(voucherBase64Temp, selectedPaymentMethod, total);
        if (!validacion.valido) {
            voucherBase64Temp = '';
            showToast(validacion.error, 'error');
            return;
        }

        const hashImagen = await generarHashImagen(voucherBase64Temp);
        const huellaVisual = await generarHuellaVisualVoucher(voucherBase64Temp);
        const nroOperacion = validacion.nroOperacion;

        const usados = obtenerHistorialComprobantesEstrictos();
        if (
            usados.hashes.includes(hashImagen) ||
            (huellaVisual && usados.huellas.includes(huellaVisual)) ||
            (nroOperacion && usados.operaciones.includes(nroOperacion))
        ) {
            showToast(`Este comprobante o Nro. de operación (${nroOperacion}) ya fue utilizado y no puede repetirse.`, 'error');
            return;
        }

        const ordenCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
        const { user } = getSession();

        const res = await fetch(`${API_URL}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orden: ordenCode,
                cliente: user ? user.nombre : 'Cliente Invitado',
                telefono: user ? (user.telefono || '') : '',
                total,
                metodo: selectedPaymentMethod,
                nro_operacion: nroOperacion,
                imagen_voucher: voucherBase64Temp,
                hash_imagen: hashImagen,
                huella_visual: huellaVisual,
                detalles_pedido: detallesParaBD
            })
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'Este comprobante o número de operación ya fue utilizado anteriormente.', 'error');
            return;
        }

        guardarComprobanteUsadoEstricto(hashImagen, huellaVisual, nroOperacion);
        await descontarStockPorPedido(detallesParaBD);
        await fetchProductsFromDB();

        showToast('¡Voucher validado y guardado con éxito!', 'success');
        showToast('¡Voucher validado y guardado con éxito!', 'success');
        closeVoucherModal();
        toggleCartDrawer(false);

      const lineasDetalle = detallesParaBD.map((item, index) =>
            `${index + 1}. [${item.codigo}] ${item.titulo}\n` +
            `   Color: ${item.color} | Talla: ${item.talla} | Cant: ${item.cantidad}\n` +
            `   Subtotal: ${formatPrice(item.precio_remate * item.cantidad)}`
        ).join('\n\n');

        const msg = [
            `NUEVO PAGO Y PEDIDO (${selectedPaymentMethod.toUpperCase()}) - LIZ FASHION EVOLUTION`,
            `Orden: ${ordenCode}`,
            `Nro. Operacion: ${nroOperacion}`,
            `Cliente: ${user ? user.nombre : 'Cliente Invitado'}`,
            `Telefono: ${user && user.telefono ? user.telefono : '-'}`,
            '',
            `Detalle de la Bolsa de Compras:`,
            lineasDetalle,
            '',
            `TOTAL GENERAL PAGADO: ${formatPrice(total)}`,
            `Confirmacion: Comprobante validado y registrado en la web.`
        ].join('\n');

        state.cart = [];
        voucherBase64Temp = '';
        renderCart();

        const numeroAdmin = String(typeof WHATSAPP_PHONE !== 'undefined' ? WHATSAPP_PHONE : '931598799').replace(/\D/g, '');
        const numeroConCodigo = numeroAdmin.startsWith('51') ? numeroAdmin : `51${numeroAdmin}`;
        const urlWhatsApp = `https://wa.me/${numeroConCodigo}?text=${encodeURIComponent(msg)}`;

        const enlaceTemporal = document.createElement('a');
        enlaceTemporal.href = urlWhatsApp;
        enlaceTemporal.target = '_blank';
        enlaceTemporal.rel = 'noopener noreferrer';
        document.body.appendChild(enlaceTemporal);
        enlaceTemporal.click();
        enlaceTemporal.remove();

        setTimeout(() => {3
            if (!document.hidden) {
                window.location.href = urlWhatsApp;
            }
        }, 700);
    } catch (err) {
        console.error('Error en handleSubirVoucher:', err);
        showToast('Ocurrió un error al validar o enviar el pedido.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = textoOriginalBtn;
        }
    }
}

async function generarHuellaVisualVoucher(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            const grises = [];
            for (let i = 0; i < data.length; i += 4) {
                grises.push(Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]));
            }
            const promedio = grises.reduce((a, b) => a + b, 0) / grises.length;
            resolve(grises.map(g => (g >= promedio ? '1' : '0')).join(''));
        };
        img.onerror = () => resolve('');
        img.src = base64Str;
    });
}

function obtenerHistorialComprobantesEstrictos() {
    try {
        return JSON.parse(localStorage.getItem('liz_vouchers_estrictos_v1') || '{"hashes":[],"huellas":[],"operaciones":[]}');
    } catch {
        return { hashes: [], huellas: [], operaciones: [] };
    }
}

function guardarComprobanteUsadoEstricto(hashImagen, huellaVisual, nroOperacion) {
    const hist = obtenerHistorialComprobantesEstrictos();
    if (hashImagen && !hist.hashes.includes(hashImagen)) hist.hashes.push(hashImagen);
    if (huellaVisual && !hist.huellas.includes(huellaVisual)) hist.huellas.push(huellaVisual);
    if (nroOperacion && !hist.operaciones.includes(nroOperacion)) hist.operaciones.push(nroOperacion);
    localStorage.setItem('liz_vouchers_estrictos_v1', JSON.stringify(hist));
}

async function validarAutenticidadVoucherYapePlin(base64Str, metodoEsperado, montoEsperado) {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
        return { valido: false, error: 'Solo se aceptan imágenes JPG o PNG.' };
    }

    // 1. Verificar formato vertical de captura móvil y color según método (Yape o Plin)
    const checkVisual = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.height <= img.width || img.height < 350) {
                resolve({ ok: false, motivo: 'Rechazado: la imagen no es una captura vertical de comprobante Yape/Plin.' });
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = 60;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 60, 100);
            const px = ctx.getImageData(0, 0, 60, 100).data;
            let morados = 0;
            let celestesAzules = 0;
            const totalPx = 60 * 100;

            for (let i = 0; i < px.length; i += 4) {
                const r = px[i], g = px[i + 1], b = px[i + 2];
                if (r >= 65 && r <= 185 && g <= 85 && b >= 75 && b <= 200 && b > g + 35) {
                    morados++;
                }
                if (b >= 110 && g >= 90 && r <= 140 && (b + g) > r * 1.6) {
                    celestesAzules++;
                }
            }

            if (metodoEsperado === 'Plin') {
                if ((celestesAzules / totalPx) < 0.04 && (morados / totalPx) < 0.10) {
                    resolve({ ok: false, motivo: 'Rechazado: esta imagen no parece una captura válida de Plin.' });
                    return;
                }
            } else {
                if ((morados / totalPx) < 0.15) {
                    resolve({ ok: false, motivo: 'Rechazado: esta imagen no es una captura oficial de Yape.' });
                    return;
                }
            }
            resolve({ ok: true });
        };
        img.onerror = () => resolve({ ok: false, motivo: 'No se pudo leer la imagen del comprobante.' });
        img.src = base64Str;
    });

    if (!checkVisual.ok) {
        return { valido: false, error: checkVisual.motivo };
    }

    // 2. OCR estricto del comprobante para Yape y Plin (Soles y Dólares)
    if (typeof Tesseract === 'undefined') {
        return { valido: false, error: 'No cargó Tesseract.js. Revisa la etiqueta <script> en index.html.' };
    }

    const ocrResult = await Tesseract.recognize(base64Str, 'spa');
    const rawText = ocrResult?.data?.text || '';
    const textoLimpio = rawText.replace(/\s+/g, ' ').trim();
    const textoLower = textoLimpio.toLowerCase();

    const tieneEstructura = /yapeaste|yapearon|plin|transferencia|transacci[oó]n|operaci[oó]n|destino/i.test(textoLimpio);
    if (!tieneEstructura) {
        return { valido: false, error: 'Rechazado: la imagen no muestra los datos de una transacción de Yape o Plin.' };
    }

    // Debe ir dirigido a "Liz Berru" o "Liz Ber*"
    const tieneDestinatario = /liz\s*ber(ru|\*|\b)/i.test(textoLimpio);
    if (!tieneDestinatario) {
        return { valido: false, error: 'Rechazado: el comprobante no está dirigido a Liz Berru / Liz Ber*.' };
    }

    if (metodoEsperado === 'Plin') {
        if (!/\bplin\b/i.test(textoLimpio)) {
            return { valido: false, error: 'Rechazado: el comprobante no corresponde a Plin.' };
        }
    } else {
        if (!/yape/i.test(textoLimpio)) {
            return { valido: false, error: 'Rechazado: el comprobante no corresponde a Destino: Yape.' };
        }
        if (!/548/.test(textoLimpio) && !/c[oó]digo\s*de\s*seguridad/i.test(textoLimpio)) {
            return { valido: false, error: 'Rechazado: el comprobante de Yape no muestra los datos de seguridad/destino válidos.' };
        }
    }

    const matchOp = textoLimpio.match(/(?:operaci[oó]n|n[ro°]+[^0-9]{0,15})\s*(\d{5,12})/i);
    if (!matchOp || !matchOp[1]) {
        return { valido: false, error: `Rechazado: no se detecta el Nro. de operación del comprobante de ${metodoEsperado}.` };
    }
    const nroOperacion = matchOp[1].trim();

    // Validar monto en Soles (S/) o Dólares ($ / USD) según la moneda activa
    const esUSD = (typeof state !== 'undefined' && state.currency === 'USD');
    const tasa = typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 0.27;
    const montoObjetivo = esUSD ? Number(montoEsperado) * tasa : Number(montoEsperado);

    const matchMonto = textoLimpio.match(/(?:s\/|\$|usd|pen)\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (matchMonto && matchMonto[1]) {
        const montoLeido = parseFloat(matchMonto[1].replace(',', '.'));
        const tolerancia = esUSD ? 0.15 : 0.10;
        if (!isNaN(montoLeido) && Math.abs(montoLeido - montoObjetivo) > tolerancia) {
            const etiquetaEsperada = esUSD ? `$ ${montoObjetivo.toFixed(2)} USD` : `S/ ${montoObjetivo.toFixed(2)}`;
            const etiquetaLeida = esUSD ? `$ ${montoLeido.toFixed(2)}` : `S/ ${montoLeido.toFixed(2)}`;
            return {
                valido: false,
                error: `Rechazado: el monto del comprobante (${etiquetaLeida}) no coincide con el total (${etiquetaEsperada}).`
            };
        }
    }

    const ahora = new Date();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = String(ahora.getDate()).padStart(2, '0');
    const diaSinCero = String(ahora.getDate());
    const mes = meses[ahora.getMonth()];
    const anio = String(ahora.getFullYear());
    const regexFechaHoy = new RegExp(`(?:${dia}|${diaSinCero})\\s*${mes}\\.?\\s*${anio}`, 'i');
    if (!regexFechaHoy.test(textoLower)) {
        return { valido: false, error: 'Rechazado: la fecha del comprobante no corresponde a hoy.' };
    }

    return { valido: true, nroOperacion };
}

async function handleSubirVoucher(e) {
    e.preventDefault();
    if (!voucherBase64Temp) {
        showToast('Sube la captura de tu voucher', 'error');
        return;
    }

    const cantidadesPorProducto = {};
    state.cart.forEach(item => {
        cantidadesPorProducto[item.productId] = (cantidadesPorProducto[item.productId] || 0) + item.qty;
    });

    let total = 0;
    const detallesParaBD = [];

    state.cart.forEach(item => {
        const p = PRODUCTS.find(prod => String(prod.id) === String(item.productId));
        if (!p) return;

        const prodCode = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
        const totalUnidadesEsteProducto = cantidadesPorProducto[item.productId] || item.qty;
        const minReq = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
        const tienePrecioMayor = Number(p.precioMayor) > 0;
        const tieneDescuentoMayor = tienePrecioMayor && totalUnidadesEsteProducto >= minReq;
        const precioAplicado = tieneDescuentoMayor
            ? Number(p.precioMayor)
            : Number(p.salePrice);
        total += precioAplicado * item.qty;

        detallesParaBD.push({
            codigo: prodCode,
            titulo: p.name,
            precio_remate: precioAplicado,
            talla: item.size || 'Única',
            color: item.color || 'Único',
            cantidad: item.qty,
            imagen: p.image || p.imagen_url || ''
        });
    });

    if (detallesParaBD.length === 0) {
        showToast('No se encontraron prendas válidas en la bolsa.', 'error');
        return;
    }

    const submitBtn = document.getElementById('voucherSubmitBtn');
    const textoOriginalBtn = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validando comprobante...';
    }

    try {
        // 1. Validación estricta del voucher (destinatario Liz Berru / Liz Ber*, celular 548, destino, monto, fecha y nro. operación)
        const validacion = await validarAutenticidadVoucherYapePlin(voucherBase64Temp, selectedPaymentMethod, total);
        if (!validacion.valido) {
            showToast(validacion.error, 'error');
            return;
        }

        const hashImagen = await generarHashImagen(voucherBase64Temp);
        const huellaVisual = await generarHuellaVisualVoucher(voucherBase64Temp);
        const nroOperacion = validacion.nroOperacion;

        // 2. Bloqueo estricto: nunca permitir subir más de una vez la misma imagen o el mismo Nro. de operación
        const usados = obtenerHistorialComprobantesEstrictos();
        if (
            usados.hashes.includes(hashImagen) ||
            (huellaVisual && usados.huellas.includes(huellaVisual)) ||
            usados.operaciones.includes(nroOperacion)
        ) {
            showToast(`Este comprobante o Nro. de operación (${nroOperacion}) ya fue utilizado y no puede repetirse.`, 'error');
            return;
        }

        const ordenCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
        const { user } = getSession();

        const res = await fetch(`${API_URL}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orden: ordenCode,
                cliente: user ? user.nombre : 'Cliente Invitado',
                telefono: user ? (user.telefono || '') : '',
                total,
                metodo: selectedPaymentMethod,
                nro_operacion: nroOperacion,
                imagen_voucher: voucherBase64Temp,
                hash_imagen: hashImagen,
                huella_visual: huellaVisual,
                detalles_pedido: detallesParaBD
            })
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'Este comprobante o número de operación ya fue utilizado anteriormente.', 'error');
            return;
        }

        guardarComprobanteUsadoEstricto(hashImagen, huellaVisual, nroOperacion);

        showToast('¡Voucher validado y guardado con éxito!', 'success');
        closeVoucherModal();
        toggleCartDrawer(false);

        let msg = `🛍️ *NUEVO PAGO Y PEDIDO (${selectedPaymentMethod.toUpperCase()})* 🛍️\n`;
        msg += `🧾 *Orden:* ${ordenCode}\n`;
        msg += `🔢 *Nro. Operación:* ${nroOperacion}\n`;
        msg += `👤 *Cliente:* ${user ? user.nombre : 'Cliente Invitado'}\n\n`;
        msg += `📋 *Detalle Total de la Bolsa de Compras:*\n`;

        detallesParaBD.forEach((item, index) => {
            msg += `${index + 1}. *[${item.codigo}] ${item.titulo}*\n`;
            msg += `   • Color: *${item.color}* | Talla: *${item.talla}* | Cant: *${item.cantidad}*\n`;
            msg += `   • Subtotal: ${formatPrice(item.precio_remate * item.cantidad)}\n\n`;
        });

        msg += `💰 *TOTAL GENERAL PAGADO: ${formatPrice(total)}*\n\n`;
        msg += `✅ *Confirmación:* Mi comprobante ha sido validado y el reporte detallado ya se encuentra registrado en la web. ¡Quedo a la espera de la confirmación de envío!`;

        state.cart = [];
        voucherBase64Temp = '';
        renderCart();

        const urlWhatsApp = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
        const popup = window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            window.location.href = urlWhatsApp;
        }
    } catch (err) {
        console.error('Error en handleSubirVoucher:', err);
        showToast('Ocurrió un error al validar o enviar el pedido.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = textoOriginalBtn;
        }
    }
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

    const cantidadesPorProducto = {};
    state.cart.forEach(item => {
        cantidadesPorProducto[item.productId] = (cantidadesPorProducto[item.productId] || 0) + item.qty;
    });

    let total = 0;
    const detallesParaBD = [];

    state.cart.forEach(item => {
        const p = PRODUCTS.find(prod => String(prod.id) === String(item.productId));
        if (!p) return;

        const prodCode = p.code || `LIZ-${String(p.id).padStart(4, '0')}`;
        const totalUnidadesEsteProducto = cantidadesPorProducto[item.productId] || item.qty;
        const minReq = p.minUnidadesMayor || MIN_UNIDADES_MAYOR;
        const tienePrecioMayor = Number(p.precioMayor) > 0;
        const tieneDescuentoMayor = tienePrecioMayor && totalUnidadesEsteProducto >= minReq;
        const precioAplicado = tieneDescuentoMayor
            ? Number(p.precioMayor)
            : Number(p.salePrice);

        total += precioAplicado * item.qty;

        detallesParaBD.push({
            codigo: prodCode,
            titulo: p.name,
            precio_remate: precioAplicado,
            talla: item.size || 'Única',
            color: item.color || 'Único',
            cantidad: item.qty,
            imagen: p.image || p.imagen_url || ''
        });
    });

    if (detallesParaBD.length === 0) {
        showToast('No se encontraron prendas válidas en la bolsa.', 'error');
        return;
    }

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
                telefono: user ? (user.telefono || '') : '',
                total,
                metodo: selectedPaymentMethod,
                imagen_voucher: voucherBase64Temp,
                hash_imagen: hashImagen,
                detalles_pedido: detallesParaBD
            })
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'Este comprobante ya fue utilizado anteriormente.', 'error');
            return;
        }

        showToast('¡Voucher y detalles guardados con éxito!', 'success');
        closeVoucherModal();
        toggleCartDrawer(false);

        let msg = `🛍️ *NUEVO PAGO Y PEDIDO (${selectedPaymentMethod.toUpperCase()})* 🛍️\n`;
        msg += `🧾 *Orden:* ${ordenCode}\n`;
        msg += `👤 *Cliente:* ${user ? user.nombre : 'Cliente Invitado'}\n\n`;
        msg += `📋 *Detalle Total de la Bolsa de Compras:*\n`;

        detallesParaBD.forEach((item, index) => {
            msg += `${index + 1}. *[${item.codigo}] ${item.titulo}*\n`;
            msg += `   • Color: *${item.color}* | Talla: *${item.talla}* | Cant: *${item.cantidad}*\n`;
            msg += `   • Subtotal: ${formatPrice(item.precio_remate * item.cantidad)}\n\n`;
        });

        msg += `💰 *TOTAL GENERAL PAGADO: ${formatPrice(total)}*\n\n`;
        msg += `✅ *Confirmación:* Mi comprobante ha sido enviado y el reporte detallado ya se encuentra registrado en la web. ¡Quedo a la espera de la confirmación de envío!`;

        state.cart = [];
        voucherBase64Temp = '';
        renderCart();

        const urlWhatsApp = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
        const popup = window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            window.location.href = urlWhatsApp;
        }
    } catch (err) {
        console.error('Error en handleSubirVoucher:', err);
        showToast('Ocurrió un error al procesar o enviar el pedido.', 'error');
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

async function buscarTelefonoClientePorNombre(nombreCliente) {
    const objetivo = String(nombreCliente || '').trim().toLowerCase();
    if (!objetivo) return '';

    try {
        const res = await fetch(`${API_CANJES_URL}/clientes-puntos`);
        if (res.ok) {
            const lista = await res.json();
            if (Array.isArray(lista)) {
                const encontrado = lista.find(c =>
                    String(c.nombre || '').trim().toLowerCase() === objetivo ||
                    String(c.nombre || '').trim().toLowerCase().includes(objetivo)
                );
                const tel = encontrado && (encontrado.telefono || encontrado.celular || encontrado.whatsapp);
                if (tel && String(tel).trim() !== '' && String(tel).trim() !== '-') {
                    return String(tel).trim();
                }
            }
        }
    } catch (e) {
        console.warn('No se pudo consultar teléfono en clientes-puntos:', e);
    }

    const sesionActual = JSON.parse(localStorage.getItem('rs_usuario') || 'null');
    if (sesionActual && String(sesionActual.nombre || '').trim().toLowerCase() === objetivo) {
        const telSesion = sesionActual.telefono || sesionActual.celular || '';
        if (telSesion && String(telSesion).trim() !== '-') return String(telSesion).trim();
    }

    return '';
}

async function cambiarEstadoPago(id, estado) {
    const { token } = getSession();

    const filaActual = Array.from(document.querySelectorAll('#tablaAdminVouchersBody tr')).find(tr =>
        tr.innerHTML.includes(`cambiarEstadoPago(${id},`)
    );
    const celdasFila = filaActual ? filaActual.querySelectorAll('td') : [];
    const ordenFila = celdasFila[0]?.textContent?.trim() || `ORD-${id}`;
    const clienteFila = celdasFila[1]?.textContent?.trim() || '';
    const metodoFila = celdasFila[2]?.textContent?.trim() || 'Yape';
    const totalTextoFila = celdasFila[3]?.textContent?.trim() || 'S/ 0.00';

    try {
        const res = await fetch(`${API_URL}/pagos/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado })
        });

        if (!res.ok) {
            showToast('Error al actualizar estado', 'error');
            return;
        }

        const rawData = await res.json().catch(() => ({}));
        const pagoActualizado = rawData.pago || rawData.data || rawData || {};

        const nombreCliente = (
            pagoActualizado.cliente ||
            pagoActualizado.nombre_cliente ||
            pagoActualizado.usuario_nombre ||
            clienteFila ||
            'Cliente'
        ).trim();

        const ordenPago = (pagoActualizado.orden || ordenFila).trim();
        const metodoPago = (pagoActualizado.metodo || metodoFila).trim();
        const totalNumero = Number(pagoActualizado.total);
        const totalTexto = !isNaN(totalNumero) && pagoActualizado.total !== undefined
            ? `S/ ${totalNumero.toFixed(2)}`
            : totalTextoFila;

        let telefonoGuardado = (
            pagoActualizado.telefono ||
            pagoActualizado.celular ||
            pagoActualizado.whatsapp ||
            pagoActualizado.cliente_telefono ||
            ''
        ).toString().trim();

        if (!telefonoGuardado || telefonoGuardado === '-') {
            telefonoGuardado = await buscarTelefonoClientePorNombre(nombreCliente);
        }

        showToast(`Pago marcado como ${estado}`, 'success');
        await renderTablaAdminVouchers();

        const iconoEstado = estado === 'Aprobado' ? '✅ ¡PAGO APROBADO!' : '❌ ¡PAGO RECHAZADO / OBSERVADO!';
        let mensajeWhatsApp = `Hola *${nombreCliente}*,\n\n` +
                              `Te saludamos de *LIZ FASHION EVOLUTION*.\n` +
                              `📌 *Estado de tu orden (${ordenPago}):* ${iconoEstado}\n` +
                              `💳 *Método:* ${metodoPago} (${totalTexto})\n\n`;

        if (estado === 'Aprobado') {
            mensajeWhatsApp += `¡Tu comprobante ha sido validado con éxito! Estamos procediendo con el despacho de tu pedido. ¡Gracias por tu compra! 🎉`;
        } else {
            mensajeWhatsApp += `Lamentablemente tu comprobante no pudo ser validado (imagen borrosa, fecha no válida o monto incorrecto). Por favor, comunícate con nosotros para solucionarlo.`;
        }

        const telefonoConfirmado = prompt(
            `El pago de ${nombreCliente} (${ordenPago}) fue marcado como ${estado}.\nNúmero de WhatsApp del cliente:`,
            telefonoGuardado || '9'
        );

        if (telefonoConfirmado && telefonoConfirmado.trim() !== '' && telefonoConfirmado.trim() !== '9') {
            let numeroLimpio = telefonoConfirmado.trim().replace(/\D/g, '');
            if (!numeroLimpio.startsWith('51') && numeroLimpio.length === 9) {
                numeroLimpio = '51' + numeroLimpio;
            }

            const urlWhatsApp = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensajeWhatsApp)}`;
            const container = document.getElementById('toastContainer');
            if (container) {
                const alertaDiv = document.createElement('div');
                alertaDiv.className = 'bg-slate-900 border-2 border-emerald-500 text-white p-4 rounded-3xl shadow-2xl flex flex-col gap-2.5 pointer-events-auto mt-2';
                alertaDiv.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="font-black text-xs text-emerald-400">✅ ¡Pago ${estado} (${nombreCliente} · ${numeroLimpio})!</span>
                        <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-white text-sm font-bold px-2">✕</button>
                    </div>
                    <p class="text-[11px] text-slate-300 leading-tight">Envía el aviso al WhatsApp del cliente (${numeroLimpio}):</p>
                    <a href="${urlWhatsApp}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-2xl text-center shadow-lg transition flex items-center justify-center gap-2">
                        <i data-lucide="message-circle" class="w-4 h-4"></i> Enviar a WhatsApp (${numeroLimpio}) 💬
                    </a>
                `;
                container.appendChild(alertaDiv);
                lucide.createIcons();
            }
        } else {
            showToast('Estado actualizado, pero no se ingresó un número válido de WhatsApp.', 'warning');
        }
    } catch (err) {
        showToast('Error de conexión al actualizar estado', 'error');
    }
}

// =====================================================================
// HISTORIAL DE PAGOS Y ESTADO PARA EL CLIENTE
// =====================================================================
async function openClientPaymentsModal() {
    const { user } = getSession();
    if (!user) {
        showToast('Debes iniciar sesión para ver tus pagos', 'warning');
        openAuthModal();
        return;
    }

    const modal = document.getElementById('clientPaymentsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        await renderTablaClientPayments(user.nombre);
    }
}

function closeClientPaymentsModal() {
    const modal = document.getElementById('clientPaymentsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function renderTablaClientPayments(nombreUsuario) {
    const tbody = document.getElementById('tablaClientPaymentsBody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_URL}/pagos/cliente/${encodeURIComponent(nombreUsuario)}`);
        if (!res.ok) throw new Error('Error al cargar pagos');
        const pagosCliente = await res.json();

        if (!Array.isArray(pagosCliente) || pagosCliente.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">No tienes pagos registrados con Yape o Plin todavía.</td></tr>`;
            return;
        }

        tbody.innerHTML = pagosCliente.map(p => {
            let estadoBadge = 'bg-amber-100 text-amber-800';
            if (p.estado === 'Aprobado') estadoBadge = 'bg-emerald-100 text-emerald-700 font-black';
            if (p.estado === 'Rechazado') estadoBadge = 'bg-rose-100 text-rose-700 font-black';

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-3 font-mono font-bold">${p.orden}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.metodo === 'Yape' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${p.metodo}</span></td>
                    <td class="p-3 font-black text-rose-600">S/ ${Number(p.total).toFixed(2)}</td>
                    <td class="p-3 text-center">
                        <a href="${p.imagen_voucher}" target="_blank" class="inline-block">
                            <img src="${p.imagen_voucher}" class="w-10 h-10 object-cover rounded-lg border hover:scale-110 transition shadow-xs" title="Ver mi voucher">
                        </a>
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2.5 py-1 rounded-full text-[10px] ${estadoBadge}">${p.estado}</span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500">Error al cargar tus pagos.</td></tr>`;
    }
}

// =====================================================================
// EXTENSIÓN: MODAL POST-AGREGAR AL CARRITO (PAGAR OR SEGUIR COMPRANDO)
// =====================================================================
function openPostAddModal(product) {
    const modal = document.getElementById('postAddModal');
    const desc = document.getElementById('postAddProductDesc');
    if (desc) {
        desc.textContent = `Has agregado "${product.name}" a tu bolsa. ¿Qué deseas hacer ahora?`;
    }
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closePostAddModal() {
    const modal = document.getElementById('postAddModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function goToCheckoutFromModal() {
    closePostAddModal();
    toggleCartDrawer(true);
}

const cardQuantities = {};

function changeCardQty(productId, delta) {
    if (!cardQuantities[productId]) {
        cardQuantities[productId] = 1;
    }

    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const rawImgIdx = sliderIndexes[productId] || 0;
    const currentImgIdx = rawImgIdx < (product.images?.length || 1) ? rawImgIdx : 0;
    
    const currentStockMap = (product.variantDetails && product.variantDetails[currentImgIdx]) 
        ? product.variantDetails[currentImgIdx].stockBySize 
        : product.stockBySize;

    const selectedSize = state.selectedSizesPerCard[productId] || getFirstAvailableSize(product, currentImgIdx);
    const stockTallaActual = currentStockMap[selectedSize] || 0;

    let nuevaCantidad = cardQuantities[productId] + delta;

    if (nuevaCantidad < 1) {
        nuevaCantidad = 1;
    }

    if (nuevaCantidad > stockTallaActual) {
        showToast(`Solo quedan ${stockTallaActual} unidades disponibles en la talla ${selectedSize}`, 'warning');
        return;
    }

    cardQuantities[productId] = nuevaCantidad;
    
    const qtySpan = document.getElementById(`qty-input-${productId}`);
    if (qtySpan) {
        qtySpan.textContent = cardQuantities[productId];
    }
}

function addToCartWithQty(productId) {
    const qty = cardQuantities[productId] || 1;
    for (let i = 0; i < qty; i++) {
        addToCart(productId);
    }
    cardQuantities[productId] = 1;
    const qtySpan = document.getElementById(`qty-input-${productId}`);
    if (qtySpan) {
        qtySpan.textContent = '1';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('authContainer');
    const overlaySignup = document.getElementById('overlaySignup');
    const overlayLogin = document.getElementById('overlayLogin');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');

    if (overlaySignup && authContainer) {
        overlaySignup.addEventListener('click', () => {
            authContainer.classList.add("right-panel-active");
        });
    }

    if (showSignup && authContainer) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.classList.add("right-panel-active");
        });
    }

    if (overlayLogin && authContainer) {
        overlayLogin.addEventListener('click', () => {
            authContainer.classList.remove("right-panel-active");
        });
    }

    if (showLogin && authContainer) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.classList.remove("right-panel-active");
        });
    }
});

// =====================================================================
// RECUPERACIÓN DE CONTRASEÑA CON PALABRA SECRETA
// =====================================================================
function openForgotPasswordModal(e) {
    e.preventDefault();
    const email = prompt("Ingresa tu correo electrónico registrado:");
    if (!email) return;

    const palabraSecreta = prompt("Ingresa tu palabra secreta de recuperación (ej. piura2026):");
    if (!palabraSecreta) return;

    const nuevaPassword = prompt("Ingresa tu nueva contraseña:");
    if (!nuevaPassword) return;

    recuperarPasswordNeon(email.trim(), palabraSecreta.trim(), nuevaPassword.trim());
}

async function recuperarPasswordNeon(email, palabra_secreta, nueva_password) {
    try {
        const res = await fetch(`${API_URL}/recuperar-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, palabra_secreta, nueva_password })
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'No se pudo recuperar la contraseña', 'error');
            return;
        }

        showToast('¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.', 'success');
    } catch (err) {
        showToast('Error de conexión con el servidor', 'error');
    }
}


// =====================================================================
// BOLSA DE CONFECCIÓN CONSOLIDADA (AÑADIR MÚLTIPLES PRENDAS SIN SALIR)
// =====================================================================
let bolsaConfeccionItems = [];

function agregarPrendaBolsaConfeccion(id) {
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

    bolsaConfeccionItems.push({
        id: prenda.id,
        modelo: prenda.modelo,
        color: colorSeleccionado,
        talla: tallaSeleccionada,
        precio: prenda.precio,
      minUnidadesMayor: prenda.minUnidadesMayor || MIN_UNIDADES_MAYOR,
        imagen: prenda.imagenes && prenda.imagenes.length > 0 ? prenda.imagenes[0] : prenda.imagen
    });

    actualizarBadgeBolsaConfeccion();
    showToast(`¡"${prenda.modelo}" (${colorSeleccionado} - Talla ${tallaSeleccionada}) agregada a la bolsa!`, 'success');
}

function actualizarBadgeBolsaConfeccion() {
    const badge = document.getElementById('badgeBolsaConfeccion');
    if (badge) badge.textContent = bolsaConfeccionItems.length;
}

function abrirBolsaConfeccion() {
    renderizarBolsaConfeccionItems();
    const modal = document.getElementById('bolsaConfeccionModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function cerrarBolsaConfeccion() {
    const modal = document.getElementById('bolsaConfeccionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderizarBolsaConfeccionItems() {
    const container = document.getElementById('listaBolsaConfeccionItems');
    const subtitulo = document.getElementById('subtituloBolsaConf');
    const totalSpan = document.getElementById('totalBolsaConfeccion');
    if (!container) return;

    subtitulo.textContent = `${bolsaConfeccionItems.length} prenda(s) acumulada(s)`;

    if (bolsaConfeccionItems.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">No has agregado ninguna prenda de confección todavía. Sigue explorando el catálogo.</div>`;
        if (totalSpan) totalSpan.textContent = 'S/ 0.00';
        return;
    }

    const conteoModelos = {};
    bolsaConfeccionItems.forEach(item => {
        conteoModelos[item.modelo] = (conteoModelos[item.modelo] || 0) + 1;
    });

    let total = 0;
    container.innerHTML = bolsaConfeccionItems.map((item, idx) => {
       const cantidadEsteModelo = conteoModelos[item.modelo];
        let precioAplicado = item.precio;
        let esPrecioMayor = false;
        const minReqConf = item.minUnidadesMayor || MIN_UNIDADES_MAYOR;
            const tienePrecioMayorConf = Number(item.precioMayor) > 0;

            if (tienePrecioMayorConf && cantidadEsteModelo >= minReqConf) {
                precioAplicado = Number(item.precioMayor);
                esPrecioMayor = true;
            }
            total += precioAplicado;

            return `
            <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border ${esPrecioMayor ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'}">
                <img src="${item.imagen}" class="w-14 h-16 object-cover rounded-xl border shrink-0" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=Prenda'">
                <div class="flex-1">
                    <h5 class="font-bold text-slate-900 text-xs">${item.modelo}</h5>
                    <span class="text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-semibold inline-block mt-0.5">Color: ${item.color} | Talla: ${item.talla}</span>
                    
                    ${esPrecioMayor 
                        ? `<span class="block text-[10px] font-extrabold text-rose-600 mt-1">🎉 ¡Precio por mayor aplicado (${cantidadEsteModelo} unds)!</span>` 
                       : `<span class="block text-[10px] text-slate-400 mt-1">💡 Agrega ${minReqConf - cantidadEsteModelo} unds más de este modelo para activar precio por mayor</span>`
                    }

                    <p class="text-xs font-black text-rose-600 mt-1">S/ ${precioAplicado.toFixed(2)} ${esPrecioMayor ? '<span class="text-[9px] text-rose-500">(Al por mayor)</span>' : ''}</p>
                </div>
                <button onclick="bolsaConfeccionItems.splice(${idx}, 1); actualizarBadgeBolsaConfeccion(); renderizarBolsaConfeccionItems();" class="p-2 text-slate-400 hover:text-rose-600 cursor-pointer transition" title="Quitar prenda">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </div>
        `;
    }).join('');

    if (totalSpan) totalSpan.textContent = `S/ ${total.toFixed(2)}`;
}
function enviarBolsaConfeccionWhatsApp() {
    if (bolsaConfeccionItems.length === 0) {
        showToast('Tu bolsa de confección está vacía', 'warning');
        return;
    }

    const nroOrden = `CONF-LIZ-${Math.floor(100000 + Math.random() * 900000)}`;
    const fechaActual = `${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`;
    
    // Contar cuántas unidades hay de cada modelo para aplicar precio por mayor automáticamente
    const conteoModelos = {};
    bolsaConfeccionItems.forEach(item => {
        conteoModelos[item.modelo] = (conteoModelos[item.modelo] || 0) + 1;
    });

    let total = 0;
    let mensaje = `🔥 *PEDIDO CONSOLIDADO DE CONFECCIÓN* 🔥\n`;
    mensaje += `🧾 *N° Orden:* ${nroOrden}\n`;
    mensaje += `📅 *Fecha:* ${fechaActual}\n\n`;
    mensaje += `📋 *Detalle de prendas solicitadas:*\n\n`;

    bolsaConfeccionItems.forEach((item, index) => {
        const cantidadEsteModelo = conteoModelos[item.modelo];
       let precioAplicado = item.precio;
        let esPrecioMayor = false;
        const minReqConf = item.minUnidadesMayor || MIN_UNIDADES_MAYOR;
        const tienePrecioMayorConf = Number(item.precioMayor) > 0;

        if (tienePrecioMayorConf && cantidadEsteModelo >= minReqConf) {
            precioAplicado = Number(item.precioMayor);
            esPrecioMayor = true;
        }

        total += precioAplicado;

        // AQUÍ SE DETALLA CADA PRENDA CON SU MODELO, COLOR, TALLA Y PRECIO EXACTO
        mensaje += `${index + 1}. *Modelo:* ${item.modelo}\n`;
        mensaje += `   • Color: *${item.color}*\n`;
        mensaje += `   • Talla: *${item.talla}*\n`;
        mensaje += `   • Precio: S/ ${precioAplicado.toFixed(2)} ${esPrecioMayor ? '(Precio Mayor)' : ''}\n\n`;

        // Registrar en el reporte de la base de datos Neon de forma automática
        registrarPedidoClienteEnReporte({
            orden: `${nroOrden}-${index + 1}`,
            fecha: fechaActual,
            modelo: item.modelo,
            color: item.color,
            talla: item.talla,
            precio: precioAplicado
        });
    });

    mensaje += `💰 *TOTAL CONSOLIDADO: S/ ${total.toFixed(2)}*\n\n`;
    mensaje += `¡Hola! Acabo de acumular estas prendas en mi bolsa de confección. Quedo a la espera de las coordinaciones de pago y envío.`;

    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(mensaje)}`, '_blank');
    
    bolsaConfeccionItems = [];
    actualizarBadgeBolsaConfeccion();
    cerrarBolsaConfeccion();
    showToast('¡Pedido consolidado enviado por WhatsApp y registrado!', 'success');
}
function generarPDFBolsaConfeccionConsolidada() {
    if (bolsaConfeccionItems.length === 0) {
        showToast('Tu bolsa de confección está vacía', 'warning');
        return;
    }

    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        alert('Librería jsPDF no detectada.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const nroOrden = `CONF-LIZ-${Math.floor(100000 + Math.random() * 900000)}`;
    const fechaActual = `${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`;

    // Cabecera PDF
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LIZ FASHION EVOLUTION', 15, 22);
    
    doc.setFontSize(9);
    doc.text('ORDEN CONSOLIDADA DE CONFECCIÓN', 120, 22);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fechaActual}`, 15, 45);
    doc.text(`N° de Orden: ${nroOrden}`, 135, 45);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 50, 195, 50);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de las Prendas Acumuladas:', 15, 60);

    let yPos = 70;
    let totalGeneral = 0;

    bolsaConfeccionItems.forEach((item, index) => {
        totalGeneral += item.precio;
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. Modelo: ${item.modelo}`, 15, yPos);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`   • Color: ${item.color}   |   Talla: ${item.talla}`, 15, yPos + 6);
        doc.text(`   • Precio: S/ ${item.precio.toFixed(2)}`, 15, yPos + 12);

        registrarPedidoClienteEnReporte({
            orden: `${nroOrden}-${index + 1}`,
            fecha: fechaActual,
            modelo: item.modelo,
            color: item.color,
            talla: item.talla,
            precio: item.precio
        });

        yPos += 22;
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos + 2, 195, yPos + 2);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total a Pagar: S/ ${totalGeneral.toFixed(2)}`, 135, yPos + 12);

    doc.save(`Orden_Consolidada_Confeccion_${nroOrden}.pdf`);
    
    bolsaConfeccionItems = [];
    actualizarBadgeBolsaConfeccion();
    cerrarBolsaConfeccion();
    showToast('¡PDF consolidado generado con éxito!', 'success');
}


// =====================================================================
// VENTANA DE REPORTE DETALLADO DE PEDIDOS DEL CLIENTE
// =====================================================================
async function openClientReportModal() {
    let currentUser = JSON.parse(localStorage.getItem('rs_usuario') || 'null');
    
    if (!currentUser || (!currentUser.nombre && !currentUser.email)) {
        showToast('Debes iniciar sesión para ver tu reporte de pedidos', 'warning');
        if (typeof openAuthModal === 'function') openAuthModal();
        return;
    }

    const identificadorCliente = currentUser.nombre || currentUser.email;

    const modal = document.getElementById('clientReportModal');
    const container = document.getElementById('clientReportContainer');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (container) {
        container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Consultando base de datos...</div>';
    }

    try {
        let res = await fetch(`${API_URL}/pagos/cliente/${encodeURIComponent(identificadorCliente)}`);
        let pagos = await res.json();

        if ((!Array.isArray(pagos) || pagos.length === 0) && currentUser.email) {
            res = await fetch(`${API_URL}/pagos/cliente/${encodeURIComponent(currentUser.email)}`);
            pagos = await res.json();
        }

        if (!container) return;

        if (!Array.isArray(pagos) || pagos.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">No tienes pedidos ni comprobantes registrados todavía. Realiza un pedido y sube tu comprobante para verlo aquí.</div>';
            return;
        }

        let html = '';
        pagos.forEach(pago => {
            let badgeColor = pago.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : (pago.estado === 'Rechazado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800');
            
            html += `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                            <span class="font-black text-slate-900 text-sm">Orden: ${pago.orden}</span>
                            <span class="block text-[10px] text-slate-400">Fecha: ${new Date(pago.creado_en).toLocaleString()}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${badgeColor}">${pago.estado}</span>
                            <span class="font-black text-rose-600 text-sm">S/ ${Number(pago.total).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="text-xs space-y-1.5">
                        <p class="font-bold text-slate-700">🛒 Detalle de Prendas Solicitadas:</p>
                        <div class="bg-white rounded-xl p-2.5 border border-slate-200 space-y-2">
            `;

            if (pago.detalles_pedido && Array.isArray(pago.detalles_pedido) && pago.detalles_pedido.length > 0) {
                pago.detalles_pedido.forEach(item => {
                    html += `
                        <div class="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                            <div class="flex items-center gap-2">
                                <img src="${item.imagen || item.imagen_url || 'placeholder.jpg'}" class="w-8 h-8 rounded-lg object-cover border">
                                <div>
                                    <p class="font-bold text-slate-800">${item.titulo || item.modelo}</p>
                                    <p class="text-[10px] text-slate-500">Talla: <b>${item.talla || 'Única'}</b> | Color: <b>${item.color || 'Estándar'}</b> | Cant: <b>${item.cantidad || 1}</b></p>
                                </div>
                            </div>
                            <span class="font-bold text-slate-900">S/ ${(Number(item.precio_remate || item.precio || 0) * (item.cantidad || 1)).toFixed(2)}</span>
                        </div>
                    `;
                });
            } else {
                html += `<p class="text-[11px] text-slate-400 italic">Pedido general validado por WhatsApp / Yape.</p>`;
            }

            html += `
                        </div>
                    </div>
                    <div class="flex justify-between items-center pt-1 text-[11px] text-slate-500">
                        <span>Método: <strong class="text-purple-700">${pago.metodo}</strong></span>
                        <a href="${pago.imagen_voucher}" target="_blank" class="text-rose-600 hover:underline font-bold">Ver Comprobante Subido ↗</a>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        if (container) {
            container.innerHTML = '<div class="text-center py-6 text-xs text-rose-600">Error al conectar con el servidor para cargar el reporte.</div>';
        }
    }
}

function closeClientReportModal() {
    const modal = document.getElementById('clientReportModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}





// =====================================================================
// PANEL DE ADMINISTRADOR: REPORTE GENERAL DE TODOS LOS CLIENTES
// =====================================================================
async function openAdminAllReportsModal() {
    const { isAdmin } = getSession();
    if (!isAdmin) {
        showToast('Acceso exclusivo para el Administrador', 'error');
        return;
    }

    const modal = document.getElementById('adminAllReportsModal');
    const container = document.getElementById('adminAllReportsContainer');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (container) {
        container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Cargando todos los reportes de clientes desde Neon...</div>';
    }

    try {
        const { token } = getSession();
        const res = await fetch(`${API_URL}/pagos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const pagos = await res.json();

        if (!container) return;

        if (!Array.isArray(pagos) || pagos.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">No hay pagos ni reportes registrados en el sistema todavía.</div>';
            return;
        }

        let html = '';
        pagos.forEach(pago => {
            let badgeColor = pago.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : (pago.estado === 'Rechazado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800');
            
            html += `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs mb-3">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                            <span class="font-black text-slate-900 text-sm">Orden: ${pago.orden}</span>
                            <span class="block text-xs font-bold text-purple-700">Cliente: ${pago.cliente || 'Anónimo'} (${pago.telefono || 'Sin teléfono'})</span>
                            <span class="block text-[10px] text-slate-400">Fecha: ${new Date(pago.creado_en).toLocaleString()}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${badgeColor}">${pago.estado}</span>
                            <span class="font-black text-rose-600 text-sm">S/ ${Number(pago.total).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="text-xs space-y-1.5">
                        <p class="font-bold text-slate-700">🛒 Detalle de Prendas Solicitadas:</p>
                        <div class="bg-white rounded-xl p-2.5 border border-slate-200 space-y-2">
            `;

            if (pago.detalles_pedido && Array.isArray(pago.detalles_pedido) && pago.detalles_pedido.length > 0) {
                pago.detalles_pedido.forEach(item => {
                    html += `
                        <div class="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                            <div class="flex items-center gap-2">
                                <img src="${item.imagen || item.imagen_url || 'placeholder.jpg'}" class="w-8 h-8 rounded-lg object-cover border">
                                <div>
                                    <p class="font-bold text-slate-800">${item.titulo || item.modelo}</p>
                                    <p class="text-[10px] text-slate-500">Talla: <b>${item.talla || 'Única'}</b> | Color: <b>${item.color || 'Estándar'}</b> | Cant: <b>${item.cantidad || 1}</b></p>
                                </div>
                            </div>
                            <span class="font-bold text-slate-900">S/ ${(Number(item.precio_remate || item.precio || 0) * (item.cantidad || 1)).toFixed(2)}</span>
                        </div>
                    `;
                });
            } else {
                html += `<p class="text-[11px] text-slate-400 italic">Pedido general validado por WhatsApp / Yape.</p>`;
            }

            html += `
                        </div>
                    </div>
                    <div class="flex justify-between items-center pt-1 text-[11px] text-slate-500">
                        <span>Método de Pago: <strong class="text-purple-700">${pago.metodo}</strong></span>
                        <a href="${pago.imagen_voucher}" target="_blank" class="text-rose-600 hover:underline font-bold">Ver Comprobante del Cliente ↗</a>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        if (container) {
            container.innerHTML = '<div class="text-center py-6 text-xs text-rose-600">Error al cargar el reporte general de administrador.</div>';
        }
    }
}

function closeAdminAllReportsModal() {
    const modal = document.getElementById('adminAllReportsModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

async function descontarStockPorPedido(detallesPedido) {
    if (!Array.isArray(detallesPedido) || detallesPedido.length === 0) return;

    const { token } = getSession();
    const productosActualizadosIds = new Set();

    detallesPedido.forEach(item => {
        const product = PRODUCTS.find(p =>
            (item.codigo && (p.code === item.codigo || `LIZ-${String(p.id).padStart(4, '0')}` === item.codigo)) ||
            p.name === item.titulo
        );
        if (!product) return;

        const qtyToDeduct = Math.max(1, Number(item.cantidad) || 1);
        const sizeKey = item.talla;
        const colorKey = (item.color || '').trim().toLowerCase();

        let matchedVariantIdx = -1;
        if (Array.isArray(product.variantDetails) && product.variantDetails.length > 0) {
            matchedVariantIdx = product.variantDetails.findIndex(v =>
                String(v.color || '').trim().toLowerCase() === colorKey
            );
        }

        if (matchedVariantIdx >= 0 && product.variantDetails[matchedVariantIdx].stockBySize) {
            const vStock = product.variantDetails[matchedVariantIdx].stockBySize;
            if (sizeKey && typeof vStock[sizeKey] === 'number') {
                vStock[sizeKey] = Math.max(0, vStock[sizeKey] - qtyToDeduct);
            }
        }

        if (product.stockBySize && sizeKey && typeof product.stockBySize[sizeKey] === 'number') {
            product.stockBySize[sizeKey] = Math.max(0, product.stockBySize[sizeKey] - qtyToDeduct);
        }

        productosActualizadosIds.add(product.id);
    });

    applyFilters();
    updateGlobalStockCounter();

    for (const prodId of productosActualizadosIds) {
        const prod = PRODUCTS.find(p => p.id === prodId);
        if (!prod) continue;

        const aggregatedStock = (Array.isArray(prod.variantDetails) && prod.variantDetails.length > 0)
            ? prod.variantDetails.reduce((acc, v) => {
                acc.S += Number(v.stockBySize?.S || 0);
                acc.M += Number(v.stockBySize?.M || 0);
                acc.L += Number(v.stockBySize?.L || 0);
                acc.XL += Number(v.stockBySize?.XL || 0);
                acc.XXL += Number(v.stockBySize?.XXL || 0);
                return acc;
            }, { S: 0, M: 0, L: 0, XL: 0, XXL: 0 })
            : prod.stockBySize;

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            await fetch(`${API_URL}/productos/${prod.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    titulo: prod.name,
                    categoria: prod.category,
                    etiqueta: prod.tag,
                    precio_remate: prod.salePrice,
                    precio_mayor: Number(prod.precioMayor) || 0,
                    precio_original: prod.regularPrice,
                    stock_by_size: aggregatedStock,
                    variant_details: prod.variantDetails || [],
                    material: prod.material,
                    colores: prod.colors || [],
                    descripcion: prod.description,
                    imagen_url: prod.image,
                    imagenes: prod.images || [prod.image]
                })
            });
        } catch (err) {
            console.warn(`No se pudo sincronizar el stock del producto ${prod.id} con el servidor:`, err.message);
        }
    }
}
// =====================================================================
// ZONA DE CANJE, PUNTOS Y VALIDACIÓN DE COMPROBANTES YAPE / PLIN
// =====================================================================
const API_CANJES_URL = 'https://sistema-web-ropa-liz-fashion-evolution.onrender.com/api/canjes';
let archivoCanjeBase64Pendiente = '';
let adicionalEditadoManualmente = false;
let cacheProductosCanje = [];
let canjePendientePago = null;
let voucherCanjeBase64 = '';

function cambiarModoImagenCanje() {
    const tipoEl = document.getElementById('canje-tipo-imagen');
    const urlInput = document.getElementById('canje-imagen');
    const fileInput = document.getElementById('canje-imagen-file');
    if (!tipoEl || !urlInput || !fileInput) return;

    const modo = tipoEl.value;
    if (modo === 'url') {
        urlInput.style.display = 'block';
        fileInput.style.display = 'none';
        fileInput.value = '';
        archivoCanjeBase64Pendiente = '';
    } else if (modo === 'archivo') {
        urlInput.style.display = 'none';
        fileInput.style.display = 'block';
        urlInput.value = '';
    } else {
        urlInput.style.display = 'none';
        fileInput.style.display = 'none';
    }
}

function sincronizarAdicionalPorPuntos() {
    if (adicionalEditadoManualmente) return;
    const ptsInput = document.getElementById('canje-puntos');
    const addInput = document.getElementById('canje-adicional');
    if (!ptsInput || !addInput) return;

    const pts = parseInt(ptsInput.value, 10);
    addInput.value = (!isNaN(pts) && pts > 0) ? (pts * 1).toFixed(2) : '';
}

function leerArchivoComoBase64Comprimido(file, maxAncho = 700, calidad = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const scale = img.width > maxAncho ? maxAncho / img.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', calidad));
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function seleccionarArchivoCanje(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const base64 = await leerArchivoComoBase64Comprimido(file);
    archivoCanjeBase64Pendiente = base64;

    const inputUrl = document.getElementById('canje-imagen');
    if (inputUrl) inputUrl.value = base64;

    const previewBox = document.getElementById('canje-preview-box');
    const previewImg = document.getElementById('canje-preview-img');
    if (previewBox && previewImg) {
        previewImg.src = base64;
        previewBox.style.display = 'block';
    }
}

function obtenerUsuarioCanjeActual() {
    if (typeof getSession === 'function') {
        const sesion = getSession();
        if (sesion && sesion.user) {
            return {
                usuario: sesion.user,
                esAdmin: Boolean(sesion.isAdmin || sesion.user.rol === 'admin' || sesion.user.isAdmin)
            };
        }
    }
    const raw = JSON.parse(localStorage.getItem('rs_usuario') || 'null');
    return {
        usuario: raw,
        esAdmin: Boolean(raw && (raw.rol === 'admin' || raw.isAdmin))
    };
}

function guardarPuntosEnSesion(nuevosPuntos) {
    const { usuario } = obtenerUsuarioCanjeActual();
    if (!usuario) return;
    usuario.puntos = Number(nuevosPuntos) || 0;
    window.currentUser = usuario;
    localStorage.setItem('rs_usuario', JSON.stringify(usuario));
}

function abrirModalCanjes() {
    const modal = document.getElementById('modalCanjes');
    if (!modal) return;
    modal.style.display = 'flex';

    const { usuario, esAdmin } = obtenerUsuarioCanjeActual();
    if (usuario) window.currentUser = usuario;

    const panelAdmin = document.getElementById('admin-canje-panel');
    if (panelAdmin) {
        panelAdmin.style.display = esAdmin ? 'block' : 'none';
    }

    const addInput = document.getElementById('canje-adicional');
    if (addInput && !addInput.dataset.boundManual) {
        addInput.dataset.boundManual = '1';
        addInput.addEventListener('input', () => {
            adicionalEditadoManualmente = addInput.value.trim() !== '';
        });
    }

    actualizarVistaPuntos();
    cargarProductosCanje();
    if (esAdmin) {
        cargarPuntosClientesAdmin();
    }
}

function cerrarModalCanjes() {
    const modal = document.getElementById('modalCanjes');
    if (modal) {
        modal.style.display = 'none';
    }
}

function actualizarVistaPuntos() {
    const { usuario } = obtenerUsuarioCanjeActual();
    const pts = usuario ? (Number(usuario.puntos) || 0) : 0;
    const navPts = document.getElementById('nav-user-puntos');
    const modalPts = document.getElementById('modal-user-puntos');
    if (navPts) navPts.textContent = pts;
    if (modalPts) modalPts.textContent = pts;
}

function obtenerTarifaPorPunto(producto) {
    const ptsReq = Math.max(1, parseInt(producto.puntos_requeridos, 10) || 1);
    const adicionalGuardado = parseFloat(producto.precio_adicional) || 0;

    if (adicionalGuardado === 1 || adicionalGuardado === 2) {
        return adicionalGuardado;
    }
    if (adicionalGuardado > 0) {
        return adicionalGuardado / ptsReq;
    }
    return 1;
}

function calcularMontoAdicionalCliente(producto, puntosCliente) {
    const ptsReq = Math.max(1, parseInt(producto.puntos_requeridos, 10) || 1);
    const tarifa = obtenerTarifaPorPunto(producto);
    const ptsValidos = Math.max(0, Number(puntosCliente) || 0);
    const ptsFaltantes = Math.max(0, ptsReq - ptsValidos);

    return Number((ptsFaltantes * tarifa).toFixed(2));
}

function refrescarMontoAdicionalTarjeta(productoId) {
    const producto = cacheProductosCanje.find(item => Number(item.id) === Number(productoId));
    if (!producto) return;

    const { usuario } = obtenerUsuarioCanjeActual();
    const ptsCliente = usuario ? (Number(usuario.puntos) || 0) : 0;
    const spanMonto = document.getElementById(`texto-monto-adicional-${productoId}`);
    const inputMonto = document.getElementById(`monto-adicional-${productoId}`);

    const montoCalculado = calcularMontoAdicionalCliente(producto, ptsCliente);

    if (spanMonto) spanMonto.textContent = montoCalculado.toFixed(2);
    if (inputMonto) inputMonto.value = montoCalculado.toFixed(2);
}

async function cargarProductosCanje() {
    const contenedor = document.getElementById('lista-productos-canje');
    if (!contenedor) return;
    contenedor.style.display = 'grid';
    contenedor.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; padding:12px;">Cargando prendas disponibles para canje...</p>';

    try {
        const res = await fetch(`${API_CANJES_URL}/productos`);
        const productos = await res.json();
        const { usuario, esAdmin } = obtenerUsuarioCanjeActual();
        const ptsCliente = usuario ? (Number(usuario.puntos) || 0) : 0;

        if (!Array.isArray(productos) || productos.length === 0) {
            cacheProductosCanje = [];
            contenedor.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; padding:12px; color:#475569;">Aún no hay prendas subidas para canjear.</p>';
            return;
        }

        cacheProductosCanje = productos;

        contenedor.innerHTML = productos.map(p => {
            const ptsReq = Math.max(1, parseInt(p.puntos_requeridos, 10) || 1);
            const leAlcanza = ptsCliente >= ptsReq;
            const montoDiferencia = calcularMontoAdicionalCliente(p, ptsCliente);

            return `
            <div class="canje-card">
                <img src="${p.imagen_url || 'https://placehold.co/300x300?text=Prenda'}" alt="${p.nombre}">
                <h4>${p.nombre}</h4>
                <div class="canje-costo">⭐ ${ptsReq} Puntos</div>
                <div class="canje-adicional-box">
                    <label>
                        <input type="checkbox" id="chk-adicional-${p.id}" ${!leAlcanza ? 'checked' : ''} onchange="refrescarMontoAdicionalTarjeta(${p.id})">
                        Pagar adicional: <strong>S/ <span id="texto-monto-adicional-${p.id}">${montoDiferencia.toFixed(2)}</span></strong>
                        <input type="hidden" id="monto-adicional-${p.id}" value="${montoDiferencia.toFixed(2)}">
                    </label>
                </div>
                <button type="button" class="btn-ejecutar-canje" onclick="event.preventDefault(); event.stopPropagation(); canjearProducto(${p.id}, ${ptsReq}, ${montoDiferencia})">
                    Elegir y Canjear
                </button>
                ${esAdmin ? `
                    <button type="button" class="btn-editar-canje-admin" onclick="editarProductoCanjePorId(${p.id})">
                        ✏️ Editar Prenda / Puntos
                    </button>
                    <button type="button" class="btn-eliminar-canje-admin" onclick="eliminarProductoCanje(${p.id}, '${String(p.nombre || '').replace(/'/g, "\\'")}')">
                        🗑️ Eliminar
                    </button>
                ` : ''}
            </div>`;
        }).join('');
    } catch (err) {
        contenedor.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; padding:12px; color:#e11d48;">No se pudieron cargar las prendas de canje.</p>';
    }
}

function editarProductoCanjePorId(productoId) {
    const producto = cacheProductosCanje.find(item => Number(item.id) === Number(productoId));
    if (!producto) {
        alert('No se encontró la prenda para editar.');
        return;
    }
    prepararEdicionCanje(producto);
}

async function eliminarProductoCanje(productoId, nombrePrenda) {
    if (!confirm(`¿Seguro que deseas eliminar "${nombrePrenda}" de la Zona de Canje?`)) {
        return;
    }

    const res = await fetch(`${API_CANJES_URL}/productos/${productoId}`, {
        method: 'DELETE'
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'No se pudo eliminar la prenda canjeable.');
        return;
    }

    if (document.getElementById('canje-edit-id').value === String(productoId)) {
        limpiarFormCanje();
    }
    await cargarProductosCanje();
    alert('Prenda eliminada de la Zona de Canje.');
}

async function guardarProductoCanje() {
    const id = document.getElementById('canje-edit-id').value;
    const nombre = document.getElementById('canje-nombre').value.trim();
    const tipoEl = document.getElementById('canje-tipo-imagen');
    const puntosReq = parseInt(document.getElementById('canje-puntos').value, 10);
    const inputAdicional = document.getElementById('canje-adicional');
    const fileInput = document.getElementById('canje-imagen-file');
    const urlInput = document.getElementById('canje-imagen');

    let tipoElegido = tipoEl ? tipoEl.value : '';
    if (!tipoElegido && !id) {
        const resp = prompt('¿Cómo deseas ingresar la imagen? Escribe URL o ARCHIVO:', (fileInput && fileInput.files && fileInput.files[0]) ? 'ARCHIVO' : 'URL');
        if (!resp) return;
        tipoElegido = resp.trim().toLowerCase().startsWith('a') ? 'archivo' : 'url';
        if (tipoEl) {
            tipoEl.value = tipoElegido;
            cambiarModoImagenCanje();
        }
    }

    let imagenUrl = '';
    if (tipoElegido === 'archivo') {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            imagenUrl = await leerArchivoComoBase64Comprimido(fileInput.files[0]);
            archivoCanjeBase64Pendiente = imagenUrl;
        } else {
            imagenUrl = archivoCanjeBase64Pendiente || (urlInput ? urlInput.value.trim() : '');
        }
    } else {
        imagenUrl = (urlInput ? urlInput.value.trim() : '') || archivoCanjeBase64Pendiente;
    }

    if (!nombre || !imagenUrl || !puntosReq || puntosReq < 1) {
        alert('Completa el nombre, elige URL o archivo de imagen y los puntos requeridos.');
        return;
    }

    const rawAdicional = inputAdicional ? inputAdicional.value.trim() : '';
    const precioAdicional = rawAdicional !== '' ? (parseFloat(rawAdicional) || 0) : (puntosReq * 1);

    const payload = {
        nombre,
        imagen_url: imagenUrl,
        puntos_requeridos: puntosReq,
        precio_adicional: precioAdicional
    };

    const url = id ? `${API_CANJES_URL}/productos/${id}` : `${API_CANJES_URL}/productos`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'No se pudo guardar los cambios de la prenda.');
        return;
    }

    limpiarFormCanje();
    await cargarProductosCanje();
    alert(id ? 'Cambios de la prenda guardados.' : 'Prenda canjeable guardada.');
}

function prepararEdicionCanje(producto) {
    const panelAdmin = document.getElementById('admin-canje-panel');
    if (panelAdmin) panelAdmin.style.display = 'block';

    archivoCanjeBase64Pendiente = producto.imagen_url || '';
    adicionalEditadoManualmente = true;

    document.getElementById('titulo-form-canje').textContent = `Editando: ${producto.nombre}`;
    document.getElementById('canje-edit-id').value = producto.id;
    document.getElementById('canje-nombre').value = producto.nombre || '';

    const esBase64 = typeof producto.imagen_url === 'string' && producto.imagen_url.startsWith('data:image');
    const tipoEl = document.getElementById('canje-tipo-imagen');
    const urlInput = document.getElementById('canje-imagen');
    const fileInput = document.getElementById('canje-imagen-file');

    if (tipoEl) {
        tipoEl.value = esBase64 ? 'archivo' : 'url';
    }
    if (urlInput) {
        urlInput.value = producto.imagen_url || '';
        urlInput.style.display = esBase64 ? 'none' : 'block';
    }
    if (fileInput) {
        fileInput.style.display = esBase64 ? 'block' : 'none';
    }

    document.getElementById('canje-puntos').value = producto.puntos_requeridos || '';
    document.getElementById('canje-adicional').value = producto.precio_adicional ?? '';
    document.getElementById('btn-cancelar-edit').style.display = 'inline-block';

    const previewBox = document.getElementById('canje-preview-box');
    const previewImg = document.getElementById('canje-preview-img');
    if (previewBox && previewImg && producto.imagen_url) {
        previewImg.src = producto.imagen_url;
        previewBox.style.display = 'block';
    }

    panelAdmin?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpiarFormCanje() {
    archivoCanjeBase64Pendiente = '';
    adicionalEditadoManualmente = false;
    document.getElementById('titulo-form-canje').textContent = 'Administrar Producto Canjeable';
    document.getElementById('canje-edit-id').value = '';
    document.getElementById('canje-nombre').value = '';

    const tipoEl = document.getElementById('canje-tipo-imagen');
    if (tipoEl) tipoEl.value = '';
    cambiarModoImagenCanje();

    document.getElementById('canje-imagen').value = '';
    const fileInput = document.getElementById('canje-imagen-file');
    if (fileInput) fileInput.value = '';
    const previewBox = document.getElementById('canje-preview-box');
    const previewImg = document.getElementById('canje-preview-img');
    if (previewBox) previewBox.style.display = 'none';
    if (previewImg) previewImg.src = '';
    document.getElementById('canje-puntos').value = '';
    document.getElementById('canje-adicional').value = '';
    document.getElementById('btn-cancelar-edit').style.display = 'none';
}

function previsualizarVoucherCanje(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        voucherCanjeBase64 = e.target.result || '';
        const img = document.getElementById('canje-pago-voucher-preview');
        if (img && voucherCanjeBase64) {
            img.src = voucherCanjeBase64;
            img.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

function obtenerNumeroPagoCanjeActual() {
    return '927026548';
}

function actualizarNumeroPagoCanje() {
    const metodo = document.getElementById('canje-pago-metodo')?.value || 'Yape';
    const numero = obtenerNumeroPagoCanjeActual();
    const lblMetodo = document.getElementById('canje-metodo-nombre-label');
    const lblNumero = document.getElementById('canje-numero-destino-label');
    const btnCopiar = document.getElementById('btn-copiar-numero-canje');

    if (lblMetodo) lblMetodo.textContent = metodo;
    if (lblNumero) lblNumero.textContent = numero;
    if (btnCopiar) btnCopiar.textContent = '📋 Copiar número';
}

async function copiarNumeroPagoCanje() {
    const numero = obtenerNumeroPagoCanjeActual();
    const btnCopiar = document.getElementById('btn-copiar-numero-canje');

    try {
        await navigator.clipboard.writeText(numero);
    } catch (e) {
        const tempInput = document.createElement('input');
        tempInput.value = numero;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    }

    if (btnCopiar) {
        btnCopiar.textContent = `✅ Copiado (${numero})`;
        setTimeout(() => {
            btnCopiar.textContent = '📋 Copiar número';
        }, 2200);
    }
}

function abrirModalPagoAdicionalCanje(datos) {
    canjePendientePago = datos;
    voucherCanjeBase64 = '';

    const modal = document.getElementById('modalPagoAdicionalCanje');
    if (modal && modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }

    const resumen = document.getElementById('resumen-pago-adicional-canje');
    const fileInput = document.getElementById('canje-pago-voucher-file');
    const opInput = document.getElementById('canje-pago-operacion');
    const ultimos3Input = document.getElementById('canje-pago-ultimos3');
    const preview = document.getElementById('canje-pago-voucher-preview');

    if (fileInput) fileInput.value = '';
    if (opInput) opInput.value = '';
    if (ultimos3Input) ultimos3Input.value = '';
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }

    if (resumen) {
        resumen.innerHTML = `
            <div><strong>Cliente:</strong> ${datos.clienteNombre}</div>
            <div><strong>Prenda:</strong> ${datos.nombrePrenda}</div>
            <div><strong>Puntos usados:</strong> -${datos.puntosUsados} pts (Restan: <strong>${datos.puntosRestantes} pts</strong>)</div>
            <div><strong>Adicional a pagar:</strong> <strong style="color:#d96b27; font-size:1.05rem;">S/ ${Number(datos.montoAdicional).toFixed(2)}</strong></div>
            <div style="margin-top:4px; color:#475569; font-size:0.82rem;">Yape / Plin Admin: <strong>927 026 548</strong></div>
        `;
    }

    actualizarNumeroPagoCanje();

    if (!document.getElementById('btn-copiar-numero-canje')) {
        const selectMetodo = document.getElementById('canje-pago-metodo');
        if (selectMetodo && selectMetodo.parentElement) {
            const barraCopia = document.createElement('div');
            barraCopia.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; background:#f8fafc; border:1px solid #cbd5e1; padding:8px 10px; border-radius:8px;';
            barraCopia.innerHTML = `
                <span style="font-size:0.85rem; color:#0f172a;">
                    Número <strong id="canje-metodo-nombre-label">${selectMetodo.value || 'Yape'}</strong>:
                    <strong id="canje-numero-destino-label" style="color:#002b5c; font-size:0.95rem;">927026548</strong>
                </span>
                <button type="button" id="btn-copiar-numero-canje" onclick="copiarNumeroPagoCanje()" style="background:#002b5c; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:0.8rem; font-weight:bold; cursor:pointer;">
                    📋 Copiar número
                </button>
            `;
            selectMetodo.insertAdjacentElement('afterend', barraCopia);
        }
    }

    if (modal) {
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('inset', '0', 'important');
        modal.style.setProperty('z-index', '2147483647', 'important');
        modal.style.setProperty('display', 'flex', 'important');
    }
}

function cerrarModalPagoAdicionalCanje() {
    const modal = document.getElementById('modalPagoAdicionalCanje');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
}

function obtenerFechaHoyPeruInfo() {
    const ahora = new Date();
    const partes = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).formatToParts(ahora);

    const diaStr = partes.find(p => p.type === 'day')?.value || '01';
    const mesStr = partes.find(p => p.type === 'month')?.value || '01';
    const anioStr = partes.find(p => p.type === 'year')?.value || '2026';

    const diaNum = parseInt(diaStr, 10);
    const mesNum = parseInt(mesStr, 10);

    const nombresMesCorto = {
        1: ['ene', 'enero'],
        2: ['feb', 'febrero'],
        3: ['mar', 'marzo'],
        4: ['abr', 'abril'],
        5: ['may', 'mayo'],
        6: ['jun', 'junio'],
        7: ['jul', 'julio'],
        8: ['ago', 'agosto'],
        9: ['set', 'sep', 'septiembre', 'setiembre'],
        10: ['oct', 'octubre'],
        11: ['nov', 'noviembre'],
        12: ['dic', 'diciembre']
    };

    return {
        diaNum,
        diaStr,
        mesNum,
        mesStr,
        anioStr,
        textoLegible: `${diaStr}/${mesStr}/${anioStr}`,
        mesesPosibles: nombresMesCorto[mesNum] || []
    };
}

function extraerYValidarFechaHoyEnTexto(textoLimpio) {
    const hoy = obtenerFechaHoyPeruInfo();
    const t = textoLimpio
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const regexNum = /\b(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(20\d{2})\b/g;
    let matchNum;
    const fechasEncontradas = [];

    while ((matchNum = regexNum.exec(t)) !== null) {
        const d = parseInt(matchNum[1], 10);
        const m = parseInt(matchNum[2], 10);
        const a = matchNum[3];
        fechasEncontradas.push({ dia: d, mes: m, anio: a, raw: matchNum[0] });
    }

    const mesesRegex = '(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|set(?:iembre)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)';
    const regexTexto = new RegExp(`\\b(\\d{1,2})\\.?\\s*(?:de\\s*)?(${mesesRegex})\\.?\\s*(?:de\\s*,?\\s*)?(20\\d{2})\\b`, 'gi');
    let matchTxt;

    const mapaMes = {
        ene: 1, enero: 1,
        feb: 2, febrero: 2,
        mar: 3, marzo: 3,
        abr: 4, abril: 4,
        may: 5, mayo: 5,
        jun: 6, junio: 6,
        jul: 7, julio: 7,
        ago: 8, agosto: 8,
        set: 9, setiembre: 9, sep: 9, septiembre: 9,
        oct: 10, octubre: 10,
        nov: 11, noviembre: 11,
        dic: 12, diciembre: 12
    };

    while ((matchTxt = regexTexto.exec(t)) !== null) {
        const d = parseInt(matchTxt[1], 10);
        const mKey = matchTxt[2].toLowerCase().replace(/\./g, '');
        const m = mapaMes[mKey] || 0;
        const a = matchTxt[3];
        fechasEncontradas.push({ dia: d, mes: m, anio: a, raw: matchTxt[0] });
    }

    if (fechasEncontradas.length === 0) {
        return {
            valida: false,
            motivo: `Validación estricta de fecha: no se detectó la fecha del comprobante. Debe ser de hoy (${hoy.textoLegible}).`
        };
    }

    const coincideHoy = fechasEncontradas.some(
        f => f.dia === hoy.diaNum && f.mes === hoy.mesNum && f.anio === hoy.anioStr
    );

    if (!coincideHoy) {
        const detectadasTexto = fechasEncontradas.map(f => f.raw).join(', ');
        return {
            valida: false,
            motivo: `Validación estricta de fecha: el comprobante muestra (${detectadasTexto}), pero el canje debe ser con fecha de hoy (${hoy.textoLegible}).`
        };
    }

    return {
        valida: true,
        fechaHoy: hoy.textoLegible
    };
}

function extraerNumeroOperacionOCR(texto) {
    const matchEtiqueta = String(texto || '').match(/(?:nro\.?\s*de\s*operaci[oó]n|operaci[oó]n|op\.?)\s*[:#-]?\s*(\d{5,12})/i);
    if (matchEtiqueta && matchEtiqueta[1]) return matchEtiqueta[1].trim();
    const matchLargo = String(texto || '').match(/\b(\d{6,10})\b/);
    return matchLargo ? matchLargo[1].trim() : null;
}

function extraerTresDigitosSeguridadOCR(texto) {
    const t = String(texto || '');
    const matchCodigoSeg = t.match(/(?:c[oó]digo\s*de\s*seguridad|seguridad)\s*[:#-]?\s*(\d)\s*(\d)\s*(\d)/i);
    if (matchCodigoSeg) {
        return `${matchCodigoSeg[1]}${matchCodigoSeg[2]}${matchCodigoSeg[3]}`;
    }

    const matchCodigoJunto = t.match(/(?:c[oó]digo\s*de\s*seguridad|seguridad)\s*[:#-]?\s*(\d{3})\b/i);
    if (matchCodigoJunto && matchCodigoJunto[1]) {
        return matchCodigoJunto[1];
    }

    const matchUltimosCel = t.match(/(?:n[uú]mero\s*de\s*celular|celular|destino).*?\*{2,}\s*\*{2,}\s*(\d{3})\b/i);
    if (matchUltimosCel && matchUltimosCel[1]) {
        return matchUltimosCel[1];
    }

    return null;
}

async function calcularHashVoucherCanje(base64Str) {
    try {
        if (window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(String(base64Str || ''));
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (e) {
        console.warn('Fallback hash voucher:', e);
    }
    const str = String(base64Str || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return `fallback_${str.length}_${Math.abs(hash)}`;
}

async function validarVoucherYapePlinOCR(base64Str, metodoSeleccionado, montoEsperado, tresDigitosIngresados = '') {
    if (typeof Tesseract === 'undefined') {
        return { valido: false, motivo: 'No se pudo cargar el lector de comprobantes. Recarga la página e intenta de nuevo.' };
    }

    const { data } = await Tesseract.recognize(base64Str, 'spa', {
        logger: () => {}
    });

    const textoCrudo = data && data.text ? data.text : '';
    const textoLimpio = textoCrudo
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    if (!textoLimpio || textoLimpio.length < 12) {
        return {
            valido: false,
            motivo: 'Imagen no válida: no se detecta texto de un comprobante de Yape o Plin.'
        };
    }

    const esComprobanteYapeOPlin =
        textoLimpio.includes('yapeaste') ||
        textoLimpio.includes('yape') ||
        textoLimpio.includes('plin') ||
        textoLimpio.includes('datos de la transacci') ||
        textoLimpio.includes('nro. de operaci') ||
        textoLimpio.includes('operacion') ||
        textoLimpio.includes('operación');

    if (!esComprobanteYapeOPlin) {
        return {
            valido: false,
            motivo: 'Solo se aceptan comprobantes de pago de Yape o Plin. No se acepta otro tipo de imagen.'
        };
    }

    const tieneMontoSoles =
        textoLimpio.includes('s/') ||
        textoLimpio.includes('soles') ||
        /\d{1,4}[.,]\d{2}/.test(textoLimpio);

    if (!tieneMontoSoles) {
        return {
            valido: false,
            motivo: 'El comprobante no muestra un monto válido en soles (S/).'
        };
    }

    const validacionFechaHoy = extraerYValidarFechaHoyEnTexto(textoLimpio);
    if (!validacionFechaHoy.valida) {
        return {
            valido: false,
            motivo: validacionFechaHoy.motivo
        };
    }

    const tresDigitosOCR = extraerTresDigitosSeguridadOCR(textoLimpio);
    const digitosLimpiosInput = String(tresDigitosIngresados || '').replace(/\D/g, '');

    if (digitosLimpiosInput.length > 0) {
        if (digitosLimpiosInput.length !== 3) {
            return {
                valido: false,
                motivo: 'Debes ingresar exactamente los 3 dígitos del código de seguridad / últimos 3 números.'
            };
        }
        if (!tresDigitosOCR || tresDigitosOCR !== digitosLimpiosInput) {
            return {
                valido: false,
                motivo: `Los últimos 3 números (${digitosLimpiosInput}) no coinciden con el comprobante (${tresDigitosOCR || 'no detectados'}).`
            };
        }
    }

    const opDetectada = extraerNumeroOperacionOCR(textoLimpio);
    const montoNum = Number(montoEsperado) || 0;

    return {
        valido: true,
        texto: textoLimpio,
        fechaValidada: validacionFechaHoy.fechaHoy,
        nroOperacionDetectado: opDetectada,
        tresDigitosDetectados: tresDigitosOCR,
        montoEsperado: montoNum
    };
}

async function confirmarPagoAdicionalYEnviarWhatsApp() {
    if (!canjePendientePago) {
        alert('No hay un canje pendiente por confirmar.');
        return;
    }

    const metodo = document.getElementById('canje-pago-metodo')?.value || 'Yape';
    const numeroDestino = typeof obtenerNumeroPagoCanjeActual === 'function'
        ? obtenerNumeroPagoCanjeActual()
        : '927026548';
    const nroOperacionInput = document.getElementById('canje-pago-operacion')?.value.trim() || null;
    const tresDigitosInput = document.getElementById('canje-pago-ultimos3')?.value.trim() || '';

    if (!voucherCanjeBase64) {
        alert('Primero sube la captura o foto de tu comprobante de Yape o Plin.');
        return;
    }

    const d = canjePendientePago;
    const codigoOrdenCanje = `CANJE-${d.productoId}-${Date.now().toString().slice(-5)}`;

    let nroOperacionFinal = nroOperacionInput || null;
    let tresDigitosFinal = tresDigitosInput || 'No detectado';
    let fechaHoyValidada = typeof obtenerFechaHoyPeruInfo === 'function'
        ? obtenerFechaHoyPeruInfo().textoLegible
        : new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });

    try {
        if (typeof validarVoucherYapePlinOCR === 'function') {
            const validacionOCR = await validarVoucherYapePlinOCR(
                voucherCanjeBase64,
                metodo,
                d.montoAdicional,
                tresDigitosInput
            );
            if (!validacionOCR || !validacionOCR.valido) {
                alert((validacionOCR && validacionOCR.motivo) || 'Comprobante no válido.');
                return;
            }
            nroOperacionFinal = nroOperacionInput || validacionOCR.nroOperacionDetectado || null;
            tresDigitosFinal = tresDigitosInput || validacionOCR.tresDigitosDetectados || 'No detectado';
            fechaHoyValidada = validacionOCR.fechaValidada || fechaHoyValidada;
        }
    } catch (errOCR) {
        console.error('Detalle error OCR:', errOCR);
        alert(`No se pudo leer el comprobante: ${errOCR && errOCR.message ? errOCR.message : 'Intenta con otra captura nítida.'}`);
        return;
    }

    try {
        const hashVoucher = typeof calcularHashVoucherCanje === 'function'
            ? await calcularHashVoucherCanje(voucherCanjeBase64)
            : '';
        const baseCanjes = typeof API_CANJES_URL !== 'undefined'
            ? API_CANJES_URL
            : 'https://sistema-web-ropa-liz-fashion-evolution.onrender.com/api/canjes';
        const baseApiUrl = baseCanjes.replace(/\/canjes\/?$/, '');

        const resPago = await fetch(`${baseApiUrl}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orden: codigoOrdenCanje,
                cliente: d.clienteNombre,
                telefono: d.clienteTelefono && d.clienteTelefono !== '-' ? d.clienteTelefono : '',
                total: Number(d.montoAdicional) || 0,
                metodo,
                nro_operacion: nroOperacionFinal,
                imagen_voucher: voucherCanjeBase64,
                hash_imagen: hashVoucher,
                detalles_pedido: [{
                    codigo: `CANJE-${d.productoId}`,
                    titulo: `${d.nombrePrenda} [Canje -${d.puntosReq} pts | ${metodo} ${numeroDestino} | Fecha: ${fechaHoyValidada} | 3Dig: ${tresDigitosFinal}]`,
                    talla: 'Única',
                    color: metodo,
                    cantidad: 1,
                    precio_remate: Number(d.montoAdicional) || 0
                }]
            })
        });

        const dataPago = await resPago.json().catch(() => ({}));
        if (!resPago.ok) {
            alert(dataPago.error || 'Este comprobante o número de operación ya fue registrado o no es válido.');
            return;
        }

        if (typeof cargarPagosAdmin === 'function') {
            await cargarPagosAdmin();
        }
    } catch (errRed) {
        console.error('Error al registrar comprobante:', errRed);
        alert(`No se pudo enviar al servidor: ${errRed && errRed.message ? errRed.message : 'La prenda no fue eliminada.'}`);
        return;
    }

    const mensajeWhatsApp = [
        `🎁 *CANJE CON PAGO ADICIONAL - LIZ FASHION EVOLUTION*`,
        `🧾 *Orden:* ${codigoOrdenCanje}`,
        `📅 *Fecha Validada (Hoy):* ${fechaHoyValidada}`,
        `👤 *Cliente:* ${d.clienteNombre}`,
        `📱 *Teléfono:* ${d.clienteTelefono}`,
        `👗 *Prenda Canjeada:* ${d.nombrePrenda}`,
        `⭐ *Puntos Requeridos:* ${d.puntosReq} pts`,
        `🔻 *Puntos Usados:* -${Number(d.puntosUsados) || 0} pts`,
        `✨ *Puntos Restantes:* ${Number(d.puntosRestantes) || 0} pts`,
        `💰 *Monto Adicional Pagado:* S/ ${Number(d.montoAdicional).toFixed(2)}`,
        `💳 *Método y Número:* ${metodo} (${numeroDestino})`,
        `🔢 *Nro. Operación:* ${nroOperacionFinal || 'No ingresado'}`,
        `🔐 *Últimos 3 Números / Código:* ${tresDigitosFinal}`,
        `🧾 *Comprobante:* Subido y pendiente de aprobación en Validar Yape/Plin`
    ].join('\n');

    const urlWhatsApp = `https://wa.me/51931598799?text=${encodeURIComponent(mensajeWhatsApp)}`;

    if (typeof cerrarModalPagoAdicionalCanje === 'function') cerrarModalPagoAdicionalCanje();
    if (typeof cerrarModalCanjes === 'function') cerrarModalCanjes();
    canjePendientePago = null;
    voucherCanjeBase64 = '';

    const popup = window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = urlWhatsApp;
    }
}
async function canjearProducto(productoId, puntosReq, precioAdicional) {
    try {
        const { usuario } = obtenerUsuarioCanjeActual();
        const producto = (Array.isArray(cacheProductosCanje) ? cacheProductosCanje : []).find(
            item => Number(item.id) === Number(productoId)
        ) || {};
        const ptsRequeridos = Math.max(1, parseInt(puntosReq || producto.puntos_requeridos, 10) || 1);
        const puntosActuales = usuario ? (Number(usuario.puntos) || 0) : 0;

        const chk = document.getElementById(`chk-adicional-${productoId}`);
        const inputMonto = document.getElementById(`monto-adicional-${productoId}`);
        const montoCalculado = inputMonto
            ? (parseFloat(inputMonto.value) || 0)
            : (parseFloat(precioAdicional) || calcularMontoAdicionalCliente(producto, puntosActuales));

        const quierePagarAdicional = chk ? chk.checked : (puntosActuales < ptsRequeridos || montoCalculado > 0);

        if (usuario && puntosActuales >= ptsRequeridos && (!quierePagarAdicional || montoCalculado <= 0)) {
            const res = await fetch(`${API_CANJES_URL}/procesar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: usuario.id,
                    producto_canje_id: productoId,
                    pagar_adicional: false,
                    monto_adicional: 0,
                    metodo_pago: 'Solo Puntos'
                })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.error || 'No se pudo completar el canje.');
                return;
            }

            const puntosRestantes = Number(data.nuevos_puntos) || 0;
            if (typeof guardarPuntosEnSesion === 'function') guardarPuntosEnSesion(puntosRestantes);
            if (typeof actualizarVistaPuntos === 'function') actualizarVistaPuntos();
            if (typeof cargarProductosCanje === 'function') await cargarProductosCanje();
            if (typeof cargarPuntosClientesAdmin === 'function') await cargarPuntosClientesAdmin();
            cerrarModalCanjes();

            const mensajeWhatsApp = [
                `🎁 *CANJE POR PUNTOS REALIZADO - LIZ FASHION EVOLUTION*`,
                `👤 *Cliente:* ${usuario.nombre || 'Cliente'}`,
                `📱 *Teléfono:* ${usuario.telefono || '-'}`,
                `👗 *Prenda Canjeada:* ${producto.nombre || 'Prenda'}`,
                `⭐ *Puntos Canjeados:* ${ptsRequeridos} pts`,
                `✨ *Puntos Restantes:* ${puntosRestantes} pts`,
                `💳 *Pago Adicional:* S/ 0.00 (100% con Puntos)`
            ].join('\n');

            window.open(`https://wa.me/51931598799?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank');
            return;
        }

        if (!quierePagarAdicional && puntosActuales < ptsRequeridos && chk) {
            chk.checked = true;
        }

        const montoFinalPagar = montoCalculado > 0
            ? montoCalculado
            : Math.max(1, calcularMontoAdicionalCliente(producto, puntosActuales));

        const puntosUsadosPrevios = usuario ? Math.min(puntosActuales, ptsRequeridos) : 0;
        const puntosRestantesPrevios = usuario ? Math.max(0, puntosActuales - puntosUsadosPrevios) : 0;

        abrirModalPagoAdicionalCanje({
            usuarioId: usuario?.id || null,
            productoId,
            nombrePrenda: producto.nombre || 'Prenda Canjeada',
            puntosReq: ptsRequeridos,
            puntosUsados: puntosUsadosPrevios,
            puntosRestantes: puntosRestantesPrevios,
            montoAdicional: montoFinalPagar,
            clienteNombre: usuario?.nombre || 'Cliente',
            clienteTelefono: usuario?.telefono || '-'
        });
    } catch (err) {
        console.error('Error en canjearProducto:', err);
        alert('Ocurrió un inconveniente al abrir la ventana de canje.');
    }
}

function enviarMensajeAdminCanje() {
    const { usuario } = obtenerUsuarioCanjeActual();
    const nombreCliente = usuario ? (usuario.nombre || 'Cliente') : 'Cliente Invitado';
    const correoCliente = usuario ? (usuario.email || '-') : '-';
    const telefonoCliente = usuario ? (usuario.telefono || '-') : '-';
    const puntosCliente = usuario ? (Number(usuario.puntos) || 0) : 0;

    const detalleTexto = prompt(
        'Escribe tu mensaje para la administradora sobre tus puntos o canjes:',
        `Hola Liz Admin, soy ${nombreCliente} (${puntosCliente} pts). Quiero consultar sobre mi canje:`
    );
    if (!detalleTexto || !detalleTexto.trim()) return;

    const mensajeWhatsApp = [
        `📩 *MENSAJE PARA ADMINISTRACIÓN - ZONA DE CANJE*`,
        `👤 *Cliente:* ${nombreCliente}`,
        `📧 *Correo:* ${correoCliente}`,
        `📱 *Teléfono:* ${telefonoCliente}`,
        `⭐ *Puntos Actuales:* ${puntosCliente} pts`,
        `📝 *Mensaje:* ${detalleTexto.trim()}`
    ].join('\n');

    window.open(`https://wa.me/51931598799?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank');
}

async function acumularPuntosPorCompra(cantidadPrendas) {
    const { usuario } = obtenerUsuarioCanjeActual();
    if (!usuario || cantidadPrendas <= 0) return;

    const res = await fetch(`${API_CANJES_URL}/sumar-puntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario_id: usuario.id,
            cantidad_prendas: cantidadPrendas
        })
    });
    const data = await res.json();
    if (res.ok) {
        guardarPuntosEnSesion(data.puntos_actuales);
        actualizarVistaPuntos();
    }
}

async function cargarPuntosClientesAdmin() {
    const tbody = document.getElementById('tbody-clientes-puntos');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3">Cargando clientes...</td></tr>';

    try {
        const res = await fetch(`${API_CANJES_URL}/clientes-puntos`);
        const clientes = await res.json();

        tbody.innerHTML = clientes.map(c => `
            <tr>
                <td>${c.nombre || 'Cliente'}</td>
                <td>${c.email || '-'}</td>
                <td><strong>⭐ ${c.puntos} pts</strong></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="3">Error al cargar clientes.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    actualizarVistaPuntos();
});

// =====================================================================
// PERFIL DEL CLIENTE: VER, EDITAR Y GUARDAR TODOS SUS DATOS
// =====================================================================
async function openClientProfileModal() {
    const { user, isAdmin, token } = getSession();
    if (!user) {
        openAuthModal();
        return;
    }
    if (isAdmin) {
        showToast('Esta vista de perfil es exclusiva para clientes', 'warning');
        return;
    }

    let datosCliente = { ...user };

    // Intenta traer los datos más recientes desde la BD si existe el endpoint
    try {
        const res = await fetch(`${API_URL}/cliente/perfil/${user.id}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.usuario) {
                datosCliente = { ...datosCliente, ...data.usuario };
                localStorage.setItem('rs_usuario', JSON.stringify(datosCliente));
            }
        }
    } catch (_) {}

    const nombre = datosCliente.nombre || '';
    const avatar = document.getElementById('profileModalAvatar');
    if (avatar) avatar.textContent = (nombre.trim().charAt(0) || 'C').toUpperCase();

    document.getElementById('profileNombreInput').value = nombre;
    document.getElementById('profileEmailInput').value = datosCliente.email || '';
    document.getElementById('profileTelefonoInput').value = datosCliente.telefono || '';
    document.getElementById('profileRolDisplay').textContent = datosCliente.rol || 'cliente';
    document.getElementById('profilePuntosDisplay').textContent = `${Number(datosCliente.puntos) || 0} pts`;

    const modal = document.getElementById('clientProfileModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeClientProfileModal() {
    const modal = document.getElementById('clientProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function handleSaveClientProfile(e) {
    e.preventDefault();
    const { user, isAdmin, token } = getSession();
    if (!user || isAdmin) {
        showToast('Solo disponible para cuentas de cliente', 'error');
        return;
    }

    const nombre = document.getElementById('profileNombreInput').value.trim();
    const email = document.getElementById('profileEmailInput').value.trim();
    const telefono = document.getElementById('profileTelefonoInput').value.trim();

    if (!nombre || !email) {
        showToast('Completa tu nombre y correo electrónico', 'warning');
        return;
    }

    const btnGuardar = document.getElementById('btnSaveClientProfile');
    if (btnGuardar) btnGuardar.disabled = true;

    try {
        const res = await fetch(`${API_URL}/cliente/perfil/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ nombre, email, telefono })
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'No se pudieron guardar tus datos', 'error');
            return;
        }

        const usuarioActualizado = {
            ...user,
            ...(data.usuario || { nombre, email, telefono })
        };
        localStorage.setItem('rs_usuario', JSON.stringify(usuarioActualizado));
        window.currentUser = usuarioActualizado;

        updateAuthUI();
        closeClientProfileModal();
        showToast('¡Tus datos de cliente se guardaron correctamente!', 'success');
    } catch (err) {
        showToast('Error de conexión al guardar tus datos', 'error');
    } finally {
        if (btnGuardar) btnGuardar.disabled = false;
    }
}