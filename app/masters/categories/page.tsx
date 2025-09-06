"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { CategoryManagement } from "@/components/masters/category-management"

export default function CategoriesPage() {
  const handleCategoryUpdated = () => {
    console.log("Category data updated")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">商品カテゴリー管理</h1>
          <p className="text-muted-foreground text-pretty">商品カテゴリーの基本情報を管理します</p>
        </div>

        <CategoryManagement onCategoryUpdated={handleCategoryUpdated} />
      </div>
    </MainLayout>
  )
}
