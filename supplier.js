// متغيرات عامة
let suppliers = [];
let invoices = [];
let currentSupplier = null;
let currentInvoice = null;
let itemCounter = 0;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    await loadSuppliers();
    await loadInvoices();
}

// إعداد Event Listeners
function setupEventListeners() {
    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            location.reload();
        }
    });

    // التبويبات
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // زر الرجوع من تفاصيل المورد
    document.getElementById('backToSuppliersBtn').addEventListener('click', () => {
        document.getElementById('supplier-details-section').classList.remove('active');
        document.getElementById('suppliers-section').classList.add('active');
    });

    // أزرار إضافة
    document.getElementById('addSupplierBtn').addEventListener('click', openSupplierModal);
    document.getElementById('addInvoiceBtn').addEventListener('click', openInvoiceModal);

    // إغلاق المودال
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // إغلاق المودال عند الضغط خارجه
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // نماذج الإرسال
    document.getElementById('supplierForm').addEventListener('submit', handleSupplierSubmit);
    document.getElementById('invoiceForm').addEventListener('submit', handleInvoiceSubmit);

    // إضافة منتج للفاتورة
    document.getElementById('addItemBtn').addEventListener('click', addInvoiceItem);

    // فلتر الموردين
    document.getElementById('supplierFilter').addEventListener('change', filterInvoicesBySupplier);

    // حساب المتبقي عند تغيير المبلغ المدفوع
    document.getElementById('invoicePaid').addEventListener('input', calculateInvoiceRemaining);
}

// التبديل بين التبويبات
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-section`).classList.add('active');
}

// ==================== الموردين ====================

async function loadSuppliers() {
    try {
        suppliers = await supplierAPI.getAll();
        displaySuppliers();
        updateSupplierSelects();
    } catch (error) {
        showAlert('خطأ في تحميل الموردين', 'error');
        console.error(error);
    }
}

function displaySuppliers() {
    const grid = document.getElementById('suppliersGrid');
    grid.innerHTML = '';

    suppliers.forEach(supplier => {
        const card = document.createElement('div');
        card.className = 'supplier-card-simple';
        card.onclick = () => viewSupplierDetails(supplier.id);
        
        card.innerHTML = `
            <div class="supplier-name">
                <i class="fas fa-user-tie"></i>
                <h3>${supplier.name}</h3>
            </div>
            <div class="supplier-arrow">
                <i class="fas fa-chevron-left"></i>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function viewSupplierDetails(id) {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    
    const detailsContent = document.getElementById('supplierDetailsContent');
    
    detailsContent.innerHTML = `
        <div class="supplier-details-page">
            <div class="supplier-header">
                <h1>${supplier.name}</h1>
                <span class="supplier-id-badge">#${supplier.id}</span>
            </div>
            
            <div class="details-cards">
                <!-- بطاقة معلومات الاتصال -->
                <div class="detail-card">
                    <h3><i class="fas fa-address-card"></i> معلومات الاتصال</h3>
                    <div class="card-content">
                        <div class="info-row">
                            <span class="info-label">رقم الهاتف:</span>
                            <a href="tel:${supplier.phone}" class="info-value phone-link">
                                <i class="fas fa-phone"></i> ${supplier.phone}
                            </a>
                        </div>
                        
                        ${supplier.whatsappLink || supplier.telegramLink ? `
                            <div class="info-row">
                                <span class="info-label">التواصل الاجتماعي:</span>
                                <div class="social-links">
                                    ${supplier.whatsappLink ? `
                                        <a href="${supplier.whatsappLink}" target="_blank" class="social-btn whatsapp">
                                            <i class="fab fa-whatsapp"></i> واتساب
                                        </a>
                                    ` : ''}
                                    ${supplier.telegramLink ? `
                                        <a href="${supplier.telegramLink}" target="_blank" class="social-btn telegram">
                                            <i class="fab fa-telegram"></i> تليجرام
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- بطاقة المعلومات المالية -->
                <div class="detail-card">
                    <h3><i class="fas fa-money-bill-wave"></i> المعلومات المالية</h3>
                    <div class="card-content">
                        <div class="financial-grid">
                            <div class="financial-box paid">
                                <div class="financial-icon">
                                    <i class="fas fa-arrow-down"></i>
                                </div>
                                <div class="financial-info">
                                    <span class="financial-label">إجمالي المدفوع</span>
                                    <span class="financial-amount">${formatHelper.currency(supplier.totalPaid)}</span>
                                </div>
                            </div>
                            
                            <div class="financial-box withdraw">
                                <div class="financial-icon">
                                    <i class="fas fa-arrow-up"></i>
                                </div>
                                <div class="financial-info">
                                    <span class="financial-label">إجمالي المسحوب</span>
                                    <span class="financial-amount">${formatHelper.currency(supplier.totalWithdraw)}</span>
                                </div>
                            </div>
                            
                            <div class="financial-box due">
                                <div class="financial-icon">
                                    <i class="fas fa-wallet"></i>
                                </div>
                                <div class="financial-info">
                                    <span class="financial-label">المتبقي</span>
                                    <span class="financial-amount">${formatHelper.currency(supplier.totalDue)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- أزرار الإجراءات -->
            <div class="action-buttons">
                <button class="btn btn-large btn-invoices" onclick="showSupplierInvoices(${supplier.id})">
                    <i class="fas fa-file-invoice"></i> عرض الفواتير
                </button>
                <button class="btn btn-large btn-edit" onclick="editSupplier(${supplier.id})">
                    <i class="fas fa-edit"></i> تعديل البيانات
                </button>
                <button class="btn btn-large btn-delete" onclick="deleteSupplier(${supplier.id})">
                    <i class="fas fa-trash"></i> حذف المورد
                </button>
            </div>
        </div>
    `;
    
    // الانتقال لصفحة التفاصيل
    document.getElementById('suppliers-section').classList.remove('active');
    document.getElementById('supplier-details-section').classList.add('active');
    
    // التمرير للأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSupplierInvoices(supplierId) {
    // الرجوع لقائمة الموردين أولاً
    document.getElementById('supplier-details-section').classList.remove('active');
    document.getElementById('suppliers-section').classList.remove('active');
    
    // التبديل لتبويب الفواتير
    switchTab('invoices');
    
    // تعيين الفلتر للمورد
    document.getElementById('supplierFilter').value = supplierId;
    
    // تطبيق الفلتر
    filterInvoicesBySupplier();
    
    // التمرير للأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCustomModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

function openSupplierModal(supplier = null) {
    currentSupplier = supplier;
    const modal = document.getElementById('supplierModal');
    const form = document.getElementById('supplierForm');
    
    if (supplier) {
        document.getElementById('supplierModalTitle').textContent = 'تعديل مورد';
        document.getElementById('supplierId').value = supplier.id;
        document.getElementById('supplierName').value = supplier.name;
        document.getElementById('supplierPhone').value = supplier.phone;
        document.getElementById('supplierTelegram').value = supplier.telegramLink || '';
        document.getElementById('supplierWhatsapp').value = supplier.whatsappLink || '';
        document.getElementById('supplierPaid').value = supplier.totalPaid;
        document.getElementById('supplierWithdraw').value = supplier.totalWithdraw;
        document.getElementById('supplierDue').value = supplier.totalDue;
    } else {
        document.getElementById('supplierModalTitle').textContent = 'إضافة مورد جديد';
        form.reset();
        document.getElementById('supplierId').value = '';
    }
    
    modal.style.display = 'block';
}

function closeSupplierModal() {
    document.getElementById('supplierModal').style.display = 'none';
    const form = document.getElementById('supplierForm');
    form.reset();
    document.getElementById('supplierId').value = '';
    currentSupplier = null;
}

async function handleSupplierSubmit(e) {
    e.preventDefault();
    
    const supplierData = {
        name: document.getElementById('supplierName').value,
        phone: document.getElementById('supplierPhone').value,
        telegramLink: document.getElementById('supplierTelegram').value,
        whatsappLink: document.getElementById('supplierWhatsapp').value,
        totalPaid: parseFloat(document.getElementById('supplierPaid').value) || 0,
        totalWithdraw: parseFloat(document.getElementById('supplierWithdraw').value) || 0,
        totalDue: parseFloat(document.getElementById('supplierDue').value) || 0
    };

    try {
        const supplierIdInput = document.getElementById('supplierId').value;
        const supplierId = supplierIdInput && supplierIdInput !== '' ? parseInt(supplierIdInput) : null;
        
        if (supplierId) {
            await supplierAPI.update(supplierId, supplierData);
            showAlert('تم تحديث المورد بنجاح');
        } else {
            await supplierAPI.create(supplierData);
            showAlert('تم إضافة المورد بنجاح');
        }
        
        closeSupplierModal();
        await loadSuppliers();
    } catch (error) {
        showAlert('خطأ في حفظ المورد', 'error');
        console.error(error);
    }
}

async function editSupplier(id) {
    try {
        const supplier = await supplierAPI.getById(id);
        openSupplierModal(supplier);
    } catch (error) {
        showAlert('خطأ في تحميل بيانات المورد', 'error');
        console.error(error);
    }
}

async function deleteSupplier(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
    
    try {
        await supplierAPI.delete(id);
        showAlert('تم حذف المورد بنجاح');
        await loadSuppliers();
    } catch (error) {
        showAlert('خطأ في حذف المورد', 'error');
        console.error(error);
    }
}

function updateSupplierSelects() {
    const selects = [
        document.getElementById('invoiceSupplier'),
        document.getElementById('supplierFilter')
    ];

    selects.forEach(select => {
        const currentValue = select.value;
        const isFilter = select.id === 'supplierFilter';
        
        select.innerHTML = isFilter ? '<option value="">جميع الموردين</option>' : '<option value="">اختر المورد</option>';
        
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    });
}

// ==================== الفواتير ====================

async function loadInvoices() {
    try {
        invoices = await invoiceAPI.getAll();
        displayInvoices();
    } catch (error) {
        showAlert('خطأ في تحميل الفواتير', 'error');
        console.error(error);
    }
}

function displayInvoices(filteredInvoices = null) {
    const tbody = document.querySelector('#invoicesTable tbody');
    tbody.innerHTML = '';
    
    const invoicesToDisplay = filteredInvoices || invoices;

    invoicesToDisplay.forEach(invoice => {
        const row = tbody.insertRow();
        const supplierName = suppliers.find(s => s.id === invoice.supplier?.id)?.name || 'غير معروف';
        
        row.innerHTML = `
            <td>${invoice.id}</td>
            <td>${supplierName}</td>
            <td>${formatHelper.date(invoice.invoiceDate)}</td>
            <td>${formatHelper.currency(invoice.totalAmount)}</td>
            <td>${formatHelper.currency(invoice.paidAmount)}</td>
            <td>${formatHelper.currency(invoice.remainingAmount)}</td>
            <td>
                <button class="btn btn-view" onclick="viewInvoice(${invoice.id})">عرض</button>
                <button class="btn btn-edit" onclick="editInvoice(${invoice.id})">تعديل</button>
                <button class="btn btn-delete" onclick="deleteInvoice(${invoice.id})">حذف</button>
            </td>
        `;
    });
}

function openInvoiceModal(invoice = null) {
    currentInvoice = invoice;
    const modal = document.getElementById('invoiceModal');
    const form = document.getElementById('invoiceForm');
    
    if (invoice) {
        document.getElementById('invoiceModalTitle').textContent = 'تعديل فاتورة';
        document.getElementById('invoiceId').value = invoice.id;
        document.getElementById('invoiceSupplier').value = invoice.supplier?.id || '';
        document.getElementById('invoiceDate').value = formatHelper.dateInput(invoice.invoiceDate);
        document.getElementById('invoiceNotes').value = invoice.notes || '';
        document.getElementById('invoiceTotal').value = invoice.totalAmount;
        document.getElementById('invoicePaid').value = invoice.paidAmount;
        document.getElementById('invoiceRemaining').value = invoice.remainingAmount;
        
        document.getElementById('invoiceItems').innerHTML = '';
        itemCounter = 0;
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                addInvoiceItem(item);
            });
        }
    } else {
        document.getElementById('invoiceModalTitle').textContent = 'إضافة فاتورة جديدة';
        form.reset();
        document.getElementById('invoiceId').value = '';
        document.getElementById('invoiceDate').value = formatHelper.dateInput();
        document.getElementById('invoiceItems').innerHTML = '';
        itemCounter = 0;
    }
    
    modal.style.display = 'block';
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
    const form = document.getElementById('invoiceForm');
    form.reset();
    document.getElementById('invoiceId').value = '';
    document.getElementById('invoiceItems').innerHTML = '';
    itemCounter = 0;
    currentInvoice = null;
}

function addInvoiceItem(itemData = null) {
    itemCounter++;
    const itemsContainer = document.getElementById('invoiceItems');
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'invoice-item';
    itemDiv.dataset.itemId = itemCounter;
    
    itemDiv.innerHTML = `
        <div class="item-header">
            <h4>منتج ${itemCounter}</h4>
            <button type="button" class="remove-item" onclick="removeInvoiceItem(${itemCounter})">إزالة</button>
        </div>
        
        <div class="product-search">
            <input type="number" class="product-id" placeholder="أدخل رقم المنتج" 
                   value="${itemData?.productIds?.[0] || ''}" min="1">
            <button type="button" class="btn btn-search" onclick="searchProduct(${itemCounter})">بحث</button>
        </div>
        
        <div class="product-display" id="product-display-${itemCounter}"></div>
        
        <div class="form-row">
            <div class="form-group">
                <label>الكمية</label>
                <input type="number" class="item-quantity" value="${itemData?.quantity || 1}" min="1" 
                       onchange="calculateItemTotal(${itemCounter})">
            </div>
            
            <div class="form-group">
                <label>سعر الوحدة</label>
                <input type="number" class="item-price" value="${itemData?.unitPrice || 0}" step="0.01" 
                       onchange="calculateItemTotal(${itemCounter})">
            </div>
            
            <div class="form-group">
                <label>الإجمالي</label>
                <input type="number" class="item-total" value="${itemData?.totalPrice || 0}" readonly step="0.01">
            </div>
        </div>
    `;
    
    itemsContainer.appendChild(itemDiv);
    
    if (itemData?.productIds?.[0]) {
        searchProduct(itemCounter);
    }
}

function removeInvoiceItem(itemId) {
    const item = document.querySelector(`[data-item-id="${itemId}"]`);
    if (item) {
        item.remove();
        calculateInvoiceTotal();
    }
}

async function searchProduct(itemId) {
    const itemDiv = document.querySelector(`[data-item-id="${itemId}"]`);
    const productId = itemDiv.querySelector('.product-id').value;
    const displayDiv = itemDiv.querySelector(`#product-display-${itemId}`);
    
    if (!productId) {
        displayDiv.innerHTML = '';
        return;
    }
    
    try {
        const product = await productAPI.getById(productId);
        
        displayDiv.innerHTML = `
            <div class="product-info">
                <p><strong>اسم المنتج:</strong> ${product.title}</p>
                <p><strong>الوصف:</strong> ${product.description || 'لا يوجد'}</p>
                <p><strong>سعر الشراء:</strong> ${formatHelper.currency(product.purchasPrice)}</p>
                <p><strong>سعر البيع:</strong> ${formatHelper.currency(product.sellingPrice)}</p>
                <p><strong>الكمية المتاحة:</strong> ${product.quantity}</p>
                <p><strong>اللون:</strong> ${product.color || 'غير محدد'}</p>
            </div>
        `;
        
        const priceInput = itemDiv.querySelector('.item-price');
        if (priceInput.value == 0 || !priceInput.value) {
            priceInput.value = product.purchasPrice;
            calculateItemTotal(itemId);
        }
    } catch (error) {
        displayDiv.innerHTML = `
            <div class="product-not-found">
                المنتج غير موجود
            </div>
        `;
        console.error(error);
    }
}

function calculateItemTotal(itemId) {
    const itemDiv = document.querySelector(`[data-item-id="${itemId}"]`);
    const quantity = parseFloat(itemDiv.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(itemDiv.querySelector('.item-price').value) || 0;
    const total = quantity * price;
    
    itemDiv.querySelector('.item-total').value = total.toFixed(2);
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    let total = 0;
    
    document.querySelectorAll('.invoice-item').forEach(item => {
        const itemTotal = parseFloat(item.querySelector('.item-total').value) || 0;
        total += itemTotal;
    });
    
    document.getElementById('invoiceTotal').value = total.toFixed(2);
    calculateInvoiceRemaining();
}

function calculateInvoiceRemaining() {
    const total = parseFloat(document.getElementById('invoiceTotal').value) || 0;
    const paid = parseFloat(document.getElementById('invoicePaid').value) || 0;
    const remaining = total - paid;
    
    document.getElementById('invoiceRemaining').value = remaining.toFixed(2);
}

async function handleInvoiceSubmit(e) {
    e.preventDefault();
    
    const items = [];
    document.querySelectorAll('.invoice-item').forEach(item => {
        const productId = item.querySelector('.product-id').value;
        if (productId) {
            items.push({
                productIds: [parseInt(productId)],
                quantity: parseInt(item.querySelector('.item-quantity').value),
                unitPrice: parseFloat(item.querySelector('.item-price').value),
                totalPrice: parseFloat(item.querySelector('.item-total').value)
            });
        }
    });
    
    if (items.length === 0) {
        showAlert('يجب إضافة منتج واحد على الأقل', 'error');
        return;
    }
    
    const supplierId = document.getElementById('invoiceSupplier').value;
    if (!supplierId) {
        showAlert('يجب اختيار المورد', 'error');
        return;
    }
    
    const invoiceData = {
        supplier: { id: parseInt(supplierId) },
        invoiceDate: document.getElementById('invoiceDate').value,
        totalAmount: parseFloat(document.getElementById('invoiceTotal').value),
        paidAmount: parseFloat(document.getElementById('invoicePaid').value),
        remainingAmount: parseFloat(document.getElementById('invoiceRemaining').value),
        notes: document.getElementById('invoiceNotes').value,
        items: items
    };

    try {
        const invoiceIdInput = document.getElementById('invoiceId').value;
        const hasValidId = invoiceIdInput && invoiceIdInput.trim() !== '' && invoiceIdInput !== 'undefined';
        
        if (hasValidId) {
            const invoiceId = parseInt(invoiceIdInput);
            await invoiceAPI.update(invoiceId, invoiceData);
            showAlert('تم تحديث الفاتورة بنجاح');
        } else {
            await invoiceAPI.create(invoiceData);
            showAlert('تم إضافة الفاتورة بنجاح');
        }
        
        closeInvoiceModal();
        await loadInvoices();
    } catch (error) {
        showAlert('خطأ في حفظ الفاتورة', 'error');
        console.error(error);
    }
}

async function viewInvoice(id) {
    try {
        const invoice = await invoiceAPI.getById(id);
        openInvoiceModal(invoice);
    } catch (error) {
        showAlert('خطأ في تحميل الفاتورة', 'error');
        console.error(error);
    }
}

async function editInvoice(id) {
    try {
        const invoice = await invoiceAPI.getById(id);
        openInvoiceModal(invoice);
    } catch (error) {
        showAlert('خطأ في تحميل الفاتورة', 'error');
        console.error(error);
    }
}

async function deleteInvoice(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
    
    try {
        await invoiceAPI.delete(id);
        showAlert('تم حذف الفاتورة بنجاح');
        await loadInvoices();
    } catch (error) {
        showAlert('خطأ في حذف الفاتورة', 'error');
        console.error(error);
    }
}

function filterInvoicesBySupplier() {
    const supplierId = document.getElementById('supplierFilter').value;
    
    if (!supplierId) {
        displayInvoices();
        return;
    }
    
    const filtered = invoices.filter(inv => inv.supplier?.id == supplierId);
    displayInvoices(filtered);
}