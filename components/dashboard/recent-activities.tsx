import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"

interface Activity {
  id: string
  type: "purchase" | "delivery" | "invoice"
  description: string
  amount?: number
  timestamp: Date
  status: "success" | "pending" | "error"
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "delivery",
    description: "ABC農園へいちご 50パック納品",
    amount: 125000,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    status: "success",
  },
  {
    id: "2",
    type: "purchase",
    description: "田中農園からトマト 100kg仕入れ",
    amount: 80000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    status: "success",
  },
  {
    id: "3",
    type: "invoice",
    description: "9月分請求書を5社に送信",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    status: "pending",
  },
  {
    id: "4",
    type: "delivery",
    description: "XYZ市場へメロン 20個納品",
    amount: 200000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    status: "success",
  },
  {
    id: "5",
    type: "purchase",
    description: "山田農園からすいか 30個仕入れ",
    amount: 150000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    status: "success",
  },
]

export function RecentActivities() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "purchase":
        return "📦"
      case "delivery":
        return "🚚"
      case "invoice":
        return "📄"
      default:
        return "📋"
    }
  }

  const getStatusBadge = (status: Activity["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-primary">
            完了
          </Badge>
        )
      case "pending":
        return <Badge variant="secondary">処理中</Badge>
      case "error":
        return <Badge variant="destructive">エラー</Badge>
      default:
        return <Badge variant="outline">不明</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近の活動</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activity.amount && (
                  <span className="text-sm font-medium text-primary">{formatCurrency(activity.amount)}</span>
                )}
                {getStatusBadge(activity.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
