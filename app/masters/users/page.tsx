"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { UserManagement } from "@/components/masters/user-management"

export default function UsersPage() {
  const handleUserUpdated = () => {
    console.log("User updated")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">ユーザー管理</h1>
          <p className="text-muted-foreground text-pretty">
            システムにアクセスするユーザーを管理します
          </p>
        </div>

        <UserManagement onUserUpdated={handleUserUpdated} />
      </div>
    </MainLayout>
  )
}
