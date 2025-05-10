import { PlatformType } from '../models/types';

/**
 * API路径常量
 */
export const API_PATHS = {
  DATA_SOURCES: '/api/data-sources',
  OAUTH: '/api/oauth',
  UPLOADS: '/api/uploads',
  SYNC: '/api/sync',
};

/**
 * 路由路径常量
 */
export const ROUTE_PATHS = {
  OVERVIEW: '/',
  SOURCES: '/sources',
  NEW_SOURCE: '/sources/new',
  SOURCE_DETAIL: '/sources/:id',
  SETTINGS: '/settings',
};

/**
 * 平台配置
 */
export const PLATFORM_CONFIG = {
  // OAuth平台配置
  OAUTH_PLATFORMS: {
    [PlatformType.TWITTER]: {
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      description: 'Connect to Twitter to sync tweets, mentions, and analytics.',
      scopes: ['tweet.read', 'users.read', 'offline.access'],
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    },
    [PlatformType.FACEBOOK]: {
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      description: 'Connect to Facebook to sync posts, comments, and insights.',
      scopes: ['pages_read_engagement', 'pages_manage_posts', 'pages_show_list'],
      authUrl: 'https://www.facebook.com/v13.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v13.0/oauth/access_token',
    },
    [PlatformType.INSTAGRAM]: {
      name: 'Instagram',
      icon: 'instagram',
      color: '#E1306C',
      description: 'Connect to Instagram to sync posts, comments, and insights.',
      scopes: ['user_profile', 'user_media'],
      authUrl: 'https://api.instagram.com/oauth/authorize',
      tokenUrl: 'https://api.instagram.com/oauth/access_token',
    },
    [PlatformType.LINKEDIN]: {
      name: 'LinkedIn',
      icon: 'linkedin',
      color: '#0A66C2',
      description: 'Connect to LinkedIn to sync posts, comments, and analytics.',
      scopes: ['r_liteprofile', 'r_organization_social', 'w_organization_social'],
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    [PlatformType.YOUTUBE]: {
      name: 'YouTube',
      icon: 'youtube',
      color: '#FF0000',
      description: 'Connect to YouTube to sync videos, comments, and analytics.',
      scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
    },
  },
  
  // 本地数据平台配置
  LOCAL_PLATFORMS: {
    [PlatformType.LOCAL_CSV]: {
      name: 'CSV File',
      icon: 'file-csv',
      color: '#217346',
      description: 'Upload CSV files to analyze data.',
      allowedExtensions: ['.csv'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
    [PlatformType.LOCAL_JSON]: {
      name: 'JSON File',
      icon: 'file-code',
      color: '#F7DF1E',
      description: 'Upload JSON files to analyze data.',
      allowedExtensions: ['.json'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
    [PlatformType.LOCAL_EXCEL]: {
      name: 'Excel File',
      icon: 'file-excel',
      color: '#217346',
      description: 'Upload Excel files to analyze data.',
      allowedExtensions: ['.xlsx', '.xls'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },
  },
};

/**
 * 同步间隔选项（分钟）
 */
export const SYNC_INTERVALS = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '3小时', value: 180 },
  { label: '6小时', value: 360 },
  { label: '12小时', value: 720 },
  { label: '24小时', value: 1440 },
];

/**
 * 本地上传文件大小限制 (bytes)
 */
export const UPLOAD_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB 