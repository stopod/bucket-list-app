// Database types
export type { 
  Database, 
  Tables, 
  TablesInsert, 
  TablesUpdate, 
  Enums, 
  CompositeTypes, 
  Json 
} from './database';

// Common application types
export interface ApiError {
  message: string;
  code?: string;
}

export interface LoaderData {
  [key: string]: any;
}

export interface ActionData {
  error?: string;
  success?: string;
  [key: string]: any;
}