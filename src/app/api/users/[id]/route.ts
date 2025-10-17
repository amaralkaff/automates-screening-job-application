import { NextResponse } from 'next/server'

// Mock user data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
]

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  const user = users.find(u => u.id === id)

  if (!user) {
    return NextResponse.json(
      { error: 'User not found', status: 'error' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    user,
    status: 'success'
  })
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()

    const userIndex = users.findIndex(u => u.id === id)

    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found', status: 'error' },
        { status: 404 }
      )
    }

    // Update user (in real app, this would be a database update)
    users[userIndex] = { ...users[userIndex], ...body }

    return NextResponse.json({
      message: 'User updated successfully',
      user: users[userIndex],
      status: 'success'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON data', status: 'error' },
      { status: 400 }
    )
  }
}