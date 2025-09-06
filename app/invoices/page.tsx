"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { InvoiceCreation } from "@/components/invoices/invoice-creation"
import { InvoiceHistory } from "@/components/invoices/invoice-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("creation")

  const handleInvoiceGenerated = (customerId: string, month: string) => {
    console.log("Invoice generated for customer:", customerId, "month:", month)
    // TODO: Refresh data or update state
  }

  const handleDownload = (item: any) => {
    console.log("Downloading invoice:", item)
    // TODO: Implement actual download logic
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">帳票管理</h1>
          <p className="text-muted-foreground text-pretty">請求書の作成と帳票履歴を管理します</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="creation">請求書作成</TabsTrigger>
            <TabsTrigger value="history">帳票履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="creation" className="space-y-6">
            <InvoiceCreation onInvoiceGenerated={handleInvoiceGenerated} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <InvoiceHistory onDownload={handleDownload} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
