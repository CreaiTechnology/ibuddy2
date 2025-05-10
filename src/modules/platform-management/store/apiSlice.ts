import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_PATHS } from '../constants';
import { 
  DataSource, 
  OAuthCredentials, 
  LocalDataConfig,
  SyncSettings,
  QueryParams,
  StandardizedData
} from '../models/types';

// 创建平台API
export const platformApi = createApi({
  reducerPath: 'platformApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: process.env.REACT_APP_API_URL || '',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['DataSource', 'OAuthConfig', 'LocalConfig', 'SyncSettings', 'Data', 'SyncStatus'],
  endpoints: (builder) => ({
    // 数据源操作
    getDataSources: builder.query<DataSource[], void>({
      query: () => API_PATHS.DATA_SOURCES,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DataSource' as const, id })),
              { type: 'DataSource', id: 'LIST' },
            ]
          : [{ type: 'DataSource', id: 'LIST' }],
    }),
    
    getDataSourceById: builder.query<DataSource, string>({
      query: (id) => `${API_PATHS.DATA_SOURCES}/${id}`,
      providesTags: (result, error, id) => [{ type: 'DataSource', id }],
    }),
    
    createDataSource: builder.mutation<DataSource, Partial<DataSource>>({
      query: (dataSource) => ({
        url: API_PATHS.DATA_SOURCES,
        method: 'POST',
        body: dataSource,
      }),
      invalidatesTags: [{ type: 'DataSource', id: 'LIST' }],
    }),
    
    updateDataSource: builder.mutation<DataSource, { id: string; data: Partial<DataSource> }>({
      query: ({ id, data }) => ({
        url: `${API_PATHS.DATA_SOURCES}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'DataSource', id },
        { type: 'DataSource', id: 'LIST' },
      ],
    }),
    
    deleteDataSource: builder.mutation<void, string>({
      query: (id) => ({
        url: `${API_PATHS.DATA_SOURCES}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'DataSource', id: 'LIST' }],
    }),
    
    // OAuth操作
    getOAuthUrl: builder.query<{ url: string }, { platform: string; redirectUri: string }>({
      query: ({ platform, redirectUri }) => ({
        url: `${API_PATHS.OAUTH}/auth-url`,
        params: { platform, redirectUri },
      }),
    }),
    
    getOAuthToken: builder.mutation<OAuthCredentials, { platform: string; code: string; redirectUri: string }>({
      query: (credentials) => ({
        url: `${API_PATHS.OAUTH}/token`,
        method: 'POST',
        body: credentials,
      }),
    }),
    
    refreshOAuthToken: builder.mutation<OAuthCredentials, { platform: string; refreshToken: string }>({
      query: (credentials) => ({
        url: `${API_PATHS.OAUTH}/refresh`,
        method: 'POST',
        body: credentials,
      }),
    }),
    
    // 本地数据上传操作
    uploadFile: builder.mutation<LocalDataConfig, { sourceId: string; file: File }>({
      query: ({ sourceId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `${API_PATHS.UPLOADS}/${sourceId}`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { sourceId }) => [
        { type: 'LocalConfig', id: sourceId },
        { type: 'DataSource', id: sourceId },
      ],
    }),
    
    getUploadHistory: builder.query<LocalDataConfig, string>({
      query: (sourceId) => `${API_PATHS.UPLOADS}/${sourceId}/history`,
      providesTags: (result, error, sourceId) => [{ type: 'LocalConfig', id: sourceId }],
    }),
    
    // 同步操作
    getSyncSettings: builder.query<SyncSettings, string>({
      query: (id) => `${API_PATHS.SYNC}/${id}/settings`,
    }),
    
    updateSyncSettings: builder.mutation<SyncSettings, { id: string; settings: SyncSettings }>({
      query: ({ id, settings }) => ({
        url: `${API_PATHS.SYNC}/${id}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'SyncStatus', id }],
    }),
    
    triggerSync: builder.mutation<{ status: string; message: string }, string>({
      query: (id) => ({
        url: `${API_PATHS.SYNC}/${id}/trigger`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'SyncStatus', id },
        { type: 'DataSource', id },
      ],
    }),
    
    getSyncStatus: builder.query<{ status: string; lastSync: Date; nextSync?: Date }, string>({
      query: (id) => `${API_PATHS.SYNC}/${id}/status`,
      providesTags: (result, error, id) => [{ type: 'SyncStatus', id }],
    }),
    
    // 数据查询操作
    queryData: builder.query<StandardizedData, { sourceId: string; params: QueryParams }>({
      query: ({ sourceId, params }) => ({
        url: `${API_PATHS.DATA_SOURCES}/${sourceId}/data`,
        params,
      }),
    }),
  }),
});

// 导出生成的Hooks
export const {
  useGetDataSourcesQuery,
  useGetDataSourceByIdQuery,
  useCreateDataSourceMutation,
  useUpdateDataSourceMutation,
  useDeleteDataSourceMutation,
  useGetOAuthUrlQuery,
  useGetOAuthTokenMutation,
  useRefreshOAuthTokenMutation,
  useUploadFileMutation,
  useGetUploadHistoryQuery,
  useGetSyncSettingsQuery,
  useUpdateSyncSettingsMutation,
  useTriggerSyncMutation,
  useGetSyncStatusQuery,
  useQueryDataQuery,
} = platformApi; 