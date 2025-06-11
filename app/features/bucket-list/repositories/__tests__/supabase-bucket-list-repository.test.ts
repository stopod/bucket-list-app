import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SupabaseBucketListRepository } from '../supabase-bucket-list-repository'
import type { Database } from '~/shared/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BucketItemInsert, BucketItemUpdate } from '~/features/bucket-list/types'

describe('SupabaseBucketListRepository', () => {
  let repository: SupabaseBucketListRepository
  let mockSupabaseClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a more complete mock that properly simulates Supabase query chaining
    const createMockQuery = (resolvedValue: any) => {
      const query = {
        select: vi.fn().mockReturnValue(query),
        insert: vi.fn().mockReturnValue(query),
        update: vi.fn().mockReturnValue(query),
        delete: vi.fn().mockReturnValue(query),
        eq: vi.fn().mockReturnValue(query),
        order: vi.fn().mockReturnValue(query),
        single: vi.fn().mockReturnValue(Promise.resolve(resolvedValue)),
        then: vi.fn().mockImplementation((onResolve) => Promise.resolve(resolvedValue).then(onResolve)),
      }
      return query
    }

    mockSupabaseClient = {
      from: vi.fn(() => createMockQuery({ data: [], error: null }))
    } as unknown as SupabaseClient<Database>

    repository = new SupabaseBucketListRepository(mockSupabaseClient, 'test-user-id')
  })

  describe('findAll', () => {
    it('should fetch all bucket items successfully', async () => {
      const mockData = [
        { id: '1', title: 'Test Item 1', profile_id: 'test-user-id' },
        { id: '2', title: 'Test Item 2', profile_id: 'test-user-id' },
      ]
      
      // Override the from method to return our specific mock
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockData, error: null })
      }
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      const result = await repository.findAll()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bucket_items')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockData)
    })

    it('should throw error when database query fails', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: null, error: mockError })
      }
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      await expect(repository.findAll()).rejects.toThrow('Failed to fetch bucket items: Database error')
    })
  })

  describe('findById', () => {
    it('should fetch bucket item by id successfully', async () => {
      const mockData = { id: '1', title: 'Test Item', profile_id: 'test-user-id' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null })
      }
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      const result = await repository.findById('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bucket_items')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockData)
    })

    it('should return null when item not found', async () => {
      const mockError = { code: 'PGRST116', message: 'No rows found' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      }
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create bucket item successfully', async () => {
      const mockInsertData: BucketItemInsert = {
        title: 'New Item',
        profile_id: 'test-user-id',
        category_id: 1,
        priority: 'medium',
        status: 'not_started',
        is_public: false,
      }

      const mockCreatedData = { id: '1', ...mockInsertData, created_at: '2024-01-01T00:00:00Z' }
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedData, error: null })
      }
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      const result = await repository.create(mockInsertData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bucket_items')
      expect(mockQuery.insert).toHaveBeenCalled()
      expect(mockQuery.select).toHaveBeenCalled()
      expect(result).toEqual(mockCreatedData)
    })

    it('should throw error when creation fails', async () => {
      const mockInsertData: BucketItemInsert = {
        title: 'New Item',
        profile_id: 'test-user-id',
        category_id: 1,
        priority: 'medium',
        status: 'not_started',
        is_public: false,
      }

      const mockError = { message: 'Insert failed', code: 'INSERT_ERROR' }
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      }
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      await expect(repository.create(mockInsertData)).rejects.toThrow('Failed to create bucket item: Insert failed')
    })
  })

  describe('update', () => {
    it('should update bucket item successfully', async () => {
      const mockUpdateData: BucketItemUpdate = {
        title: 'Updated Item',
        status: 'completed',
      }

      const mockUpdatedData = { id: '1', ...mockUpdateData, updated_at: '2024-01-01T00:00:00Z' }
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedData, error: null })
      }
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      const result = await repository.update('1', mockUpdateData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bucket_items')
      expect(mockQuery.update).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockUpdatedData)
    })
  })

  describe('delete', () => {
    it('should delete bucket item successfully', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }
      // Make the query itself a promise
      Object.assign(mockQuery, Promise.resolve({ data: null, error: null }))
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      await repository.delete('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bucket_items')
      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
    })

    it('should throw error when deletion fails', async () => {
      const mockError = { message: 'Delete failed', code: 'DELETE_ERROR' }
      
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }
      // Make the query itself a promise with error
      Object.assign(mockQuery, Promise.resolve({ data: null, error: mockError }))
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      await expect(repository.delete('1')).rejects.toThrow('Failed to delete bucket item: Delete failed')
    })
  })

  describe('findAllCategories', () => {
    it('should fetch all categories successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Travel', color: 'blue' },
        { id: 2, name: 'Learning', color: 'green' },
      ]
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }
      // Make the query itself a promise
      Object.assign(mockQuery, Promise.resolve({ data: mockCategories, error: null }))
      mockSupabaseClient.from = vi.fn(() => mockQuery)

      const result = await repository.findAllCategories()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.order).toHaveBeenCalledWith('id')
      expect(result).toEqual(mockCategories)
    })
  })
})