import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type { 
  BucketItem, 
  BucketItemInsert, 
  BucketItemUpdate, 
  Category, 
  UserBucketStats,
  BucketListFilters,
  BucketListSort
} from "../types";
import type { 
  BucketListRepository,
  RepositoryResult
} from "./bucket-list-repository";
import { 
  BucketListRepositoryError,
  createSuccess,
  createError
} from "./bucket-list-repository";

export class SupabaseBucketListRepository implements BucketListRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findAll(filters?: BucketListFilters, sort?: BucketListSort): Promise<BucketItem[]> {
    let query = this.supabase.from("bucket_items").select("*");
    
    query = this.applyFilters(query, filters);
    query = this.applySort(query, sort);

    const { data, error } = await query;
    
    if (error) {
      throw new BucketListRepositoryError(`Failed to fetch bucket items: ${error.message}`, error.code);
    }

    return data || [];
  }

  async findAllWithCategory(filters?: BucketListFilters, sort?: BucketListSort): Promise<(BucketItem & { category: Category })[]> {
    let query = this.supabase
      .from("bucket_items")
      .select(`
        *,
        category:categories(*)
      `);
    
    query = this.applyFilters(query, filters);
    query = this.applySort(query, sort);

    const { data, error } = await query;
    
    if (error) {
      throw new BucketListRepositoryError(`Failed to fetch bucket items with categories: ${error.message}`, error.code);
    }

    return data as (BucketItem & { category: Category })[] || [];
  }

  async findById(id: string): Promise<BucketItem | null> {
    const { data, error } = await this.supabase
      .from("bucket_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") { // No rows found
        return null;
      }
      throw new BucketListRepositoryError(`Failed to fetch bucket item: ${error.message}`, error.code);
    }

    return data;
  }

  async findByProfileId(profileId: string, filters?: BucketListFilters, sort?: BucketListSort): Promise<BucketItem[]> {
    let query = this.supabase
      .from("bucket_items")
      .select("*")
      .eq("profile_id", profileId);
    
    query = this.applyFilters(query, filters);
    query = this.applySort(query, sort);

    const { data, error } = await query;
    
    if (error) {
      throw new BucketListRepositoryError(`Failed to fetch user bucket items: ${error.message}`, error.code);
    }

    return data || [];
  }

  async findPublic(filters?: BucketListFilters, sort?: BucketListSort): Promise<BucketItem[]> {
    let query = this.supabase
      .from("bucket_items")
      .select("*")
      .eq("is_public", true);
    
    query = this.applyFilters(query, filters);
    query = this.applySort(query, sort);

    const { data, error } = await query;
    
    if (error) {
      throw new BucketListRepositoryError(`Failed to fetch public bucket items: ${error.message}`, error.code);
    }

    return data || [];
  }

  async create(data: BucketItemInsert): Promise<BucketItem> {
    const now = new Date().toISOString();
    const insertData = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    const { data: result, error } = await this.supabase
      .from("bucket_items")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new BucketListRepositoryError(`Failed to create bucket item: ${error.message}`, error.code);
    }

    return result;
  }

  async update(id: string, data: BucketItemUpdate): Promise<BucketItem> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.supabase
      .from("bucket_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new BucketListRepositoryError(`Failed to update bucket item: ${error.message}`, error.code);
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("bucket_items")
      .delete()
      .eq("id", id);

    if (error) {
      throw new BucketListRepositoryError(`Failed to delete bucket item: ${error.message}`, error.code);
    }
  }

  async findAllCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("*")
      .order("id");

    if (error) {
      throw new BucketListRepositoryError(`Failed to fetch categories: ${error.message}`, error.code);
    }

    return data || [];
  }

  async findCategoryById(id: number): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") { // No rows found
        return null;
      }
      throw new BucketListRepositoryError(`Failed to fetch category: ${error.message}`, error.code);
    }

    return data;
  }

  async getUserStats(profileId: string): Promise<UserBucketStats | null> {
    const { data, error } = await this.supabase
      .from("user_bucket_stats")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    if (error) {
      if (error.code === "PGRST116") { // No rows found
        return null;
      }
      throw new BucketListRepositoryError(`Failed to fetch user stats: ${error.message}`, error.code);
    }

    return data;
  }

  // プライベートヘルパーメソッド
  private applyFilters(query: any, filters?: BucketListFilters) {
    if (!filters) return query;

    if (filters.profile_id) {
      query = query.eq("profile_id", filters.profile_id);
    }
    if (filters.category_id) {
      query = query.eq("category_id", filters.category_id);
    }
    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.is_public !== undefined) {
      query = query.eq("is_public", filters.is_public);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    return query;
  }

  private applySort(query: any, sort?: BucketListSort) {
    if (!sort) {
      return query.order("created_at", { ascending: false });
    }

    return query.order(sort.field, { ascending: sort.direction === "asc" });
  }
}