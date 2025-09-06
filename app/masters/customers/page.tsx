"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { CustomerManagement } from "@/components/masters/customer-management"

export default function CustomersPage() {
  const handleCustomerUpdated = () => {
    console.log("Customer data updated")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">納品先管理</h1>
          <p className="text-muted-foreground text-pretty">納品先の基本情報を管理します</p>
        </div>

        <CustomerManagement onCustomerUpdated={handleCustomerUpdated} />
      </div>
    </MainLayout>
  )
}
