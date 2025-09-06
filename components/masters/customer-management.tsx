"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Search, Plus, Edit, Trash2, Building2, Phone, MapPin, ChevronUp, ChevronDown, Clock } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Customer } from "@/types"

const customerSchema = z.object({
  companyName: z.string().min(1, "会社名を入力してください"),
  contactPerson: z.string().min(1, "担当者名を入力してください"),
  phone: z.string().min(1, "電話番号を入力してください"),
  deliveryAddress: z.string().min(1, "納品住所を入力してください"),
  billingAddress: z.string().optional(),
  deliveryTimePreference: z.string().optional(),
  specialRequests: z.string().optional(),
  specialNotes: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

// Mock data
const mockCustomers: Customer[] = [
  {
    id: "1",
    companyName: "ABC市場",
    contactPerson: "佐藤次郎",
    phone: "03-1234-5678",
    deliveryAddress: "東京都中央区築地1-2-3",
    billingAddress: "東京都中央区築地1-2-3",
    deliveryTimePreference: "午前6時〜8時",
    specialRequests: "鮮度重視。梱包は丁寧にお願いします。",
    specialNotes: "優良取引先。支払い条件良好。",
    createdAt: "2023-01-10T00:00:00Z",
  },
  {
    id: "2",
    companyName: "XYZ青果店",
    contactPerson: "高橋美子",
    phone: "045-9876-5432",
    deliveryAddress: "神奈川県横浜市中区○○町4-5-6",
    deliveryTimePreference: "午前中",
    specialRequests: "駐車場が狭いため、小型車での配送をお願いします。",
    specialNotes: "地域密着型店舗。リピート率高い。",
    createdAt: "2023-02-15T00:00:00Z",
  },
  {
    id: "3",
    companyName: "DEF農協",
    contactPerson: "伊藤健一",
    phone: "052-1111-2222",
    deliveryAddress: "愛知県名古屋市中村区△△町7-8-9",
    billingAddress: "愛知県名古屋市中村区△△町7-8-10",
    deliveryTimePreference: "指定なし",
    specialRequests: "大口取引先。月末締め翌月払い。",
    specialNotes: "大口取引先。月末締め翌月払い。",
    createdAt: "2023-03-20T00:00:00Z",
  },
]

// Mock sales history
const mockSalesHistory: Record<string, { month: string; amount: number }[]> = {
  "1": [
    { month: "2024-01", amount: 450000 },
    { month: "2023-12", amount: 380000 },
    { month: "2023-11", amount: 420000 },
  ],
  "2": [
    { month: "2024-01", amount: 280000 },
    { month: "2023-12", amount: 320000 },
    { month: "2023-11", amount: 250000 },
  ],
  "3": [
    { month: "2024-01", amount: 720000 },
    { month: "2023-12", amount: 680000 },
    { month: "2023-11", amount: 750000 },
  ],
}

interface CustomerManagementProps {
  onCustomerUpdated?: () => void
}

export function CustomerManagement({ onCustomerUpdated }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showSalesHistory, setShowSalesHistory] = useState(false)
  const [sortField, setSortField] = useState<keyof Customer>("companyName")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phone: "",
      deliveryAddress: "",
      billingAddress: "",
      deliveryTimePreference: "",
      specialRequests: "",
      specialNotes: "",
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    return (
      searchQuery === "" ||
      customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return 0
  })

  const handleSubmit = (data: CustomerFormData) => {
    if (editingCustomer) {
      // Update existing customer
      setCustomers((prev) =>
        prev.map((customer) => (customer.id === editingCustomer.id ? { ...customer, ...data } : customer)),
      )
    } else {
      // Add new customer
      const newCustomer: Customer = {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date().toISOString(),
      }
      setCustomers((prev) => [...prev, newCustomer])
    }

    setIsDialogOpen(false)
    setEditingCustomer(null)
    form.reset()
    onCustomerUpdated?.()
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    form.reset({
      companyName: customer.companyName,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      deliveryAddress: customer.deliveryAddress,
      billingAddress: customer.billingAddress || "",
      deliveryTimePreference: customer.deliveryTimePreference || "",
      specialRequests: customer.specialRequests || "",
      specialNotes: customer.specialNotes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("この納品先を削除してもよろしいですか？")) {
      setCustomers((prev) => prev.filter((customer) => customer.id !== id))
      onCustomerUpdated?.()
    }
  }

  const handleShowSalesHistory = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowSalesHistory(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingCustomer(null)
    form.reset()
  }

  const getTotalSales = (customerId: string) => {
    const history = mockSalesHistory[customerId] || []
    return history.reduce((total, record) => total + record.amount, 0)
  }

  const isMobile = useIsMobile()

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">納品先管理</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新規登録
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingCustomer ? "納品先編集" : "新規納品先登録"}</DialogTitle>
                  <DialogDescription>納品先の情報を入力してください</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>会社名 *</FormLabel>
                            <FormControl>
                              <Input placeholder="会社名を入力" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>担当者名 *</FormLabel>
                            <FormControl>
                              <Input placeholder="担当者名を入力" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>電話番号 *</FormLabel>
                            <FormControl>
                              <Input placeholder="03-1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryTimePreference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>配送時間指定</FormLabel>
                            <FormControl>
                              <Input placeholder="午前中" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>納品住所 *</FormLabel>
                          <FormControl>
                            <Input placeholder="納品住所を入力" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>請求書送付先</FormLabel>
                          <FormControl>
                            <Input placeholder="納品先と異なる場合のみ入力" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialRequests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>特別要望</FormLabel>
                          <FormControl>
                            <Textarea placeholder="配送や商品に関する特別な要望があれば入力" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>特記事項</FormLabel>
                          <FormControl>
                            <Input placeholder="取引に関する備考や特記事項を入力" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4 pt-4">
                      <Button type="submit" className="flex-1">
                        {editingCustomer ? "更新" : "登録"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDialogClose}
                        className="flex-1 bg-transparent"
                      >
                        キャンセル
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* 検索エリア */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="会社名、担当者、住所で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>

          {isMobile ? (
            <div className="space-y-4">
              {sortedCustomers.map((customer) => (
                <Card key={customer.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-lg">{customer.companyName}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(customer.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">担当者:</span>
                        <span>{customer.contactPerson}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm">{customer.deliveryAddress}</span>
                      </div>
                      {customer.deliveryTimePreference && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.deliveryTimePreference}</span>
                        </div>
                      )}
                      {customer.specialNotes && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">特記事項:</span>
                          <span className="text-sm">{customer.specialNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // デスクトップ表示（テーブル形式）
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("companyName")}>
                      <div className="flex items-center gap-1">
                        会社名
                        {sortField === "companyName" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("contactPerson")}>
                      <div className="flex items-center gap-1">
                        担当者
                        {sortField === "contactPerson" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead>連絡先</TableHead>
                    <TableHead>納品住所</TableHead>
                    <TableHead>配送時間</TableHead>
                    <TableHead>特記事項</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{customer.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{customer.contactPerson}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-xs">{customer.deliveryAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>{customer.deliveryTimePreference || "-"}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-xs block">
                          {customer.specialNotes || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(customer.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {sortedCustomers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "検索条件に一致する納品先が見つかりませんでした。" : "納品先が登録されていません。"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 取引実績モーダル */}
      <Dialog open={showSalesHistory} onOpenChange={setShowSalesHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>取引実績</DialogTitle>
            <DialogDescription>{selectedCustomer?.companyName}の売上履歴</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(getTotalSales(selectedCustomer.id))}
                </div>
                <div className="text-sm text-muted-foreground">累計売上</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月</TableHead>
                    <TableHead>売上金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(mockSalesHistory[selectedCustomer.id] || []).map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>{formatCurrency(record.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
