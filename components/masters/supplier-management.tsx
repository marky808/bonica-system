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
import { Search, Plus, Edit, Trash2, Building2, Phone, MapPin, ChevronUp, ChevronDown } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Supplier } from "@/types"

const supplierSchema = z.object({
  companyName: z.string().min(1, "会社名を入力してください"),
  contactPerson: z.string().min(1, "担当者名を入力してください"),
  phone: z.string().min(1, "電話番号を入力してください"),
  address: z.string().min(1, "住所を入力してください"),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  notes: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

// Mock data
const mockSuppliers: Supplier[] = [
  {
    id: "1",
    companyName: "田中農園",
    contactPerson: "田中太郎",
    phone: "090-1234-5678",
    address: "静岡県静岡市清水区○○町1-2-3",
    paymentTerms: "月末締め翌月末払い",
    deliveryTerms: "午前中配送希望",
    notes: "いちご専門農園。品質が安定している。",
    createdAt: "2023-01-15T00:00:00Z",
  },
  {
    id: "2",
    companyName: "山田農場",
    contactPerson: "山田花子",
    phone: "080-9876-5432",
    address: "愛知県豊橋市△△町4-5-6",
    paymentTerms: "20日締め翌月10日払い",
    deliveryTerms: "指定なし",
    notes: "トマト、きゅうりの大規模生産者。",
    createdAt: "2023-02-20T00:00:00Z",
  },
  {
    id: "3",
    companyName: "ABC農園",
    contactPerson: "鈴木一郎",
    phone: "070-1111-2222",
    address: "茨城県つくば市□□町7-8-9",
    paymentTerms: "15日締め当月末払い",
    deliveryTerms: "平日のみ",
    notes: "メロン、すいかの専門農園。季節限定。",
    createdAt: "2023-03-10T00:00:00Z",
  },
]

interface SupplierManagementProps {
  onSupplierUpdated?: () => void
}

export function SupplierManagement({ onSupplierUpdated }: SupplierManagementProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [sortField, setSortField] = useState<keyof Supplier>("companyName")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phone: "",
      address: "",
      paymentTerms: "",
      deliveryTerms: "",
      notes: "",
    },
  })

  const handleSort = (field: keyof Supplier) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    return (
      searchQuery === "" ||
      supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return 0
  })

  const handleSubmit = (data: SupplierFormData) => {
    if (editingSupplier) {
      // Update existing supplier
      setSuppliers((prev) =>
        prev.map((supplier) => (supplier.id === editingSupplier.id ? { ...supplier, ...data } : supplier)),
      )
    } else {
      // Add new supplier
      const newSupplier: Supplier = {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date().toISOString(),
      }
      setSuppliers((prev) => [...prev, newSupplier])
    }

    setIsDialogOpen(false)
    setEditingSupplier(null)
    form.reset()
    onSupplierUpdated?.()
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    form.reset({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms || "",
      deliveryTerms: supplier.deliveryTerms || "",
      notes: supplier.notes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("この仕入れ先を削除してもよろしいですか？")) {
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id))
      onSupplierUpdated?.()
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingSupplier(null)
    form.reset()
  }

  const isMobile = useIsMobile()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">仕入れ先管理</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新規登録
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? "仕入れ先編集" : "新規仕入れ先登録"}</DialogTitle>
                <DialogDescription>仕入れ先の情報を入力してください</DialogDescription>
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
                            <Input placeholder="090-1234-5678" {...field} />
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
                          <FormLabel>支払条件</FormLabel>
                          <FormControl>
                            <Input placeholder="月末締め翌月末払い" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>住所 *</FormLabel>
                        <FormControl>
                          <Input placeholder="住所を入力" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>配送条件</FormLabel>
                        <FormControl>
                          <Input placeholder="午前中配送希望" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>特記事項</FormLabel>
                        <FormControl>
                          <Textarea placeholder="特記事項があれば入力" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingSupplier ? "更新" : "登録"}
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

        {/* モバイル表示（カード形式） */}
        {isMobile ? (
          <div className="space-y-4">
            {sortedSuppliers.map((supplier) => (
              <Card key={supplier.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-lg">{supplier.companyName}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(supplier.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">担当者:</span>
                      <span>{supplier.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{supplier.address}</span>
                    </div>
                    {supplier.paymentTerms && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">支払条件:</span>
                        <span>{supplier.paymentTerms}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">取引開始:</span>
                      <span>{new Date(supplier.createdAt).toLocaleDateString("ja-JP")}</span>
                    </div>
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
                  <TableHead>住所</TableHead>
                  <TableHead>支払条件</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center gap-1">
                      取引開始日
                      {sortField === "createdAt" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{supplier.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.contactPerson}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {supplier.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-xs">{supplier.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.paymentTerms || "-"}</TableCell>
                    <TableCell>{new Date(supplier.createdAt).toLocaleDateString("ja-JP")}</TableCell>
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
          </div>
        )}

        {sortedSuppliers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "検索条件に一致する仕入れ先が見つかりませんでした。" : "仕入れ先が登録されていません。"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
