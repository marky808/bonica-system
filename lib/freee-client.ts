interface FreeeConfig {
  accessToken: string
  companyId: string
  apiBaseUrl: string
  devMode: boolean
}

interface FreeeInvoice {
  id?: number
  company_id: number
  issue_date: string
  due_date?: string
  partner_id?: number
  partner_code?: string
  invoice_number?: string
  title?: string
  invoice_status: 'draft' | 'applying' | 'remanded' | 'rejected' | 'approved' | 'unsubmitted'
  posting_status: 'unrequested' | 'preview' | 'waiting' | 'accepted' | 'rejected'
  payment_status?: 'empty' | 'unsettled' | 'settled'
  payment_date?: string
  description?: string
  invoice_contents?: FreeeInvoiceContent[]
  total_amount_per_tax_rate_8?: FreeeAmountPerTaxRate
  total_amount_per_tax_rate_10?: FreeeAmountPerTaxRate
  total_vat?: number
  sub_total?: number
  booking_date?: string
  memo?: string
  payment_type?: 'transfer' | 'direct_debit'
  mail_sent_at?: string
  partner_display_name?: string
  partner_title?: string
  partner_zipcode?: string
  partner_prefecture_code?: number
  partner_address1?: string
  partner_address2?: string
  partner_contact_info?: string
  company_name?: string
  company_zipcode?: string
  company_prefecture_code?: number
  company_address1?: string
  company_address2?: string
  company_contact_info?: string
}

interface FreeeInvoiceContent {
  id?: number
  order?: number
  type: 'normal' | 'discount' | 'text'
  qty?: number
  unit?: string
  unit_price?: number
  vat?: number
  description?: string
  account_item_id?: number
  account_item_name?: string
  tax_code?: number
  item_id?: number
  item_name?: string
  section_id?: number
  section_name?: string
  tag_ids?: number[]
  tag_names?: string[]
  amount?: number
}

interface FreeeAmountPerTaxRate {
  amount: number
  vat: number
}

interface FreeePartner {
  id?: number
  code?: string
  company_id: number
  name: string
  shortcut1?: string
  shortcut2?: string
  long_name?: string
  name_kana?: string
  default_title?: string
  phone?: string
  contact_name?: string
  email?: string
  address_attributes?: {
    zipcode?: string
    prefecture_code?: number
    street_name1?: string
    street_name2?: string
  }
  partner_doc_setting_attributes?: {
    sending_method?: 'email' | 'posting' | 'email_and_posting'
  }
  partner_bank_account_attributes?: {
    bank_name?: string
    bank_name_kana?: string
    bank_code?: string
    branch_name?: string
    branch_kana?: string
    branch_code?: string
    account_type?: 'ordinary' | 'checking' | 'earmarked' | 'savings' | 'other'
    account_number?: string
    account_name?: string
    long_account_name?: string
  }
  payment_term_attributes?: {
    cutoff_day?: number
    additional_months?: number
    fixed_day?: number
  }
}

interface FreeeDeliverySlip {
  id?: number
  company_id: number
  issue_date: string
  partner_id?: number
  partner_code?: string
  partner_name?: string
  title?: string
  memo?: string
  details?: FreeeDeliverySlipDetail[]
}

interface FreeeDeliverySlipDetail {
  id?: number
  account_item_id?: number
  tax_code?: number
  item_id?: number
  section_id?: number
  tag_ids?: number[]
  amount: number
  description?: string
}

export class FreeeApiClient {
  private config: FreeeConfig

  constructor() {
    this.config = {
      accessToken: process.env.FREEE_ACCESS_TOKEN || '',
      companyId: process.env.FREEE_COMPANY_ID || '',
      apiBaseUrl: process.env.FREEE_API_BASE_URL || 'https://api.freee.co.jp',
      devMode: process.env.FREEE_DEV_MODE === 'true'
    }

    if (!this.config.accessToken || !this.config.companyId) {
      console.warn('freee API credentials not configured')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<{ data?: T; error?: string }> {
    console.log(`[freee API DEBUG] devMode: ${this.config.devMode}, accessToken length: ${this.config.accessToken?.length || 0}, companyId: ${this.config.companyId}`)
    
    if (this.config.devMode) {
      console.log(`[freee DEV MODE] ${options.method || 'GET'} ${endpoint}`)
      if (options.body) {
        console.log('[freee DEV MODE] Request body:', JSON.parse(options.body as string))
      }
      
      // Return mock response for dev mode
      if (endpoint.includes('/partners') && options.method === 'POST') {
        return { data: { id: Math.floor(Math.random() * 10000), code: `MOCK-${Date.now()}`, name: '開発モックパートナー' } as T }
      } else if (endpoint.includes('/partners')) {
        return { data: [] as T }
      } else if (endpoint.includes('/invoices') && options.method === 'POST') {
        return { data: { id: Math.floor(Math.random() * 10000), invoice_number: `INV-DEV-${Date.now()}` } as T }
      }
      
      return { data: {} as T }
    }

    if (!this.config.accessToken) {
      console.error('[freee API] Access token not configured')
      return { error: 'freee API アクセストークンが設定されていません。環境変数 FREEE_ACCESS_TOKEN を確認してください。' }
    }

    if (!this.config.companyId) {
      console.error('[freee API] Company ID not configured')
      return { error: 'freee API 会社IDが設定されていません。環境変数 FREEE_COMPANY_ID を確認してください。' }
    }

    try {
      const fullUrl = `${this.config.apiBaseUrl}${endpoint}`
      console.log(`[freee API] ${options.method || 'GET'} ${fullUrl}`)
      console.log(`[freee API DEBUG] Headers:`, {
        'Authorization': `Bearer ${this.config.accessToken?.substring(0, 10)}...`,
        'Content-Type': 'application/json',
        'X-Api-Version': '2020-06-15'
      })
      if (options.body) {
        console.log(`[freee API DEBUG] Request body:`, options.body)
      }
      
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          'X-Api-Version': '2020-06-15',
          ...options.headers
        },
        timeout: 30000 // 30秒タイムアウト
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`[freee API] HTTP ${response.status}:`, errorData)
        
        // エラーステータスに応じた詳細なエラーメッセージ
        switch (response.status) {
          case 401:
            return { error: '認証エラー: freee APIのアクセストークンが無効です。トークンを確認してください。' }
          case 403:
            return { error: 'アクセス権限エラー: このAPIへのアクセス権限がありません。' }
          case 404:
            return { error: 'リソースが見つかりません: 指定されたデータが存在しません。' }
          case 429:
            // レート制限の場合、リトライを試行
            if (retryCount < 3) {
              console.log(`[freee API] Rate limit exceeded. Retrying in ${(retryCount + 1) * 2} seconds...`)
              await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000))
              return this.request(endpoint, options, retryCount + 1)
            }
            return { error: 'レート制限エラー: APIの呼び出し回数が制限を超えました。しばらく時間をおいてから再試行してください。' }
          case 500:
          case 502:
          case 503:
            return { error: 'freee APIサーバーエラー: サーバー側で問題が発生しています。しばらく時間をおいてから再試行してください。' }
          default:
            return { 
              error: errorData.message || `freee API エラー (${response.status}): ${response.statusText}` 
            }
        }
      }

      const data = await response.json()
      console.log(`[freee API] Success: ${options.method || 'GET'} ${endpoint}`)
      console.log(`[freee API DEBUG] Response data:`, JSON.stringify(data, null, 2))
      return { data }
    } catch (error) {
      console.error('[freee API] Request failed:', error)
      
      // ネットワークエラーの詳細な処理
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { error: 'ネットワークエラー: freee APIサーバーに接続できません。インターネット接続を確認してください。' }
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'タイムアウトエラー: APIの応答が遅すぎます。しばらく時間をおいてから再試行してください。' }
      }
      
      return { error: `freee API 通信エラー: ${error instanceof Error ? error.message : '不明なエラーが発生しました'}` }
    }
  }

  // Partner (取引先) methods
  async createPartner(partner: Partial<FreeePartner>): Promise<{ data?: FreeePartner; error?: string }> {
    const payload = {
      company_id: parseInt(this.config.companyId),
      ...partner
    }

    const result = await this.request<{ partner: FreeePartner }>('/api/1/partners', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (result.data) {
      return { data: result.data.partner }
    }
    return { error: result.error }
  }

  async updatePartner(partnerId: number, partner: Partial<FreeePartner>): Promise<{ data?: FreeePartner; error?: string }> {
    const payload = {
      company_id: parseInt(this.config.companyId),
      ...partner
    }

    const result = await this.request<{ partner: FreeePartner }>(`/api/1/partners/${partnerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })

    if (result.data) {
      return { data: result.data.partner }
    }
    return { error: result.error }
  }

  async getPartners(params?: { keyword?: string; offset?: number; limit?: number }): Promise<{ data?: FreeePartner[]; error?: string }> {
    const queryParams = new URLSearchParams({
      company_id: this.config.companyId,
      ...(params?.keyword && { keyword: params.keyword }),
      ...(params?.offset && { offset: params.offset.toString() }),
      ...(params?.limit && { limit: params.limit.toString() })
    })

    const result = await this.request<{ partners: FreeePartner[] }>(`/api/1/partners?${queryParams}`, {
      method: 'GET'
    })

    if (result.data) {
      return { data: result.data.partners }
    }
    return { error: result.error }
  }

  async getPartnerByCode(code: string): Promise<{ data?: FreeePartner; error?: string }> {
    const partners = await this.getPartners({ keyword: code })
    if (partners.error) {
      return { error: partners.error }
    }

    const partner = partners.data?.find(p => p.code === code)
    if (!partner) {
      return { error: `Partner with code ${code} not found` }
    }

    return { data: partner }
  }

  // Invoice (請求書) methods
  async createInvoice(invoice: Partial<FreeeInvoice>): Promise<{ data?: FreeeInvoice; error?: string }> {
    const payload = {
      company_id: parseInt(this.config.companyId),
      invoice_status: 'draft' as const,
      ...invoice
    }

    const result = await this.request<{ invoice: FreeeInvoice }>('/api/1/invoices', {
      method: 'POST',
      body: JSON.stringify({ invoice: payload })
    })

    if (result.data) {
      return { data: result.data.invoice }
    }
    return { error: result.error }
  }

  async updateInvoice(invoiceId: number, invoice: Partial<FreeeInvoice>): Promise<{ data?: FreeeInvoice; error?: string }> {
    const payload = {
      company_id: parseInt(this.config.companyId),
      ...invoice
    }

    const result = await this.request<{ invoice: FreeeInvoice }>(`/api/1/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({ invoice: payload })
    })

    if (result.data) {
      return { data: result.data.invoice }
    }
    return { error: result.error }
  }

  async getInvoice(invoiceId: number): Promise<{ data?: FreeeInvoice; error?: string }> {
    const queryParams = new URLSearchParams({
      company_id: this.config.companyId
    })

    const result = await this.request<{ invoice: FreeeInvoice }>(`/api/1/invoices/${invoiceId}?${queryParams}`, {
      method: 'GET'
    })

    if (result.data) {
      return { data: result.data.invoice }
    }
    return { error: result.error }
  }

  async getInvoices(params?: { 
    start_issue_date?: string
    end_issue_date?: string
    partner_id?: number
    partner_code?: string
    invoice_status?: string
    payment_status?: string
    offset?: number
    limit?: number 
  }): Promise<{ data?: FreeeInvoice[]; error?: string }> {
    const queryParams = new URLSearchParams({
      company_id: this.config.companyId,
      ...(params?.start_issue_date && { start_issue_date: params.start_issue_date }),
      ...(params?.end_issue_date && { end_issue_date: params.end_issue_date }),
      ...(params?.partner_id && { partner_id: params.partner_id.toString() }),
      ...(params?.partner_code && { partner_code: params.partner_code }),
      ...(params?.invoice_status && { invoice_status: params.invoice_status }),
      ...(params?.payment_status && { payment_status: params.payment_status }),
      ...(params?.offset && { offset: params.offset.toString() }),
      ...(params?.limit && { limit: params.limit.toString() })
    })

    const result = await this.request<{ invoices: FreeeInvoice[] }>(`/api/1/invoices?${queryParams}`, {
      method: 'GET'
    })

    if (result.data) {
      return { data: result.data.invoices }
    }
    return { error: result.error }
  }

  async deleteInvoice(invoiceId: number): Promise<{ data?: boolean; error?: string }> {
    const queryParams = new URLSearchParams({
      company_id: this.config.companyId
    })

    const result = await this.request(`/api/1/invoices/${invoiceId}?${queryParams}`, {
      method: 'DELETE'
    })

    if (!result.error) {
      return { data: true }
    }
    return { error: result.error }
  }

  // Delivery Slip (納品書) - Note: freee doesn't have a specific delivery slip API
  // We'll use the deals API for this purpose
  async createDeliverySlip(deliverySlip: FreeeDeliverySlip): Promise<{ data?: any; error?: string }> {
    const payload = {
      company_id: parseInt(this.config.companyId),
      issue_date: deliverySlip.issue_date,
      type: 'income',
      partner_id: deliverySlip.partner_id,
      partner_code: deliverySlip.partner_code,
      details: deliverySlip.details?.map(detail => ({
        tax_code: detail.tax_code || 2, // 10% tax
        account_item_id: detail.account_item_id,
        amount: detail.amount,
        description: detail.description,
        item_id: detail.item_id,
        section_id: detail.section_id,
        tag_ids: detail.tag_ids
      }))
    }

    const result = await this.request('/api/1/deals', {
      method: 'POST',
      body: JSON.stringify({ deal: payload })
    })

    if (result.data) {
      return { data: result.data }
    }
    return { error: result.error }
  }

  // Utility method to sync customer to freee partner
  async syncCustomerToPartner(customer: {
    id: string
    companyName: string
    contactPerson: string
    phone: string
    deliveryAddress: string
    billingAddress: string
  }): Promise<{ data?: FreeePartner; error?: string }> {
    // Check if partner already exists
    const existingPartners = await this.getPartners({ keyword: customer.companyName })
    if (existingPartners.error) {
      return { error: existingPartners.error }
    }
    
    if (existingPartners.data && existingPartners.data.length > 0) {
      const existingPartner = existingPartners.data.find(p => p.name === customer.companyName)
      if (existingPartner && existingPartner.id) {
        // Update existing partner
        return this.updatePartner(existingPartner.id, {
          name: customer.companyName,
          contact_name: customer.contactPerson,
          phone: customer.phone,
          address_attributes: {
            street_name1: customer.billingAddress
          }
        })
      }
    }

    // Create new partner
    return this.createPartner({
      code: `CUST-${customer.id}`,
      name: customer.companyName,
      contact_name: customer.contactPerson,
      phone: customer.phone,
      address_attributes: {
        street_name1: customer.billingAddress
      }
    })
  }

  // Utility method to sync supplier to freee partner
  async syncSupplierToPartner(supplier: {
    id: string
    companyName: string
    contactPerson: string
    phone: string
    address: string
  }): Promise<{ data?: FreeePartner; error?: string }> {
    // Check if partner already exists
    const existingPartners = await this.getPartners({ keyword: supplier.companyName })
    if (existingPartners.data && existingPartners.data.length > 0) {
      const existingPartner = existingPartners.data.find(p => p.name === supplier.companyName)
      if (existingPartner && existingPartner.id) {
        // Update existing partner
        return this.updatePartner(existingPartner.id, {
          name: supplier.companyName,
          contact_name: supplier.contactPerson,
          phone: supplier.phone,
          address_attributes: {
            street_name1: supplier.address
          }
        })
      }
    }

    // Create new partner
    return this.createPartner({
      code: `SUPP-${supplier.id}`,
      name: supplier.companyName,
      contact_name: supplier.contactPerson,
      phone: supplier.phone,
      address_attributes: {
        street_name1: supplier.address
      }
    })
  }
}

// FIXME: Google Sheets連携への移行に伴いfreee連携機能を一時的に無効化
// 将来的にfreee連携を復活させる場合は、以下のコメントアウトを解除してください
// export const freeeClient = new FreeeApiClient()

export const freeeClient = {
  // Mock implementation to maintain compatibility
  createPartner: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  updatePartner: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  getPartners: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  getPartnerByCode: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  createInvoice: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  updateInvoice: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  getInvoice: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  getInvoices: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  deleteInvoice: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  createDeliverySlip: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  syncCustomerToPartner: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' }),
  syncSupplierToPartner: () => Promise.resolve({ error: 'この機能はGoogle Sheets連携に移行されました' })
}