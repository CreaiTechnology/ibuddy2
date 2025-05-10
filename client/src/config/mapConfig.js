/**
 * 地图服务配置文件
 * 包含API密钥和服务提供商配置
 */

// Mapbox配置
export const MAPBOX_CONFIG = {
  // 替换为您的Mapbox访问令牌
  // 可以在 https://account.mapbox.com/ 创建
  ACCESS_TOKEN: '',
  
  // 是否启用Mapbox服务
  // 如果ACCESS_TOKEN未设置或为默认值，此值将自动为false
  ENABLED: true,  // 手动设置为true启用Mapbox
  
  // Mapbox API基础URL
  BASE_URL: 'https://api.mapbox.com',
  
  // 路线规划服务类型
  // 可选: driving, walking, cycling
  DIRECTIONS_PROFILE: 'driving',
  
  // 额外配置选项
  OPTIONS: {
    // 是否避开收费公路
    AVOID_TOLLS: false,
    
    // 是否避开高速公路
    AVOID_HIGHWAYS: false
  }
};

// OSRM配置（开源路线规划机器）
export const OSRM_CONFIG = {
  // 是否启用OSRM作为备用
  ENABLED: true,
  
  // OSRM API基础URL
  BASE_URL: 'https://router.project-osrm.org',
  
  // 路线规划服务类型
  // 可选: driving, walking, cycling
  DIRECTIONS_PROFILE: 'driving'
};

// 默认地图中心点（马来西亚吉隆坡）
export const DEFAULT_MAP_CENTER = {
  lat: 3.1390,
  lng: 101.6869,
  zoom: 11
};

// 路线规划配置
export const ROUTE_PLANNING_CONFIG = {
  // 提供商优先级顺序
  PROVIDER_PRIORITY: ['mapbox', 'osrm', 'mock'],
  
  // 是否启用路线优化（优化停靠点顺序）
  ENABLE_OPTIMIZATION: true,
  
  // 是否自动避开交通拥堵
  AVOID_TRAFFIC: true,
  
  // 是否记录性能指标
  LOG_PERFORMANCE: true
};

// 定义为变量后再导出
const mapConfig = {
  MAPBOX: MAPBOX_CONFIG,
  OSRM: OSRM_CONFIG,
  DEFAULT_MAP_CENTER,
  ROUTE_PLANNING: ROUTE_PLANNING_CONFIG
};

export default mapConfig; 