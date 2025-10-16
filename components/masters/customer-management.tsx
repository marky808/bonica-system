"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Plus, Edit, Trash2, Users, Phone, MapPin, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiClient, type Customer } from "@/lib/api"

const customerSchema = z.object({
  companyName: z.string().min(1, "会社名を入力してください"),
  contactPerson: z.string().min(1, "担当者名を入力してください"),
  phone: z.string().min(1, "電話番号を入力してください"),
  deliveryAddress: z.string().min(1, "納品住所を入力してください"),
  billingAddress: z.string().min(1, "請求先住所を入力してください"),
  deliveryTimePreference: z.string().optional(),
  specialRequests: z.string().optional(),
  specialNotes: z.string().optional(),
  billingCycle: z.string().default("monthly"),
  billingDay: z.number().min(1).max(31).default(31),
  paymentTerms: z.string().default("30days"),
  invoiceRegistrationNumber: z.string().optional(),
  invoiceNotes: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerManagementProps {
  onCustomerUpdated?: () => void
}

export function CustomerManagement({ onCustomerUpdated }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isMobile = useIsMobile()

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
      billingCycle: "monthly",
      billingDay: 31,
      paymentTerms: "30days",
      invoiceRegistrationNumber: "",
      invoiceNotes: "",
    },
  })

  // Load customers data
  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true)
      setError('')
      
      try {
        const response = await apiClient.getCustomers()
        if (response.data) {
          setCustomers(response.data)
        } else {
          setError(response.error || '納品先データの取得に失敗しました')
        }
      } catch (err) {
        setError('通信エラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  const filteredCustomers = customers.filter(customer =>
    customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  )

  const handleSubmit = async (data: CustomerFormData) => {
    setSubmitting(true)
    setError('')

    try {
      if (editingCustomer) {
        // Update existing customer
        const response = await apiClient.updateCustomer(editingCustomer.id, data)
        if (response.data) {
          setCustomers(customers.map(c => 
            c.id === editingCustomer.id ? response.data! : c
          ))
          setShowForm(false)
          setEditingCustomer(null)
          form.reset()
          onCustomerUpdated?.()
        } else {
          setError(response.error || '納品先の更新に失敗しました')
        }
      } else {
        // Create new customer
        const response = await apiClient.createCustomer(data)
        if (response.data) {
          setCustomers([response.data, ...customers])
          setShowForm(false)
          form.reset()
          onCustomerUpdated?.()
        } else {
          setError(response.error || '納品先の登録に失敗しました')
        }
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    form.reset({
      companyName: customer.companyName,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      deliveryAddress: customer.deliveryAddress,
      billingAddress: customer.billingAddress,
      deliveryTimePreference: customer.deliveryTimePreference || "",
      specialRequests: customer.specialRequests || "",
      specialNotes: customer.specialNotes || "",
      billingCycle: customer.billingCycle || "monthly",
      billingDay: customer.billingDay || 31,
      paymentTerms: customer.paymentTerms || "30days",
      invoiceRegistrationNumber: customer.invoiceRegistrationNumber || "",
      invoiceNotes: customer.invoiceNotes || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この納品先を削除しますか？関連する納品データも影響を受ける可能性があります。')) {
      return
    }

    try {
      const response = await apiClient.deleteCustomer(id)
      if (response.data) {
        setCustomers(customers.filter(c => c.id !== id))
        onCustomerUpdated?.()
      } else {
        setError(response.error || '納品先の削除に失敗しました')
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCustomer(null)
    form.reset()
    setError('')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              納品先一覧 ({filteredCustomers.length}件)
            </CardTitle>
            <Button onClick={() => setShowForm(true)} className="self-start">
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="会社名・担当者・電話番号で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardContent className="p-0">
          {isMobile ? (
            // Mobile view
            <div className="space-y-4 p-4">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{customer.companyName}</h3>
                        <p className="text-sm text-muted-foreground">担当: {customer.contactPerson}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">納品先:</p>
                          <p>{customer.deliveryAddress}</p>
                          <p className="font-medium mt-1">請求先:</p>
                          <p>{customer.billingAddress}</p>
                        </div>
                      </div>
                    </div>

                    {(customer.deliveryTimePreference || customer.specialRequests) && (
                      <div className="text-xs text-muted-foreground">
                        {customer.deliveryTimePreference && (
                          <p>配送時間: {customer.deliveryTimePreference}</p>
                        )}
                        {customer.specialRequests && (
                          <p>特別要望: {customer.specialRequests}</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(customer)} className="flex-1">
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(customer.id)} className="flex-1">
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop view
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会社名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>納品住所</TableHead>
                  <TableHead>請求先住所</TableHead>
                  <TableHead>配送時間</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.companyName}</TableCell>
                    <TableCell>{customer.contactPerson}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{customer.deliveryAddress}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{customer.billingAddress}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{customer.deliveryTimePreference || "指定なし"}</TableCell>
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
          )}

          {filteredCustomers.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "検索条件に一致する納品先がありません" : "納品先が登録されていません"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "納品先編集" : "新規納品先登録"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>会社名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="○○レストラン" {...field} />
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
                    <FormLabel>担当者 *</FormLabel>
                    <FormControl>
                      <Input placeholder="田中太郎" {...field} />
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
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>納品住所 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="東京都渋谷区道玄坂1-1-1"
                        rows={2}
                        {...field}
                      />
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
                    <FormLabel>請求先住所 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="東京都渋谷区道玄坂1-1-1"
                        rows={2}
                        {...field}
                      />
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
                      <Input placeholder="午前中希望" {...field} />
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
                      <Textarea
                        placeholder="搬入時の注意事項など"
                        rows={2}
                        {...field}
                      />
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
                    <FormLabel>請求書備考</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="請求書に記載する特記事項"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceRegistrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>インボイス登録番号</FormLabel>
                    <FormControl>
                      <Input placeholder="T1234567890123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>請求書特記事項</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="請求書に記載する追加の特記事項"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="billingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>請求サイクル</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="請求サイクルを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">月次請求</SelectItem>
                          <SelectItem value="weekly">週次請求</SelectItem>
                          <SelectItem value="immediate">都度請求</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>締め日</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="締め日を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}日{day === 31 ? '(月末)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>支払条件</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="支払条件を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">即金</SelectItem>
                          <SelectItem value="7days">7日後</SelectItem>
                          <SelectItem value="15days">15日後</SelectItem>
                          <SelectItem value="30days">30日後</SelectItem>
                          <SelectItem value="60days">60日後</SelectItem>
                          <SelectItem value="endofmonth">月末締め翌月末払い</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingCustomer ? "更新" : "登録"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                  キャンセル
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
