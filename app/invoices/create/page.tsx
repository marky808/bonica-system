"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { InvoiceCreation } from "@/components/invoices/invoice-creation"
import { useRouter } from "next/navigation"

export default function CreateInvoicePage() {
  const router = useRouter()

  const handleInvoiceGenerated = (customerId: string, month: string) => {
    console.log("Invoice generated for customer:", customerId, "month:", month)
    // TODO: Implement success handling
    router.push("/invoices")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">請求書作成</h1>
          <p className="text-muted-foreground text-pretty">月次の納品実績から請求書を作成します</p>
        </div>

        <InvoiceCreation onInvoiceGenerated={handleInvoiceGenerated} />
      </div>
    </MainLayout>
  )
}
