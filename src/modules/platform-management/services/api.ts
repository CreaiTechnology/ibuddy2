import axios from 'axios';
import { API_PATHS } from '../constants';
import { 
  DataSource, 
  OAuthCredentials, 
  LocalDataConfig,
  SyncSettings,
  QueryParams,
  StandardizedData
} from '../models/types';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 数据源API服务
 */
export const DataSourceService = {
  /**
   * 获取所有数据源
   */
  getAll: async (): Promise<DataSource[]> => {
    const response = await apiClient.get(API_PATHS.DATA_SOURCES);
    return response.data as DataSource[];
  },

  /**
   * 根据ID获取数据源
   */
  getById: async (id: string): Promise<DataSource> => {
    const response = await apiClient.get(`${API_PATHS.DATA_SOURCES}/${id}`);
    return response.data as DataSource;
  },

  /**
   * 创建新数据源
   */
  create: async (dataSource: Partial<DataSource>): Promise<DataSource> => {
    const response = await apiClient.post(API_PATHS.DATA_SOURCES, dataSource);
    return response.data as DataSource;
  },

  /**
   * 更新数据源
   */
  update: async (id: string, dataSource: Partial<DataSource>): Promise<DataSource> => {
    const response = await apiClient.put(`${API_PATHS.DATA_SOURCES}/${id}`, dataSource);
    return response.data as DataSource;
  },

  /**
   * 删除数据源
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_PATHS.DATA_SOURCES}/${id}`);
  },
};

/**
 * OAuth授权服务
 */
export const OAuthService = {
  /**
   * 获取授权URL
   */
  getAuthUrl: async (platform: string, redirectUri: string): Promise<string> => {
    const response = await apiClient.get(`${API_PATHS.OAUTH}/auth-url`, {
      params: { platform, redirectUri },
    });
    return (response.data as {url: string}).url;
  },

  /**
   * 通过授权码获取令牌
   */
  getToken: async (platform: string, code: string, redirectUri: string): Promise<OAuthCredentials> => {
    const response = await apiClient.post(`${API_PATHS.OAUTH}/token`, {
      platform,
      code,
      redirectUri,
    });
    return response.data as OAuthCredentials;
  },

  /**
   * 刷新令牌
   */
  refreshToken: async (platform: string, refreshToken: string): Promise<OAuthCredentials> => {
    const response = await apiClient.post(`${API_PATHS.OAUTH}/refresh`, {
      platform,
      refreshToken,
    });
    return response.data as OAuthCredentials;
  },
};

/**
 * 本地数据上传服务
 */
export const UploadService = {
  /**
   * 上传文件
   */
  uploadFile: async (sourceId: string, file: File): Promise<LocalDataConfig> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${API_PATHS.UPLOADS}/${sourceId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as LocalDataConfig;
  },

  /**
   * 获取上传历史
   */
  getUploadHistory: async (sourceId: string): Promise<LocalDataConfig> => {
    const response = await apiClient.get(`${API_PATHS.UPLOADS}/${sourceId}/history`);
    return response.data as LocalDataConfig;
  },
};

/**
 * 同步服务
 */
export const SyncService = {
  /**
   * 获取同步设置
   */
  getSyncSettings: async (sourceId: string): Promise<SyncSettings> => {
    const response = await apiClient.get(`${API_PATHS.SYNC}/${sourceId}/settings`);
    return response.data as SyncSettings;
  },

  /**
   * 更新同步设置
   */
  updateSyncSettings: async (sourceId: string, settings: SyncSettings): Promise<SyncSettings> => {
    const response = await apiClient.put(`${API_PATHS.SYNC}/${sourceId}/settings`, settings);
    return response.data as SyncSettings;
  },

  /**
   * 触发立即同步
   */
  triggerSync: async (sourceId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.post(`${API_PATHS.SYNC}/${sourceId}/trigger`);
    return response.data as { status: string; message: string };
  },

  /**
   * 获取同步状态
   */
  getSyncStatus: async (sourceId: string): Promise<{ status: string; lastSync: Date; nextSync?: Date }> => {
    const response = await apiClient.get(`${API_PATHS.SYNC}/${sourceId}/status`);
    return response.data as { status: string; lastSync: Date; nextSync?: Date };
  },
};

/**
 * 数据查询服务
 */
export const DataQueryService = {
  /**
   * 查询数据源数据
   */
  queryData: async (sourceId: string, params: QueryParams): Promise<StandardizedData> => {
    const response = await apiClient.get(`${API_PATHS.DATA_SOURCES}/${sourceId}/data`, { params });
    return response.data as StandardizedData;
  },
}; 