import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Truck, FileText } from "lucide-react"

export function QuickActions() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>クイックアクション</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/purchases/new">
            <Button className="w-full h-20 flex flex-col gap-2" size="lg">
              <ShoppingCart className="h-6 w-6" />
              <span className="text-sm font-medium">仕入れ登録</span>
            </Button>
          </Link>

          <Link href="/deliveries/new">
            <Button className="w-full h-20 flex flex-col gap-2" size="lg" variant="secondary">
              <Truck className="h-6 w-6" />
              <span className="text-sm font-medium">納品処理</span>
            </Button>
          </Link>

          <Link href="/invoices/create">
            <Button className="w-full h-20 flex flex-col gap-2 bg-transparent" size="lg" variant="outline">
              <FileText className="h-6 w-6" />
              <span className="text-sm font-medium">請求書作成</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
