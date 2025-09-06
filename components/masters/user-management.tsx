"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { User } from "@/types"

// Mock data with initial user
const mockUsers: User[] = [
  {
    id: "1",
    email: "808works@gmail.com",
    name: "小西正高",
    role: "admin",
    lastLogin: "2024-12-20T10:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  },
]

interface UserManagementProps {
  onUserUpdated?: () => void
}

export function UserManagement({ onUserUpdated }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<User & { password?: string }>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newUser, setNewUser] = useState<Partial<User & { password?: string }>>({
    email: "",
    name: "",
    role: "user",
    password: "",
  })
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const isMobile = useIsMobile()

  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setEditingData({ ...user, password: "" })
  }

  const handleSave = (id: string) => {
    const updatedUser = { ...editingData }
    delete updatedUser.password // パスワードは表示用のみ、実際の保存では除外

    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...updatedUser } : user)))
    setEditingId(null)
    setEditingData({})
    onUserUpdated?.()
    alert("ユーザー情報を更新しました")
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleDelete = (id: string) => {
    const user = users.find((u) => u.id === id)
    if (user?.role === "admin" && users.filter((u) => u.role === "admin").length === 1) {
      alert("管理者は最低1人必要です。削除できません。")
      return
    }

    if (confirm("このユーザーを削除してもよろしいですか？")) {
      setUsers((prev) => prev.filter((user) => user.id !== id))
      onUserUpdated?.()
      alert("ユーザーを削除しました")
    }
  }

  const handleAdd = () => {
    if (!newUser.email?.trim() || !newUser.name?.trim() || !newUser.password?.trim()) {
      alert("メールアドレス、名前、パスワードを入力してください")
      return
    }

    // メールアドレス重複チェック
    const isDuplicate = users.some((user) => user.email.toLowerCase() === newUser.email?.toLowerCase())
    if (isDuplicate) {
      alert("同じメールアドレスのユーザーが既に存在します")
      return
    }

    // 簡単なメールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUser.email)) {
      alert("正しいメールアドレス形式で入力してください")
      return
    }

    const user: User = {
      id: Date.now().toString(),
      email: newUser.email.trim(),
      name: newUser.name.trim(),
      role: newUser.role as "admin" | "user",
      createdAt: new Date().toISOString(),
    }

    setUsers((prev) => [...prev, user])
    setNewUser({ email: "", name: "", role: "user", password: "" })
    setIsAdding(false)
    onUserUpdated?.()
    alert("ユーザーが正常に追加されました")
  }

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }))
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
                    onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value as "admin" | "user" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="権限を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理者</SelectItem>
                      <SelectItem value="user">一般ユーザー</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 既存ユーザーカード */}
          {users.map((user) => (
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
                        onValueChange={(value) =>
                          setEditingData((prev) => ({ ...prev, role: value as "admin" | "user" }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理者</SelectItem>
                          <SelectItem value="user">一般ユーザー</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? "管理者" : "一般"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">メール:</span>
                        <p className="mt-1">{user.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">パスワード:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono">{showPasswords[user.id] ? "6391" : "••••••••"}</span>
                          <Button size="sm" variant="ghost" onClick={() => togglePasswordVisibility(user.id)}>
                            {showPasswords[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {user.lastLogin && (
                        <div>
                          <span className="font-medium text-muted-foreground">最終ログイン:</span>
                          <p className="mt-1">{formatDate(user.lastLogin)}</p>
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
                        disabled={user.role === "admin" && users.filter((u) => u.role === "admin").length === 1}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

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
                <TableHead>最終ログイン</TableHead>
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
                      onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value as "admin" | "user" }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">管理者</SelectItem>
                        <SelectItem value="user">一般ユーザー</SelectItem>
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
              {users.map((user) => (
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{showPasswords[user.id] ? "6391" : "••••••••"}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="h-6 w-6 p-0"
                        >
                          {showPasswords[user.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <Select
                        value={editingData.role}
                        onValueChange={(value) =>
                          setEditingData((prev) => ({ ...prev, role: value as "admin" | "user" }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理者</SelectItem>
                          <SelectItem value="user">一般ユーザー</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "管理者" : "一般ユーザー"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.lastLogin ? formatDate(user.lastLogin) : "未ログイン"}</span>
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
                          disabled={user.role === "admin" && users.filter((u) => u.role === "admin").length === 1}
                        >
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

        {users.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">ユーザーが登録されていません。</div>
        )}
      </CardContent>
    </Card>
  )
}
