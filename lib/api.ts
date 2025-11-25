const API_BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface ProductPrefix {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Purchase {
  id: string
  productName: string
  productPrefixId?: string
  categoryId: string
  quantity: number
  unit: string
  unitNote?: string
  unitPrice: number
  price: number
  taxType: string
  supplierId: string
  purchaseDate: string
  expiryDate?: string
  deliveryFee?: string
  status: string
  remainingQuantity: number
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
  }
  supplier: {
    id: string
    companyName: string
    contactPerson: string
  }
  productPrefix?: {
    id: string
    name: string
  }
}

export interface PurchasesResponse {
  purchases: Purchase[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Category {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  companyName: string
  contactPerson: string
  phone: string
  address: string
  paymentTerms: string
  deliveryConditions: string
  specialNotes?: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  companyName: string
  contactPerson: string
  phone: string
  deliveryAddress: string
  billingAddress: string
  deliveryTimePreference?: string
  specialRequests?: string
  specialNotes?: string
  billingCycle: string
  billingDay: number
  paymentTerms: string
  invoiceRegistrationNumber?: string
  invoiceNotes?: string
  billingCustomerId?: string | null
  billingCustomer?: Customer | null
  createdAt: string
  updatedAt: string
}

export interface DeliveryItem {
  id: string
  deliveryId: string
  purchaseId: string
  quantity: number
  unitPrice: number
  amount: number
  purchase: Purchase
}

export interface Delivery {
  id: string
  customerId: string
  deliveryDate: string
  totalAmount: number
  status: string
  freeeDeliverySlipId?: string
  freeeInvoiceId?: string
  googleSheetId?: string
  googleSheetUrl?: string
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    companyName: string
    contactPerson: string
    phone: string
    deliveryAddress: string
  }
  items: DeliveryItem[]
}

export interface DeliveriesResponse {
  deliveries: Delivery[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Invoice {
  id: string
  customerId: string
  invoiceDate: string
  month: number
  year: number
  totalAmount: number
  status: string
  freeeInvoiceId?: string
  googleSheetId?: string
  googleSheetUrl?: string
  deliveryIds: string
  createdAt: string
  updatedAt: string
}

export interface GoogleSheetTemplate {
  id: string
  name: string
  type: string // 'delivery' or 'invoice'
  templateSheetId: string
  createdAt: string
  updatedAt: string
}

class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
      console.log('🔧 API Client initialized:', { 
        hasToken: !!this.token, 
        tokenLength: this.token?.length,
        tokenPrefix: this.token?.substring(0, 20)
      })
    } else {
      console.log('🔧 API Client initialized on server side (no token)')
    }
  }

  setToken(token: string) {
    console.log('🔐 Setting API token:', { 
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20)
    })
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
      console.log('✅ Token stored in localStorage')
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // ALWAYS check localStorage on client side for fresh token
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken && storedToken !== this.token) {
        console.log('🔄 Refreshing token from localStorage:', { 
          tokenLength: storedToken?.length,
          tokenPrefix: storedToken?.substring(0, 20)
        })
        this.token = storedToken
      }
      if (!storedToken && this.token) {
        console.log('🚫 Token removed from localStorage, clearing client token')
        this.token = null
      }
      if (!storedToken) {
        console.log('⚠️ No token found in localStorage')
      }
    }
    
    const url = `${API_BASE_URL}/api${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
      console.log('🔑 API Request with token:', { url, hasToken: !!this.token })
    } else {
      console.log('⚠️ API Request without token:', { url, hasToken: false })
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ API Request failed:', { url, status: response.status, error: data.error })
        return { error: data.error || 'An error occurred' }
      }

      console.log('✅ API Request success:', { url, status: response.status })
      return { data }
    } catch (error) {
      console.error('API request error:', error)
      return { error: 'Network error occurred' }
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/me')
  }

  // Purchase methods
  async getPurchases(params: {
    page?: number
    limit?: number
    category?: string
    supplier?: string
    month?: string
    status?: string
    search?: string
  } = {}): Promise<ApiResponse<PurchasesResponse>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `/purchases${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<PurchasesResponse>(endpoint)
  }

  async getPurchase(id: string): Promise<ApiResponse<Purchase>> {
    return this.request<Purchase>(`/purchases/${id}`)
  }

  async createPurchase(data: {
    productName: string
    productPrefixId?: string
    categoryId: string
    quantity: number
    unit: string
    unitNote?: string
    unitPrice: number
    price: number
    taxType?: string
    supplierId: string
    purchaseDate: string
    expiryDate?: string
    deliveryFee?: string
  }): Promise<ApiResponse<Purchase>> {
    return this.request<Purchase>('/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePurchase(id: string, data: Partial<{
    productName: string
    categoryId: string
    quantity: number
    unit: string
    unitNote?: string
    price: number
    taxType: string
    supplierId: string
    purchaseDate: string
    expiryDate?: string
    deliveryFee?: string
    status: string
  }>): Promise<ApiResponse<Purchase>> {
    return this.request<Purchase>(`/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePurchase(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/purchases/${id}`, {
      method: 'DELETE',
    })
  }

  // Category methods
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>('/categories')
  }

  async createCategory(data: { name: string }): Promise<ApiResponse<Category>> {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCategory(id: string, data: { name: string }): Promise<ApiResponse<Category>> {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCategory(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/categories/${id}`, {
      method: 'DELETE',
    })
  }

  // Product Prefix endpoints
  async getProductPrefixes(): Promise<ApiResponse<ProductPrefix[]>> {
    return this.request<ProductPrefix[]>('/product-prefixes')
  }

  async createProductPrefix(data: { name: string }): Promise<ApiResponse<ProductPrefix>> {
    return this.request<ProductPrefix>('/product-prefixes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProductPrefix(id: string, data: { name: string }): Promise<ApiResponse<ProductPrefix>> {
    return this.request<ProductPrefix>(`/product-prefixes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProductPrefix(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/product-prefixes/${id}`, {
      method: 'DELETE',
    })
  }

  // Supplier methods
  async getSuppliers(): Promise<ApiResponse<Supplier[]>> {
    return this.request<Supplier[]>('/suppliers')
  }

  async createSupplier(data: {
    companyName: string
    contactPerson: string
    phone: string
    address: string
    paymentTerms: string
    deliveryConditions: string
    specialNotes?: string
  }): Promise<ApiResponse<Supplier>> {
    return this.request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSupplier(id: string, data: {
    companyName: string
    contactPerson: string
    phone: string
    address: string
    paymentTerms: string
    deliveryConditions: string
    specialNotes?: string
  }): Promise<ApiResponse<Supplier>> {
    return this.request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteSupplier(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/suppliers/${id}`, {
      method: 'DELETE',
    })
  }

  // Customer methods
  async getCustomers(): Promise<ApiResponse<Customer[]>> {
    return this.request<Customer[]>('/customers')
  }

  async createCustomer(data: {
    companyName: string
    contactPerson: string
    phone: string
    deliveryAddress: string
    billingAddress: string
    deliveryTimePreference?: string
    specialRequests?: string
    specialNotes?: string
    billingCycle?: string
    billingDay?: number
    paymentTerms?: string
  }): Promise<ApiResponse<Customer>> {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCustomer(id: string, data: {
    companyName: string
    contactPerson: string
    phone: string
    deliveryAddress: string
    billingAddress: string
    deliveryTimePreference?: string
    specialRequests?: string
    specialNotes?: string
    billingCycle?: string
    billingDay?: number
    paymentTerms?: string
  }): Promise<ApiResponse<Customer>> {
    return this.request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    })
  }

  // Available purchases (stock) methods
  async getAvailablePurchases(params: {
    search?: string
  } = {}): Promise<ApiResponse<Purchase[]>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `/purchases/available${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<Purchase[]>(endpoint)
  }

  // Delivery methods
  async getDeliveries(params: {
    page?: number
    limit?: number
    customer?: string
    month?: string
    status?: string
    search?: string
  } = {}): Promise<ApiResponse<DeliveriesResponse>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `/deliveries${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<DeliveriesResponse>(endpoint)
  }

  async getDelivery(id: string): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/deliveries/${id}`)
  }

  async createDelivery(data: {
    customerId: string
    deliveryDate: string
    items: Array<{
      purchaseId: string
      quantity: number
      unitPrice: number
    }>
  }): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>('/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDelivery(id: string, data: Partial<{
    customerId: string
    deliveryDate: string
    status: string
    items: Array<{
      purchaseId: string
      quantity: number
      unitPrice: number
    }>
  }>): Promise<ApiResponse<Delivery>> {
    return this.request<Delivery>(`/deliveries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteDelivery(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/deliveries/${id}`, {
      method: 'DELETE',
    })
  }

  // freee API methods
  async syncFreeePartners(): Promise<ApiResponse<any>> {
    return this.request('/freee/sync-partners', {
      method: 'POST'
    })
  }

  async createFreeeInvoice(data: {
    deliveryIds: string[]
    customerId?: string
    issueDate?: string
    dueDate?: string
  }): Promise<ApiResponse<any>> {
    return this.request('/freee/create-invoice', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createFreeeDeliverySlip(data: {
    deliveryId: string
    issueDate?: string
    description?: string
  }): Promise<ApiResponse<any>> {
    return this.request('/freee/create-delivery-slip', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getFreeeInvoices(params: {
    start_date?: string
    end_date?: string
    partner_id?: string
    partner_code?: string
    invoice_status?: string
    payment_status?: string
  } = {}): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `/freee/invoices${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request(endpoint)
  }

  // Dashboard methods
  async getDashboardStats(): Promise<ApiResponse<{
    monthlyPurchaseAmount: number
    monthlyDeliveryAmount: number
    monthlyProfit: number
    totalInventoryValue: number
    totalInventoryItems: number
    period: {
      year: number
      month: number
      start: string
      end: string
    }
  }>> {
    return this.request('/dashboard/stats')
  }

  async getDashboardActivities(limit?: number): Promise<ApiResponse<{
    activities: Array<{
      id: string
      type: 'purchase' | 'delivery' | 'invoice'
      description: string
      amount?: number
      timestamp: string
      status: 'success' | 'pending' | 'error'
      relatedId?: string
    }>
    counts: {
      purchases: number
      deliveries: number
      invoices: number
      total: number
    }
  }>> {
    const endpoint = `/dashboard/activities${limit ? `?limit=${limit}` : ''}`
    return this.request(endpoint)
  }

  // Inventory methods
  async getInventory(params: {
    search?: string
    category?: string
    status?: string
  } = {}): Promise<ApiResponse<{
    items: Array<{
      id: string
      productName: string
      category: string
      quantity: number
      unit: string
      unitNote?: string
      purchasePrice: number
      totalValue: number
      purchaseDate: string
      supplier: string
      status: string
      expiryDate?: string
    }>
    stats: {
      totalItems: number
      totalValue: number
      warningItems: number
    }
  }>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `/inventory${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request(endpoint)
  }

  // Google Sheets API methods
  async getGoogleSheetTemplates(): Promise<ApiResponse<GoogleSheetTemplate[]>> {
    return this.request<GoogleSheetTemplate[]>('/google-sheets/templates')
  }

  async createGoogleSheetTemplate(data: {
    name: string
    type: 'delivery' | 'invoice'
    templateSheetId: string
  }): Promise<ApiResponse<GoogleSheetTemplate>> {
    return this.request<GoogleSheetTemplate>('/google-sheets/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createGoogleSheetsDelivery(data: {
    deliveryId: string
    templateId: string
  }): Promise<ApiResponse<{
    success: boolean
    sheetId: string
    url: string
    pdfUrl: string
  }>> {
    return this.request('/google-sheets/create-delivery', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async createGoogleSheetsInvoice(data: {
    customerId: string
    startDate: string
    endDate: string
    templateId: string
  }): Promise<ApiResponse<{
    success: boolean
    invoiceId: string
    sheetId: string
    url: string
    pdfUrl: string
  }>> {
    return this.request('/google-sheets/create-invoice', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Reports methods
  async getReports(params: {
    startDate?: string
    endDate?: string
    type?: 'monthly' | 'category' | 'supplier' | 'profit'
  } = {}): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `/reports${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request(endpoint)
  }

  async downloadCsv(params: {
    startDate?: string
    endDate?: string
    type?: 'monthly' | 'purchases' | 'deliveries' | 'inventory'
  } = {}): Promise<Blob> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value.toString())
      }
    })

    const url = `${API_BASE_URL}/api/reports/csv${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    const headers: HeadersInit = {}
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error('CSV download failed')
    }

    return response.blob()
  }

  // User methods
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users')
  }

  async createUser(data: {
    name: string
    email: string
    password: string
    role?: string
  }): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: string, data: {
    name?: string
    email?: string
    password?: string
    role?: string
  }): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/users/${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()