"use client"

import { useState, useEffect } from "react"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Plus, Edit, Trash2, Building2, Phone, MapPin, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiClient, type Supplier } from "@/lib/api"

const supplierSchema = z.object({
  companyName: z.string().min(1, "会社名を入力してください"),
  contactPerson: z.string().min(1, "担当者名を入力してください"),
  phone: z.string().min(1, "電話番号を入力してください"),
  address: z.string().min(1, "住所を入力してください"),
  paymentTerms: z.string().min(1, "支払条件を入力してください"),
  deliveryConditions: z.string().min(1, "配送条件を入力してください"),
  specialNotes: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface SupplierManagementProps {
  onSupplierUpdated?: () => void
}

export function SupplierManagement({ onSupplierUpdated }: SupplierManagementProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isMobile = useIsMobile()

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phone: "",
      address: "",
      paymentTerms: "",
      deliveryConditions: "",
      specialNotes: "",
    },
  })

  // Load suppliers data
  useEffect(() => {
    const loadSuppliers = async () => {
      setLoading(true)
      setError('')
      
      try {
        const response = await apiClient.getSuppliers()
        if (response.data) {
          setSuppliers(response.data)
        } else {
          setError(response.error || '仕入れ先データの取得に失敗しました')
        }
      } catch (err) {
        setError('通信エラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    loadSuppliers()
  }, [])

  const handleSubmit = async (data: SupplierFormData) => {
    setSubmitting(true)
    setError('')

    try {
      if (editingSupplier) {
        // Update existing supplier
        const response = await apiClient.updateSupplier(editingSupplier.id, data)
        if (response.data) {
          setSuppliers(suppliers.map(s => 
            s.id === editingSupplier.id ? response.data! : s
          ))
          setShowForm(false)
          setEditingSupplier(null)
          form.reset()
          onSupplierUpdated?.()
        } else {
          setError(response.error || '仕入れ先の更新に失敗しました')
        }
      } else {
        // Create new supplier
        const response = await apiClient.createSupplier(data)
        if (response.data) {
          setSuppliers([response.data, ...suppliers])
          setShowForm(false)
          form.reset()
          onSupplierUpdated?.()
        } else {
          setError(response.error || '仕入れ先の登録に失敗しました')
        }
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    form.reset({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms,
      deliveryConditions: supplier.deliveryConditions,
      specialNotes: supplier.specialNotes || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この仕入れ先を削除しますか？関連する仕入れデータも影響を受ける可能性があります。')) {
      return
    }

    try {
      const response = await apiClient.deleteSupplier(id)
      if (response.data) {
        setSuppliers(suppliers.filter(s => s.id !== id))
        onSupplierUpdated?.()
      } else {
        setError(response.error || '仕入れ先の削除に失敗しました')
      }
    } catch (err) {
      setError('通信エラーが発生しました')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingSupplier(null)
    form.reset()
    setError('')
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone.includes(searchQuery)
  )

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
              <Building2 className="h-5 w-5" />
              仕入れ先一覧 ({filteredSuppliers.length}件)
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

      {/* Suppliers List */}
      <Card>
        <CardContent className="p-0">
          {isMobile ? (
            // Mobile view
            <div className="space-y-4 p-4">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{supplier.companyName}</h3>
                        <p className="text-sm text-muted-foreground">担当: {supplier.contactPerson}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="flex-1">{supplier.address}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>支払条件: {supplier.paymentTerms}</p>
                      <p>配送条件: {supplier.deliveryConditions}</p>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)} className="flex-1">
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(supplier.id)} className="flex-1">
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
                  <TableHead>住所</TableHead>
                  <TableHead>支払条件</TableHead>
                  <TableHead>配送条件</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.companyName}</TableCell>
                    <TableCell>{supplier.contactPerson}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{supplier.address}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{supplier.paymentTerms}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{supplier.deliveryConditions}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(supplier.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredSuppliers.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "検索条件に一致する仕入れ先がありません" : "仕入れ先が登録されていません"}
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
              {editingSupplier ? "仕入れ先編集" : "新規仕入れ先登録"}
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
                      <Input placeholder="株式会社○○農園" {...field} />
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>住所 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="東京都千代田区丸の内1-1-1"
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
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>支払条件 *</FormLabel>
                    <FormControl>
                      <Input placeholder="月末締め翌月末払い" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>配送条件 *</FormLabel>
                    <FormControl>
                      <Input placeholder="午前中配送希望" {...field} />
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
                      <Textarea
                        placeholder="品質にこだわりがあり、有機栽培専門"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingSupplier ? "更新" : "登録"}
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