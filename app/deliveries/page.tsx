"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { DeliveryForm } from "@/components/deliveries/delivery-form"
import { DeliveryHistory } from "@/components/deliveries/delivery-history"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"

export default function DeliveriesPage() {
  const [activeTab, setActiveTab] = useState("history")

  const handleSubmit = (data: any) => {
    console.log("Delivery data:", data)
    // TODO: Implement API call to save delivery
    setActiveTab("history")
  }

  const handleCancel = () => {
    setActiveTab("history")
  }

  const handleReissueSlip = (deliveryId: string) => {
    console.log("Reissuing slip for delivery:", deliveryId)
    // TODO: Implement PDF download
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">納品管理</h1>
            <p className="text-muted-foreground text-pretty">農産物の納品処理と履歴を管理します</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="history">納品履歴</TabsTrigger>
              <TabsTrigger value="new">新規納品</TabsTrigger>
            </TabsList>
            {activeTab === "history" && (
              <Button onClick={() => setActiveTab("new")} className="h-12">
                <Plus className="h-4 w-4 mr-2" />
                新規納品処理
              </Button>
            )}
          </div>

          <TabsContent value="history" className="space-y-6">
            <DeliveryHistory onReissueSlip={handleReissueSlip} />
          </TabsContent>

          <TabsContent value="new" className="space-y-6">
            <DeliveryForm onSubmit={handleSubmit} onCancel={handleCancel} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
