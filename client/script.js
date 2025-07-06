document.addEventListener('DOMContentLoaded', function() {
    // تهيئة متغيرات الطلب
    const order = {
        items: [],
        total: 0,
        notes: '',
        table: '',
        status: 'new'
    };

    // عناصر DOM
    const hotItemsContainer = document.getElementById('hot-items');
    const coldItemsContainer = document.getElementById('cold-items');
    const tableInput = document.getElementById('table');
    const notesInput = document.getElementById('notes');
    const totalAmount = document.getElementById('total-amount');
    const submitBtn = document.getElementById('submit-order');

    // جلب القائمة من Firebase
    function loadMenu() {
        database.ref('menu').orderByChild('available').equalTo(true).on('value', (snapshot) => {
            const menuItems = snapshot.val();
            renderMenu(menuItems);
        });
    }

    // عرض القائمة
    function renderMenu(menuItems) {
        hotItemsContainer.innerHTML = '';
        coldItemsContainer.innerHTML = '';

        if (!menuItems) return;

        Object.entries(menuItems).forEach(([key, item]) => {
            if (!item.available) return;

            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item';
            itemElement.innerHTML = `
                <div class="item-name">${item.name}</div>
                <div class="item-price">${item.price} ج.م</div>
                <div class="quantity-control">
                    <button class="quantity-btn minus" data-id="${key}" data-price="${item.price}">-</button>
                    <span class="quantity" data-id="${key}">0</span>
                    <button class="quantity-btn plus" data-id="${key}" data-price="${item.price}">+</button>
                </div>
            `;

            if (item.type === 'hot') {
                hotItemsContainer.appendChild(itemElement);
            } else {
                coldItemsContainer.appendChild(itemElement);
            }
        });

        setupQuantityButtons();
    }

    // إعداد أزرار الكمية
    function setupQuantityButtons() {
        document.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                const price = parseInt(this.getAttribute('data-price'));
                const quantityElement = document.querySelector(`.quantity[data-id="${itemId}"]`);
                let quantity = parseInt(quantityElement.textContent);

                if (this.classList.contains('plus')) {
                    quantity++;
                    order.total += price;
                } else if (this.classList.contains('minus') && quantity > 0) {
                    quantity--;
                    order.total -= price;
                }

                quantityElement.textContent = quantity;
                totalAmount.textContent = order.total;

                // تحديث عناصر الطلب
                updateOrderItems(itemId, quantity, price);
            });
        });
    }

    // تحديث عناصر الطلب
    function updateOrderItems(itemId, quantity, price) {
        const existingItemIndex = order.items.findIndex(item => item.id === itemId);

        if (quantity > 0) {
            if (existingItemIndex !== -1) {
                order.items[existingItemIndex].quantity = quantity;
            } else {
                const itemName = document.querySelector(`.quantity-btn[data-id="${itemId}"]`).closest('.menu-item').querySelector('.item-name').textContent;
                order.items.push({
                    id: itemId,
                    name: itemName,
                    quantity: quantity,
                    price: price
                });
            }
        } else if (existingItemIndex !== -1) {
            order.items.splice(existingItemIndex, 1);
        }
    }

    // إرسال الطلب
    function submitOrder() {
        order.table = tableInput.value;
        order.notes = notesInput.value;
        order.timestamp = firebase.database.ServerValue.TIMESTAMP;

        if (!order.table) {
            alert('الرجاء إدخال رقم الطاولة');
            return;
        }

        if (order.items.length === 0) {
            alert('الرجاء اختيار مشروب واحد على الأقل');
            return;
        }

        database.ref('orders').push(order)
            .then(() => {
                alert(`تم إرسال الطلب للطاولة ${order.table}\nالإجمالي: ${order.total} ج.م`);
                resetOrder();
            })
            .catch(error => {
                console.error('Error submitting order:', error);
                alert('حدث خطأ أثناء إرسال الطلب، الرجاء المحاولة مرة أخرى');
            });
    }

    // إعادة تعيين الطلب
    function resetOrder() {
        order.items = [];
        order.total = 0;
        order.notes = '';
        order.table = '';

        tableInput.value = '';
        notesInput.value = '';
        totalAmount.textContent = '0';
        document.querySelectorAll('.quantity').forEach(q => q.textContent = '0');
    }

    // أحداث
    submitBtn.addEventListener('click', submitOrder);

    // تحميل القائمة عند البدء
    loadMenu();
});
