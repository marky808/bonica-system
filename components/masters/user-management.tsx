"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Save, X, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiClient } from "@/lib/api"
import type { User } from "@/types"

interface UserManagementProps {
  onUserUpdated?: () => void
}

export function UserManagement({ onUserUpdated }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<User & { password?: string }>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newUser, setNewUser] = useState<Partial<User & { password?: string }>>({
    email: "",
    name: "",
    role: "USER",
    password: "",
  })
  const isMobile = useIsMobile()

  // データを読み込む
  const loadUsers = async () => {
    try {
      console.log('📥 Loading users from API...')
      setIsLoading(true)
      const response = await apiClient.getUsers()
      console.log('✅ Users loaded:', response.data)
      if (response.data) {
        setUsers(response.data)
      }
    } catch (err: any) {
      console.error('❌ Failed to load users:', err)
      alert(err.message || 'ユーザーの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // コンポーネントマウント時にデータを読み込む
  useEffect(() => {
    loadUsers()
  }, [])

  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setEditingData({ ...user, password: "" })
  }

  const handleSave = async (id: string) => {
    try {
      if (!editingData.name?.trim()) {
        alert("名前を入力してください")
        return
      }

      if (!editingData.email?.trim()) {
        alert("メールアドレスを入力してください")
        return
      }

      // メールアドレス形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(editingData.email)) {
        alert("正しいメールアドレス形式で入力してください")
        return
      }

      console.log('📝 Updating user:', id, editingData)

      const updateData: any = {
        name: editingData.name.trim(),
        email: editingData.email.trim(),
        role: editingData.role,
      }

      // パスワードが入力されている場合のみ送信
      if (editingData.password && editingData.password.trim()) {
        updateData.password = editingData.password.trim()
      }

      const response = await apiClient.updateUser(id, updateData)
      console.log('✅ User update response:', response)

      if (response.data) {
        await loadUsers()
        setEditingId(null)
        setEditingData({})
        onUserUpdated?.()
        alert("ユーザー情報を更新しました")
      }
    } catch (err: any) {
      console.error('❌ Failed to update user:', err)
      alert(err.message || 'ユーザーの更新に失敗しました')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleDelete = async (id: string) => {
    try {
      const user = users.find((u) => u.id === id)

      if (!user) {
        return
      }

      // 管理者チェックはサーバー側でも行われるが、UIでも確認
      const normalizedRole = user.role?.toUpperCase()
      if (normalizedRole === "ADMIN") {
        const adminCount = users.filter((u) => u.role?.toUpperCase() === "ADMIN").length
        if (adminCount <= 1) {
          alert("管理者は最低1人必要です。削除できません。")
          return
        }
      }

      if (confirm("このユーザーを削除してもよろしいですか？")) {
        console.log('🗑️ Deleting user:', id)
        const response = await apiClient.deleteUser(id)
        console.log('✅ User delete response:', response)

        if (response.data?.success) {
          await loadUsers()
          onUserUpdated?.()
          alert("ユーザーを削除しました")
        }
      }
    } catch (err: any) {
      console.error('❌ Failed to delete user:', err)
      alert(err.message || 'ユーザーの削除に失敗しました')
    }
  }

  const handleAdd = async () => {
    try {
      if (!newUser.email?.trim() || !newUser.name?.trim() || !newUser.password?.trim()) {
        alert("メールアドレス、名前、パスワードを入力してください")
        return
      }

      // メールアドレス形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newUser.email)) {
        alert("正しいメールアドレス形式で入力してください")
        return
      }

      console.log('📝 Creating user:', { name: newUser.name.trim(), email: newUser.email.trim(), role: newUser.role })

      const response = await apiClient.createUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password.trim(),
        role: newUser.role || "USER",
      })

      console.log('✅ User creation response:', response)

      if (response.data) {
        await loadUsers()
        setNewUser({ email: "", name: "", role: "USER", password: "" })
        setIsAdding(false)
        onUserUpdated?.()
        alert("ユーザーが正常に追加されました")
      }
    } catch (err: any) {
      console.error('❌ Failed to create user:', err)
      alert(err.message || 'ユーザーの追加に失敗しました')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // ローディング表示
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">ユーザー管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isMobile) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">ユーザー管理</CardTitle>
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
                  <Badge variant="outline">新規ユーザー</Badge>
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
                    type="email"
                    placeholder="メールアドレス"
                    value={newUser.email || ""}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="名前"
                    value={newUser.name || ""}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="パスワード"
                    value={newUser.password || ""}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="権限を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">管理者</SelectItem>
                      <SelectItem value="USER">一般ユーザー</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 既存ユーザーカード */}
          {users.map((user) => {
            const normalizedRole = user.role?.toUpperCase()
            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  {editingId === user.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">編集中</Badge>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(user.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Input
                          type="email"
                          value={editingData.email || ""}
                          onChange={(e) => setEditingData((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="メールアドレス"
                        />
                        <Input
                          value={editingData.name || ""}
                          onChange={(e) => setEditingData((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="名前"
                        />
                        <Input
                          type="password"
                          value={editingData.password || ""}
                          onChange={(e) => setEditingData((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="新しいパスワード（変更する場合のみ）"
                        />
                        <Select
                          value={editingData.role}
                          onValueChange={(value) => setEditingData((prev) => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">管理者</SelectItem>
                            <SelectItem value="USER">一般ユーザー</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{user.name}</h3>
                          <Badge variant={normalizedRole === "ADMIN" ? "default" : "secondary"}>
                            {normalizedRole === "ADMIN" ? "管理者" : "一般"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">メール:</span>
                          <p className="mt-1">{user.email}</p>
                        </div>
                        {user.updatedAt && (
                          <div>
                            <span className="font-medium text-muted-foreground">最終更新:</span>
                            <p className="mt-1">{formatDate(user.updatedAt)}</p>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-muted-foreground">作成日:</span>
                          <p className="mt-1">{formatDate(user.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="flex-1">
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(user.id)}
                          className="flex-1"
                          disabled={normalizedRole === "ADMIN" && users.filter((u) => u.role?.toUpperCase() === "ADMIN").length === 1}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {users.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">ユーザーが登録されていません。</div>
          )}
        </CardContent>
      </Card>
    )
  }

  // デスクトップ表示
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">ユーザー管理</CardTitle>
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
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>パスワード</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>最終更新</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* 新規追加行 */}
              {isAdding && (
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <Input
                      placeholder="名前"
                      value={newUser.name || ""}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="email"
                      placeholder="メールアドレス"
                      value={newUser.email || ""}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="password"
                      placeholder="パスワード"
                      value={newUser.password || ""}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">管理者</SelectItem>
                        <SelectItem value="USER">一般ユーザー</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
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

              {/* 既存ユーザー */}
              {users.map((user) => {
                const normalizedRole = user.role?.toUpperCase()
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      {editingId === user.id ? (
                        <Input
                          value={editingData.name || ""}
                          onChange={(e) => setEditingData((prev) => ({ ...prev, name: e.target.value }))}
                          className="h-8"
                        />
                      ) : (
                        <span className="font-medium">{user.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Input
                          type="email"
                          value={editingData.email || ""}
                          onChange={(e) => setEditingData((prev) => ({ ...prev, email: e.target.value }))}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-sm">{user.email}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Input
                          type="password"
                          value={editingData.password || ""}
                          onChange={(e) => setEditingData((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="新しいパスワード（変更する場合のみ）"
                          className="h-8"
                        />
                      ) : (
                        <span className="font-mono text-sm">••••••••</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Select
                          value={editingData.role}
                          onValueChange={(value) => setEditingData((prev) => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">管理者</SelectItem>
                            <SelectItem value="USER">一般ユーザー</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={normalizedRole === "ADMIN" ? "default" : "secondary"}>
                          {normalizedRole === "ADMIN" ? "管理者" : "一般ユーザー"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{user.updatedAt ? formatDate(user.updatedAt) : "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(user.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(user.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                            disabled={normalizedRole === "ADMIN" && users.filter((u) => u.role?.toUpperCase() === "ADMIN").length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {users.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">ユーザーが登録されていません。</div>
        )}
      </CardContent>
    </Card>
  )
}
