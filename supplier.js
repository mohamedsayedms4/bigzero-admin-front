// متغيرات عامة
let suppliers = [];
let invoices = [];
let currentSupplier = null;
let currentInvoice = null;
let itemCounter = 0;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkAuthAndInitialize();
});

// التحقق من المصادقة وتهيئة التطبيق
function checkAuthAndInitialize() {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
        // إذا كان التوكن موجود، اعرض القسم الرئيسي
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainSection').style.display = 'block';
        initializeApp();
    } else {
        // إذا لم يكن موجود، اعرض صفحة تسجيل الدخول
        document.getElementById('loginSection').style.display = 'flex';
        document.getElementById('mainSection').style.display = 'none';
        setupLoginForm();
    }
}

// إعداد نموذج تسجيل الدخول
function setupLoginForm() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const token = document.getElementById('authTokenInput').value.trim();
        
        if (token) {
            localStorage.setItem('accessToken', token);
            checkAuthAndInitialize();
            showAlert('تم تسجيل الدخول بنجاح');
        } else {
            showAlert('يرجى إدخال التوكن', 'error');
        }
    });
}

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
    const tbody = document.querySelector('#suppliersTable tbody');
    tbody.innerHTML = '';

    suppliers.forEach(supplier => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${supplier.id}</td>
            <td>${supplier.name}</td>
            <td>${supplier.phone}</td>
            <td>${formatHelper.currency(supplier.totalPaid)}</td>
            <td>${formatHelper.currency(supplier.totalWithdraw)}</td>
            <td>${formatHelper.currency(supplier.totalDue)}</td>
            <td>
                <button class="btn btn-edit" onclick="editSupplier(${supplier.id})">تعديل</button>
                <button class="btn btn-delete" onclick="deleteSupplier(${supplier.id})">حذف</button>
            </td>
        `;
    });
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
            // تحديث مورد موجود
            await supplierAPI.update(supplierId, supplierData);
            showAlert('تم تحديث المورد بنجاح');
        } else {
            // إنشاء مورد جديد
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
        
        // تحميل المنتجات
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
        
        // تعيين سعر الوحدة تلقائياً
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