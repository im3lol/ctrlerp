import { create } from 'zustand'

export type Module = 'dashboard' | 'settings' | 'inventory' | 'accounting' | 'sales' | 'purchases' | 'reports' | 'investors'
type SettingsView = 'company' | 'currencies' | 'uom' | 'users' | 'chart-of-accounts'
type InventoryView = 'warehouses' | 'items' | 'categories' | 'stock-movements' | 'item-balances'
type AccountingView = 'journal-entries' | 'chart-of-accounts'
type SalesView = 'customers' | 'sales-invoices' | 'receipt-vouchers'
type PurchasesView = 'suppliers' | 'purchase-invoices' | 'payment-vouchers'
type ReportsView = 'trial-balance' | 'balance-sheet' | 'income-statement' | 'inventory-report' | 'sales-report' | 'purchase-report' | 'customer-aging' | 'supplier-aging'
type InvestorsView = 'investors-list'

export interface UserInfo {
  id: string
  name: string
  username: string
  role: string
  email?: string
}

export interface CompanyInfo {
  id: string
  nameAr: string
  nameEn?: string
  logo?: string | null
  vatRate?: number
  role?: string
}

interface AppState {
  currentModule: Module
  currentView: string
  sidebarOpen: boolean
  // Auth & company
  user: UserInfo | null
  currentCompanyId: string | null
  companies: CompanyInfo[]
  isAuthenticated: boolean
  // Navigation actions
  setModule: (module: Module) => void
  setView: (view: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  // Auth & company actions
  setUser: (user: UserInfo) => void
  setCurrentCompany: (id: string) => void
  setCompanies: (companies: CompanyInfo[]) => void
  addCompany: (company: CompanyInfo) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'dashboard',
  currentView: '',
  sidebarOpen: true,
  // Auth & company
  user: null,
  currentCompanyId: null,
  companies: [],
  isAuthenticated: false,
  // Navigation actions
  setModule: (module) => set({ currentModule: module, currentView: '' }),
  setView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  // Auth & company actions
  setUser: (user) => set({ user, isAuthenticated: true }),
  setCurrentCompany: (id) => set({ currentCompanyId: id }),
  setCompanies: (companies) => set({ companies }),
  addCompany: (company) => set((state) => ({ companies: [...state.companies, company] })),
  logout: () => set({ user: null, currentCompanyId: null, companies: [], isAuthenticated: false }),
}))
