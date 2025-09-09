import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { freeeClient } from '@/lib/freee-client'

// POST /api/freee/sync-partners - Sync all customers and suppliers to freee partners
export async function POST(request: NextRequest) {
  try {
    requireAuth(request)

    const results = {
      customers: { synced: 0, errors: 0, details: [] as any[] },
      suppliers: { synced: 0, errors: 0, details: [] as any[] }
    }

    // Sync customers
    const customers = await prisma.customer.findMany()
    for (const customer of customers) {
      const result = await freeeClient.syncCustomerToPartner({
        id: customer.id,
        companyName: customer.companyName,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        deliveryAddress: customer.deliveryAddress,
        billingAddress: customer.billingAddress
      })

      if (result.data) {
        results.customers.synced++
        results.customers.details.push({
          customer: customer.companyName,
          freeePartnerId: result.data.id,
          status: 'success'
        })
      } else {
        results.customers.errors++
        results.customers.details.push({
          customer: customer.companyName,
          error: result.error,
          status: 'error'
        })
      }
    }

    // Sync suppliers
    const suppliers = await prisma.supplier.findMany()
    for (const supplier of suppliers) {
      const result = await freeeClient.syncSupplierToPartner({
        id: supplier.id,
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        address: supplier.address
      })

      if (result.data) {
        results.suppliers.synced++
        results.suppliers.details.push({
          supplier: supplier.companyName,
          freeePartnerId: result.data.id,
          status: 'success'
        })
      } else {
        results.suppliers.errors++
        results.suppliers.details.push({
          supplier: supplier.companyName,
          error: result.error,
          status: 'error'
        })
      }
    }

    return NextResponse.json({
      message: 'Partner sync completed',
      results
    })

  } catch (error: any) {
    console.error('Sync partners error:', error)
    return NextResponse.json(
      { error: error.message || 'パートナー同期に失敗しました' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}