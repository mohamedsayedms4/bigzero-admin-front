// تكوين API
const API_BASE_URL = 'https://api-spring.bigzero.online/api/v1/products';
const CATEGORIES_API_URL = 'https://api-spring.bigzero.online/api/v1/categories';

// المتغيرات العامة
let products = [];
let categories = [];
let currentPage = 0;
const pageSize = 12;
let totalPages = 0;
let productToDelete = null;
let isEditMode = false;
let currentView = 'grid';
let selectedImages = [];

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadCategories();
    loadProducts();
    setupEventListeners();
    setupPriceCalculations();
});

// التحقق من المصادقة
function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    const form = document.getElementById('productForm');
    form.addEventListener('submit', handleProductSubmit);

    const imagesInput = document.getElementById('productImages');
    imagesInput.addEventListener('change', handleImagesPreview);

    // تحديث الحسابات عند تغيير الأسعار
    const sellingPriceInput = document.getElementById('sellingPrice');
    const discountInput = document.getElementById('discountPercentage');
    
    sellingPriceInput.addEventListener('input', updatePriceSummary);
    discountInput.addEventListener('input', updatePriceSummary);
}

// إعداد حسابات الأسعار
function setupPriceCalculations() {
    updatePriceSummary();
}

// تحديث ملخص الأسعار
function updatePriceSummary() {
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value) || 0;
    const discount = parseFloat(document.getElementById('discountPercentage').value) || 0;
    
    const discountAmount = sellingPrice * (discount / 100);
    const finalPrice = sellingPrice - discountAmount;
    
    document.getElementById('summarySellingPrice').textContent = sellingPrice.toFixed(2);
    document.getElementById('summaryDiscount').textContent = discountAmount.toFixed(2);
    document.getElementById('summaryFinalPrice').textContent = finalPrice.toFixed(2);
}

// تحميل التصنيفات
async function loadCategories() {
    const categorySelect = document.getElementById('productCategory');
    const filterSelect = document.getElementById('categoryFilter');
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(CATEGORIES_API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('فشل في تحميل التصنيفات');
        }

        const data = await response.json();
        // استخراج التصنيفات من الاستجابة
        categories = data.content || data || [];
        updateCategorySelects();
        
    } catch (error) {
        console.error('Error loading categories:', error);
        showAlert('فشل في تحميل التصنيفات', 'error');
        // تعيين مصفوفة فارغة في حالة الخطأ
        categories = [];
        updateCategorySelects();
    }
}

// تحديث قوائم التصنيفات
function updateCategorySelects() {
    const categorySelect = document.getElementById('productCategory');
    const filterSelect = document.getElementById('categoryFilter');
    
    categorySelect.innerHTML = '<option value="">اختر التصنيف...</option>';
    filterSelect.innerHTML = '<option value="">جميع التصنيفات</option>';
    
    if (categories.length === 0) {
        const noCategoryOption = document.createElement('option');
        noCategoryOption.value = "";
        noCategoryOption.textContent = "لا توجد تصنيفات";
        noCategoryOption.disabled = true;
        categorySelect.appendChild(noCategoryOption);
        return;
    }
    
    // دالة مساعدة لمعالجة التصنيفات المتداخلة
    function processCategories(categoryList, level = 0) {
        categoryList.forEach(category => {
            const prefix = '─ '.repeat(level);
            const categoryName = category.nameAr || category.nameEn || `التصنيف ${category.id}`;
            
            const option1 = document.createElement('option');
            option1.value = category.id;
            option1.textContent = prefix + categoryName;
            categorySelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = category.id;
            option2.textContent = prefix + categoryName;
            filterSelect.appendChild(option2);
            
            // معالجة التصنيفات الفرعية بشكل متكرر
            if (category.children && category.children.length > 0) {
                processCategories(category.children, level + 1);
            }
        });
    }
    
    processCategories(categories);
}

// تحميل المنتجات
async function loadProducts(page = 0) {
    showLoadingState();
    currentPage = page;
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}?page=${page}&size=${pageSize}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('فشل في تحميل المنتجات');
        }

        const data = await response.json();
        products = data.content || [];
        totalPages = data.totalPages || 1;
        
        displayProducts();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('فشل في تحميل المنتجات', 'error');
        showEmptyState();
    }
}

// عرض المنتجات
function displayProducts() {
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');

    loadingState.classList.remove('show');
    
    if (products.length === 0) {
        gridView.innerHTML = '';
        listView.innerHTML = '';
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');
    
    // تطبيق الفلاتر
    const filteredProducts = filterProductsList(products);
    
    if (currentView === 'grid') {
        displayGridView(filteredProducts);
    } else {
        displayListView(filteredProducts);
    }
}

// عرض المنتجات في شكل grid
function displayGridView(productsToDisplay) {
    const gridView = document.getElementById('gridView');
    
    gridView.innerHTML = productsToDisplay.map(product => {
        const category = findCategoryById(product.categoryId);
        const finalPrice = calculateFinalPrice(product.sellingPrice, product.discountPercentage);
        const hasDiscount = product.discountPercentage > 0;
        
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200?text=No+Image'}" 
                         alt="${product.title}">
                    <div class="product-badges">
                        ${product.isVerified ? '<span class="product-badge verified"><i class="fas fa-check"></i> موثوق</span>' : ''}
                        ${hasDiscount ? `<span class="product-badge discount">${product.discountPercentage}%</span>` : ''}
                    </div>
                </div>
                <div class="product-content">
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-category">${getCategoryName(category)}</div>
                    
                    <div class="product-prices">
                        <span class="product-price">${finalPrice.toFixed(2)} جنية</span>
                        ${hasDiscount ? `
                            <span class="product-price original">${product.sellingPrice} جنية</span>
                        ` : ''}
                    </div>
                    
                    <div class="product-meta">
                        <span>الكمية: ${product.quantity}</span>
                        <div class="product-stats">
                            <span class="product-stat">
                                <i class="fas fa-eye"></i> ${product.viewsCounter || 0}
                            </span>
                            <span class="product-stat">
                                <i class="fas fa-search"></i> ${product.searchCounter || 0}
                            </span>
                        </div>
                    </div>
                    
                    <div class="product-actions">
                        <button class="btn btn-sm btn-info" onclick="showProductDetails(${product.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="showDeleteModal(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// عرض المنتجات في شكل list
function displayListView(productsToDisplay) {
    const tableBody = document.getElementById('productsTableBody');
    
    tableBody.innerHTML = productsToDisplay.map(product => {
        const category = findCategoryById(product.categoryId);
        const finalPrice = calculateFinalPrice(product.sellingPrice, product.discountPercentage);
        const hasDiscount = product.discountPercentage > 0;
        
        return `
            <tr>
                <td>
                    <div class="list-images">
                        ${product.images && product.images.length > 0 ? 
                            product.images.slice(0, 3).map(img => 
                                `<img src="${img}" class="list-image" alt="صورة المنتج">`
                            ).join('') : 
                            '<span style="color: #999;">لا توجد صور</span>'
                        }
                    </div>
                </td>
                <td>
                    <strong>${product.title}</strong>
                    ${product.isVerified ? '<br><small class="text-success"><i class="fas fa-check"></i> موثوق</small>' : ''}
                </td>
                <td>${getCategoryName(category)}</td>
                <td>
                    <div>
                        <strong>${finalPrice.toFixed(2)} جنية</strong>
                        ${hasDiscount ? `
                            <br>
                            <small class="text-muted" style="text-decoration: line-through;">${product.sellingPrice} جنية</small>
                            <span class="product-discount">${product.discountPercentage}%</span>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <span class="${product.quantity > 0 ? 'text-success' : 'text-danger'}">
                        ${product.quantity}
                    </span>
                </td>
                <td>
                    <div class="product-stats">
                        <span class="product-stat">
                            <i class="fas fa-eye"></i> ${product.viewsCounter || 0}
                        </span>
                        <span class="product-stat">
                            <i class="fas fa-search"></i> ${product.searchCounter || 0}
                        </span>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-info" onclick="showProductDetails(${product.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="action-btn btn-warning" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="action-btn btn-danger" onclick="showDeleteModal(${product.id})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// البحث عن التصنيف بالمعرف
function findCategoryById(categoryId) {
    function searchInCategories(categoryList) {
        for (const category of categoryList) {
            if (category.id === categoryId) {
                return category;
            }
            if (category.children && category.children.length > 0) {
                const found = searchInCategories(category.children);
                if (found) return found;
            }
        }
        return null;
    }
    
    return searchInCategories(categories);
}

// الحصول على اسم التصنيف
function getCategoryName(category) {
    if (!category) return 'غير مصنف';
    return category.nameAr || category.nameEn || `التصنيف ${category.id}`;
}

// حساب السعر النهائي
function calculateFinalPrice(sellingPrice, discountPercentage) {
    const discount = discountPercentage || 0;
    return sellingPrice - (sellingPrice * (discount / 100));
}

// تطبيق الفلاتر
function filterProducts() {
    displayProducts();
}

// تصفية قائمة المنتجات
function filterProductsList(productsList) {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    const sortFilter = document.getElementById('sortFilter').value;
    
    let filtered = productsList.filter(product => {
        const matchesCategory = !categoryFilter || product.categoryId == categoryFilter;
        const matchesSearch = !searchFilter || 
                             product.title.toLowerCase().includes(searchFilter) ||
                             (product.description && product.description.toLowerCase().includes(searchFilter));
        
        return matchesCategory && matchesSearch;
    });
    
    // التصنيف
    switch(sortFilter) {
        case 'views':
            filtered.sort((a, b) => (b.viewsCounter || 0) - (a.viewsCounter || 0));
            break;
        case 'searches':
            filtered.sort((a, b) => (b.searchCounter || 0) - (a.searchCounter || 0));
            break;
        case 'price-low':
            filtered.sort((a, b) => a.sellingPrice - b.sellingPrice);
            break;
        case 'price-high':
            filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
            break;
        case 'newest':
        default:
            filtered.sort((a, b) => b.id - a.id);
            break;
    }
    
    return filtered;
}

// تغيير طريقة العرض
function changeView(view) {
    currentView = view;
    
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const gridBtn = document.querySelector('[data-view="grid"]');
    const listBtn = document.querySelector('[data-view="list"]');
    
    if (view === 'grid') {
        gridView.style.display = 'grid';
        listView.style.display = 'none';
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        gridView.style.display = 'none';
        listView.style.display = 'block';
        gridBtn.classList.remove('active');
        listBtn.classList.add('active');
    }
    
    displayProducts();
}

// تحديث الترقيم
function updatePagination() {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // زر السابق
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} 
                onclick="loadProducts(${currentPage - 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    // أرقام الصفحات
    for (let i = 0; i < totalPages; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="loadProducts(${i})">
                ${i + 1}
            </button>
        `;
    }
    
    // زر التالي
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === totalPages - 1 ? 'disabled' : ''} 
                onclick="loadProducts(${currentPage + 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// معاينة الصور
function handleImagesPreview(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagesPreview');
    
    selectedImages = Array.from(files);
    preview.innerHTML = '';
    
    if (files.length > 0) {
        Array.from(files).forEach((file, index) => {
            if (!file.type.startsWith('image/')) {
                showAlert('الرجاء اختيار ملفات صور فقط', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showAlert('حجم الصورة يجب أن يكون أقل من 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="معاينة الصورة">
                    <button type="button" class="remove-image" onclick="removeImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
        preview.style.display = 'flex';
    } else {
        preview.style.display = 'none';
    }
}

// إزالة صورة من المعاينة
function removeImage(index) {
    selectedImages.splice(index, 1);
    handleImagesPreview({ target: { files: createFileList(selectedImages) } });
}

// إنشاء FileList من المصفوفة
function createFileList(files) {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    return dt.files;
}

// معالجة إرسال النموذج
async function handleProductSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = new FormData();
    const productDto = {
        title: document.getElementById('productTitle').value,
        description: document.getElementById('productDescription').value,
        purchasPrice: parseFloat(document.getElementById('purchasePrice').value),
        sellingPrice: parseFloat(document.getElementById('sellingPrice').value),
        discountPercentage: parseInt(document.getElementById('discountPercentage').value) || 0,
        quantity: parseInt(document.getElementById('productQuantity').value),
        color: document.getElementById('productColor').value,
        categoryId: parseInt(document.getElementById('productCategory').value),
        isVerified: document.getElementById('productVerified').checked
    };

    formData.append('product', new Blob([JSON.stringify(productDto)], {
        type: 'application/json'
    }));

    selectedImages.forEach((image, index) => {
        formData.append('images', image);
    });

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        const token = localStorage.getItem('accessToken');
        const url = isEditMode ? 
            `${API_BASE_URL}/${document.getElementById('productId').value}` : 
            API_BASE_URL;

        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'فشل في حفظ المنتج');
        }

        const result = await response.json();
        
        showAlert(
            isEditMode ? 'تم تحديث المنتج بنجاح! 🎉' : 'تم إضافة المنتج بنجاح! 🎉', 
            'success'
        );

        resetForm();
        loadProducts(currentPage);

    } catch (error) {
        console.error('Error saving product:', error);
        showAlert('فشل في حفظ المنتج: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// التحقق من صحة النموذج
function validateForm() {
    let isValid = true;
    
    const title = document.getElementById('productTitle').value;
    const category = document.getElementById('productCategory').value;
    const purchasePrice = document.getElementById('purchasePrice').value;
    const sellingPrice = document.getElementById('sellingPrice').value;
    const quantity = document.getElementById('productQuantity').value;
    
    // إعادة تعيين رسائل الخطأ
    document.querySelectorAll('.error-message').forEach(el => {
        el.classList.remove('show');
    });
    
    if (!title.trim()) {
        document.getElementById('titleError').textContent = 'اسم المنتج مطلوب';
        document.getElementById('titleError').classList.add('show');
        isValid = false;
    }
    
    if (!category) {
        document.getElementById('categoryError').textContent = 'التصنيف مطلوب';
        document.getElementById('categoryError').classList.add('show');
        isValid = false;
    }
    
    if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
        document.getElementById('purchasePriceError').textContent = 'سعر الشراء يجب أن يكون أكبر من الصفر';
        document.getElementById('purchasePriceError').classList.add('show');
        isValid = false;
    }
    
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
        document.getElementById('sellingPriceError').textContent = 'سعر البيع يجب أن يكون أكبر من الصفر';
        document.getElementById('sellingPriceError').classList.add('show');
        isValid = false;
    }
    
    if (!quantity || parseInt(quantity) < 0) {
        document.getElementById('quantityError').textContent = 'الكمية يجب أن تكون رقم صحيح موجب';
        document.getElementById('quantityError').classList.add('show');
        isValid = false;
    }
    
    if (parseFloat(sellingPrice) < parseFloat(purchasePrice)) {
        document.getElementById('sellingPriceError').textContent = 'سعر البيع يجب أن يكون أكبر من سعر الشراء';
        document.getElementById('sellingPriceError').classList.add('show');
        isValid = false;
    }
    
    return isValid;
}

// تعديل المنتج
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    isEditMode = true;
    
    document.getElementById('productId').value = product.id;
    document.getElementById('productTitle').value = product.title;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('purchasePrice').value = product.purchasPrice;
    document.getElementById('sellingPrice').value = product.sellingPrice;
    document.getElementById('discountPercentage').value = product.discountPercentage || 0;
    document.getElementById('productQuantity').value = product.quantity;
    document.getElementById('productColor').value = product.color || '';
    document.getElementById('productCategory').value = product.categoryId;
    document.getElementById('productVerified').checked = product.isVerified || false;
    
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> تحديث المنتج';
    document.getElementById('formTitle').textContent = 'تعديل المنتج';
    document.getElementById('cancelBtn').style.display = 'inline-flex';
    
    updatePriceSummary();
    
    showAlert('جاري تحرير المنتج...', 'warning');
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

// إعادة تعيين النموذج
function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagesPreview').style.display = 'none';
    document.getElementById('imagesPreview').innerHTML = '';
    selectedImages = [];
    
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> إضافة منتج';
    document.getElementById('formTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('cancelBtn').style.display = 'none';
    
    document.querySelectorAll('.error-message').forEach(el => {
        el.classList.remove('show');
    });
    
    updatePriceSummary();
    isEditMode = false;
}

// عرض تفاصيل المنتج
function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const category = findCategoryById(product.categoryId);
    const finalPrice = calculateFinalPrice(product.sellingPrice, product.discountPercentage);
    
    const content = document.getElementById('productDetailsContent');
    content.innerHTML = `
        <div class="product-details">
            <div class="details-images">
                <div class="main-image">
                    <img src="${product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400x300?text=No+Image'}" 
                         alt="${product.title}" id="mainDetailImage">
                </div>
                ${product.images && product.images.length > 1 ? `
                    <div class="thumbnails">
                        ${product.images.map((img, index) => `
                            <div class="thumbnail ${index === 0 ? 'active' : ''}" 
                                 onclick="changeDetailImage('${img}', this)">
                                <img src="${img}" alt="صورة ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="details-info">
                <h2>${product.title}</h2>
                ${product.isVerified ? '<span class="badge verified"><i class="fas fa-check"></i> منتج موثوق</span>' : ''}
                
                <div class="details-meta">
                    <div class="meta-item">
                        <span class="meta-label">التصنيف:</span>
                        <span class="meta-value">${getCategoryName(category)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">اللون:</span>
                        <span class="meta-value">${product.color || 'غير محدد'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">سعر الشراء:</span>
                        <span class="meta-value">${product.purchasPrice} جنية</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">سعر البيع:</span>
                        <span class="meta-value">${product.sellingPrice} جنية</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">نسبة الخصم:</span>
                        <span class="meta-value">${product.discountPercentage || 0}%</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">السعر النهائي:</span>
                        <span class="meta-value" style="color: #28a745; font-weight: bold;">${finalPrice.toFixed(2)} جنية</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">الكمية المتاحة:</span>
                        <span class="meta-value ${product.quantity > 0 ? 'text-success' : 'text-danger'}">
                            ${product.quantity}
                        </span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">عدد المشاهدات:</span>
                        <span class="meta-value">${product.viewsCounter || 0}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">عدد عمليات البحث:</span>
                        <span class="meta-value">${product.searchCounter || 0}</span>
                    </div>
                </div>
                
                ${product.description ? `
                    <div class="meta-item full-width">
                        <span class="meta-label">الوصف:</span>
                        <p class="meta-value">${product.description}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('detailsModal').classList.add('show');
}

// تغيير الصورة الرئيسية في التفاصيل
function changeDetailImage(src, element) {
    document.getElementById('mainDetailImage').src = src;
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    element.classList.add('active');
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('show');
}

// عرض نموذج تأكيد الحذف
function showDeleteModal(productId) {
    productToDelete = productId;
    document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
    productToDelete = null;
    document.getElementById('deleteModal').classList.remove('show');
}

// تأكيد الحذف
async function confirmDelete() {
    if (!productToDelete) return;

    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/${productToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('فشل في حذف المنتج');
        }

        showAlert('تم حذف المنتج بنجاح!', 'success');
        closeDeleteModal();
        loadProducts(currentPage);

    } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('فشل في حذف المنتج: ' + error.message, 'error');
    }
}

// عرض حالة التحميل
function showLoadingState() {
    document.getElementById('loadingState').classList.add('show');
    document.getElementById('emptyState').classList.remove('show');
}

// عرض حالة عدم وجود بيانات
function showEmptyState() {
    document.getElementById('loadingState').classList.remove('show');
    document.getElementById('emptyState').classList.add('show');
}

// عرض الرسائل
function showAlert(message, type = 'success') {
    const alert = document.getElementById('alertMessage');
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
}

// العودة للوحة التحكم
function goToDashboard() {
    window.location.href = 'index.html';
}

// إغلاق النماذج عند النقر خارج المحتوى
window.addEventListener('click', function(event) {
    const deleteModal = document.getElementById('deleteModal');
    const detailsModal = document.getElementById('detailsModal');
    
    if (event.target === deleteModal) closeDeleteModal();
    if (event.target === detailsModal) closeDetailsModal();
});

// إدارة الضغط على مفتاح ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeDeleteModal();
        closeDetailsModal();
    }
});