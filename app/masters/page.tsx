"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { SupplierManagement } from "@/components/masters/supplier-management"
import { CustomerManagement } from "@/components/masters/customer-management"
import { CategoryManagement } from "@/components/masters/category-management"
import { UserManagement } from "@/components/masters/user-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState("suppliers")

  const handleDataUpdated = () => {
    // TODO: Refresh data or show success message
    console.log("Master data updated")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">マスタ管理</h1>
          <p className="text-muted-foreground text-pretty">
            仕入れ先、納品先、商品カテゴリー、ユーザーの基本情報を管理します
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-fit grid-cols-4">
            <TabsTrigger value="suppliers">仕入れ先</TabsTrigger>
            <TabsTrigger value="customers">納品先</TabsTrigger>
            <TabsTrigger value="categories">商品カテゴリー</TabsTrigger>
            <TabsTrigger value="users">ユーザー管理</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-6">
            <SupplierManagement onSupplierUpdated={handleDataUpdated} />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerManagement onCustomerUpdated={handleDataUpdated} />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <CategoryManagement onCategoryUpdated={handleDataUpdated} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement onUserUpdated={handleDataUpdated} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
