"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  Leaf,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  FileText,
  Settings,
  Users,
  Package,
  Menu,
  X,
  BarChart3,
  LogOut,
  List,
} from "lucide-react"

const navigation = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { name: "仕入れ管理", href: "/purchases", icon: ShoppingCart },
  { name: "在庫管理", href: "/inventory", icon: Package },
  { name: "納品管理", href: "/deliveries", icon: Truck },
  { name: "帳票管理", href: "/invoices", icon: FileText },
  { name: "一覧表示", href: "/lists", icon: List, hasSubNav: true },
  { name: "レポート", href: "/reports", icon: BarChart3 },
  { name: "マスタ管理", href: "/masters", icon: Settings, hasSubNav: true },
]

const listSubNav = [
  { name: "仕入れ一覧", href: "/lists/purchases", icon: ShoppingCart },
  { name: "納品一覧", href: "/lists/deliveries", icon: Truck },
]

const masterSubNav = [
  { name: "仕入れ先", href: "/masters/suppliers", icon: Users },
  { name: "納品先", href: "/masters/customers", icon: Users },
  { name: "商品カテゴリー", href: "/masters/categories", icon: Package },
]

export function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")
  
  const toggleMenu = (href: string) => {
    setExpandedMenu(expandedMenu === href ? null : href)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-background"
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
            <div className="bg-primary rounded-lg p-2">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">BONICA管理</h1>
              <p className="text-sm text-muted-foreground">システム</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <div key={item.name}>
                  {item.hasSubNav ? (
                    <button
                      onClick={() => toggleMenu(item.href)}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      <div className={cn(
                        "transition-transform duration-200",
                        expandedMenu === item.href ? "rotate-90" : "rotate-0"
                      )}>
                        ▶
                      </div>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )}

                  {/* List sub-navigation */}
                  {item.href === "/lists" && expandedMenu === "/lists" && (
                    <div className="ml-8 mt-2 space-y-1">
                      {listSubNav.map((subItem) => {
                        const SubIcon = subItem.icon
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors",
                              pathname === subItem.href
                                ? "text-primary font-medium"
                                : "text-muted-foreground hover:text-sidebar-foreground",
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <SubIcon className="h-4 w-4" />
                            {subItem.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {/* Master sub-navigation */}
                  {item.href === "/masters" && expandedMenu === "/masters" && (
                    <div className="ml-8 mt-2 space-y-1">
                      {masterSubNav.map((subItem) => {
                        const SubIcon = subItem.icon
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors",
                              pathname === subItem.href
                                ? "text-primary font-medium"
                                : "text-muted-foreground hover:text-sidebar-foreground",
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <SubIcon className="h-4 w-4" />
                            {subItem.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.name?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground">
                  {user?.name || 'ユーザー'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full mt-2 justify-start text-muted-foreground hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
