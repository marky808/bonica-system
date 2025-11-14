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
import type { ProductPrefix } from "@/lib/api"

interface ProductPrefixManagementProps {
  onPrefixUpdated?: () => void
}

export function ProductPrefixManagement({ onPrefixUpdated }: ProductPrefixManagementProps) {
  const [prefixes, setPrefixes] = useState<ProductPrefix[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<ProductPrefix>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newPrefix, setNewPrefix] = useState<Partial<ProductPrefix>>({ name: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isMobile = useIsMobile()

  const loadPrefixes = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.getProductPrefixes()
      if (response.data) {
        setPrefixes(response.data)
      }
    } catch (err: any) {
      console.error('Failed to load prefixes:', err)
      setError('プレフィックスの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrefixes()
  }, [])

  const handleEdit = (prefix: ProductPrefix) => {
    setEditingId(prefix.id)
    setEditingData({ ...prefix })
  }

  const handleSave = async (id: string) => {
    try {
      if (!editingData.name?.trim()) {
        alert('プレフィックス名を入力してください')
        return
      }

      const response = await apiClient.updateProductPrefix(id, { name: editingData.name.trim() })
      if (response.data) {
        await loadPrefixes()
        setEditingId(null)
        setEditingData({})
        onPrefixUpdated?.()
        alert('プレフィックスを更新しました')
      }
    } catch (err: any) {
      console.error('Failed to update prefix:', err)
      alert(err.message || 'プレフィックスの更新に失敗しました')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleDelete = async (id: string) => {
    const prefix = prefixes.find(p => p.id === id)
    if (!prefix) return

    if (!confirm(`「${prefix.name}」を削除してもよろしいですか？\n\n※このプレフィックスが仕入れデータで使用されている場合は削除できません。`)) {
      return
    }

    try {
      console.log('🗑️ Deleting prefix:', id)
      const response = await apiClient.deleteProductPrefix(id)
      console.log('✅ Delete response:', response)

      await loadPrefixes()
      onPrefixUpdated?.()
      alert('プレフィックスを削除しました')
    } catch (err: any) {
      console.error('❌ Failed to delete prefix:', err)

      // エラーメッセージを詳しく表示
      if (err.message?.includes('使用されている')) {
        alert(`削除できません\n\n「${prefix.name}」は仕入れデータで使用されているため削除できません。\n先に関連する仕入れデータを削除または別のプレフィックスに変更してください。`)
      } else {
        alert(`削除に失敗しました\n\n${err.message || 'プレフィックスの削除に失敗しました'}`)
      }
    }
  }

  const handleAdd = async () => {
    try {
      if (!newPrefix.name?.trim()) {
        alert("プレフィックス名を入力してください")
        return
      }

      console.log('📝 Creating prefix:', newPrefix.name.trim())
      const response = await apiClient.createProductPrefix({ name: newPrefix.name.trim() })
      console.log('✅ Prefix creation response:', response)

      if (response.data) {
        await loadPrefixes()
        setNewPrefix({ name: "" })
        setIsAdding(false)
        onPrefixUpdated?.()
        alert("プレフィックスが正常に追加されました")
      } else {
        console.error('❌ No data in response:', response)
        alert('プレフィックスの追加に失敗しました: レスポンスにデータがありません')
      }
    } catch (err: any) {
      console.error('❌ Failed to create prefix:', err)
      alert(err.message || 'プレフィックスの追加に失敗しました')
    }
  }

  const sortedPrefixes = [...prefixes].sort((a, b) => a.name.localeCompare(b.name))

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
            <CardTitle className="text-xl font-bold">商品プレフィックス管理</CardTitle>
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
                  <Badge variant="outline">新規プレフィックス</Badge>
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
                  placeholder="プレフィックス名（例：鈴木さんの）"
                  value={newPrefix.name || ""}
                  onChange={(e) => setNewPrefix({ name: e.target.value })}
                />
              </CardContent>
            </Card>
          )}

          {sortedPrefixes.map((prefix) => (
            <Card key={prefix.id}>
              <CardContent className="p-4">
                {editingId === prefix.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editingData.name || ""}
                      onChange={(e) => setEditingData({ name: e.target.value })}
                      placeholder="プレフィックス名"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(prefix.id)}>
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
                    <div className="font-medium">{prefix.name}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(prefix)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(prefix.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {sortedPrefixes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">商品プレフィックスが登録されていません。</div>
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
            <CardTitle className="text-2xl font-bold">商品プレフィックス管理</CardTitle>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              新規プレフィックス追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>プレフィックス名</TableHead>
                <TableHead className="w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <Input
                      placeholder="プレフィックス名（例：鈴木さんの、四国名産）"
                      value={newPrefix.name || ""}
                      onChange={(e) => setNewPrefix({ name: e.target.value })}
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

              {sortedPrefixes.map((prefix) => (
                <TableRow key={prefix.id}>
                  <TableCell>
                    {editingId === prefix.id ? (
                      <Input
                        value={editingData.name || ""}
                        onChange={(e) => setEditingData({ name: e.target.value })}
                        placeholder="プレフィックス名"
                      />
                    ) : (
                      <span className="font-medium">{prefix.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === prefix.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(prefix.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(prefix)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(prefix.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {sortedPrefixes.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">商品プレフィックスが登録されていません。</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
