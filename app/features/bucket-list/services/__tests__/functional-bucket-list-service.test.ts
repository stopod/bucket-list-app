import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getUserBucketItems,
  getUserBucketItemsWithCategory,
  getBucketItem,
  createBucketItem,
  updateBucketItem,
  deleteBucketItem,
  getCategories,
  getUserStats,
  getDashboardData,
} from '../functional-bucket-list-service'
import type { BucketListRepository } from '~/features/bucket-list/repositories'
import type { BucketItem, BucketItemInsert, Category, UserBucketStats } from '~/features/bucket-list/types'
import type { BucketListError } from '~/shared/types/errors'
import { isSuccess, isFailure } from '~/shared/types/result'

// Mock Repository
const mockRepository: BucketListRepository = {
  findAll: vi.fn(),
  findAllWithCategory: vi.fn(),
  findById: vi.fn(),
  findByProfileId: vi.fn(),
  findPublic: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAllCategories: vi.fn(),
  findCategoryById: vi.fn(),
  getUserStats: vi.fn(),
}

const mockBucketItem: BucketItem = {
  id: '1',
  title: 'Test Item',
  description: null,
  profile_id: 'user-1',
  category_id: 1,
  priority: 'medium',
  status: 'not_started',
  due_date: null,
  due_type: null,
  is_public: false,
  completed_at: null,
  completion_comment: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockCategory: Category = {
  id: 1,
  name: 'Test Category',
  color: '#blue',
  created_at: '2024-01-01T00:00:00Z',
}

const mockUserStats: UserBucketStats = {
  profile_id: 'user-1',
  display_name: 'Test User',
  total_items: 10,
  completed_items: 3,
  in_progress_items: 2,
  not_started_items: 5,
  completion_rate: 30,
}

describe('Functional BucketListService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserBucketItems', () => {
    it('正常な場合、ユーザーのバケットリスト項目がResult<Success>で返されること', async () => {
      const profileId = 'user-1'
      const mockItems: BucketItem[] = [mockBucketItem]

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue(mockItems)

      const result = await getUserBucketItems(mockRepository)(profileId)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockItems)
      }
      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(profileId, undefined, undefined)
    })

    it('リポジトリでエラーが発生した場合、Result<Failure>で返されること', async () => {
      const profileId = 'user-1'
      const error = new Error('Database error')

      vi.mocked(mockRepository.findByProfileId).mockRejectedValue(error)

      const result = await getUserBucketItems(mockRepository)(profileId)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toContain('Database error')
      }
    })

    it('フィルターとソート条件を指定した場合、適切にリポジトリに渡されること', async () => {
      const profileId = 'user-1'
      const filters = { status: 'completed' as const }
      const sort = { field: 'created_at' as const, direction: 'desc' as const }

      vi.mocked(mockRepository.findByProfileId).mockResolvedValue([])

      const result = await getUserBucketItems(mockRepository)(profileId, filters, sort)

      expect(isSuccess(result)).toBe(true)
      expect(mockRepository.findByProfileId).toHaveBeenCalledWith(profileId, filters, sort)
    })
  })

  describe('getUserBucketItemsWithCategory', () => {
    it('正常な場合、カテゴリ情報付きの項目がResult<Success>で返されること', async () => {
      const profileId = 'user-1'
      const mockItemsWithCategory = [{ ...mockBucketItem, category: mockCategory }]

      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(mockItemsWithCategory)

      const result = await getUserBucketItemsWithCategory(mockRepository)(profileId)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockItemsWithCategory)
        expect(result.data[0]).toHaveProperty('category')
      }
    })
  })

  describe('getBucketItem', () => {
    it('項目が存在する場合、Result<Success>で項目が返されること', async () => {
      const itemId = '1'

      vi.mocked(mockRepository.findById).mockResolvedValue(mockBucketItem)

      const result = await getBucketItem(mockRepository)(itemId)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockBucketItem)
      }
    })

    it('項目が存在しない場合、Result<Failure>で返されること', async () => {
      const itemId = 'nonexistent'

      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const result = await getBucketItem(mockRepository)(itemId)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toContain('not found')
      }
    })
  })

  describe('createBucketItem', () => {
    it('有効なデータの場合、Result<Success>で新しい項目が返されること', async () => {
      const newItemData: BucketItemInsert = {
        title: 'New Item',
        profile_id: 'user-1',
        category_id: 1,
        priority: 'high',
        status: 'not_started',
        is_public: false,
      }

      vi.mocked(mockRepository.create).mockResolvedValue(mockBucketItem)

      const result = await createBucketItem(mockRepository)(newItemData)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockBucketItem)
      }
      expect(mockRepository.create).toHaveBeenCalledWith(newItemData)
    })

    it('無効なデータ（空のタイトル）の場合、Result<Failure>で返されること', async () => {
      const invalidData: BucketItemInsert = {
        title: '',
        profile_id: 'user-1',
        category_id: 1,
        priority: 'high',
        status: 'not_started',
        is_public: false,
      }

      const result = await createBucketItem(mockRepository)(invalidData)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.type).toBe('ValidationError')
      }
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('タイトルが長すぎる場合、Result<Failure>で返されること', async () => {
      const invalidData: BucketItemInsert = {
        title: 'a'.repeat(201), // 200文字を超える
        profile_id: 'user-1',
        category_id: 1,
        priority: 'high',
        status: 'not_started',
        is_public: false,
      }

      const result = await createBucketItem(mockRepository)(invalidData)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.type).toBe('ValidationError')
        expect(result.error.message).toContain('200文字以内')
      }
    })
  })

  describe('updateBucketItem', () => {
    it('有効なデータの場合、Result<Success>で更新された項目が返されること', async () => {
      const itemId = '1'
      const updateData = { title: 'Updated Title' }
      const updatedItem = { ...mockBucketItem, title: 'Updated Title' }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockBucketItem)
      vi.mocked(mockRepository.update).mockResolvedValue(updatedItem)

      const result = await updateBucketItem(mockRepository)(itemId, updateData)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data.title).toBe('Updated Title')
      }
    })

    it('完了済み項目を編集しようとした場合、Result<Failure>で返されること', async () => {
      const itemId = '1'
      const completedItem = { ...mockBucketItem, status: 'completed' as const }
      const updateData = { title: 'Updated Title' }

      vi.mocked(mockRepository.findById).mockResolvedValue(completedItem)

      const result = await updateBucketItem(mockRepository)(itemId, updateData)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.type).toBe('BusinessRuleError')
        expect(result.error.message).toContain('完了済みのアイテムは編集できません')
      }
      expect(mockRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteBucketItem', () => {
    it('正常な場合、Result<Success>で削除が完了すること', async () => {
      const itemId = '1'

      vi.mocked(mockRepository.delete).mockResolvedValue()

      const result = await deleteBucketItem(mockRepository)(itemId)

      expect(isSuccess(result)).toBe(true)
      expect(mockRepository.delete).toHaveBeenCalledWith(itemId)
    })

    it('削除に失敗した場合、Result<Failure>で返されること', async () => {
      const itemId = '1'
      const error = new Error('Delete failed')

      vi.mocked(mockRepository.delete).mockRejectedValue(error)

      const result = await deleteBucketItem(mockRepository)(itemId)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toContain('Delete failed')
      }
    })
  })

  describe('getCategories', () => {
    it('正常な場合、Result<Success>でカテゴリ一覧が返されること', async () => {
      const mockCategories: Category[] = [mockCategory]

      vi.mocked(mockRepository.findAllCategories).mockResolvedValue(mockCategories)

      const result = await getCategories(mockRepository)()

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockCategories)
      }
    })
  })

  describe('getUserStats', () => {
    it('統計情報が存在する場合、Result<Success>で統計が返されること', async () => {
      const profileId = 'user-1'

      vi.mocked(mockRepository.getUserStats).mockResolvedValue(mockUserStats)

      const result = await getUserStats(mockRepository)(profileId)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockUserStats)
      }
    })

    it('統計情報が存在しない場合、Result<Failure>で返されること', async () => {
      const profileId = 'user-1'

      vi.mocked(mockRepository.getUserStats).mockResolvedValue(null)

      const result = await getUserStats(mockRepository)(profileId)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toContain('not found')
      }
    })
  })

  describe('getDashboardData', () => {
    it('正常な場合、Result<Success>でダッシュボードデータが返されること', async () => {
      const profileId = 'user-1'
      const mockItemsWithCategory = [{ ...mockBucketItem, category: mockCategory }]
      const mockCategories = [mockCategory]

      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue(mockItemsWithCategory)
      vi.mocked(mockRepository.findAllCategories).mockResolvedValue(mockCategories)

      const result = await getDashboardData(mockRepository)(profileId)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toHaveProperty('items')
        expect(result.data).toHaveProperty('categories')
        expect(result.data).toHaveProperty('stats')
        expect(result.data).toHaveProperty('itemsByCategory')
        expect(result.data).toHaveProperty('recentCompletedItems')
        expect(result.data).toHaveProperty('upcomingItems')
        
        expect(result.data.items).toEqual(mockItemsWithCategory)
        expect(result.data.categories).toEqual(mockCategories)
        expect(result.data.stats).toMatchObject({
          total_items: 1,
          completed_items: 0,
          in_progress_items: 0,
          not_started_items: 1,
          completion_rate: 0,
        })
      }
    })

    it('項目取得に失敗した場合、Result<Failure>で返されること', async () => {
      const profileId = 'user-1'
      const error = new Error('Items fetch failed')

      vi.mocked(mockRepository.findAllWithCategory).mockRejectedValue(error)
      vi.mocked(mockRepository.findAllCategories).mockResolvedValue([])

      const result = await getDashboardData(mockRepository)(profileId)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toContain('Items fetch failed')
      }
    })

    it('カテゴリ取得に失敗した場合、Result<Failure>で返されること', async () => {
      const profileId = 'user-1'
      const error = new Error('Categories fetch failed')

      vi.mocked(mockRepository.findAllWithCategory).mockResolvedValue([])
      vi.mocked(mockRepository.findAllCategories).mockRejectedValue(error)

      const result = await getDashboardData(mockRepository)(profileId)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toContain('Categories fetch failed')
      }
    })
  })
})