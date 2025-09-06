"use client"

import type React from "react"

import { Sidebar } from "./sidebar"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64">
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
