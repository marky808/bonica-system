"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Truck, FileText } from "lucide-react"
import type { Purchase, Delivery } from "@/types"

const deliverySchema = z.object({
  customerId: z.string().min(1, "納品先を選択してください"),
  date: z.string().min(1, "納品日を選択してください"),
  items: z
    .array(
      z.object({
        purchaseId: z.string(),
        quantity: z.number().min(0.01, "使用数量を入力してください"),
        price: z.number().min(0, "納品価格を入力してください"),
      }),
    )
    .min(1, "商品を選択してください"),
})

type DeliveryFormData = z.infer<typeof deliverySchema>

// Mock data
const availablePurchases: Purchase[] = [
  {
    id: "1",
    date: "2024-01-15",
    productName: "いちご（あまおう）",
    categoryId: "1",
    quantity: 50,
    unit: "パック",
    unitNotes: "1パック300g",
    price: 125000,
    taxType: "excluded",
    supplierId: "1",
    status: "partial",
    remainingQuantity: 20,
    createdAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "2",
    date: "2024-01-14",
    productName: "トマト（大玉）",
    categoryId: "4",
    quantity: 100,
    unit: "kg",
    price: 80000,
    taxType: "excluded",
    supplierId: "2",
    status: "unused",
    remainingQuantity: 100,
    createdAt: "2024-01-14T14:30:00Z",
  },
  {
    id: "3",
    date: "2024-01-16",
    productName: "メロン（アンデス）",
    categoryId: "3",
    quantity: 25,
    unit: "個",
    price: 200000,
    taxType: "excluded",
    supplierId: "3",
    status: "unused",
    remainingQuantity: 25,
    createdAt: "2024-01-16T10:00:00Z",
  },
]

const customers = [
  { id: "1", name: "ABC市場" },
  { id: "2", name: "XYZ青果店" },
  { id: "3", name: "DEF農協" },
  { id: "4", name: "GHI スーパー" },
]

interface DeliveryFormProps {
  onSubmit: (data: DeliveryFormData) => void
  onCancel: () => void
  initialData?: Partial<Delivery>
}

export function DeliveryForm({ onSubmit, onCancel, initialData }: DeliveryFormProps) {
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set())
  const [deliveryItems, setDeliveryItems] = useState<Record<string, { quantity: number; price: number }>>({})

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      customerId: initialData?.customerId || "",
      date: initialData?.date || new Date().toISOString().split("T")[0],
      items: [],
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const handlePurchaseSelect = (purchaseId: string, checked: boolean) => {
    const newSelected = new Set(selectedPurchases)
    if (checked) {
      newSelected.add(purchaseId)
      // Initialize with default values
      setDeliveryItems((prev) => ({
        ...prev,
        [purchaseId]: { quantity: 1, price: 0 },
      }))
    } else {
      newSelected.delete(purchaseId)
      setDeliveryItems((prev) => {
        const { [purchaseId]: removed, ...rest } = prev
        return rest
      })
    }
    setSelectedPurchases(newSelected)
  }

  const handleItemChange = (purchaseId: string, field: "quantity" | "price", value: number) => {
    setDeliveryItems((prev) => ({
      ...prev,
      [purchaseId]: {
        ...prev[purchaseId],
        [field]: value,
      },
    }))
  }

  const calculateTotalAmount = () => {
    return Array.from(selectedPurchases).reduce((total, purchaseId) => {
      const item = deliveryItems[purchaseId]
      return total + (item?.quantity || 0) * (item?.price || 0)
    }, 0)
  }

  const calculateTotalProfit = () => {
    return Array.from(selectedPurchases).reduce((total, purchaseId) => {
      const purchase = availablePurchases.find((p) => p.id === purchaseId)
      const item = deliveryItems[purchaseId]
      if (!purchase || !item) return total

      const unitCost = purchase.price / purchase.quantity
      const cost = item.quantity * unitCost
      const revenue = item.quantity * item.price
      return total + (revenue - cost)
    }, 0)
  }

  const handleSubmit = (data: DeliveryFormData) => {
    const items = Array.from(selectedPurchases).map((purchaseId) => {
      const purchase = availablePurchases.find((p) => p.id === purchaseId)!
      const deliveryItem = deliveryItems[purchaseId]
      const unitCost = purchase.price / purchase.quantity
      const cost = deliveryItem.quantity * unitCost
      const revenue = deliveryItem.quantity * deliveryItem.price

      return {
        purchaseId,
        productName: purchase.productName,
        quantity: deliveryItem.quantity,
        unit: purchase.unit,
        price: deliveryItem.price,
        profit: revenue - cost,
      }
    })

    onSubmit({
      ...data,
      items,
    })
  }

  const generateDeliverySlip = () => {
    // TODO: Implement freee integration for delivery slip generation
    console.log("Generating delivery slip...")
    alert("納品書を生成しました（freee連携機能は後で実装予定）")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-balance">納品処理</CardTitle>
          <CardDescription className="text-pretty">在庫から商品を選択して納品処理を行います</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 納品先選択 */}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>納品先 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="納品先を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 納品日 */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>納品日 *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 在庫選択エリア */}
      <Card>
        <CardHeader>
          <CardTitle>利用可能な在庫</CardTitle>
          <CardDescription>納品に使用する商品を選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">選択</TableHead>
                  <TableHead>仕入れ日</TableHead>
                  <TableHead>商品名</TableHead>
                  <TableHead>残数</TableHead>
                  <TableHead>仕入れ価格</TableHead>
                  <TableHead>使用数量</TableHead>
                  <TableHead>納品価格（単価）</TableHead>
                  <TableHead>小計</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availablePurchases.map((purchase) => {
                  const isSelected = selectedPurchases.has(purchase.id)
                  const item = deliveryItems[purchase.id]
                  const subtotal = item ? item.quantity * item.price : 0

                  return (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handlePurchaseSelect(purchase.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>{purchase.date}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{purchase.productName}</div>
                          {purchase.unitNotes && (
                            <div className="text-xs text-muted-foreground">{purchase.unitNotes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {purchase.remainingQuantity} {purchase.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(purchase.price)}</TableCell>
                      <TableCell>
                        {isSelected && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={purchase.remainingQuantity}
                            value={item?.quantity || 1}
                            onChange={(e) =>
                              handleItemChange(purchase.id, "quantity", Number.parseFloat(e.target.value) || 0)
                            }
                            className="w-24"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isSelected && (
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={item?.price || 0}
                            onChange={(e) =>
                              handleItemChange(purchase.id, "price", Number.parseFloat(e.target.value) || 0)
                            }
                            className="w-32"
                          />
                        )}
                      </TableCell>
                      <TableCell>{isSelected && formatCurrency(subtotal)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 合計金額表示 */}
      {selectedPurchases.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(calculateTotalAmount())}</div>
                <div className="text-sm text-muted-foreground">合計納品金額</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{formatCurrency(calculateTotalProfit())}</div>
                <div className="text-sm text-muted-foreground">予想利益</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">{selectedPurchases.size}品目</div>
                <div className="text-sm text-muted-foreground">選択商品数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          className="flex-1 h-12"
          disabled={selectedPurchases.size === 0}
        >
          <Truck className="h-4 w-4 mr-2" />
          納品処理実行
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={generateDeliverySlip}
          className="flex-1 h-12 bg-transparent"
          disabled={selectedPurchases.size === 0}
        >
          <FileText className="h-4 w-4 mr-2" />
          納品書発行
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 h-12">
          キャンセル
        </Button>
      </div>
    </div>
  )
}
