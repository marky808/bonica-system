import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const whereClause = type ? { type } : {};

    const templates = await prisma.googleSheetTemplate.findMany({
      where: whereClause,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching Google Sheet templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, templateSheetId } = body;

    if (!name || !type || !templateSheetId) {
      return NextResponse.json(
        { error: 'Name, type, and templateSheetId are required' },
        { status: 400 }
      );
    }

    if (!['delivery', 'invoice'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "delivery" or "invoice"' },
        { status: 400 }
      );
    }

    const template = await prisma.googleSheetTemplate.create({
      data: {
        name,
        type,
        templateSheetId
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating Google Sheet template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}