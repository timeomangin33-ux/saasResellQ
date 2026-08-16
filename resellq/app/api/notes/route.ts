import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'ok',
        note: { title, content },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Il y a un problème.' }, { status: 500 });
  }
}