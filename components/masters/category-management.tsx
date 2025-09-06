"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, GripVertical, Save, X, ChevronUp, ChevronDown } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ProductCategory } from "@/types"

// Mock data
const mockCategories: ProductCategory[] = [
  {
    id: "1",
    name: "果物",
    description: "いちご、すいか、メロン、りんご、みかんなど",
    categoryInfo: "高品質果物、贈答用対応可能、季節により品揃え変動",
    storageMethod: "冷蔵保存（品目により温度調整）",
    displayOrder: 1,
  },
  {
    id: "2",
    name: "野菜",
    description: "トマト、きゅうり、キャベツ、レタス、人参など",
    categoryInfo: "新鮮野菜中心、有機栽培品も取り扱い、朝採れ野菜あり",
    storageMethod: "冷蔵保存（10℃前後推奨）",
    displayOrder: 2,
  },
  {
    id: "3",
    name: "穀物",
    description: "米、小麦、大豆、とうもろこしなど",
    categoryInfo: "国産品優先、品質等級管理、長期保存対応",
    storageMethod: "常温保存（湿度管理重要）",
    displayOrder: 3,
  },
  {
    id: "4",
    name: "冷凍",
    description: "冷凍野菜、冷凍果物、冷凍加工品など",
    categoryInfo: "コールドチェーン管理、業務用サイズ対応",
    storageMethod: "冷凍保存（-18℃以下）",
    displayOrder: 4,
  },
  {
    id: "5",
    name: "その他",
    description: "加工品、調味料、特殊農産物など",
    categoryInfo: "特殊品目、季節限定商品、地域特産品含む",
    storageMethod: "商品により異なる",
    displayOrder: 5,
  },
]

interface CategoryManagementProps {
  onCategoryUpdated?: () => void
}

export function CategoryManagement({ onCategoryUpdated }: CategoryManagementProps) {
  const [categories, setCategories] = useState<ProductCategory[]>(mockCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<ProductCategory>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<ProductCategory>>({
    name: "",
    description: "",
    categoryInfo: "",
    storageMethod: "",
  })
  const isMobile = useIsMobile()

  const handleEdit = (category: ProductCategory) => {
    setEditingId(category.id)
    setEditingData({ ...category })
  }

  const handleSave = (id: string) => {
    setCategories((prev) => prev.map((category) => (category.id === id ? { ...category, ...editingData } : category)))
    setEditingId(null)
    setEditingData({})
    onCategoryUpdated?.()
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleDelete = (id: string) => {
    if (confirm("このカテゴリーを削除してもよろしいですか？")) {
      setCategories((prev) => prev.filter((category) => category.id !== id))
      onCategoryUpdated?.()
    }
  }

  const handleAdd = () => {
    if (!newCategory.name?.trim()) {
      alert("カテゴリー名を入力してください")
      return
    }

    // 重複チェック
    const isDuplicate = categories.some((cat) => cat.name.toLowerCase() === newCategory.name?.toLowerCase())
    if (isDuplicate) {
      alert("同じ名前のカテゴリーが既に存在します")
      return
    }

    const category: ProductCategory = {
      id: Date.now().toString(),
      name: newCategory.name.trim(),
      description: newCategory.description?.trim() || "",
      categoryInfo: newCategory.categoryInfo?.trim() || "",
      storageMethod: newCategory.storageMethod?.trim() || "",
      displayOrder: categories.length + 1,
    }

    setCategories((prev) => [...prev, category])
    setNewCategory({ name: "", description: "", categoryInfo: "", storageMethod: "" })
    setIsAdding(false)
    onCategoryUpdated?.()

    alert("カテゴリーが正常に追加されました")
  }

  const handleMoveUp = (id: string) => {
    const index = categories.findIndex((cat) => cat.id === id)
    if (index > 0) {
      const newCategories = [...categories]
      const temp = newCategories[index].displayOrder
      newCategories[index].displayOrder = newCategories[index - 1].displayOrder
      newCategories[index - 1].displayOrder = temp

      // Sort by display order
      newCategories.sort((a, b) => a.displayOrder - b.displayOrder)
      setCategories(newCategories)
      onCategoryUpdated?.()
    }
  }

  const handleMoveDown = (id: string) => {
    const index = categories.findIndex((cat) => cat.id === id)
    if (index < categories.length - 1) {
      const newCategories = [...categories]
      const temp = newCategories[index].displayOrder
      newCategories[index].displayOrder = newCategories[index + 1].displayOrder
      newCategories[index + 1].displayOrder = temp

      // Sort by display order
      newCategories.sort((a, b) => a.displayOrder - b.displayOrder)
      setCategories(newCategories)
      onCategoryUpdated?.()
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder)

  if (isMobile) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">商品カテゴリー管理</CardTitle>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新規追加
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 新規追加カード */}
          {isAdding && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">新規カテゴリー</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdd}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="カテゴリー名"
                    value={String(newCategory.name || "")}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="説明"
                    value={String(newCategory.description || "")}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <Input
                    placeholder="カテゴリー情報・備考"
                    value={String(newCategory.categoryInfo || "")}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, categoryInfo: e.target.value }))}
                  />
                  <Input
                    placeholder="保存方法"
                    value={String(newCategory.storageMethod || "")}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, storageMethod: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 既存カテゴリーカード */}
          {sortedCategories.map((category, index) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                {editingId === category.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">編集中</Badge>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(category.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={String(editingData.name || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="カテゴリー名"
                      />
                      <Input
                        value={String(editingData.description || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="説明"
                      />
                      <Input
                        value={String(editingData.categoryInfo || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, categoryInfo: e.target.value }))}
                        placeholder="カテゴリー情報・備考"
                      />
                      <Input
                        value={String(editingData.storageMethod || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, storageMethod: e.target.value }))}
                        placeholder="保存方法"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        <Badge variant="outline">#{category.displayOrder}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveUp(category.id)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveDown(category.id)}
                          disabled={index === sortedCategories.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">説明:</span>
                        <p className="mt-1">{category.description}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">カテゴリー情報:</span>
                        <p className="mt-1">{category.categoryInfo}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">保存方法:</span>
                        <p className="mt-1">{category.storageMethod}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(category)} className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(category.id)} className="flex-1">
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {sortedCategories.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">商品カテゴリーが登録されていません。</div>
          )}
        </CardContent>
      </Card>
    )
  }

  // デスクトップ表示（既存のテーブル表示）
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">商品カテゴリー管理</CardTitle>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            新規追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">順序</TableHead>
                <TableHead>カテゴリー名</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>カテゴリー情報</TableHead>
                <TableHead>保存方法</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* 新規追加行 */}
              {isAdding && (
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <Badge variant="outline">新規</Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="カテゴリー名"
                      value={String(newCategory.name || "")}
                      onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="説明"
                      value={String(newCategory.description || "")}
                      onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="カテゴリー情報・備考"
                      value={String(newCategory.categoryInfo || "")}
                      onChange={(e) => setNewCategory((prev) => ({ ...prev, categoryInfo: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="保存方法"
                      value={String(newCategory.storageMethod || "")}
                      onChange={(e) => setNewCategory((prev) => ({ ...prev, storageMethod: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAdd}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* 既存カテゴリー */}
              {sortedCategories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveUp(category.id)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveDown(category.id)}
                          disabled={index === sortedCategories.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === category.id ? (
                      <Input
                        value={String(editingData.name || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, name: e.target.value }))}
                        className="h-8"
                      />
                    ) : (
                      <span className="font-medium">{category.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === category.id ? (
                      <Input
                        value={String(editingData.description || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, description: e.target.value }))}
                        className="h-8"
                      />
                    ) : (
                      <span className="text-sm">{category.description}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === category.id ? (
                      <Input
                        value={String(editingData.categoryInfo || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, categoryInfo: e.target.value }))}
                        className="h-8"
                      />
                    ) : (
                      <Badge variant="outline">{category.categoryInfo}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === category.id ? (
                      <Input
                        value={String(editingData.storageMethod || "")}
                        onChange={(e) => setEditingData((prev) => ({ ...prev, storageMethod: e.target.value }))}
                        className="h-8"
                      />
                    ) : (
                      <span className="text-sm">{category.storageMethod}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === category.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(category.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(category.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {sortedCategories.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">商品カテゴリーが登録されていません。</div>
        )}
      </CardContent>
    </Card>
  )
}
