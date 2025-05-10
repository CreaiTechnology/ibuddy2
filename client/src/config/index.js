/**
 * 全局配置文件
 */

// API基础URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// 导出地图配置
export * from './mapConfig';

// 将mapConfig作为默认导出同时引入
import mapConfig from './mapConfig';
export default mapConfig; 