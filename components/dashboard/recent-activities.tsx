import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface Activity {
  id: string
  type: "purchase" | "delivery" | "invoice"
  description: string
  amount?: number
  timestamp: string
  status: "success" | "pending" | "error"
  relatedId?: string
}

export function RecentActivities() {
  const { isAuthenticated } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadActivities = async () => {
      if (!isAuthenticated) return
      
      try {
        console.log('📋 最近の活動データ読み込み中...')
        setLoading(true)
        setError('')
        
        const response = await apiClient.getDashboardActivities(8)
        console.log('📋 活動データレスポンス:', response)
        
        if (response.data) {
          const actualData = response.data.data || response.data
          console.log('📋 活動実データ:', actualData)
          
          setActivities(actualData.activities || [])
        } else {
          console.error('❌ 活動データエラー:', response.error)
          setError(response.error || '活動データの取得に失敗しました')
        }
      } catch (err: any) {
        console.error('活動データ読み込みエラー:', err)
        setError('活動データの取得中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    loadActivities()
  }, [isAuthenticated])

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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近の活動</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">活動データを読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近の活動</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              再読み込み
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近の活動</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-sm text-muted-foreground">最近の活動がありません</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getActivityIcon(activity.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), {
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
