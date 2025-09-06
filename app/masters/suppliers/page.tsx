"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { SupplierManagement } from "@/components/masters/supplier-management"

export default function SuppliersPage() {
  const handleSupplierUpdated = () => {
    console.log("Supplier data updated")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">仕入れ先管理</h1>
          <p className="text-muted-foreground text-pretty">仕入れ先の基本情報を管理します</p>
        </div>

        <SupplierManagement onSupplierUpdated={handleSupplierUpdated} />
      </div>
    </MainLayout>
  )
}
