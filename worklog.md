---
Task ID: 1
Agent: Main Agent
Task: Implement product detail page, stock transfer form page, barcode scanning, and navigation improvements

Work Log:
- Updated `src/lib/store.ts` to add `selectedItemId`, `selectedTransferId`, and their setters
- Created `src/components/inventory/item-detail-page.tsx` - Full-page product detail with back navigation, product info, codes, linked records (sales/purchases/movements/adjustments), stock balances table
- Created `src/components/inventory/stock-transfer-form-page.tsx` - Full-page stock transfer form with barcode scanning support, warehouse hierarchy selection, dual mode (create/view)
- Updated `src/components/inventory/items-list.tsx` - Removed detail dialog popup, replaced with page navigation via `setSelectedItemId` + `setView('item-detail')`
- Updated `src/components/inventory/stock-transfers-list.tsx` - Create/view buttons now navigate to `stock-transfer-form` page instead of opening dialogs
- Updated `src/app/page.tsx` - Added imports for `ItemDetailPage` and `StockTransferFormPage`, added route cases for `item-detail` and `stock-transfer-form` views, added view titles

Stage Summary:
- Product click → navigates to full detail page (not popup)
- Stock transfer create/view → navigates to full form page (not popup)
- Barcode scanning in stock transfer form auto-adds items on Enter key
- Warehouse selectors show full hierarchy path (Warehouse → Zone → Rack → Shelf → Box)
- All transfers support any location type (box→box, warehouse→warehouse, etc.)
- Lint passes, dev server running successfully
