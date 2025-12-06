export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user"
  lastLogin?: string
  createdAt: string
}

export interface Supplier {
  id: string
  companyName: string
  contactPerson: string
  phone: string
  address: string
  paymentTerms?: string
  deliveryTerms?: string
  notes?: string
  createdAt: string
}

export interface Customer {
  id: string
  companyName: string
  contactPerson: string
  phone: string
  deliveryAddress: string
  billingAddress?: string
  deliveryTimePreference?: string
  specialRequests?: string
  specialNotes?: string
  createdAt: string
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
  categoryInfo?: string
  storageMethod?: string
  displayOrder: number
}

export interface Purchase {
  id: string
  date: string
  productName: string
  categoryId: string
  quantity: number
  unit: string
  unitNotes?: string
  price: number
  taxType: "included" | "excluded"
  supplierId: string
  status: "unused" | "partial" | "used"
  remainingQuantity: number
  expiryDate?: string
  deliveryNotes?: string
  createdAt: string
}

export interface DeliveryItem {
  purchaseId: string
  productName: string
  quantity: number
  unit: string
  price: number
  profit: number
}

export type DeliveryStatus = "pending" | "slip_issued" | "invoice_ready"
export type InvoiceStatus = "draft" | "issued"

export interface Delivery {
  id: string
  date: string
  customerId: string
  items: DeliveryItem[]
  totalAmount: number
  totalProfit: number
  status: DeliveryStatus // boolean値から明確なステータスに変更
  freeeDeliverySlipId?: string // freee連携用ID追加
  createdAt: string
}

export interface Invoice {
  id: string
  month: string
  customerId: string
  deliveries: string[]
  totalAmount: number
  generatedAt: string
  status: InvoiceStatus // "paid"ステータスを削除、freee連携想定
  freeeInvoiceId?: string // freee連携用ID追加
}

export interface DashboardStats {
  monthlyPurchaseAmount: number
  monthlyDeliveryAmount: number
  monthlyProfit: number
  totalInventoryValue: number
  totalInventoryItems: number
  unlinkedDeliveriesCount?: number // 仕入れ未紐付け納品件数
}
