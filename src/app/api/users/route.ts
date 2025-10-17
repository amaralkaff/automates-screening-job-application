import { NextResponse } from 'next/server'

// Mock user data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
]

export async function GET() {
  return NextResponse.json({
    users,
    count: users.length,
    status: 'success'
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required', status: 'error' },
        { status: 400 }
      )
    }

    // Create new user (in real app, this would be a database insert)
    const newUser = {
      id: users.length + 1,
      name,
      email
    }

    users.push(newUser)

    return NextResponse.json({
      message: 'User created successfully',
      user: newUser,
      status: 'success'
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON data', status: 'error' },
      { status: 400 }
    )
  }
}