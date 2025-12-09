import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test data for invoice generation...');

  // 1. Create category
  const category = await prisma.category.upsert({
    where: { name: '野菜' },
    update: {},
    create: { name: '野菜' }
  });
  console.log('Category created:', category.name);

  const category2 = await prisma.category.upsert({
    where: { name: '果物' },
    update: {},
    create: { name: '果物' }
  });
  console.log('Category created:', category2.name);

  // 2. Create supplier
  const supplier = await prisma.supplier.upsert({
    where: { companyName: 'テスト農園' },
    update: {},
    create: {
      companyName: 'テスト農園',
      contactPerson: '山田太郎',
      phone: '090-1234-5678',
      address: '東京都渋谷区1-1-1',
      paymentTerms: '30days',
      deliveryConditions: '翌日配送'
    }
  });
  console.log('Supplier created:', supplier.companyName);

  // 3. Create billing customer (請求先)
  const billingCustomer = await prisma.customer.upsert({
    where: { companyName: 'ABC本社（請求先）' },
    update: {},
    create: {
      companyName: 'ABC本社（請求先）',
      contactPerson: '佐藤経理',
      phone: '03-1111-2222',
      deliveryAddress: '東京都港区2-2-2',
      billingAddress: '東京都港区2-2-2 本社ビル',
      billingCycle: 'monthly',
      billingDay: 31,
      paymentTerms: '30days',
      invoiceRegistrationNumber: 'T1234567890123'
    }
  });
  console.log('Billing customer created:', billingCustomer.companyName);

  // 4. Create delivery customers (納品先) linked to billing customer
  const deliveryCustomer1 = await prisma.customer.upsert({
    where: { companyName: 'ABC渋谷店（納品先）' },
    update: { billingCustomerId: billingCustomer.id },
    create: {
      companyName: 'ABC渋谷店（納品先）',
      contactPerson: '田中店長',
      phone: '03-3333-4444',
      deliveryAddress: '東京都渋谷区3-3-3 渋谷店',
      billingAddress: '東京都渋谷区3-3-3',
      billingCustomerId: billingCustomer.id
    }
  });
  console.log('Delivery customer 1 created:', deliveryCustomer1.companyName);

  const deliveryCustomer2 = await prisma.customer.upsert({
    where: { companyName: 'ABC新宿店（納品先）' },
    update: { billingCustomerId: billingCustomer.id },
    create: {
      companyName: 'ABC新宿店（納品先）',
      contactPerson: '鈴木店長',
      phone: '03-5555-6666',
      deliveryAddress: '東京都新宿区4-4-4 新宿店',
      billingAddress: '東京都新宿区4-4-4',
      billingCustomerId: billingCustomer.id
    }
  });
  console.log('Delivery customer 2 created:', deliveryCustomer2.companyName);

  const deliveryCustomer3 = await prisma.customer.upsert({
    where: { companyName: 'ABC池袋店（納品先）' },
    update: { billingCustomerId: billingCustomer.id },
    create: {
      companyName: 'ABC池袋店（納品先）',
      contactPerson: '高橋店長',
      phone: '03-7777-8888',
      deliveryAddress: '東京都豊島区5-5-5 池袋店',
      billingAddress: '東京都豊島区5-5-5',
      billingCustomerId: billingCustomer.id
    }
  });
  console.log('Delivery customer 3 created:', deliveryCustomer3.companyName);

  // 5. Create purchases (11月分)
  const purchases = [];

  // Purchase 1: トマト
  const purchase1 = await prisma.purchase.create({
    data: {
      productName: 'トマト',
      categoryId: category.id,
      quantity: 100,
      unit: 'kg',
      unitPrice: 300,
      price: 30000,
      supplierId: supplier.id,
      purchaseDate: new Date('2024-11-01'),
      status: 'PARTIAL',
      remainingQuantity: 40
    }
  });
  purchases.push(purchase1);
  console.log('Purchase created:', purchase1.productName);

  // Purchase 2: キャベツ
  const purchase2 = await prisma.purchase.create({
    data: {
      productName: 'キャベツ',
      categoryId: category.id,
      quantity: 50,
      unit: '個',
      unitPrice: 150,
      price: 7500,
      supplierId: supplier.id,
      purchaseDate: new Date('2024-11-05'),
      status: 'PARTIAL',
      remainingQuantity: 20
    }
  });
  purchases.push(purchase2);
  console.log('Purchase created:', purchase2.productName);

  // Purchase 3: りんご
  const purchase3 = await prisma.purchase.create({
    data: {
      productName: 'りんご',
      categoryId: category2.id,
      quantity: 200,
      unit: '個',
      unitPrice: 100,
      price: 20000,
      supplierId: supplier.id,
      purchaseDate: new Date('2024-11-10'),
      status: 'PARTIAL',
      remainingQuantity: 80
    }
  });
  purchases.push(purchase3);
  console.log('Purchase created:', purchase3.productName);

  // Purchase 4: にんじん
  const purchase4 = await prisma.purchase.create({
    data: {
      productName: 'にんじん',
      categoryId: category.id,
      quantity: 80,
      unit: 'kg',
      unitPrice: 200,
      price: 16000,
      supplierId: supplier.id,
      purchaseDate: new Date('2024-11-15'),
      status: 'PARTIAL',
      remainingQuantity: 30
    }
  });
  purchases.push(purchase4);
  console.log('Purchase created:', purchase4.productName);

  // 6. Create deliveries (11月分、複数納品先へ)

  // Delivery 1: 渋谷店へ 11/10
  const delivery1 = await prisma.delivery.create({
    data: {
      customerId: deliveryCustomer1.id,
      deliveryDate: new Date('2024-11-10'),
      totalAmount: 0,
      status: 'DELIVERED',
      inputMode: 'NORMAL',
      purchaseLinkStatus: 'LINKED',
      items: {
        create: [
          {
            purchaseId: purchase1.id,
            quantity: 20,
            unitPrice: 350,
            amount: 7560, // 7000 + 560 (8% tax)
            unit: 'kg',
            taxRate: 8
          },
          {
            purchaseId: purchase2.id,
            quantity: 10,
            unitPrice: 180,
            amount: 1944, // 1800 + 144 (8% tax)
            unit: '個',
            taxRate: 8
          }
        ]
      }
    }
  });
  // Update totalAmount
  await prisma.delivery.update({
    where: { id: delivery1.id },
    data: { totalAmount: 9504 }
  });
  console.log('Delivery 1 created: 渋谷店 11/10');

  // Delivery 2: 新宿店へ 11/15
  const delivery2 = await prisma.delivery.create({
    data: {
      customerId: deliveryCustomer2.id,
      deliveryDate: new Date('2024-11-15'),
      totalAmount: 0,
      status: 'DELIVERED',
      inputMode: 'NORMAL',
      purchaseLinkStatus: 'LINKED',
      items: {
        create: [
          {
            purchaseId: purchase1.id,
            quantity: 15,
            unitPrice: 350,
            amount: 5670, // 5250 + 420 (8% tax)
            unit: 'kg',
            taxRate: 8
          },
          {
            purchaseId: purchase3.id,
            quantity: 50,
            unitPrice: 120,
            amount: 6480, // 6000 + 480 (8% tax)
            unit: '個',
            taxRate: 8
          }
        ]
      }
    }
  });
  await prisma.delivery.update({
    where: { id: delivery2.id },
    data: { totalAmount: 12150 }
  });
  console.log('Delivery 2 created: 新宿店 11/15');

  // Delivery 3: 池袋店へ 11/20
  const delivery3 = await prisma.delivery.create({
    data: {
      customerId: deliveryCustomer3.id,
      deliveryDate: new Date('2024-11-20'),
      totalAmount: 0,
      status: 'DELIVERED',
      inputMode: 'NORMAL',
      purchaseLinkStatus: 'LINKED',
      items: {
        create: [
          {
            purchaseId: purchase3.id,
            quantity: 30,
            unitPrice: 120,
            amount: 3888, // 3600 + 288 (8% tax)
            unit: '個',
            taxRate: 8
          },
          {
            purchaseId: purchase4.id,
            quantity: 25,
            unitPrice: 250,
            amount: 6750, // 6250 + 500 (8% tax)
            unit: 'kg',
            taxRate: 8
          }
        ]
      }
    }
  });
  await prisma.delivery.update({
    where: { id: delivery3.id },
    data: { totalAmount: 10638 }
  });
  console.log('Delivery 3 created: 池袋店 11/20');

  // Delivery 4: 渋谷店へ 11/25 (2回目)
  const delivery4 = await prisma.delivery.create({
    data: {
      customerId: deliveryCustomer1.id,
      deliveryDate: new Date('2024-11-25'),
      totalAmount: 0,
      status: 'DELIVERED',
      inputMode: 'NORMAL',
      purchaseLinkStatus: 'LINKED',
      items: {
        create: [
          {
            purchaseId: purchase4.id,
            quantity: 20,
            unitPrice: 250,
            amount: 5400, // 5000 + 400 (8% tax)
            unit: 'kg',
            taxRate: 8
          },
          {
            purchaseId: purchase3.id,
            quantity: 40,
            unitPrice: 120,
            amount: 5184, // 4800 + 384 (8% tax)
            unit: '個',
            taxRate: 8
          }
        ]
      }
    }
  });
  await prisma.delivery.update({
    where: { id: delivery4.id },
    data: { totalAmount: 10584 }
  });
  console.log('Delivery 4 created: 渋谷店 11/25');

  console.log('\n=== Test Data Summary ===');
  console.log('Billing Customer:', billingCustomer.companyName, '(ID:', billingCustomer.id, ')');
  console.log('Delivery Customers:');
  console.log('  -', deliveryCustomer1.companyName);
  console.log('  -', deliveryCustomer2.companyName);
  console.log('  -', deliveryCustomer3.companyName);
  console.log('\nDeliveries created: 4 (11/10, 11/15, 11/20, 11/25)');
  console.log('\nTo test invoice creation, call:');
  console.log(`POST /api/google-sheets/create-invoice`);
  console.log(`Body: { "billingCustomerId": "${billingCustomer.id}", "startDate": "2024-11-01", "endDate": "2024-11-30" }`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
