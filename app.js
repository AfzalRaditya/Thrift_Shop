/* app.js - Thrift Shop (Vanilla JS)
   - Fetch products from FakeStore API
   - Transform product titles to Indonesian 'preloved' names
   - Render DOM safely using createElement and textContent (no innerHTML)
*/

const API_URL = 'https://fakestoreapi.com/products';
const productsEl = document.getElementById('products');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('q');
const sortSelect = document.getElementById('sort');
const viewAllBtn = document.getElementById('viewAll');

let allProducts = [];

/* THEME: Dark/Light mode utilities
   - persisted to localStorage 'theme' with values 'dark' or 'light'
   - applied by setting data-theme attribute on document.documentElement
*/
function getPreferredTheme(){
  try{
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  }catch(e){}
  // fallback: respect user's system preference if available
  try{
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  }catch(e){}
  return 'light';
}

function applyTheme(theme){
  try{
    const el = document.documentElement || document.body;
    if (!el) return;
    if (theme === 'dark'){
      el.setAttribute('data-theme','dark');
      document.body.style.background = '';
    } else {
      el.removeAttribute('data-theme');
      document.body.style.background = '';
    }
  }catch(e){console.error('applyTheme error', e);}  
}

function toggleTheme(){
  const cur = getPreferredTheme();
  const next = cur === 'dark' ? 'light' : 'dark';
  try{ localStorage.setItem('theme', next); }catch(e){}
  applyTheme(next);
}

// Apply stored theme early to avoid flash
try{ applyTheme(getPreferredTheme()); }catch(e){}

// SPA home display mode: 'categories' or 'all'
let homeMode = sessionStorage.getItem('homeMode') || 'categories';
let lastHomeMode = homeMode;

function setHomeMode(mode){
  homeMode = mode === 'all' ? 'all' : 'categories';
  try{ sessionStorage.setItem('homeMode', homeMode); }catch(e){}
  // update UI controls
  const btnAll = document.getElementById('btn-view-all');
  const btnBackCat = document.getElementById('btn-back-cats');
  if (btnAll) btnAll.textContent = homeMode === 'all' ? 'Tampilkan per Kategori' : 'Lihat Semua Produk';
  if (btnBackCat) btnBackCat.style.display = homeMode === 'all' ? 'inline-block' : 'none';
}

// Render all products in flat list (no grouping)
function renderAllProducts(products){
  // ensure products section visible
  const listSection = productsEl && productsEl.closest('section');
  const catSection = document.querySelector('.categories-section');
  if (catSection) catSection.style.display = 'none';
  if (listSection) listSection.style.display = 'block';

  // render flat list
  renderProducts(products);
}

// Show home according to current mode
function showHomeView(){
  const listSection = productsEl && productsEl.closest('section');
  const catSection = document.querySelector('.categories-section');
  if (homeMode === 'all'){
    renderAllProducts(applySort(allProducts, sortSelect.value));
  } else {
    const groupedAll = groupByCategory(applySort(allProducts, sortSelect.value));
    renderCategories(groupedAll);
    if (listSection) listSection.style.display = 'none';
    if (catSection) catSection.style.display = 'block';
  }
  // ensure detail/checkout hidden
  const detailEl = document.getElementById('detail-view'); if (detailEl) detailEl.style.display = 'none';
  const checkoutEl = document.getElementById('checkout-view'); if (checkoutEl) checkoutEl.style.display = 'none';
}

// Helper: format number (USD price) into Indonesian Rupiah string using a simulated exchange rate
// Helper: format an IDR integer into localized Rupiah currency string
function formatRupiah(idrNumber){
  try{
    const n = Number(idrNumber) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Math.round(n));
  }catch(e){
    return 'Rp 0';
  }
}

// Generate a "Mahasiswa Friendly" price in Rupiah between 200k and 2M
function generateStudentFriendlyPrice(){
  // inclusive range [200000, 2000000]
  return Math.floor(Math.random() * (2000000 - 200000 + 1)) + 200000;
}

function setStatus(message, isError = false) {
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#b91c1c' : '';
  }
}

async function fetchProducts() {
  setStatus('Memuat produk...');
  try {
    const resp = await fetch(API_URL, {cache: 'no-store'});
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('Invalid data');

    // Transform data titles to Indonesian preloved names
      allProducts = data.map(transformProductForThrift);

    // Load user-uploaded products from localStorage and prepend them
    try{
      const mine = loadMyProducts();
      if (Array.isArray(mine) && mine.length > 0){
        // ensure transform for any missing fields
        const transformedMine = mine.map(m => transformProductForThrift(m));
        // give uploaded items unique negative ids if needed
        transformedMine.forEach((mi, i)=>{ if (!mi.id) mi.id = 'MY-' + Date.now() + '-' + i; });
        allProducts = [...transformedMine, ...allProducts];
      }
    }catch(e){ console.error('loadMyProducts error', e); }

    // Render both the flat products list and grouped categories
    renderProducts(allProducts);
    const grouped = groupByCategory(allProducts);
    renderCategories(grouped);
    // Hide the flat products section to focus on categorized view by default
    const listSection = productsEl && productsEl.closest('section');
    if (listSection) listSection.style.display = 'none';
    const catSection = document.querySelector('.categories-section');
    if (catSection) catSection.style.display = 'block';
    setStatus(`Menampilkan ${allProducts.length} produk`);
    if (countEl) countEl.textContent = String(allProducts.length);
    // create home view controls if missing
    createHomeViewControls();
  } catch (err) {
    console.error('fetchProducts error', err);
    setStatus('Gagal memuat produk. Cek koneksi atau coba lagi nanti.', true);
  }
}

// --- User uploaded products helpers ---
function loadMyProducts(){
  try{
    const raw = localStorage.getItem('myProducts');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}

function saveMyProducts(list){
  try{ localStorage.setItem('myProducts', JSON.stringify(list)); }catch(e){ console.error('saveMyProducts error', e); }
}

function saveMyProduct(product){
  try{
    const arr = loadMyProducts();
    arr.push(product);
    saveMyProducts(arr);
  }catch(e){ console.error('saveMyProduct error', e); }
}

// Delete a user-uploaded product by id
function deleteProduct(productId){
  try{
    const arr = loadMyProducts();
    const filtered = (arr || []).filter(p => String(p.id) !== String(productId));
    saveMyProducts(filtered);
    // remove from in-memory allProducts as well
    allProducts = (allProducts || []).filter(p => String(p.id) !== String(productId));
    // re-render current view appropriately
    if (homeMode === 'all') renderAllProducts(applySort(allProducts, sortSelect.value)); else renderCategories(groupByCategory(allProducts));
    setStatus('Produk dihapus');
  }catch(e){ console.error('deleteProduct error', e); alert('Gagal menghapus produk.'); }
}

// --- Custom Delete Modal Logic ---
let _pendingDeleteId = null;
function showDeleteModal(productId){
  _pendingDeleteId = productId;
  const modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  // focus confirm button for quick keyboard action
  const confirmBtn = document.getElementById('delete-confirm-btn');
  if (confirmBtn) confirmBtn.focus();
}

function closeDeleteModal(){
  const modal = document.getElementById('delete-modal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  _pendingDeleteId = null;
}

// wire modal buttons after DOM ready
function initDeleteModal(){
  const confirmBtn = document.getElementById('delete-confirm-btn');
  const cancelBtn = document.getElementById('delete-cancel-btn');
  const modal = document.getElementById('delete-modal');
  if (confirmBtn){
    confirmBtn.addEventListener('click', ()=>{
      if (_pendingDeleteId){ try{ deleteProduct(_pendingDeleteId); }catch(e){ console.error('delete confirm error', e); }}
      closeDeleteModal();
    });
  }
  if (cancelBtn){ cancelBtn.addEventListener('click', ()=>{ closeDeleteModal(); }); }
  // close modal when clicking on backdrop area (the backdrop child covers full inset)
  if (modal){
    modal.addEventListener('click', (ev)=>{
      // if click directly on modal container (outside inner box), close
      if (ev.target === modal || ev.target.classList.contains('modal-backdrop')) closeDeleteModal();
    });
  }
}

// initialize modal wiring now and also on DOMContentLoaded to be safe
if (document.readyState === 'complete' || document.readyState === 'interactive'){
  try{ initDeleteModal(); }catch(e){}
} else {
  document.addEventListener('DOMContentLoaded', initDeleteModal);
}

// Compress image file using Canvas API, return base64 jpeg string
function compressImageFile(file, maxWidth = 800, quality = 0.7){
  return new Promise((resolve, reject)=>{
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Not an image'));
    const img = new Image();
    const reader = new FileReader();
    reader.onload = function(ev){
      img.onload = function(){
        try{
          const ratio = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        }catch(err){ reject(err); }
      };
      img.onerror = function(e){ reject(new Error('Image load error')); };
      img.src = ev.target.result;
    };
    reader.onerror = function(e){ reject(new Error('File read error')); };
    reader.readAsDataURL(file);
  });
}

// Guard: check whether user can access Sell view
function checkSellAccess(){
  try{
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true' || !!localStorage.getItem('currentUser');
    if (!isLoggedIn){
      // show auth-required modal instead of alert
      try{ showAuthModal(); }catch(e){ console.error('showAuthModal error', e); showView('login-view'); }
      return false;
    }
    // user logged in
    showView('sell-view');
    return true;
  }catch(e){ console.error('checkSellAccess error', e); showView('login-view'); return false; }
}

// Guard for wishlist access
function checkWishlistAccess(){
  try{
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true' || !!localStorage.getItem('currentUser');
    if (!isLoggedIn){
      try{ document.getElementById('auth-modal-message').textContent = 'Silakan login untuk melihat daftar barang favorit kamu!'; showAuthModal(); }catch(e){ showView('login-view'); }
      return false;
    }
    showView('wishlist-view');
    renderWishlist();
    return true;
  }catch(e){ console.error('checkWishlistAccess error', e); showView('login-view'); return false; }
}

// Auth modal helpers
function showAuthModal(){
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  const loginBtn = document.getElementById('auth-login-btn');
  if (loginBtn) loginBtn.focus();
}

function closeAuthModal(){
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}

// Initialize auth modal wiring
function initAuthModal(){
  const loginBtn = document.getElementById('auth-login-btn');
  const cancelBtn = document.getElementById('auth-cancel-btn');
  const modal = document.getElementById('auth-modal');
  if (loginBtn) loginBtn.addEventListener('click', ()=>{ closeAuthModal(); showView('login-view'); });
  if (cancelBtn) cancelBtn.addEventListener('click', ()=>{ closeAuthModal(); });
  if (modal) modal.addEventListener('click', (ev)=>{ if (ev.target === modal || ev.target.classList.contains('modal-backdrop')) closeAuthModal(); });
}

// ensure modal wiring available
if (document.readyState === 'complete' || document.readyState === 'interactive') initAuthModal(); else document.addEventListener('DOMContentLoaded', initAuthModal);

// Wire Sell UI: show sell view via guard
const btnSell = document.getElementById('btn-sell');
if (btnSell){ btnSell.addEventListener('click', (e)=>{ e.preventDefault(); checkSellAccess(); }); }

// Wire static wishlist button (header) to guarded access
const btnWishlistStatic = document.getElementById('btn-wishlist');
if (btnWishlistStatic){ btnWishlistStatic.addEventListener('click', (e)=>{ e.preventDefault(); checkWishlistAccess(); }); }

// Sell form handling
const sellForm = document.getElementById('sell-form');
if (sellForm){
  const photoInput = document.getElementById('sell-photo');
  const spinner = document.getElementById('sell-spinner');
  sellForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const name = document.getElementById('sell-name').value.trim();
    const price = Number(document.getElementById('sell-price').value);
    const category = document.getElementById('sell-category').value.trim();
    const location = document.getElementById('sell-location').value.trim() || 'Malang, Jatim';
    const file = photoInput.files && photoInput.files[0];
    if (!name || !category || !file) return alert('Lengkapi semua field.');
    if (isNaN(price) || price < 200000 || price > 2000000) return alert('Harga harus antara Rp 200.000 dan Rp 2.000.000');

    try{
      spinner.style.display = 'block';
      const compressed = await compressImageFile(file, 800, 0.7);
      // build product object
      const product = {
        id: 'MY-' + Date.now(),
        title: name,
        name: name,
        description: 'Barang preloved dari pengguna',
        price: 0, // keep USD price empty
        priceIdr: Number(price),
        isCustom: true,
        category: category,
        location: location,
        image: compressed
      };
      saveMyProduct(product);
      // add to allProducts in-memory and re-render home
      allProducts.unshift(transformProductForThrift(product));
      // re-render appropriately
      if (homeMode === 'all') renderAllProducts(applySort(allProducts, sortSelect.value)); else renderCategories(groupByCategory(allProducts));
      setStatus('Produk berhasil ditambahkan!');
      showView('home-view');
      // reset form
      sellForm.reset();
    }catch(err){ console.error('sell upload error', err); alert('Gagal mengunggah gambar.'); }
    finally{ spinner.style.display = 'none'; }
  });

  const cancelBtn = document.getElementById('sell-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', ()=>{ sellForm.reset(); showView('home-view'); });
}

// Create home view control buttons near hero if not present
function createHomeViewControls(){
  const hero = document.querySelector('.hero-inner');
  if (!hero) return;
  if (document.getElementById('btn-view-all')) return; // already created

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex'; wrapper.style.gap='8px'; wrapper.style.alignItems='center';

  const btnAll = document.createElement('button');
  btnAll.id = 'btn-view-all';
  btnAll.className = 'btn-outline';
  btnAll.textContent = homeMode === 'all' ? 'Tampilkan per Kategori' : 'Lihat Semua Produk';
  btnAll.addEventListener('click', ()=>{
    // toggle mode
    setHomeMode(homeMode === 'all' ? 'categories' : 'all');
    showHomeView();
  });

  const btnBack = document.createElement('button');
  btnBack.id = 'btn-back-cats';
  btnBack.className = 'btn-secondary';
  btnBack.textContent = 'Kembali ke Kategori';
  btnBack.style.display = homeMode === 'all' ? 'inline-block' : 'none';
  btnBack.addEventListener('click', ()=>{ setHomeMode('categories'); showHomeView(); });

  // Location filter
  const locSelect = document.createElement('select');
  locSelect.id = 'filter-location';
  const opts = [['all','Semua'],['malang','Malang'],['luar','Luar Kota']];
  for (const [val,label] of opts){ const o = document.createElement('option'); o.value = val; o.textContent = label; locSelect.appendChild(o); }
  locSelect.addEventListener('change', ()=>{
    const v = locSelect.value;
    // re-render according to location filter
    const filtered = allProducts.filter(p=>{
      const loc = (p.location||'malang').toString().toLowerCase();
      if (v === 'all') return true;
      if (v === 'malang') return loc.includes('malang');
      if (v === 'luar') return !loc.includes('malang');
      return true;
    });
    if (homeMode === 'all') renderAllProducts(filtered); else renderCategories(groupByCategory(filtered));
  });

  wrapper.appendChild(btnAll); wrapper.appendChild(btnBack);
  wrapper.appendChild(locSelect);
  hero.appendChild(wrapper);
}

// Data transformation: convert English API result into Indonesian preloved titles
function transformProductForThrift(prod) {
  // Make a shallow copy to avoid mutating original object structure
  const p = Object.assign({}, prod);

  // If this is a custom/user-uploaded product, preserve provided fields (priceIdr, category, title)
  // Do not override with generated student-friendly prices or category mapping.
  try{
    const isMy = p.isCustom === true || (String(p.id).startsWith && String(p.id).startsWith('MY-'));
    if (isMy){
      // ensure minimal defaults but preserve user-given price and category
      if (!p.location) p.location = 'Malang, Jatim';
      if (typeof p.priceIdr === 'undefined' && typeof p.price === 'number') p.priceIdr = Math.round(p.price * 15000);
      // ensure title exists
      if (!p.title && p.name) p.title = p.name;
      return p;
    }
  }catch(e){ /* ignore and continue with normal transform */ }

  // Keyword hints from title (priority)
  const keywordMap = {
    ssd: 'SSD',
    hdd: 'HDD',
    drive: 'Drive',
    jacket: 'Jaket',
    coat: 'Jaket',
    shirt: 'Kemeja',
    't-shirt': 'Kaos',
    tshirt: 'Kaos',
    bag: 'Tas',
    backpack: 'Tas',
    watch: 'Jam Tangan',
    ring: 'Cincin',
    necklace: 'Kalung',
    shoes: 'Sepatu',
    sandal: 'Sandal'
  };

  // Simple category -> base name mapping (fallback)
  const categoryBase = {
    "electronics": 'Elektronik',
    "jewelery": 'Aksesoris',
    "jewelry": 'Aksesoris',
    "men's clothing": 'Pakaian Pria',
    "women's clothing": 'Pakaian Wanita'
  };

  const titleWords = (p.title || '').toString().toLowerCase().split(/\W+/).filter(Boolean);
  let base = '';

  // Try keyword detection first (so 'ssd' in title overrides broad category)
  const foundKey = titleWords.find(w => Object.prototype.hasOwnProperty.call(keywordMap, w));
  if (foundKey) {
    base = keywordMap[foundKey];
  } else {
    const cat = (p.category || '').toString().toLowerCase();
    if (categoryBase[cat]) base = categoryBase[cat];
    else if (titleWords.length > 0) base = titleWords[0].charAt(0).toUpperCase() + titleWords[0].slice(1);
    else base = 'Barang';
  }

  // Deterministic suffix: even id -> 'bekas', odd id -> 'preloved'
  const suffix = (Number(p.id) % 2 === 0) ? 'bekas' : 'preloved';

  p.title = `${base} ${suffix}`;
  // assign a demo location if missing for filtering/demo purposes
  if (!p.location) p.location = 'Malang, Jatim';
  // assign or persist a student-friendly IDR price (stored per-product in localStorage)
  try{
    const mapRaw = localStorage.getItem('price_map');
    let map = {};
    if (mapRaw) map = JSON.parse(mapRaw) || {};
    const key = String(p.id);
    if (map[key]){
      p.priceIdr = Number(map[key]);
    } else {
      const generated = generateStudentFriendlyPrice();
      p.priceIdr = generated;
      map[key] = generated;
      try{ localStorage.setItem('price_map', JSON.stringify(map)); }catch(e){}
    }
  }catch(e){ console.error('price_map handling error', e); }
  return p;
}

// Utility: safe text sanitization (for inputs)
function sanitizeSearchInput(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').replace(/[\x00-\x1F\x7F]/g, '');
}

function createProductCard(prod) {
  const li = document.createElement('li');
  li.className = 'product';
  li.setAttribute('data-id', String(prod.id));
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.style.cursor = 'pointer'; // indicate clickable

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'thumb-wrap';

  const img = document.createElement('img');
  img.className = 'thumb';
  img.loading = 'lazy';
  img.src = prod.image || '';
  img.alt = prod.title ? String(prod.title) : 'Product image';

  // stock badge (demo: show 'Stok: 1')
  const badge = document.createElement('div');
  badge.className = 'stock-badge';
  badge.textContent = 'Stok: 1';

  // location badge (default to Malang if missing)
  const loc = document.createElement('div');
  loc.className = 'location-badge';
  const locationText = prod.location ? String(prod.location) : 'Malang, Jatim';
  loc.textContent = '📍 ' + locationText;

  thumbWrap.appendChild(img);
  thumbWrap.appendChild(badge);
  thumbWrap.appendChild(loc);

  // Wishlist button (heart)
  const wishBtn = document.createElement('button');
  wishBtn.className = 'wish-btn';
  wishBtn.type = 'button';
  wishBtn.setAttribute('aria-label','Tambah ke Wishlist');
  wishBtn.textContent = '❤';
  // active state if in wishlist
  const wishlist = getWishlist();
  if (wishlist.includes(String(prod.id))) wishBtn.classList.add('wish-active');
  wishBtn.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    toggleWishlist(prod);
    // Reflect actual state from storage (in case toggle was blocked by guard)
    const wl = getWishlist();
    if (wl.includes(String(prod.id))) wishBtn.classList.add('wish-active'); else wishBtn.classList.remove('wish-active');
  });
  thumbWrap.appendChild(wishBtn);

  // If product is a user-uploaded item, show delete button
  try{
    const isMy = String(prod.id).startsWith('MY-') || (Array.isArray(loadMyProducts()) && loadMyProducts().some(m=>String(m.id)===String(prod.id)));
    if (isMy){
      const delBtn = document.createElement('button');
      // keep legacy .delete-btn for any existing rules, but add .btn-delete-item
      // so it gets positioned bottom-right of the image container
      delBtn.className = 'delete-btn btn-delete-item';
      delBtn.type = 'button';
      delBtn.title = 'Hapus Barang';
      delBtn.setAttribute('aria-label', 'Hapus Barang');
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        // open custom delete modal and store pending id
        try{ showDeleteModal(String(prod.id)); }catch(e){ console.error('open delete modal error', e); }
      });
      thumbWrap.appendChild(delBtn);
    }
  }catch(e){ /* ignore */ }

  const title = document.createElement('h3');
  title.textContent = prod.title || 'Untitled';

  const desc = document.createElement('p');
  // Limit description length for UI clarity
  const txt = (prod.description || '').toString();
  desc.textContent = txt.length > 120 ? txt.slice(0,120) + '…' : txt;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const price = document.createElement('div');
  price.className = 'price';
  // use persistent IDR price when available
  if (typeof prod.priceIdr === 'number'){
    price.textContent = formatRupiah(prod.priceIdr);
  } else if (typeof prod.price === 'number'){
    // fallback: convert USD -> IDR by simulated rate for backward compatibility
    price.textContent = formatRupiah(prod.price * 15000);
  } else {
    price.textContent = 'Rp 0';
  }

  const category = document.createElement('div');
  category.className = 'category muted';
  category.textContent = prod.category || '';

  // attach location data attribute for filtering
  if (prod.location) li.setAttribute('data-location', String(prod.location).toLowerCase());

  meta.appendChild(price);
  meta.appendChild(category);

  li.appendChild(thumbWrap);
  li.appendChild(title);
  li.appendChild(desc);
  li.appendChild(meta);

  // Click handler to navigate to detail view (hide categories/list first)
  li.addEventListener('click', (e) => {
    e.preventDefault();
    // Use view switcher to ensure only detail view is visible
    showView('detail-view');
    // navigate to detail (uses existing showDetail function)
    showDetail(String(prod.id));
  });

  // Keyboard accessibility: Enter / Space trigger click
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      li.click();
    }
  });

  return li;
}

function renderProducts(list) {
  // Clear safely
  while (productsEl.firstChild) productsEl.removeChild(productsEl.firstChild);

  if (!Array.isArray(list) || list.length === 0) {
    setStatus('Tidak ada produk untuk ditampilkan.');
    if (countEl) countEl.textContent = '0';
    return;
  }

  const frag = document.createDocumentFragment();
  for (const p of list) {
    try {
      const node = createProductCard(p);
      frag.appendChild(node);
    } catch (e) {
      console.error('renderProducts item failed', e, p);
    }
  }
  productsEl.appendChild(frag);
  if (countEl) countEl.textContent = String(list.length);

  // Ensure click listeners are active (use event delegation)
  setupProductClickHandler();
}

// Group products by their category property
function groupByCategory(products){
  const map = Object.create(null);
  for (const p of products){
    const key = (p.category || 'Uncategorized').toString();
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }
  return map; // { categoryName: [products...] }
}

// Render grouped categories into #categories-container
function renderCategories(groupedData){
  const container = document.getElementById('categories-container');
  if (!container) return;
  // clear safely
  while (container.firstChild) container.removeChild(container.firstChild);

  // For each category, create a section with up to 3 items and a 'Lihat Semua' button
  Object.keys(groupedData).forEach(catName => {
    const items = groupedData[catName] || [];

    const section = document.createElement('section');
    section.className = 'category-block';

    const header = document.createElement('div');
    header.className = 'category-header';
    const h2 = document.createElement('h2');
    h2.textContent = catName;
    header.appendChild(h2);

    const grid = document.createElement('ul');
    grid.className = 'category-grid';

    // show up to 3 items initially
    const initial = items.slice(0,3);
    for (const p of initial){
      const card = createProductCard(p);
      grid.appendChild(card);
    }

    // actions container
    const actions = document.createElement('div');
    actions.className = 'category-actions';
    const viewAllBtn = document.createElement('button');
    viewAllBtn.type = 'button';
    viewAllBtn.className = 'btn-outline';
    viewAllBtn.textContent = 'Koleksi Lainnya';
    viewAllBtn.style.marginTop = '8px';
    viewAllBtn.setAttribute('aria-label', `Koleksi lainnya ${catName}`);

    // When clicked, toggle showing all items in this category and hide other categories
    viewAllBtn.addEventListener('click', ()=>{
      const isExpanded = section.classList.contains('expanded');
      // collapse any expanded sections first
      const allSections = Array.from(container.querySelectorAll('.category-block'));
      allSections.forEach(s => {
        if (s !== section){
          s.classList.remove('focused');
          s.classList.remove('expanded');
          // restore trimmed view: remove extra children beyond 3
          const g = s.querySelector('.category-grid');
          const catTitle = s.querySelector('h2') && s.querySelector('h2').textContent;
          if (g && catTitle){
            const currentItems = groupedData[catTitle] || [];
            while (g.children.length > Math.min(3, currentItems.length)) g.removeChild(g.lastChild);
          }
        }
      });

      if (!isExpanded){
        // expand this one: clear grid and append all items
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        for (const p of items){ grid.appendChild(createProductCard(p)); }
        section.classList.add('expanded');
        section.classList.add('focused');
        viewAllBtn.textContent = 'Tutup Koleksi';
      } else {
        // collapse back to 3
        while (grid.firstChild) grid.removeChild(grid.lastChild);
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        for (const p of initial){ grid.appendChild(createProductCard(p)); }
        section.classList.remove('expanded');
        section.classList.remove('focused');
        viewAllBtn.textContent = 'Koleksi Lainnya';
      }
    });

    actions.appendChild(viewAllBtn);

    section.appendChild(header);
    section.appendChild(grid);
    section.appendChild(actions);
    container.appendChild(section);
  });
}

// Event delegation: handle clicks on product cards
function setupProductClickHandler(){
  // Ensure clicks on any .product li anywhere are handled (category grids or main list)
  // Remove previous handlers to avoid duplicates
  try{ productsEl && productsEl.removeEventListener('click', productClickListener); }catch(e){}
  try{ document.removeEventListener('click', productClickListener); }catch(e){}
  if (productsEl) productsEl.addEventListener('click', productClickListener);
  document.addEventListener('click', productClickListener);
}

// Wishlist helpers
function getWishlist(){
  try{
    // per-user wishlist key: wishlist_<username>
    const user = sessionStorage.getItem('userName') || localStorage.getItem('currentUser') || null;
    const key = user ? `wishlist_${String(user)}` : 'wishlist_guest';
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(String);
  }catch(e){ return []; }
}

function saveWishlist(arr){
  try{
    const user = sessionStorage.getItem('userName') || localStorage.getItem('currentUser') || null;
    const key = user ? `wishlist_${String(user)}` : 'wishlist_guest';
    localStorage.setItem(key, JSON.stringify(arr));
  }catch(e){}
}

function toggleWishlist(prod){
  // Guard: require login for modifying per-user wishlist
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true' || !!localStorage.getItem('currentUser');
  if (!isLoggedIn){
    try{ document.getElementById('auth-modal-message').textContent = 'Silakan login untuk melihat daftar barang favorit kamu!'; showAuthModal(); }catch(e){ showView('login-view'); }
    return;
  }
  const id = String(prod.id);
  const list = getWishlist();
  const idx = list.indexOf(id);
  if (idx === -1) {
    list.push(id);
  } else {
    list.splice(idx,1);
  }
  saveWishlist(list);
}

// render wishlist view
function renderWishlistView(){
  const root = document.getElementById('wishlist-view');
  const container = document.getElementById('wishlist-container');
  if (!root || !container) return;
  // clear
  while (container.firstChild) container.removeChild(container.firstChild);

  const list = getWishlist();
  if (list.length === 0){
    const empty = document.createElement('div'); empty.className='history-empty'; empty.textContent='Belum ada item di wishlist.'; container.appendChild(empty); return;
  }

  // find products by id from allProducts
  for (const id of list){
    const p = allProducts.find(x=> String(x.id) === id);
    if (!p) continue;
    const card = createProductCard(p);
    container.appendChild(card);
  }
}

function productClickListener(e){
  // Traverse up to find li.product
  let el = e.target;
  while (el){
    if (el.matches && el.matches('li.product')){
      const id = el.getAttribute('data-id');
      if (id) { showDetail(id); }
      return;
    }
    el = el.parentNode;
  }
}

// Fetch product by id and render detail view
async function fetchProductById(id){
  try{
    setStatus('Memuat detail produk...');
    const resp = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {cache: 'no-store'});
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const prod = await resp.json();
    return prod;
  }catch(err){
    console.error('fetchProductById', err);
    setStatus('Gagal memuat detail produk.', true);
    return null;
  }
}

function transformTitleForDetail(prod){
  // reuse transform logic (but work on a copy)
  const transformed = transformProductForThrift(prod);
  return transformed.title;
}

// Show detail view: fetch, transform, render
async function showDetail(id){
  const detailEl = document.getElementById('detail-view');
  const listSection = productsEl.closest('section');
  if (!detailEl) return;
  // Fetch fresh product data from API first
  let prod = null;
  try{
    prod = await fetchProductById(id);
  }catch(e){ prod = null; }

  // If not found via API, fallback to locally uploaded products
  if (!prod){
    try{
      const my = loadMyProducts();
      if (Array.isArray(my) && my.length>0){
        const found = my.find(item => String(item.id) === String(id));
        if (found) prod = found;
      }
    }catch(e){ /* ignore */ }
  }

  if (!prod) return;

  // Prefer user-provided title when available, otherwise transform for display
  const mappedTitle = prod.title ? String(prod.title) : transformTitleForDetail(prod);

  // Build detail DOM safely
  // Clear existing
  while (detailEl.firstChild) detailEl.removeChild(detailEl.firstChild);

  const container = document.createElement('div');
  container.className = 'detail-container';

  const thumb = document.createElement('div');
  thumb.className = 'detail-thumb';
  const img = document.createElement('img');
  img.src = prod.image || '';
  img.alt = mappedTitle;
  img.loading = 'lazy';
  thumb.appendChild(img);

  const info = document.createElement('div');
  info.className = 'detail-info';

  const h2 = document.createElement('h2');
  h2.textContent = mappedTitle;

  const pDesc = document.createElement('p');
  pDesc.textContent = prod.description || '';

  const price = document.createElement('div');
  price.className = 'price';
  if (typeof prod.priceIdr === 'number'){
    price.textContent = formatRupiah(prod.priceIdr);
  } else if (typeof prod.price === 'number'){
    price.textContent = formatRupiah(prod.price * 15000);
  } else {
    price.textContent = 'Rp 0';
  }

  const actions = document.createElement('div');
  actions.className = 'detail-actions';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-secondary';
  backBtn.textContent = 'Kembali';
  backBtn.addEventListener('click', ()=>{
    hideDetail();
  });

  const buyBtn = document.createElement('button');
  buyBtn.className = 'btn-primary';
  buyBtn.textContent = 'Beli Sekarang';
  buyBtn.addEventListener('click', ()=>{
    // Open checkout view and pass product (protected: require login)
    try{
      if (typeof protectedRenderCheckout === 'function') protectedRenderCheckout(prod);
      else if (window.renderCheckoutProtected) window.renderCheckoutProtected(prod);
      else renderCheckout(prod);
    }catch(e){
      // fallback
      renderCheckout(prod);
    }
  });

  actions.appendChild(backBtn);
  actions.appendChild(buyBtn);

  // Chat Penjual button (opens simulated chat modal)
  const chatBtn = document.createElement('button');
  chatBtn.className = 'btn-outline';
  chatBtn.type = 'button';
  chatBtn.textContent = 'Chat Penjual';
  chatBtn.addEventListener('click', ()=>{
    // open chat modal with seller info (simulate)
    showChatModal({ sellerName: 'Penjual Thrift', product: mappedTitle });
  });
  actions.appendChild(chatBtn);

  info.appendChild(h2);
  info.appendChild(pDesc);
  info.appendChild(price);
  info.appendChild(actions);

  container.appendChild(thumb);
  container.appendChild(info);

  detailEl.appendChild(container);

  // Toggle views
  // remember last home mode so we can restore when user goes back
  lastHomeMode = homeMode;
  if (listSection) listSection.style.display = 'none';
  detailEl.style.display = 'block';
}

function hideDetail(){
  const detailEl = document.getElementById('detail-view');
  const listSection = productsEl.closest('section');
  if (detailEl) while (detailEl.firstChild) detailEl.removeChild(detailEl.firstChild);
  if (detailEl) detailEl.style.display = 'none';
  // restore home view according to lastHomeMode
  if (lastHomeMode === 'all'){
    setHomeMode('all');
    showHomeView();
  } else {
    setHomeMode('categories');
    showHomeView();
  }
}

/** CHECKOUT FLOW **/
// Render checkout view for a product (safe DOM creation)
function renderCheckout(product){
  const checkoutEl = document.getElementById('checkout-view');
  const detailEl = document.getElementById('detail-view');
  const listSection = productsEl.closest('section');
  if (!checkoutEl) return;

  // Clear existing
  while (checkoutEl.firstChild) checkoutEl.removeChild(checkoutEl.firstChild);

  const card = document.createElement('div');
  card.className = 'checkout-card';

  // Summary
  const summary = document.createElement('div');
  summary.className = 'checkout-summary';
  const h3 = document.createElement('h3');
  h3.textContent = 'Ringkasan Pesanan';
  const item = document.createElement('div');
  // Show persistent IDR price in summary
  const displayPrice = (typeof product.priceIdr === 'number') ? formatRupiah(product.priceIdr) : (typeof product.price === 'number' ? formatRupiah(product.price * 15000) : 'Rp 0');
  item.textContent = `${transformTitleForDetail(product)} — ${displayPrice}`;
  summary.appendChild(h3);
  summary.appendChild(item);

  // Form
  const form = document.createElement('form');
  form.id = 'checkout-form';

  // Nama
  const nameRow = document.createElement('div');
  nameRow.className = 'form-row';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Nama Lengkap';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.name = 'fullname';
  nameInput.required = true;
  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);

  // HP
  const phoneRow = document.createElement('div');
  phoneRow.className = 'form-row';
  const phoneLabel = document.createElement('label');
  phoneLabel.textContent = 'Nomor Handphone';
  const phoneInput = document.createElement('input');
  phoneInput.type = 'tel';
  phoneInput.name = 'phone';
  phoneInput.required = true;
  phoneRow.appendChild(phoneLabel);
  phoneRow.appendChild(phoneInput);

  // Alamat
  const addrRow = document.createElement('div');
  addrRow.className = 'form-row';
  const addrLabel = document.createElement('label');
  addrLabel.textContent = 'Alamat Lengkap';
  const addrInput = document.createElement('textarea');
  addrInput.name = 'address';
  addrInput.required = true;
  addrRow.appendChild(addrLabel);
  addrRow.appendChild(addrInput);

  // Metode
  const payRow = document.createElement('div');
  payRow.className = 'form-row';
  const payLabel = document.createElement('label');
  payLabel.textContent = 'Metode Pembayaran';
  const paySelect = document.createElement('select');
  paySelect.name = 'payment';
  const opts = ['COD','Transfer Bank','e-Wallet'];
  for (const o of opts){
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    paySelect.appendChild(opt);
  }
  payRow.appendChild(payLabel);
  payRow.appendChild(paySelect);

  // Error msg placeholder
  const err = document.createElement('div');
  err.className = 'error';
  err.style.display = 'none';

  // Actions
  const actions = document.createElement('div');
  actions.className = 'checkout-actions';
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn-secondary';
  backBtn.textContent = 'Kembali';
  backBtn.addEventListener('click', ()=>{
    // go back to detail
    if (checkoutEl) checkoutEl.style.display = 'none';
    if (detailEl) detailEl.style.display = 'block';
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn-primary';
  submitBtn.textContent = 'Selesaikan Pesanan';

  actions.appendChild(backBtn);
  actions.appendChild(submitBtn);

  form.appendChild(nameRow);
  form.appendChild(phoneRow);
  form.appendChild(addrRow);
  form.appendChild(payRow);
  form.appendChild(err);
  form.appendChild(actions);

  // Form submit handling
  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    // Validate
    const fullname = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addrInput.value.trim();
    if (!fullname){ err.style.display='block'; err.textContent='Nama lengkap wajib diisi'; return; }
    if (!/^[0-9+\-\s]{6,20}$/.test(phone)){ err.style.display='block'; err.textContent='Nomor HP harus angka (6-20 digit)'; return; }
    if (!address){ err.style.display='block'; err.textContent='Alamat tidak boleh kosong'; return; }

    // Success: show custom modal instead of alert
    const modal = document.getElementById('success-modal');
    const modalBuyer = document.getElementById('modal-buyer-name');
    const modalProduct = document.getElementById('modal-product-name');
    const modalBox = modal && modal.querySelector('.modal-box');
    const modalClose = document.getElementById('modal-close');

    if (modal && modalBuyer && modalProduct && modalBox && modalClose) {
      // Build order object and save to history
      const order = {
        id: 'ORD-' + Date.now(),
        productName: transformTitleForDetail(product),
        // persist the IDR integer so history displays consistent currency
        totalPrice: typeof product.priceIdr === 'number' ? product.priceIdr : (typeof product.price === 'number' ? Math.round(product.price * 15000) : 0),
        buyerName: fullname,
        date: new Date().toISOString(),
        status: 'rekber' // default: Dana Tertahan (Rekber)
      };
      saveToHistory(order);

      // Insert texts safely
      modalBuyer.textContent = fullname;
      modalProduct.textContent = order.productName;

      // Show modal
      modal.style.display = 'flex';
      // small animation class
      requestAnimationFrame(()=> modalBox.classList.add('show'));

      // Close handler (one-time)
      const closeHandler = () => {
        modalBox.classList.remove('show');
        // hide after transition
        setTimeout(()=>{ modal.style.display = 'none'; }, 200);

        // reset form fields
        nameInput.value = '';
        phoneInput.value = '';
        addrInput.value = '';

        // Reset views: go back to list
        showView('list');
      };

      modalClose.addEventListener('click', closeHandler, { once: true });

      // Optional: clicking backdrop also closes
      const backdrop = modal.querySelector('.modal-backdrop');
      if (backdrop) backdrop.addEventListener('click', ()=> modalClose.click(), { once: true });
    } else {
      // fallback to alert if modal missing
      alert(`Pesanan berhasil dibuat untuk ${transformTitleForDetail(product)}. Terima kasih, ${fullname}!`);

      // Reset views: go back to list
      if (checkoutEl) checkoutEl.style.display = 'none';
      if (detailEl) while (detailEl.firstChild) detailEl.removeChild(detailEl.firstChild);
      if (detailEl) detailEl.style.display = 'none';
      const listSection = productsEl.closest('section');
      if (listSection) listSection.style.display = '';
      setStatus(`Menampilkan ${allProducts.length} produk`);
    }
  });

  card.appendChild(summary);
  card.appendChild(form);
  checkoutEl.appendChild(card);

  // Toggle views
  if (detailEl) detailEl.style.display = 'none';
  if (listSection) listSection.style.display = 'none';
  checkoutEl.style.display = 'block';
}

function applySort(list, mode) {
  if (!Array.isArray(list)) return list;
  if (mode === 'price-asc') {
    return [...list].sort((a,b) => (a.price||0) - (b.price||0));
  } else if (mode === 'price-desc') {
    return [...list].sort((a,b) => (b.price||0) - (a.price||0));
  }
  return list;
}

function handleSearch(event) {
  if (event) event.preventDefault();
  const raw = sanitizeSearchInput(searchInput.value || '');
  if (raw.length > 0 && raw.length < 2) {
    setStatus('Masukkan minimal 2 karakter untuk pencarian.', true);
    return;
  }
  const needle = raw.toLowerCase();
  let filtered = allProducts.filter(p => {
    const t = (p.title || '').toString().toLowerCase();
    const d = (p.description || '').toString().toLowerCase();
    const c = (p.category || '').toString().toLowerCase();
    return t.includes(needle) || d.includes(needle) || c.includes(needle);
  });

  filtered = applySort(filtered, sortSelect.value);

  // Group filtered results and render as categories
  const grouped = groupByCategory(filtered);

  const catContainer = document.getElementById('categories-container');
  const listSection = productsEl && productsEl.closest('section');
  const catSection = document.querySelector('.categories-section');

  if (filtered.length === 0){
    // show friendly not-found message inside categories container
    if (catContainer){
      while (catContainer.firstChild) catContainer.removeChild(catContainer.firstChild);
      const msg = document.createElement('div');
      msg.className = 'search-empty';
      msg.textContent = 'Hasil pencarian tidak ditemukan';
      catContainer.appendChild(msg);
    }
    if (listSection) listSection.style.display = 'none';
    if (catSection) catSection.style.display = 'block';
    setStatus(`Menampilkan 0 hasil untuk "${raw}"`, true);
    return;
  }

  renderCategories(grouped);
  if (listSection) listSection.style.display = 'none';
  if (catSection) catSection.style.display = 'block';
  setStatus(`Menampilkan ${filtered.length} hasil untuk "${raw}"`);
}

function debounce(fn, delay){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), delay);
  }
}

const liveSearch = debounce(() => {
  const raw = sanitizeSearchInput(searchInput.value || '');
  const listSection = productsEl && productsEl.closest('section');
  const catSection = document.querySelector('.categories-section');

  if (raw.length === 0) {
    // show full categories when search is cleared
    const groupedAll = groupByCategory(applySort(allProducts, sortSelect.value));
    renderCategories(groupedAll);
    if (listSection) listSection.style.display = 'none';
    if (catSection) catSection.style.display = 'block';
    setStatus(`Menampilkan ${allProducts.length} produk`);
    return;
  }
  if (raw.length < 2) return;

  const needle = raw.toLowerCase();
  const filtered = allProducts.filter(p => {
    const t = (p.title || '').toString().toLowerCase();
    const d = (p.description || '').toString().toLowerCase();
    const c = (p.category || '').toString().toLowerCase();
    return t.includes(needle) || d.includes(needle) || c.includes(needle);
  });
  const sorted = applySort(filtered, sortSelect.value);
  const grouped = groupByCategory(sorted);
  renderCategories(grouped);
  if (listSection) listSection.style.display = 'none';
  if (catSection) catSection.style.display = 'block';
  setStatus(`Menampilkan ${sorted.length} hasil untuk "${raw}"`);
}, 300);

// Event wiring
if (searchForm) searchForm.addEventListener('submit', handleSearch);
if (searchInput) searchInput.addEventListener('input', liveSearch);
if (sortSelect) sortSelect.addEventListener('change', ()=>{
  const raw = sanitizeSearchInput(searchInput.value || '');
  if (raw.length >= 2) handleSearch();
  else renderProducts(applySort(allProducts, sortSelect.value));
});
if (viewAllBtn) viewAllBtn.addEventListener('click', ()=>{
  searchInput.value = '';
  renderProducts(applySort(allProducts, sortSelect.value));
  setStatus(`Menampilkan ${allProducts.length} produk`);
});

// Flexible view switcher: hide all main containers and show the requested one.
// Accepts both legacy names ('list','detail','checkout','history') and new ids
// ('home-view','detail-view','checkout-view','history-view'). Always scroll to top.
function showView(viewId){
  try{
    // Hide ALL page views first
    const pages = Array.from(document.querySelectorAll('.page-view'));
    pages.forEach(p => { try{ p.style.display = 'none'; }catch(e){} });

    // Also hide any transient modal-like app views if they exist
    const appViews = Array.from(document.querySelectorAll('.app-view'));
    appViews.forEach(av => { try{ av.style.display = 'none'; }catch(e){} });

    // Resolve target: allow both ids and legacy keywords
    let target = document.getElementById(viewId);
    if (!target) {
      // legacy mapping for logical names
      if (viewId === 'list' || viewId === 'home-view') target = document.getElementById('home-view') || document.querySelector('.categories-section');
      else if (viewId === 'detail' || viewId === 'detail-view') target = document.getElementById('detail-view');
      else if (viewId === 'checkout' || viewId === 'checkout-view') target = document.getElementById('checkout-view');
      else if (viewId === 'history' || viewId === 'history-view') target = document.getElementById('history-view');
      else if (viewId === 'wishlist' || viewId === 'wishlist-view') target = document.getElementById('wishlist-view');
      else if (viewId === 'login' || viewId === 'login-view') target = document.getElementById('login-view');
      else if (viewId === 'register' || viewId === 'register-view') target = document.getElementById('register-view');
    }

    if (target && target.style){
      target.style.display = 'block';
    }

    // Scroll to top for each view switch
    try{ window.scrollTo(0,0); }catch(e){}
  }catch(err){ console.error('showView error', err); }
}

// Save an order object to localStorage under key 'order_history'
function saveToHistory(order){
  try{
    const raw = localStorage.getItem('order_history');
    let arr = [];
    if (raw){
      arr = JSON.parse(raw);
      if(!Array.isArray(arr)) arr = [];
    }
    arr.push(order);
    // keep only last 50 entries
    if (arr.length>50) arr = arr.slice(arr.length-50);
    localStorage.setItem('order_history', JSON.stringify(arr));
  }catch(err){
    console.error('Could not save order history', err);
  }
}

// Render the history view from localStorage
function renderHistory(){
  const historyRoot = document.getElementById('history-view');
  if(!historyRoot) return;
  // clear
  while(historyRoot.firstChild) historyRoot.removeChild(historyRoot.firstChild);

  const card = document.createElement('div');
  card.className = 'history-card';
  const title = document.createElement('h3');
  title.textContent = 'Riwayat Pemesanan';
  card.appendChild(title);

  // load
  let arr = [];
  try{
    const raw = localStorage.getItem('order_history');
    if(raw) arr = JSON.parse(raw);
    if(!Array.isArray(arr)) arr = [];
  }catch(err){
    console.error('Could not read order history', err);
    arr = [];
  }

  if(arr.length===0){
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'Belum ada pesanan. Coba beli sesuatu dulu!';
    card.appendChild(empty);
  } else {
    const table = document.createElement('table');
    table.className = 'history-table';
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    ['No','Waktu','Produk','Pembeli','Total','Status'].forEach(h=>{
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    arr.slice().reverse().forEach((o, idx)=>{
      const tr = document.createElement('tr');
      const no = document.createElement('td'); no.textContent = String(idx+1);
      const date = document.createElement('td'); date.textContent = new Date(o.date).toLocaleString();
      const prod = document.createElement('td'); prod.textContent = o.productName;
      const buyer = document.createElement('td');
      // sanitize buyer name: trim and collapse accidental duplication like "John John" or repeated sequences
      let buyerName = (o.buyerName || '').toString().trim();
      if (buyerName){
        // collapse multiple spaces
        buyerName = buyerName.replace(/\s+/g, ' ');
        // if name contains immediate duplicate (e.g., "Name Name"), reduce to single occurrence
        const parts = buyerName.split(' ');
        if (parts.length >= 2 && parts[0] === parts[1]) buyerName = parts.slice(0,1).join(' ');
      }
      buyer.textContent = buyerName || '-';
    const total = document.createElement('td'); total.textContent = formatRupiah(Number(o.totalPrice) || 0);
      const statusTd = document.createElement('td');
      // create status badge/button safely
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.classList.add('status-badge');
      if (o.status === 'rekber'){
        // escrow state
        badge.classList.add('badge-pending');
        badge.textContent = 'Dana Tertahan (Rekber)';
        badge.title = 'Konfirmasi jika barang diterima';
        badge.style.cursor = 'pointer';
        // add confirm receipt button (click to complete and forward funds)
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'btn-secondary';
        confirmBtn.textContent = 'Konfirmasi Barang Diterima';
        confirmBtn.style.marginLeft = '8px';
        confirmBtn.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          try{
            const rawAll = localStorage.getItem('order_history');
            let list = [];
            if (rawAll) list = JSON.parse(rawAll) || [];
            const revIndex = arr.length - 1 - idx; // because we are iterating reversed
            const target = list[revIndex];
            if (target && target.id === o.id){
              target.status = 'completed';
              target.completedAt = new Date().toISOString();
              localStorage.setItem('order_history', JSON.stringify(list));
              renderHistory();
            } else {
              const found = list.find(item => item.id === o.id);
              if (found){ found.status = 'completed'; found.completedAt = new Date().toISOString(); localStorage.setItem('order_history', JSON.stringify(list)); renderHistory(); }
            }
          }catch(err){ console.error('Could not confirm receipt', err); }
        });
        statusTd.appendChild(confirmBtn);
      } else {
        // completed
        const span = document.createElement('span');
        span.classList.add('badge-completed');
        span.textContent = 'Selesai - Dana Diteruskan';
        badge.appendChild(span);
        badge.disabled = true;
        badge.style.cursor = 'default';
      }
      statusTd.appendChild(badge);
      [no,date,prod,buyer,total,statusTd].forEach(td=>tr.appendChild(td));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
    // actions
    const actions = document.createElement('div');
    actions.className = 'history-actions';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-danger';
    clearBtn.textContent = 'Hapus Riwayat';
    clearBtn.addEventListener('click', ()=>{
      // Open custom confirm modal instead of browser confirm
      const confirmModal = document.getElementById('confirm-modal');
      const confirmCancel = document.getElementById('confirm-cancel');
      const confirmDelete = document.getElementById('confirm-delete');
      if (!confirmModal || !confirmCancel || !confirmDelete) {
        // fallback
        try{ localStorage.removeItem('order_history'); }catch(e){}
        renderHistory();
        return;
      }
      confirmModal.style.display = 'flex';
      const modalBox = confirmModal.querySelector('.modal-box');
      requestAnimationFrame(()=> modalBox.classList.add('show'));

      const closeConfirm = ()=>{
        modalBox.classList.remove('show');
        setTimeout(()=>{ confirmModal.style.display = 'none'; }, 180);
        confirmCancel.removeEventListener('click', onCancel);
        confirmDelete.removeEventListener('click', onDelete);
      };

      const onCancel = ()=>{ closeConfirm(); };
      const onDelete = ()=>{
        try{ localStorage.removeItem('order_history'); }catch(e){}
        closeConfirm();
        renderHistory();
      };

      confirmCancel.addEventListener('click', onCancel);
      confirmDelete.addEventListener('click', onDelete);
    });
    actions.appendChild(clearBtn);
    card.appendChild(actions);
  }

  historyRoot.appendChild(card);
}

// wire history nav link
const navHistory = document.getElementById('nav-history');
if(navHistory){
  navHistory.addEventListener('click', (e)=>{
    e.preventDefault();
    showView('history-view');
    renderHistory();
  });
}

// --- Chat modal helpers (simulated in-app chat, privacy-first) ---
function showChatModal(ctx){
  try{
    const modal = document.getElementById('chat-modal');
    if (!modal) return;
    const messages = modal.querySelector('#chat-messages');
    const input = modal.querySelector('#chat-input');
    const sendBtn = modal.querySelector('#chat-send');
    const closeBtn = modal.querySelector('#chat-close');

    // populate initial messages
    while(messages.firstChild) messages.removeChild(messages.firstChild);
    const intro = document.createElement('div'); intro.className = 'chat-message seller';
    const bubble = document.createElement('span'); bubble.className = 'chat-bubble seller';
    bubble.textContent = `Halo, saya penjual untuk ${ctx.product}. Ada yang bisa dibantu?`;
    intro.appendChild(bubble);
    messages.appendChild(intro);

    modal.style.display = 'flex';
    requestAnimationFrame(()=>{
      const box = modal.querySelector('.modal-box'); if (box) box.classList.add('show');
    });

    // send handler
    const sendHandler = ()=>{
      const txt = input.value.trim();
      if (!txt) return;
      const me = document.createElement('div'); me.className = 'chat-message me';
      const mb = document.createElement('span'); mb.className = 'chat-bubble me'; mb.textContent = txt;
      me.appendChild(mb);
      messages.appendChild(me);
      input.value = '';
      messages.scrollTop = messages.scrollHeight;

      // simulate seller reply after short delay
      setTimeout(()=>{
        const r = document.createElement('div'); r.className = 'chat-message seller';
        const rb = document.createElement('span'); rb.className = 'chat-bubble seller';
        rb.textContent = 'Terima kasih atas pesanmu. Saya akan cek barang dan segera kembali.';
        r.appendChild(rb);
        messages.appendChild(r);
        messages.scrollTop = messages.scrollHeight;
      }, 700 + Math.random()*800);
    };

    sendBtn.addEventListener('click', sendHandler);
  const keyHandler = (e)=>{ if (e.key === 'Enter') { e.preventDefault(); sendHandler(); } };
  input.addEventListener('keydown', keyHandler);

    // close handler
    const close = ()=>{
      const box = modal.querySelector('.modal-box'); if (box) box.classList.remove('show');
      setTimeout(()=>{ modal.style.display = 'none'; }, 180);
      try{ sendBtn.removeEventListener('click', sendHandler); }catch(e){}
      try{ input.removeEventListener('keydown', keyHandler); }catch(e){}
    };
    closeBtn.addEventListener('click', close, { once: true });
    const backdrop = modal.querySelector('.modal-backdrop'); if (backdrop) backdrop.addEventListener('click', ()=> close(), { once: true });
  }catch(err){ console.error('showChatModal error', err); }
}

// wire hero history button (moved from navbar)
const navHistoryHero = document.getElementById('nav-history-hero');
if(navHistoryHero){
  navHistoryHero.addEventListener('click', (e)=>{
    e.preventDefault();
    showView('history-view');
    renderHistory();
  });
}

// --- AUTH: simple client-side login/register (sessionStorage) ---
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userGreet = document.getElementById('user-greet');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');

function updateAuthUI(){
  // Keep backward-compatible hook: rebuild navbar auth area
  // The real rendering is done in updateNavbar(), so delegate to it.
  try{ updateNavbar(); }catch(e){ /* silent */ }
}

// Unified navbar updater that respects both login and registration states
// updateNavbar renders the auth area. First line MUST clear container to avoid duplicates.
function updateNavbar(){
  try{
    const navAuth = document.querySelector('.nav .auth-actions');
    if (!navAuth) return;

    // CLEAR existing content to prevent duplicates (required)
    try{ navAuth.innerHTML = ''; }catch(e){ /* ignore if not writable */ }

    // Only show greeting/logout when a session login exists
    const isLogged = sessionStorage.getItem('isLoggedIn') === 'true';
    const loggedName = sessionStorage.getItem('userName');

    if (isLogged && loggedName){
      const greet = document.createElement('div');
      greet.id = 'user-greet';
      greet.style.color = '#fff';
      greet.style.marginLeft = '12px';
      greet.textContent = `Halo, ${loggedName}!`;

  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'btn-logout';
  logoutBtn.className = 'btn-outline';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', function(ev){ handleLogout(ev); });

  // wishlist button (visible in both states)
  const wishlistBtn = document.createElement('button');
  wishlistBtn.id = 'btn-wishlist';
  wishlistBtn.className = 'btn-outline';
  wishlistBtn.textContent = 'Wishlist';
  wishlistBtn.addEventListener('click', (e)=>{ e.preventDefault(); checkWishlistAccess(); });
  navAuth.appendChild(wishlistBtn);
  // sell button (Mulai Jual)
  const sellBtn = document.createElement('button');
  sellBtn.id = 'btn-sell';
  sellBtn.className = 'btn-outline';
  sellBtn.textContent = 'Mulai Jual';
  sellBtn.title = 'Jual Barang';
  sellBtn.addEventListener('click', (e)=>{ e.preventDefault(); checkSellAccess(); });
  navAuth.appendChild(sellBtn);
  navAuth.appendChild(greet);
  navAuth.appendChild(logoutBtn);
  
  // Theme toggle (sun / moon)
  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.id = 'btn-theme-toggle';
  themeBtn.className = 'btn-outline';
  // show correct icon based on current theme
  const current = getPreferredTheme();
  themeBtn.textContent = current === 'dark' ? '🌙' : '☀️';
  themeBtn.title = 'Toggle Tema Gelap/Terang';
  themeBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); toggleTheme(); themeBtn.textContent = getPreferredTheme() === 'dark' ? '🌙' : '☀️'; });
  navAuth.insertBefore(themeBtn, navAuth.firstChild);
    } else {
      // login button: clear form when opening
      const loginBtn = document.createElement('button');
      loginBtn.id = 'btn-login';
      loginBtn.className = 'btn-outline';
      loginBtn.textContent = 'Login';
      loginBtn.addEventListener('click', ()=>{
        // clear login form inputs
        const li = document.getElementById('login-identifier');
        const lp = document.getElementById('login-password');
        if (li) li.value = '';
        if (lp) lp.value = '';
        // clear any previous error
        const le = document.getElementById('login-error'); if (le) le.textContent = '';
        showView('login-view');
      });

      // register button: clear register form when opening
      const registerBtn = document.createElement('button');
      registerBtn.id = 'btn-register';
      registerBtn.className = 'btn-outline';
      registerBtn.textContent = 'Daftar';
      registerBtn.addEventListener('click', ()=>{
        const rn = document.getElementById('reg-name'); if (rn) rn.value = '';
        const re = document.getElementById('reg-email'); if (re) re.value = '';
        const rp = document.getElementById('reg-password'); if (rp) rp.value = '';
        const rp2 = document.getElementById('reg-password2'); if (rp2) rp2.value = '';
        const reerr = document.getElementById('register-error'); if (reerr) reerr.textContent = '';
        showView('register-view');
      });

  navAuth.appendChild(loginBtn);
  navAuth.appendChild(registerBtn);
  // wishlist button (also visible when logged out)
  const wishlistBtn = document.createElement('button');
  wishlistBtn.id = 'btn-wishlist';
  wishlistBtn.className = 'btn-outline';
  wishlistBtn.textContent = 'Wishlist';
  wishlistBtn.addEventListener('click', (e)=>{ e.preventDefault(); checkWishlistAccess(); });
  navAuth.appendChild(wishlistBtn);

  // sell button (Mulai Jual) for logged-out state as well
  const sellBtn2 = document.createElement('button');
  sellBtn2.id = 'btn-sell';
  sellBtn2.className = 'btn-outline';
  sellBtn2.textContent = 'Mulai Jual';
  sellBtn2.title = 'Jual Barang';
  sellBtn2.addEventListener('click', (e)=>{ e.preventDefault(); checkSellAccess(); });
  navAuth.appendChild(sellBtn2);

  // Theme toggle for logged-out state
  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.id = 'btn-theme-toggle';
  themeBtn.className = 'btn-outline';
  const current2 = getPreferredTheme();
  themeBtn.textContent = current2 === 'dark' ? '🌙' : '☀️';
  themeBtn.title = 'Toggle Tema Gelap/Terang';
  themeBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); toggleTheme(); themeBtn.textContent = getPreferredTheme() === 'dark' ? '🌙' : '☀️'; });
  navAuth.insertBefore(themeBtn, navAuth.firstChild);
    }

    try{ document.body.style.overflow = ''; document.body.style.cursor = ''; }catch(e){}
  }catch(err){ console.error('updateNavbar error', err); }
}

// central logout handler
function handleLogout(){
  return function _internalLogout(ev){
    try{ if (ev && typeof ev.preventDefault === 'function') ev.preventDefault(); }catch(e){}
    try{
      sessionStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('userName');
    }catch(e){ /* ignore */ }
    // rebuild navbar (no name) and return to home
    try{ updateNavbar(null); }catch(e){}
    try{ showView('home-view'); }catch(e){}
  }();
}

// Buttons in the navbar are rendered by updateNavbar() which attaches their handlers.
// Avoid attaching handlers here to prevent duplicates.

// login form handling
const loginForm = document.getElementById('login-form');
if (loginForm){
  // centralized login handler
  function handleLogin(e){
    e.preventDefault();
    const id = document.getElementById('login-identifier').value.trim().toLowerCase();
    const pw = document.getElementById('login-password').value;
    // ensure error placeholder
    let le = document.getElementById('login-error');
    if (!le){ le = document.createElement('div'); le.id = 'login-error'; le.className = 'auth-error'; const lf = document.getElementById('login-form'); if (lf) lf.appendChild(le); }
    le.textContent = '';
    if (!id || !pw){ le.textContent = 'Email dan Password wajib diisi'; return; }

    // Load users list from localStorage
    let users = [];
    try{
      const raw = localStorage.getItem('usersList');
      if (raw) users = JSON.parse(raw) || [];
    }catch(err){ users = []; }

    // find matching user by email (case-insensitive) and password
    const found = users.find(u => (u.email || '').toLowerCase() === id && u.password === pw);
    if (!found){
      // no match -> show inline error
      le.textContent = users.length === 0 ? 'Email belum terdaftar!' : 'Email atau Password salah!';
      return;
    }

    // successful login: set session and username (use stored name)
    try{
      sessionStorage.setItem('isLoggedIn','true');
      sessionStorage.setItem('userName', found.name || (found.email || '').split('@')[0]);
    }catch(err){ console.error('login store error', err); }

    // hide login view and clear fields
    try{ const lv = document.getElementById('login-view'); if (lv) lv.style.display = 'none'; }catch(e){}
    const li = document.getElementById('login-identifier'); if (li) li.value = '';
    const lp = document.getElementById('login-password'); if (lp) lp.value = '';

    // update UI
    updateNavbar();
    showView('home-view');
  }

  loginForm.addEventListener('submit', handleLogin);
}

// register form handling
const registerForm = document.getElementById('register-form');
if (registerForm){
  // Named handler ensures clear sequence: hide register modal first -> persist -> show success
  function handleRegister(e){
    e.preventDefault();
    // collect inputs safely
    const nameEl = document.getElementById('reg-name');
    const emailEl = document.getElementById('reg-email');
    const pwEl = document.getElementById('reg-password');
    const pw2El = document.getElementById('reg-password2');
    if (!nameEl || !emailEl || !pwEl || !pw2El) return;
    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const pw = pwEl.value;
    const pw2 = pw2El.value;

    // inline error placeholder (create if missing)
    let errEl = document.getElementById('register-error');
    if (!errEl){
      errEl = document.createElement('div');
      errEl.id = 'register-error';
      errEl.className = 'auth-error';
      const form = document.getElementById('register-form');
      if (form) form.insertBefore(errEl, form.firstChild);
    }

    // basic validation
    if (!name){ errEl.textContent = 'Nama lengkap wajib diisi'; errEl.style.display = 'block'; return; }
    if (!email){ errEl.textContent = 'Email wajib diisi'; errEl.style.display = 'block'; return; }
    if (!pw){ errEl.textContent = 'Kata sandi wajib diisi'; errEl.style.display = 'block'; return; }
    if (pw !== pw2){ errEl.textContent = 'Password tidak cocok'; errEl.style.display = 'block'; return; }

    // Persist registration to localStorage usersList array
    try{
      let users = [];
      const raw = localStorage.getItem('usersList');
      if (raw) users = JSON.parse(raw) || [];

      // check if email already exists
      const exists = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      if (exists){ errEl.textContent = 'Email sudah terdaftar. Silakan login.'; errEl.style.display = 'block'; return; }

      users.push({ name: name, email: email, password: pw });
      localStorage.setItem('usersList', JSON.stringify(users));

      // Also keep a friendly registered_user_name for fallback display (non-auth)
      localStorage.setItem('registered_user_name', name);
    }catch(err){ console.error('Could not persist registration', err); errEl.textContent = 'Gagal menyimpan data pendaftaran'; errEl.style.display = 'block'; return; }

    // clear any error
    errEl.style.display = 'none'; errEl.textContent = '';

    // After registering, navigate to login page so user can login
    // Clear the form
    nameEl.value = '';
    emailEl.value = '';
    pwEl.value = '';
    pw2El.value = '';

    showView('login-view');
  }

  registerForm.addEventListener('submit', handleRegister);
}

// Cancel buttons
const loginCancel = document.getElementById('login-cancel');
if (loginCancel) loginCancel.addEventListener('click', ()=>{
  // explicitly hide login overlay and restore home view
  try{
    const lv = document.getElementById('login-view');
    if (lv){
      const card = lv.querySelector('.auth-card'); if (card && card.classList) card.classList.remove('show');
      lv.style.display = 'none';
    }
  }catch(e){}
  showView('home-view');
});
const registerCancel = document.getElementById('register-cancel');
if (registerCancel) registerCancel.addEventListener('click', ()=> showView('home-view'));

// link from login to register
const loginGoRegister = document.getElementById('login-go-register');
if (loginGoRegister){
  loginGoRegister.addEventListener('click', (e)=>{
    e.preventDefault();
    // navigate to register full-page view
    showView('register-view');
  });
}

// Protect checkout: if not logged in, redirect to login-view
const originalRenderCheckout = renderCheckout;
function protectedRenderCheckout(product){
  const isLogged = sessionStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('thrift_is_logged') === 'true';
  if (!isLogged){
    // navigate to login full-page view when checkout is attempted
    showView('login-view');
    return;
  }
  return originalRenderCheckout(product);
}
// overwrite reference used elsewhere
window.renderCheckoutProtected = protectedRenderCheckout;

// Ensure auth UI updates on load
updateAuthUI();
updateNavbar();

// Logo click -> home view
const logoLink = document.querySelector('.logo');
if (logoLink){
  logoLink.addEventListener('click', (e)=>{
    // if logo is a normal link, allow normal navigation unless SPA desired
    e.preventDefault();
    showView('home-view');
    // re-render categories to ensure home shows expected content
    const groupedAll = groupByCategory(applySort(allProducts, sortSelect.value));
    renderCategories(groupedAll);
  });
}

// wishlist button is created dynamically by updateNavbar() and attaches its own handler

// Render wishlist (dedicated function required)
function renderWishlist(){
  const root = document.getElementById('wishlist-view');
  const container = document.getElementById('wishlist-container');
  if (!root || !container) return;
  // clear
  while (container.firstChild) container.removeChild(container.firstChild);

  const list = getWishlist();
  if (!list || list.length === 0){
    const msg = document.createElement('div'); msg.className='history-empty'; msg.textContent = 'Belum ada barang di wishlist kamu.';
    container.appendChild(msg);
    return;
  }

  // for each id, find product and render a small card (reuse createProductCard but ensure buy button remains)
  for (const id of list){
    const p = allProducts.find(x=> String(x.id) === String(id));
    if (!p) continue;
    const card = createProductCard(p);
    // ensure buy button remains (createProductCard includes buy via detail view) - but in wishlist we want quick buy and remove
    // Append a remove button overlay
    const rem = document.createElement('button'); rem.type='button'; rem.className='btn-secondary'; rem.textContent='Hapus dari Wishlist';
    rem.addEventListener('click', (ev)=>{ ev.stopPropagation(); toggleWishlist(p); renderWishlist(); });
    const wrapper = document.createElement('div'); wrapper.appendChild(card); wrapper.appendChild(rem);
    container.appendChild(wrapper);
  }
}

// wishlist back to home
const wishlistBack = document.getElementById('wishlist-back-home');
if (wishlistBack) wishlistBack.addEventListener('click', (e)=>{ e.preventDefault(); showView('home-view'); showHomeView(); });

// Initial load
fetchProducts();

// Defensive: ensure search input is focusable and not covered by overlays
(function ensureSearchInteractable(){
  const si = document.getElementById('q');
  if (!si) return;
  // remove readonly/disabled accidentally set
  try{ si.removeAttribute('readonly'); si.removeAttribute('disabled'); }catch(e){}
  // ensure pointer-events on ancestors
  let el = si.parentElement;
  while (el && el !== document.body){
    if (getComputedStyle(el).pointerEvents === 'none') el.style.pointerEvents = 'auto';
    el = el.parentElement;
  }
  // light autofocus for accessibility (will not steal focus on modal open)
  si.addEventListener('focus', ()=> si.classList.add('focused'));
  si.addEventListener('blur', ()=> si.classList.remove('focused'));
})();
