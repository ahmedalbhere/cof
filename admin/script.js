document.addEventListener('DOMContentLoaded', function() {
    // تهيئة المتغيرات
    let currentUser = null;
    let editingItemId = null;
    
    // عناصر DOM
    const ordersList = document.getElementById('orders-list');
    const hotItemsList = document.getElementById('hot-items-list');
    const coldItemsList = document.getElementById('cold-items-list');
    const orderFilter = document.getElementById('order-filter');
    const addItemBtn = document.getElementById('add-item');
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const saveEditBtn = document.getElementById('save-edit');
    const logoutBtn = document.getElementById('logout-btn');
    const adminNameSpan = document.getElementById('admin-name');
    
    // تسجيل الدخول
    function login() {
        const email = "admin@easyqafiya.com";
        const password = "admin123";
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                currentUser = userCredential.user;
                adminNameSpan.textContent = `مرحباً، ${currentUser.email}`;
                initApp();
            })
            .catch((error) => {
                console.error('Login error:', error);
                alert('حدث خطأ أثناء تسجيل الدخول: ' + error.message);
            });
    }
    
    // تسجيل الخروج
    function logout() {
        auth.signOut()
            .then(() => {
                window.location.href = '../client/index.html';
            })
            .catch((error) => {
                console.error('Logout error:', error);
            });
    }
    
    // تهيئة التطبيق بعد تسجيل الدخول
    function initApp() {
        setupEventListeners();
        loadOrders();
        loadMenu();
    }
    
    // إعداد مستمعات الأحداث
    function setupEventListeners() {
        // تغيير تبويبات الصفحة
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(this.getAttribute('data-tab')).classList.add('active');
            });
        });
        
        // تصفية الطلبات
        orderFilter.addEventListener('change', loadOrders);
        
        // إضافة صنف جديد
        addItemBtn.addEventListener('click', addNewMenuItem);
        
        // النافذة المنبثقة للتعديل
        closeModalBtn.addEventListener('click', () => editModal.style.display = 'none');
        saveEditBtn.addEventListener('click', saveMenuItemChanges);
        
        // تسجيل الخروج
        logoutBtn.addEventListener('click', logout);
        
        // إغلاق النافذة المنبثقة عند النقر خارجها
        window.addEventListener('click', (event) => {
            if (event.target === editModal) {
                editModal.style.display = 'none';
            }
        });
    }
    
    // تحميل الطلبات
    function loadOrders() {
        const filterValue = orderFilter.value;
        let ordersRef = database.ref('orders').orderByChild('timestamp');
        
        if (filterValue !== 'all') {
            ordersRef = database.ref('orders').orderByChild('status').equalTo(filterValue);
        }
        
        ordersRef.on('value', (snapshot) => {
            ordersList.innerHTML = '';
            const orders = snapshot.val();
            
            if (!orders) {
                ordersList.innerHTML = '<p class="no-orders">لا توجد طلبات</p>';
                return;
            }
            
            // عرض الطلبات من الأحدث إلى الأقدم
            Object.keys(orders).reverse().forEach(key => {
                displayOrder(key, orders[key]);
            });
        });
    }
    
    // عرض الطلب
    function displayOrder(orderId, order) {
        const orderElement = document.createElement('div');
        orderElement.className = `order-card ${order.status}`;
        orderElement.dataset.id = orderId;
        
        const orderTime = new Date(order.timestamp).toLocaleTimeString();
        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <div class="order-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>${item.price * item.quantity} ج.م</span>
                </div>
            `;
        });
        
        let actionsHtml = '';
        if (order.status === 'new') {
            actionsHtml = `
                <button class="action-btn prepare-btn">بدء التحضير</button>
                <button class="action-btn cancel-btn">إلغاء الطلب</button>
            `;
        } else if (order.status === 'preparing') {
            actionsHtml = `
                <button class="action-btn complete-btn">تم الإكمال</button>
                <button class="action-btn cancel-btn">إلغاء الطلب</button>
            `;
        }
        
        orderElement.innerHTML = `
            <div class="order-header">
                <div>
                    <span class="order-id">#${orderId.substring(0, 5)}</span>
                    <span class="order-table">طاولة ${order.table}</span>
                </div>
                <span class="order-time">${orderTime}</span>
            </div>
            <div class="order-items">
                ${itemsHtml}
            </div>
            <div class="order-notes">
                <strong>ملاحظات:</strong> ${order.notes || 'لا توجد ملاحظات'}
            </div>
            <div class="order-total">
                <strong>الإجمالي:</strong> ${order.total} ج.م
            </div>
            <div class="order-actions">
                ${actionsHtml}
            </div>
        `;
        
        ordersList.appendChild(orderElement);
        
        // إضافة الأحداث للأزرار
        const prepareBtn = orderElement.querySelector('.prepare-btn');
        const completeBtn = orderElement.querySelector('.complete-btn');
        const cancelBtn = orderElement.querySelector('.cancel-btn');
        
        if (prepareBtn) {
            prepareBtn.addEventListener('click', () => updateOrderStatus(orderId, 'preparing'));
        }
        if (completeBtn) {
            completeBtn.addEventListener('click', () => updateOrderStatus(orderId, 'completed'));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => updateOrderStatus(orderId, 'cancelled'));
        }
    }
    
    // تحديث حالة الطلب
    function updateOrderStatus(orderId, status) {
        database.ref(`orders/${orderId}/status`).set(status)
            .catch(error => {
                console.error('Error updating order:', error);
                alert('حدث خطأ أثناء تحديث حالة الطلب');
            });
    }
    
    // تحميل القائمة
    function loadMenu() {
        database.ref('menu').on('value', (snapshot) => {
            hotItemsList.innerHTML = '';
            coldItemsList.innerHTML = '';
            
            const menuItems = snapshot.val();
            if (!menuItems) return;
            
            Object.entries(menuItems).forEach(([key, item]) => {
                displayMenuItem(key, item);
            });
        });
    }
    
    // عرض عنصر القائمة
    function displayMenuItem(itemId, item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'menu-item-card';
        itemElement.dataset.id = itemId;
        
        itemElement.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${item.price} ج.م - ${item.available ? 'متاح' : 'غير متاح'}</div>
            </div>
            <div class="item-actions">
                <button class="edit-btn">تعديل</button>
                <button class="delete-btn">حذف</button>
            </div>
        `;
        
        if (item.type === 'hot') {
            hotItemsList.appendChild(itemElement);
        } else {
            coldItemsList.appendChild(itemElement);
        }
        
        // إضافة أحداث التعديل والحذف
        itemElement.querySelector('.edit-btn').addEventListener('click', () => openEditModal(itemId, item));
        itemElement.querySelector('.delete-btn').addEventListener('click', () => deleteMenuItem(itemId));
    }
    
    // فتح نافذة التعديل
    function openEditModal(itemId, item) {
        editingItemId = itemId;
        
        document.getElementById('edit-item-name').value = item.name;
        document.getElementById('edit-item-price').value = item.price;
        document.getElementById('edit-item-type').value = item.type;
        document.getElementById('edit-item-available').checked = item.available;
        
        editModal.style.display = 'flex';
    }
    
    // حفظ التعديلات على الصنف
    function saveMenuItemChanges() {
        const name = document.getElementById('edit-item-name').value;
        const price = parseInt(document.getElementById('edit-item-price').value);
        const type = document.getElementById('edit-item-type').value;
        const available = document.getElementById('edit-item-available').checked;
        
        if (!name || !price) {
            alert('الرجاء إدخال اسم الصنف والسعر');
            return;
        }
        
        database.ref(`menu/${editingItemId}`).update({
            name: name,
            price: price,
            type: type,
            available: available
        })
        .then(() => {
            editModal.style.display = 'none';
        })
        .catch(error => {
            console.error('Error updating menu item:', error);
            alert('حدث خطأ أثناء حفظ التعديلات');
        });
    }
    
    // حذف صنف من القائمة
    function deleteMenuItem(itemId) {
        if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
            database.ref(`menu/${itemId}`).remove()
                .catch(error => {
                    console.error('Error deleting menu item:', error);
                    alert('حدث خطأ أثناء حذف الصنف');
                });
        }
    }
    
    // إضافة صنف جديد
    function addNewMenuItem() {
        const name = document.getElementById('item-name').value;
        const price = parseInt(document.getElementById('item-price').value);
        const type = document.getElementById('item-type').value;
        const available = document.getElementById('item-available').checked;
        
        if (!name || !price) {
            alert('الرجاء إدخال اسم الصنف والسعر');
            return;
        }
        
        database.ref('menu').push({
            name: name,
            price: price,
            type: type,
            available: available
        })
        .then(() => {
            // مسح حقول النموذج بعد الإضافة
            document.getElementById('item-name').value = '';
            document.getElementById('item-price').value = '';
            document.getElementById('item-type').value = 'hot';
            document.getElementById('item-available').checked = true;
        })
        .catch(error => {
            console.error('Error adding menu item:', error);
            alert('حدث خطأ أثناء إضافة الصنف');
        });
    }
    
    // بدء التطبيق بتسجيل الدخول
    login();
});
