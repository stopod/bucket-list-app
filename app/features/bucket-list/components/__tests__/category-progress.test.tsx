import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryProgress } from '../category-progress'
import type { Category, BucketItem } from '~/features/bucket-list/types'

describe('CategoryProgress', () => {
  const mockCategory: Category = {
    id: 1,
    name: 'Travel',
    color: 'blue',
    created_at: '2024-01-01T00:00:00Z',
  }

  const mockItems: BucketItem[] = [
    {
      id: '1',
      title: 'Visit Japan',
      description: null,
      profile_id: 'user-1',
      category_id: 1,
      priority: 'high',
      status: 'completed',
      due_date: null,
      due_type: null,
      is_public: false,
      completed_at: '2024-01-01T00:00:00Z',
      completion_comment: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Visit Paris',
      description: null,
      profile_id: 'user-1',
      category_id: 1,
      priority: 'medium',
      status: 'in_progress',
      due_date: null,
      due_type: null,
      is_public: false,
      completed_at: null,
      completion_comment: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      title: 'Visit London',
      description: null,
      profile_id: 'user-1',
      category_id: 1,
      priority: 'low',
      status: 'not_started',
      due_date: null,
      due_type: null,
      is_public: false,
      completed_at: null,
      completion_comment: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  it('should render category name and progress correctly', () => {
    render(<CategoryProgress category={mockCategory} items={mockItems} />)

    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('1/3 完了')).toBeInTheDocument()
  })

  it('should display correct completion percentage', () => {
    render(<CategoryProgress category={mockCategory} items={mockItems} />)

    // 1 completed out of 3 items = 33.33%
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('should handle empty items array', () => {
    render(<CategoryProgress category={mockCategory} items={[]} />)

    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('0/0 完了')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should handle all completed items', () => {
    const allCompletedItems = mockItems.map(item => ({
      ...item,
      status: 'completed' as const,
    }))

    render(<CategoryProgress category={mockCategory} items={allCompletedItems} />)

    expect(screen.getByText('3/3 完了')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('should display progress bar with correct accessibility', () => {
    render(<CategoryProgress category={mockCategory} items={mockItems} />)

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '33')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })
})