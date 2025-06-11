import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AchievementStats } from '../achievement-stats'
import type { UserBucketStats } from '~/features/bucket-list/types'

describe('AchievementStats', () => {
  const mockStats: UserBucketStats = {
    profile_id: 'test-user',
    display_name: 'Test User',
    total_items: 10,
    completed_items: 3,
    in_progress_items: 2,
    not_started_items: 5,
    completion_rate: 30,
  }

  it('should render achievement statistics correctly', () => {
    render(<AchievementStats stats={mockStats} />)

    expect(screen.getByText('達成状況')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // total items
    expect(screen.getByText('3')).toBeInTheDocument() // completed items
  })

  it('should handle missing stats gracefully', () => {
    const emptyStats: UserBucketStats = {
      profile_id: 'test-user',
      display_name: 'Test User',
      total_items: 0,
      completed_items: 0,
      in_progress_items: 0,
      not_started_items: 0,
      completion_rate: 0,
    }

    render(<AchievementStats stats={emptyStats} />)

    expect(screen.getByText('達成状況')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(4) // should show 0 for all stats
  })

  it('should display completion rate with correct formatting', () => {
    const statsWithHighCompletion: UserBucketStats = {
      ...mockStats,
      completion_rate: 85.5,
    }

    render(<AchievementStats stats={statsWithHighCompletion} />)

    expect(screen.getByText('85.5%')).toBeInTheDocument()
  })

  it('should show correct labels for different stats', () => {
    render(<AchievementStats stats={mockStats} />)

    expect(screen.getByText('総項目数')).toBeInTheDocument()
    expect(screen.getByText('完了')).toBeInTheDocument()
    expect(screen.getByText('進行中')).toBeInTheDocument()
    expect(screen.getByText('未着手')).toBeInTheDocument()
  })
})