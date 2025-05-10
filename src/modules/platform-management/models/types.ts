/**
 * Platform Types
 */
export enum PlatformType {
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube',
  LOCAL_CSV = 'local_csv',
  LOCAL_JSON = 'local_json',
  LOCAL_EXCEL = 'local_excel',
}

/**
 * Data Source Types
 */
export enum DataSourceType {
  SOCIAL_MEDIA = 'social_media',
  WEBSITE = 'website',
  CRM = 'crm',
  LOCAL_FILE = 'local_file',
  CUSTOM = 'custom',
}

/**
 * Connection Status
 */
export enum ConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * OAuth Credentials
 */
export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

/**
 * Local Data Configuration
 */
export interface LocalDataConfig {
  lastUploadedFiles: Array<{
    filename: string;
    uploadedAt: Date;
    size: number;
    rows?: number;
  }>;
}

/**
 * Sync Settings
 */
export interface SyncSettings {
  autoSync: boolean;
  syncInterval?: number; // in minutes
  lastSync?: Date;
  nextScheduledSync?: Date;
}

/**
 * Data Source
 */
export interface DataSource {
  id: string;
  name: string;
  platform: PlatformType;
  type: DataSourceType;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  config: OAuthCredentials | LocalDataConfig;
  syncSettings: SyncSettings;
  lastSync?: Date;
  nextScheduledSync?: Date;
}

/**
 * Query Parameters
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

/**
 * Standardized Data
 */
export interface StandardizedData {
  items: Array<Record<string, any>>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
} 