"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Save, X, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiClient } from "@/lib/api"
import type { Category } from "@/types"

interface CategoryManagementProps {
  onCategoryUpdated?: () => void
}

export function CategoryManagement({ onCategoryUpdated }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<Category>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({ name: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isMobile = useIsMobile()

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.getCategories()
      if (response.data) {
        setCategories(response.data)
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err)
      setError('カテゴリーの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setEditingData({ ...category })
  }

  const handleSave = async (id: string) => {
    try {
      if (!editingData.name?.trim()) {
        alert('カテゴリー名を入力してください')
        return
      }

      const response = await apiClient.updateCategory(id, { name: editingData.name.trim() })
      if (response.data) {
        await loadCategories()
        setEditingId(null)
        setEditingData({})
        onCategoryUpdated?.()
        alert('カテゴリーを更新しました')
      }
    } catch (err: any) {
      console.error('Failed to update category:', err)
      alert(err.message || 'カテゴリーの更新に失敗しました')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleDelete = async (id: string) => {
    if (!confirm("このカテゴリーを削除してもよろしいですか？")) {
      return
    }

    try {
      await apiClient.deleteCategory(id)
      await loadCategories()
      onCategoryUpdated?.()
      alert('カテゴリーを削除しました')
    } catch (err: any) {
      console.error('Failed to delete category:', err)
      alert(err.message || 'カテゴリーの削除に失敗しました')
    }
  }

  const handleAdd = async () => {
    try {
      if (!newCategory.name?.trim()) {
        alert("カテゴリー名を入力してください")
        return
      }

      console.log('📝 Creating category:', newCategory.name.trim())
      const response = await apiClient.createCategory({ name: newCategory.name.trim() })
      console.log('✅ Category creation response:', response)

      if (response.data) {
        await loadCategories()
        setNewCategory({ name: "" })
        setIsAdding(false)
        onCategoryUpdated?.()
        alert("カテゴリーが正常に追加されました")
      } else {
        console.error('❌ No data in response:', response)
        alert('カテゴリーの追加に失敗しました: レスポンスにデータがありません')
      }
    } catch (err: any) {
      console.error('❌ Failed to create category:', err)
      alert(err.message || 'カテゴリーの追加に失敗しました')
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        {error}
      </div>
    )
  }

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
                <Input
                  placeholder="カテゴリー名"
                  value={newCategory.name || ""}
                  onChange={(e) => setNewCategory({ name: e.target.value })}
                />
              </CardContent>
            </Card>
          )}

          {sortedCategories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                {editingId === category.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editingData.name || ""}
                      onChange={(e) => setEditingData({ name: e.target.value })}
                      placeholder="カテゴリー名"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(category.id)}>
                        <Save className="h-4 w-4 mr-1" />
                        保存
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="h-4 w-4 mr-1" />
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-medium">{category.name}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {sortedCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">商品カテゴリーが登録されていません。</div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">商品カテゴリー管理</CardTitle>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              新規カテゴリー追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>カテゴリー名</TableHead>
                <TableHead className="w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <Input
                      placeholder="カテゴリー名"
                      value={newCategory.name || ""}
                      onChange={(e) => setNewCategory({ name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAdd}>
                        <Save className="h-4 w-4 mr-1" />
                        保存
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                        <X className="h-4 w-4 mr-1" />
                        キャンセル
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {sortedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {editingId === category.id ? (
                      <Input
                        value={editingData.name || ""}
                        onChange={(e) => setEditingData({ name: e.target.value })}
                        placeholder="カテゴリー名"
                      />
                    ) : (
                      <span className="font-medium">{category.name}</span>
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
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(category.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {sortedCategories.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">商品カテゴリーが登録されていません。</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
