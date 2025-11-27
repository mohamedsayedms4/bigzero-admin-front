// تكوين API
const API_BASE_URL = 'https://api-spring.bigzero.online/api/v1/categories';

// المتغيرات العامة
let categories = [];
let categoryToDelete = null;
let isEditMode = false;
let isTreeView = false;

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadCategories();
    loadParentCategories();
    setupEventListeners();
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
    const form = document.getElementById('categoryForm');
    form.addEventListener('submit', handleCategorySubmit);

    const imageInput = document.getElementById('categoryImage');
    imageInput.addEventListener('change', handleImagePreview);

    const levelSelect = document.getElementById('categoryLevel');
    levelSelect.addEventListener('change', updateParentCategories);

    const nameEnInput = document.getElementById('categoryNameEn');
    nameEnInput.addEventListener('blur', generateCustomId);
}

// تحميل التصنيفات الرئيسية من الـ API
async function loadParentCategories() {
    const parentSelect = document.getElementById('parentCategory');
    
    try {
        parentSelect.innerHTML = '<option value="">جاري تحميل التصنيفات...</option>';
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(API_BASE_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return loadParentCategories();
            } else {
                throw new Error('انتهت صلاحية الجلسة');
            }
        }

        if (!response.ok) {
            throw new Error('فشل في تحميل التصنيفات');
        }

        const allCategories = await response.json();
        updateParentSelect(allCategories);
        
    } catch (error) {
        console.error('Error loading parent categories:', error);
        parentSelect.innerHTML = '<option value="">فشل في تحميل التصنيفات</option>';
        showAlert('فشل في تحميل قائمة التصنيفات الرئيسية', 'error');
    }
}

// تحديث القائمة المنسدلة للتصنيفات الرئيسية
function updateParentSelect(allCategories) {
    const parentSelect = document.getElementById('parentCategory');
    
    parentSelect.innerHTML = '<option value="">بدون تصنيف رئيسي</option>';
    
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.nameAr} (${category.nameEn}) - مستوى ${category.level || 0}`;
        parentSelect.appendChild(option);
    });
    
    if (isEditMode) {
        updateParentCategories();
    }
}

// تحميل جميع التصنيفات للعرض
async function loadCategories() {
    showLoadingState();
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(API_BASE_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return loadCategories();
            } else {
                throw new Error('انتهت صلاحية الجلسة');
            }
        }

        if (!response.ok) {
            throw new Error('فشل في تحميل التصنيفات');
        }

        categories = await response.json();
        displayCategories();
        updateParentSelect(categories);
        
    } catch (error) {
        console.error('Error loading categories:', error);
        showAlert('فشل في تحميل التصنيفات: ' + error.message, 'error');
        showEmptyState();
    }
}

// تحديث قائمة التصنيفات الرئيسية بناءً على المستوى المحدد
function updateParentCategories() {
    const levelSelect = document.getElementById('categoryLevel');
    const parentSelect = document.getElementById('parentCategory');
    const selectedLevel = parseInt(levelSelect.value) || 0;
    
    if (selectedLevel === 0) {
        parentSelect.value = '';
        parentSelect.disabled = true;
    } else {
        parentSelect.disabled = false;
        
        const options = parentSelect.options;
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value) {
                const category = categories.find(c => c.id === parseInt(option.value));
                if (category && category.level >= selectedLevel) {
                    option.style.display = 'none';
                    option.disabled = true;
                } else {
                    option.style.display = '';
                    option.disabled = false;
                }
            }
        }
    }
}

// عرض التصنيفات في الجدول
function displayCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');

    loadingState.classList.remove('show');
    
    if (categories.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');
    
    tbody.innerHTML = categories.map(category => `
        <tr>
            <td>
                ${category.imageUrl ? 
                    `<img src="${category.imageUrl}" alt="${category.nameAr}" class="category-icon">` :
                    `<div class="no-icon"><i class="fas fa-tag"></i></div>`
                }
            </td>
            <td>
                <strong>${category.nameAr}</strong>
            </td>
            <td>
                <span style="font-family: Arial, sans-serif;">${category.nameEn}</span>
            </td>
            <td>
                ${category.categoryId ? `<code>${category.categoryId}</code>` : '<span style="color: #999;">-</span>'}
            </td>
            <td>
                <span class="badge level-${category.level || 0}">مستوى ${category.level || 0}</span>
            </td>
            <td>
                ${getParentCategoryName(category.parentId) || '<span style="color: #999;">-</span>'}
            </td>
            <td>
                ${category.children && category.children.length > 0 ? 
                    `<button class="btn btn-sm btn-info" onclick="showChildrenModal(${category.id})">
                        <i class="fas fa-eye"></i> ${category.children.length}
                    </button>` : 
                    '<span style="color: #999;">-</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-warning" onclick="editCategory(${category.id})">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="action-btn btn-danger" onclick="showDeleteModal(${category.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (isTreeView) {
        displayCategoryTree();
    }
}

// عرض الشجرة الهيكلية
function displayCategoryTree() {
    const treeContainer = document.getElementById('categoryTree');
    treeContainer.innerHTML = buildTreeHTML(categories);
}

// بناء HTML للشجرة
function buildTreeHTML(categories, parentId = null, level = 0) {
    const children = categories.filter(cat => cat.parentId === parentId);
    if (children.length === 0) return '';

    let html = '<ul class="tree">';
    children.forEach(category => {
        const hasChildren = categories.some(cat => cat.parentId === category.id);
        html += `
            <li class="tree-item level-${level}">
                <div class="tree-node">
                    <span class="tree-toggle ${hasChildren ? 'has-children' : ''}" 
                          onclick="toggleTreeItem(this)">
                        <i class="fas fa-chevron-down"></i>
                    </span>
                    ${category.imageUrl ? 
                        `<img src="${category.imageUrl}" alt="${category.nameAr}" class="tree-icon">` :
                        `<div class="no-icon tree-icon"><i class="fas fa-tag"></i></div>`
                    }
                    <span class="tree-content">
                        <strong>${category.nameAr}</strong>
                        <small>(${category.nameEn})</small>
                        ${category.categoryId ? `<code>${category.categoryId}</code>` : ''}
                    </span>
                    <div class="tree-actions">
                        <button class="btn btn-sm btn-warning" onclick="editCategory(${category.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="showDeleteModal(${category.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${hasChildren ? buildTreeHTML(categories, category.id, level + 1) : ''}
            </li>
        `;
    });
    html += '</ul>';
    return html;
}

// تبديل عرض الشجرة/الجدول
function toggleViewMode() {
    isTreeView = !isTreeView;
    const treeView = document.getElementById('treeView');
    const tableView = document.getElementById('tableView');
    const viewModeBtn = document.getElementById('viewModeBtn');

    if (isTreeView) {
        treeView.style.display = 'block';
        tableView.style.display = 'none';
        viewModeBtn.innerHTML = '<i class="fas fa-table"></i> عرض الجدول';
        displayCategoryTree();
    } else {
        treeView.style.display = 'none';
        tableView.style.display = 'block';
        viewModeBtn.innerHTML = '<i class="fas fa-sitemap"></i> عرض الشجرة';
    }
}

// تبديل عناصر الشجرة
function toggleTreeItem(element) {
    const li = element.closest('.tree-item');
    const children = li.querySelector('ul');
    if (children) {
        children.classList.toggle('collapsed');
        const icon = element.querySelector('i');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-right');
    }
}

// الحصول على اسم التصنيف الرئيسي
function getParentCategoryName(parentId) {
    if (!parentId) return null;
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.nameAr : null;
}

// توليد معرف مخصص تلقائياً
function generateCustomId() {
    const nameEn = document.getElementById('categoryNameEn').value;
    const customIdInput = document.getElementById('categoryCustomId');
    
    if (nameEn && !customIdInput.value) {
        const customId = nameEn
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        customIdInput.value = customId;
    }
}

// معالجة إرسال النموذج
async function handleCategorySubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = new FormData();
    const categoryDto = {
        nameAr: document.getElementById('categoryNameAr').value,
        nameEn: document.getElementById('categoryNameEn').value,
        categoryId: document.getElementById('categoryCustomId').value || null,
        parentId: document.getElementById('parentCategory').value ? 
                  parseInt(document.getElementById('parentCategory').value) : null,
        level: parseInt(document.getElementById('categoryLevel').value) || 0
    };

    formData.append('category', new Blob([JSON.stringify(categoryDto)], {
        type: 'application/json'
    }));

    const imageFile = document.getElementById('categoryImage').files[0];
    if (imageFile) {
        formData.append('icon', imageFile);
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        const token = localStorage.getItem('accessToken');
        const url = isEditMode ? 
            `${API_BASE_URL}/${document.getElementById('categoryId').value}` : 
            API_BASE_URL;

        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return handleCategorySubmit(event);
            } else {
                throw new Error('انتهت صلاحية الجلسة');
            }
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'فشل في حفظ التصنيف');
        }

        const result = await response.json();
        
        showAlert(
            isEditMode ? 'تم تحديث التصنيف بنجاح! 🎉' : 'تم إضافة التصنيف بنجاح! 🎉', 
            'success'
        );

        resetForm();
        loadCategories();
        loadParentCategories();

    } catch (error) {
        console.error('Error saving category:', error);
        showAlert('فشل في حفظ التصنيف: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// التحقق من صحة النموذج
function validateForm() {
    let isValid = true;
    
    const nameAr = document.getElementById('categoryNameAr').value;
    const nameEn = document.getElementById('categoryNameEn').value;
    const level = parseInt(document.getElementById('categoryLevel').value) || 0;
    const parentId = document.getElementById('parentCategory').value;
    
    document.getElementById('nameArError').classList.remove('show');
    document.getElementById('nameEnError').classList.remove('show');
    
    if (!nameAr.trim()) {
        document.getElementById('nameArError').textContent = 'اسم التصنيف بالعربية مطلوب';
        document.getElementById('nameArError').classList.add('show');
        isValid = false;
    }
    
    if (!nameEn.trim()) {
        document.getElementById('nameEnError').textContent = 'اسم التصنيف بالإنجليزية مطلوب';
        document.getElementById('nameEnError').classList.add('show');
        isValid = false;
    }
    
    if (level === 0 && parentId) {
        showAlert('التصنيفات الرئيسية (مستوى 0) لا يمكن أن يكون لها تصنيف رئيسي', 'error');
        isValid = false;
    }
    
    if (level > 0 && !parentId) {
        showAlert('التصنيفات الفرعية يجب أن يكون لها تصنيف رئيسي', 'error');
        isValid = false;
    }
    
    return isValid;
}

// تعديل التصنيف
function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    isEditMode = true;
    
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryNameAr').value = category.nameAr || '';
    document.getElementById('categoryNameEn').value = category.nameEn || '';
    document.getElementById('categoryCustomId').value = category.categoryId || '';
    document.getElementById('parentCategory').value = category.parentId || '';
    document.getElementById('categoryLevel').value = category.level || 0;
    
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> تحديث التصنيف';
    document.getElementById('formTitle').textContent = 'تعديل التصنيف';
    document.getElementById('cancelBtn').style.display = 'inline-flex';
    
    updateParentCategories();
    
    const imagePreview = document.getElementById('imagePreview');
    if (category.imageUrl) {
        imagePreview.innerHTML = `<img src="${category.imageUrl}" alt="${category.nameAr}">`;
        imagePreview.style.display = 'block';
    }
    
    showAlert('جاري تحرير التصنيف...', 'warning');
    document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
}

// إعادة تعيين النموذج
function resetForm() {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imagePreview').innerHTML = '';
    
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-plus"></i> إضافة تصنيف';
    document.getElementById('formTitle').textContent = 'إضافة تصنيف جديد';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('parentCategory').disabled = false;
    
    document.getElementById('nameArError').classList.remove('show');
    document.getElementById('nameEnError').classList.remove('show');
    
    isEditMode = false;
}

// معاينة الصورة
function handleImagePreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        if (!file.type.startsWith('image/')) {
            showAlert('الرجاء اختيار ملف صورة فقط', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showAlert('حجم الصورة يجب أن يكون أقل من 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة">`;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

// عرض التصنيفات الفرعية في modal
function showChildrenModal(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category || !category.children || category.children.length === 0) return;

    const content = document.getElementById('childrenListContent');
    content.innerHTML = category.children.map(child => `
        <div class="child-modal-item">
            <div class="child-info">
                <strong>${child.nameAr}</strong>
                <span>${child.nameEn}</span>
                <span class="badge level-${child.level}">مستوى ${child.level}</span>
            </div>
            <div class="child-actions">
                <button class="btn btn-sm btn-warning" onclick="editCategory(${child.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `).join('');

    document.getElementById('childrenModal').classList.add('show');
}

function closeChildrenModal() {
    document.getElementById('childrenModal').classList.remove('show');
}

// عرض نموذج تأكيد الحذف
function showDeleteModal(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    categoryToDelete = categoryId;
    
    const warningText = document.getElementById('deleteWarningText');
    if (category.children && category.children.length > 0) {
        warningText.innerHTML = `هذا التصنيف يحتوي على ${category.children.length} تصنيف فرعي. الحذف سيؤدي إلى حذف جميع التصنيفات الفرعية أيضاً!`;
    } else {
        warningText.innerHTML = 'هذا الإجراء لا يمكن التراجع عنه!';
    }
    
    document.getElementById('deleteModal').classList.add('show');
}

// إغلاق نموذج التأكيد
function closeDeleteModal() {
    categoryToDelete = null;
    document.getElementById('deleteModal').classList.remove('show');
}

// تأكيد الحذف
async function confirmDelete() {
    if (!categoryToDelete) return;

    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/${categoryToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return confirmDelete();
            } else {
                throw new Error('انتهت صلاحية الجلسة');
            }
        }

        if (!response.ok) {
            throw new Error('فشل في حذف التصنيف');
        }

        showAlert('تم حذف التصنيف بنجاح!', 'success');
        closeDeleteModal();
        loadCategories();
        loadParentCategories();

    } catch (error) {
        console.error('Error deleting category:', error);
        showAlert('فشل في حذف التصنيف: ' + error.message, 'error');
    }
}

// تجديد التوكن
async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
        const response = await fetch('https://api-spring.bigzero.online/api/v1/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) return false;

        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;

    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
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
    const childrenModal = document.getElementById('childrenModal');
    
    if (event.target === deleteModal) closeDeleteModal();
    if (event.target === childrenModal) closeChildrenModal();
});

// إدارة الضغط على مفتاح ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeDeleteModal();
        closeChildrenModal();
    }
});