-- فهارس مسارات الويتر/الكاشير الساخنة

-- categories
CREATE INDEX "categories_isActive_sortOrder_idx" ON "categories"("isActive", "sortOrder");

-- menu_items
CREATE INDEX "menu_items_isActive_isAvailable_categoryId_idx" ON "menu_items"("isActive", "isAvailable", "categoryId");

-- tables
CREATE INDEX "tables_isActive_sortOrder_idx" ON "tables"("isActive", "sortOrder");

-- shifts (findOpenShift)
CREATE INDEX "shifts_closedAt_idx" ON "shifts"("closedAt");

-- bills
CREATE INDEX "bills_status_openedAt_idx" ON "bills"("status", "openedAt");

-- orders
CREATE INDEX "orders_status_servedAt_idx" ON "orders"("status", "servedAt");
CREATE INDEX "orders_businessDate_status_idx" ON "orders"("businessDate", "status");
CREATE INDEX "orders_billId_status_idx" ON "orders"("billId", "status");
CREATE INDEX "orders_createdById_status_idx" ON "orders"("createdById", "status");
CREATE INDEX "orders_tableId_status_idx" ON "orders"("tableId", "status");

-- order_items: (orderId, status) يغطي lookups على orderId أيضاً
CREATE INDEX "order_items_orderId_status_idx" ON "order_items"("orderId", "status");
DROP INDEX IF EXISTS "order_items_orderId_idx";

-- payments
CREATE INDEX "payments_billId_idx" ON "payments"("billId");
CREATE INDEX "payments_shiftId_idx" ON "payments"("shiftId");
