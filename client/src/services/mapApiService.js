import api from '../api/axiosInstance';
import axios from 'axios';
import mapConfig from '../config/mapConfig';
import { API_BASE_URL } from '../config';

// 默认使用配置文件中的设置
let MAPBOX_ACCESS_TOKEN = mapConfig.MAPBOX.ACCESS_TOKEN;
let USE_MAPBOX = mapConfig.MAPBOX.ENABLED && 
                !!MAPBOX_ACCESS_TOKEN && 
                MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN';
let USE_BACKUP_OSRM = mapConfig.OSRM.ENABLED;
let LOG_PERFORMANCE = mapConfig.ROUTE_PLANNING.LOG_PERFORMANCE;

/**
 * 从服务器获取地图配置信息
 * 这样可以避免在客户端暴露API密钥
 */
export const initMapConfig = async () => {
  try {
    console.log('[mapApiService] 正在从服务器获取地图配置...');
    console.log('[mapApiService] 初始状态: USE_MAPBOX =', USE_MAPBOX, 
                'MAPBOX_ACCESS_TOKEN 存在 =', !!MAPBOX_ACCESS_TOKEN,
                'MAPBOX_ACCESS_TOKEN 配置有效 =', MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN');
    const response = await api.get('/map/config');
    
    if (response.data && response.data.mapbox && response.data.mapbox.accessToken) {
      console.log('[mapApiService] 成功获取Mapbox配置');
      
      // 更新配置
      MAPBOX_ACCESS_TOKEN = response.data.mapbox.accessToken;
      USE_MAPBOX = true;
      console.log('[mapApiService] 更新后: USE_MAPBOX =', USE_MAPBOX, 
                  'MAPBOX_ACCESS_TOKEN 存在 =', !!MAPBOX_ACCESS_TOKEN,
                  'MAPBOX_ACCESS_TOKEN 长度 =', MAPBOX_ACCESS_TOKEN.length);
      
      // 如果服务器提供其他配置也可以更新
      if (response.data.osrm) {
        USE_BACKUP_OSRM = response.data.osrm.enabled !== undefined ? 
                           response.data.osrm.enabled : 
                           USE_BACKUP_OSRM;
        console.log('[mapApiService] OSRM 配置更新: USE_BACKUP_OSRM =', USE_BACKUP_OSRM);
      }
      
      return true;
    } else {
      console.warn('[mapApiService] 服务器返回的地图配置不完整');
      return false;
    }
  } catch (error) {
    console.error('[mapApiService] 无法从服务器获取地图配置:', error);
    console.log('[mapApiService] 将使用本地配置: USE_MAPBOX =', USE_MAPBOX, 'USE_BACKUP_OSRM =', USE_BACKUP_OSRM);
    return false;
  }
};

// 初始化时尝试从服务器获取配置
initMapConfig().catch(error => {
  console.error('[mapApiService] 初始化地图配置时出错:', error);
});

// Map API Service
export const mapApiService = {
  // 根据地址获取坐标 - 增强版本
  async geocodeAddress(address, options = {}) {
    try {
      console.log(`[mapApiService] 地理编码地址: "${address}"`);
      
      // 准备请求数据，包括地址和高级选项
      const requestData = { 
        address,
        options: {
          language: options.language || 'en',
          autocomplete: options.autocomplete,
          fuzzyMatch: options.fuzzyMatch !== false,
          country: options.country || '',
          types: options.types || 'address,place',
          limit: options.limit || 1
        }
      };
      
      // 如果提供了当前位置，添加到选项中
      if (options.currentLocation) {
        requestData.options.currentLocation = options.currentLocation;
      }
      
      // 调用服务器API
      const response = await axios.post(`${API_BASE_URL}/api/map/geocode`, requestData);
      
      // 解析新的响应格式
      const { result, meta = {} } = response.data;
      
      // 判断结果的可靠性
      if (meta.warnings && meta.warnings.length > 0) {
        // 处理结构化警告格式
        meta.warnings.forEach(warning => {
          console.warn(`[mapApiService] 地理编码警告 (${warning.type}): ${warning.message}`);
        });
      }
      
      // 对低可靠性结果发出警告
      if (meta.reliability < 70) {
        console.warn(`[mapApiService] 地理编码结果可靠性低 (${meta.reliability}%)`);
      }
      
      // 为了向后兼容，以标准格式返回结果
      return {
        success: response.data.success,
        result: {
          // 基本坐标信息
          latitude: result.latitude,
          longitude: result.longitude,
          formattedAddress: result.formattedAddress || result.placeName,
          placeType: result.placeType,
          
          // 精确度指标 - 所有可能的指标都包含，便于应用层使用
          accuracyScore: result.accuracy?.score || result.accuracy?.relevance || 0,
          accuracyLevel: result.accuracy?.level || 'unknown',
          confidence: result.accuracy?.confidence,
          relevance: result.accuracy?.relevance,
          
          // 元数据
          provider: result.provider,
          fromCache: meta.cacheStatus === 'hit'
        },
        
        // 扩展信息
        meta: {
          query: meta.query || address,
          reliability: meta.reliability,
          warnings: meta.warnings,
          timestamp: meta.timestamp,
          provider: meta.provider,
          cacheStatus: meta.cacheStatus
        },
        
        // 如果请求了多个结果，包含所有结果
        allResults: response.data.allResults
      };
    } catch (error) {
      console.error('[mapApiService] 地理编码错误:', error);
      
      // 提供更详细的错误信息
      const errorMessage = error.response?.data?.message || '地理编码失败';
      const errorDetails = error.response?.data?.suggestions || [];
      const errorObj = new Error(errorMessage);
      errorObj.details = errorDetails;
      errorObj.query = error.response?.data?.query || address;
      
      throw errorObj;
    }
  },
  
  // 根据坐标获取地址（反向地理编码）
  async reverseGeocode(longitude, latitude, options = {}) {
    try {
      console.log(`[mapApiService] 反向地理编码: [${longitude}, ${latitude}]`);
      
      const response = await axios.post(`${API_BASE_URL}/api/map/reverse-geocode`, {
        longitude,
        latitude,
        options: {
          language: options.language || 'en',
          types: options.types || 'address',
          limit: options.limit || 1
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[mapApiService] 反向地理编码错误:', error);
      throw new Error(error.response?.data?.message || '反向地理编码失败');
    }
  },
  
  // 批量地址地理编码 - 保留但不推荐使用
  async batchGeocodeAddresses(addresses) {
    try {
      console.warn('[mapApiService] batchGeocodeAddresses 方法已被弃用，请改用 bulkGeocode');
      const response = await axios.post(`${API_BASE_URL}/api/geocode/batch`, { addresses });
      return response.data;
    } catch (error) {
      console.error('批量地理编码错误:', error);
      throw new Error(error.response?.data?.message || '批量地理编码失败');
    }
  },
  
  // 新的批量地理编码方法
  async bulkGeocode(addresses, options = {}) {
    try {
      console.log(`[mapApiService] 批量地理编码 ${addresses.length} 个地址`);
      
      // 如果地址数量较少，使用Promise.all和单个地理编码请求
      if (addresses.length <= 5) {
        console.log('[mapApiService] 使用并行地理编码方法处理少量地址');
        
        const geocodePromises = addresses.map(address => 
          this.geocodeAddress(address, options)
            .then(result => ({ address, result, success: true }))
            .catch(error => ({ address, error, success: false }))
        );
        
        return Promise.all(geocodePromises);
      }
      
      // 对于大量地址，使用批量API接口
      console.log('[mapApiService] 使用批量API接口处理大量地址');
      const response = await axios.post(`${API_BASE_URL}/api/map/geocode/bulk`, {
        addresses,
        options
      });
      
      return response.data;
    } catch (error) {
      console.error('[mapApiService] 批量地理编码错误:', error);
      throw new Error(error.response?.data?.message || '批量地理编码失败');
    }
  },
  
  // 新版路径计算API
  async calculateRoute(options) {
    const { waypoints, serviceTimes, startPoint, optimize = true } = options;
    
    try {
      console.log('[API] Calling route API with:', { 
        waypoints, 
        serviceTimes, 
        startPoint, 
        optimize 
      });
      
      // 使用新的API端点格式
      const response = await axios.post(`${API_BASE_URL}/api/map/route`, {
        waypoints,
        serviceTimes,
        startPoint,
        optimize
      });
      
      console.log('[API] Route API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Route calculation error:', error);
      throw new Error(error.response?.data?.message || 'Route calculation failed');
    }
  },
  
  // 获取两点之间的距离
  async getDistance(origin, destination) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/distance`, {
        origin,
        destination
      });
      return response.data;
    } catch (error) {
      console.error('Distance calculation error:', error);
      throw new Error(error.response?.data?.message || 'Distance calculation failed');
    }
  },

  /**
   * 规划路线 - 优先使用Mapbox API，备用OSRM API
   * @param {Array} waypoints - 路线点数组，格式为 [{id, latitude, longitude}]
   * @param {Boolean} optimize - 是否优化路线顺序
   * @param {Object} customerLocation - 客户位置 {latitude, longitude}
   * @param {Array} serviceTimes - 各路点的服务时间（分钟）数组
   * @returns {Promise} - 返回路线结果
   */
  planRoute: async (waypoints, optimize = true, customerLocation = null, serviceTimes = []) => {
    console.log('[mapApiService] 使用新的calculateRoute方法进行路线规划');
    
    try {
      // 转换为新的API格式
      const options = {
        waypoints,
        serviceTimes,
        optimize
      };
      
      // 添加起始点
      if (customerLocation) {
        options.startPoint = {
          id: 'customer-location',
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude
        };
      }
      
      // 调用新的API方法
      const result = await mapApiService.calculateRoute(options);
      
      // 转换为旧API格式输出
      return {
        success: true,
        route: result,
        provider: result.provider || 'api'
      };
    } catch (error) {
      console.error('[mapApiService] 路线规划失败:', error);
      
      // 尝试使用备用方法
      if (USE_BACKUP_OSRM) {
        try {
          const osrmRoute = await planRouteWithOSRM(waypoints, customerLocation, serviceTimes);
          return {
            success: true,
            route: osrmRoute,
            provider: 'osrm'
          };
        } catch (osrmError) {
          console.warn('[mapApiService] OSRM路线规划失败，使用模拟数据:', osrmError);
        }
      }
      
      // 返回错误或模拟数据
      if (mapConfig.ROUTE_PLANNING.USE_MOCK_ON_FAILURE) {
        console.log('[mapApiService] 使用本地模拟路线数据');
        const mockRoute = generateMockRoute(waypoints, optimize, customerLocation, serviceTimes);
        return {
          success: true,
          route: mockRoute,
          provider: 'mock',
          warning: '由于API调用失败，返回的是模拟路线数据'
        };
      }
      
      // 返回错误
      return {
        success: false,
        error: error.message || '路线规划请求失败'
      };
    }
  }
};

/**
 * 使用OSRM API规划路线（作为备用）
 * @param {Array} waypoints - 路线点数组
 * @param {Object} customerLocation - 客户位置
 * @param {Array} serviceTimes - 服务时间数组
 * @returns {Object} - 处理后的路线数据
 */
async function planRouteWithOSRM(waypoints, customerLocation = null, serviceTimes = []) {
  const startTime = performance.now();
  
  // 准备全部路点（包括客户位置）
  let allPoints = [];
  if (customerLocation) {
    allPoints.push({
      id: 'customer-location',
      latitude: customerLocation.latitude,
      longitude: customerLocation.longitude,
      isCustomerLocation: true
    });
  }
  allPoints = [...allPoints, ...waypoints];

  // 准备OSRM API所需的坐标格式：经度,纬度
  const coordinatesString = allPoints
    .map(point => `${point.longitude},${point.latitude}`)
    .join(';');
  
  // 构建OSRM API URL
  const osrmBaseUrl = `${mapConfig.OSRM.BASE_URL}/route/v1/${mapConfig.OSRM.DIRECTIONS_PROFILE}/`;
  const url = `${osrmBaseUrl}${coordinatesString}?overview=full&steps=true&annotations=true`;
  
  console.log('[mapApiService] 调用OSRM API:', url);
  
  // 使用axios调用OSRM API
  const response = await axios.get(url);
  const endTime = performance.now();
  
  // 检查响应
  if (!response.data || !response.data.routes || response.data.routes.length === 0) {
    throw new Error('OSRM API没有返回有效路线');
  }
  
  // 处理OSRM响应
  const osrmRoute = response.data.routes[0];
  
  // 解码OSRM的polyline以获取路线坐标
  const coordinates = decodePolyline(osrmRoute.geometry).map(point => [point[0], point[1]]);
  
  // 提取距离（米转公里）和时间（秒转分钟）
  const distance = (osrmRoute.distance / 1000).toFixed(1);
  const duration = Math.round(osrmRoute.duration / 60);
  
  // 计算总服务时间
  const totalServiceTime = serviceTimes.reduce((sum, time) => sum + (parseInt(time) || 0), 0);
  
  // 如果启用了性能日志记录
  if (LOG_PERFORMANCE) {
    console.log('[mapApiService] OSRM路线规划成功:', { 
      distance, 
      duration,
      serviceTimes: totalServiceTime,
      totalTime: duration + totalServiceTime,
      coordinatesCount: coordinates.length,
      apiResponseTime: `${(endTime - startTime).toFixed(0)}ms`
    });
  }

  // 生成带有ID和服务时间的完整路点信息
  const waypointInfo = allPoints.map((wp, index) => {
    // 为客户位置和正常路点分配适当的服务时间
    const serviceTime = wp.isCustomerLocation ? 0 : (serviceTimes[index - (customerLocation ? 1 : 0)] || 0);
    
    return {
      id: wp.id,
      index: index,
      latitude: wp.latitude,
      longitude: wp.longitude,
      isCustomerLocation: !!wp.isCustomerLocation,
      serviceTime: serviceTime
    };
  });
  
  // 提取简单的步骤信息
  const steps = osrmRoute.legs.flatMap((leg, legIndex) => 
    leg.steps.map(step => ({
      instruction: step.maneuver.type,
      distance: (step.distance / 1000).toFixed(2),
      duration: Math.round(step.duration / 60)
    }))
  );
  
  // 检测路线中可能的重叠段
  const segments = generateRouteSegments(coordinates, waypointInfo, osrmRoute.legs);
  
  // 返回处理后的路线数据
  return {
    waypoints: waypointInfo,
    coordinates: coordinates,
    distance: distance,
    duration: duration,
    steps: steps,
    segments: segments,
    serviceTimes: {
      individual: waypointInfo.map(wp => wp.serviceTime),
      total: totalServiceTime
    },
    totalTime: duration + totalServiceTime,  // 总时间 = 行驶时间 + 服务时间
    provider: 'osrm'
  };
}

/**
 * 生成路线段数据，用于分段显示路线
 * @param {Array} coordinates - 路线坐标
 * @param {Array} waypoints - 路点信息
 * @param {Array} legs - OSRM或其他路线数据中的legs信息
 * @returns {Array} - 路线段数组
 */
function generateRouteSegments(coordinates, waypoints, legs = null) {
  if (!coordinates || coordinates.length < 2 || !waypoints || waypoints.length < 2) {
    return [];
  }
  
  const segments = [];
  
  // 如果有路段信息，使用legs中的数据
  if (legs && Array.isArray(legs) && legs.length > 0) {
    legs.forEach((leg, index) => {
      // 解码leg的几何图形（如果有）
      let segmentCoords = [];
      if (leg.geometry) {
        segmentCoords = decodePolyline(leg.geometry).map(point => [point[0], point[1]]);
      } else {
        // 如果没有leg几何图形，尝试从总坐标中提取该段
        // 这是非常简化的逻辑，实际应该更智能地确定段
        const segmentLength = Math.floor(coordinates.length / legs.length);
        const startIdx = index * segmentLength;
        const endIdx = index === legs.length - 1 ? coordinates.length : (index + 1) * segmentLength;
        segmentCoords = coordinates.slice(startIdx, endIdx);
      }
      
      // 简单检测是否为重叠段（简化版）
      let isReturnSegment = false;
      for (let i = 0; i < index; i++) {
        if (segments[i] && hasSignificantOverlap(segmentCoords, segments[i].coordinates)) {
          isReturnSegment = true;
          break;
        }
      }
      
      segments.push({
        index,
        coordinates: segmentCoords,
        distance: (leg.distance / 1000).toFixed(1),
        duration: Math.round(leg.duration / 60),
        startWaypoint: waypoints[index],
        endWaypoint: waypoints[index + 1],
        isReturnSegment,
        suggestedColor: index % 7
      });
    });
  } else {
    // 无legs数据时，基于路点估算段
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      
      // 找到最接近起点和终点的坐标索引
      const startIdx = findClosestCoordIndex(coordinates, start.latitude, start.longitude);
      const endIdx = findClosestCoordIndex(coordinates, end.latitude, end.longitude);
      
      // 提取该段坐标
      const segmentCoords = coordinates.slice(
        Math.min(startIdx, endIdx),
        Math.max(startIdx, endIdx) + 1
      );
      
      // 计算该段距离
      const segmentDistance = calculateDistance(start.latitude, start.longitude, 
                                               end.latitude, end.longitude);
      
      // 简单检测重叠
      let isReturnSegment = false;
      for (let j = 0; j < i; j++) {
        if (segments[j] && hasSignificantOverlap(segmentCoords, segments[j].coordinates)) {
          isReturnSegment = true;
          break;
        }
      }
      
      segments.push({
        index: i,
        coordinates: segmentCoords,
        distance: segmentDistance.toFixed(1),
        duration: Math.round(segmentDistance * 2), // 估算：每公里2分钟
        startWaypoint: start,
        endWaypoint: end,
        isReturnSegment,
        suggestedColor: i % 7
      });
    }
  }
  
  return segments;
}

/**
 * 查找最接近指定经纬度的坐标点索引
 */
function findClosestCoordIndex(coordinates, lat, lng) {
  let minDistance = Infinity;
  let closestIndex = 0;
  
  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const distance = Math.sqrt(
      Math.pow(lat - coord[0], 2) + 
      Math.pow(lng - coord[1], 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  return closestIndex;
}

/**
 * 检测两个坐标序列是否有明显重叠
 */
function hasSignificantOverlap(coords1, coords2) {
  if (!coords1 || !coords2 || coords1.length < 5 || coords2.length < 5) {
    return false;
  }
  
  // 计算重叠点的数量
  const threshold = 0.0001; // 大约10米
  let overlapCount = 0;
  const minOverlapPoints = Math.min(5, Math.min(coords1.length, coords2.length) / 10);
  
  // 采样以提高性能
  const sampleInterval = Math.max(1, Math.floor(coords1.length / 20));
  
  for (let i = 0; i < coords1.length; i += sampleInterval) {
    const [lat1, lng1] = coords1[i];
    
    for (let j = 0; j < coords2.length; j += sampleInterval) {
      const [lat2, lng2] = coords2[j];
      
      const distance = Math.sqrt(
        Math.pow(lat1 - lat2, 2) + 
        Math.pow(lng1 - lng2, 2)
      );
      
      if (distance < threshold) {
        overlapCount++;
        if (overlapCount >= minOverlapPoints) {
          return true;
        }
        break; // 找到一个接近点即跳到下一个采样点
      }
    }
  }
  
  return false;
}

/**
 * 解码OSRM的Polyline格式
 * @param {String} str - 编码的polyline字符串
 * @returns {Array} - 解码后的坐标数组 [[lat, lng], ...]
 */
function decodePolyline(str, precision = 5) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  let shift = 0;
  let result = 0;
  let byte = null;
  let factor = Math.pow(10, precision);

  while (index < str.length) {
    byte = null;
    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

/**
 * 生成模拟路线数据（备用方案）
 * @param {Array} waypoints - 路线点
 * @param {Boolean} optimize - 是否优化
 * @param {Object} customerLocation - 客户位置
 * @param {Array} serviceTimes - 服务时间数组
 * @returns {Object} - 模拟路线数据
 */
function generateMockRoute(waypoints, optimize, customerLocation = null, serviceTimes = []) {
  // 准备全部路点（包括客户位置）
  let allPoints = [];
  if (customerLocation) {
    allPoints.push({
      id: 'customer-location',
      latitude: customerLocation.latitude,
      longitude: customerLocation.longitude,
      isCustomerLocation: true
    });
  }
  allPoints = [...allPoints, ...waypoints];
  
  // 如果优化，可以排序waypoints（实际应该使用真实算法）
  const orderedWaypoints = [...allPoints];
  
  // 生成路线坐标（简单地在各点之间插入中间点）
  const coordinates = [];
  for (let i = 0; i < orderedWaypoints.length - 1; i++) {
    const start = orderedWaypoints[i];
    const end = orderedWaypoints[i + 1];
    
    // 添加起点
    coordinates.push([start.latitude, start.longitude]);
    
    // 添加一些中间点（简化模拟）
    const steps = 3; // 每两点之间插入的点数
    for (let j = 1; j <= steps; j++) {
      const ratio = j / (steps + 1);
      const lat = start.latitude + (end.latitude - start.latitude) * ratio;
      const lng = start.longitude + (end.longitude - start.longitude) * ratio;
      coordinates.push([lat, lng]);
    }
  }
  
  // 添加最后一个点
  if (orderedWaypoints.length > 0) {
    const last = orderedWaypoints[orderedWaypoints.length - 1];
    coordinates.push([last.latitude, last.longitude]);
  }
  
  // 计算总距离和时间（模拟）
  const distance = calculateMockDistance(orderedWaypoints);
  const duration = Math.round(distance * 2); // 简单假设：每公里2分钟
  
  // 计算总服务时间
  const totalServiceTime = serviceTimes.reduce((sum, time) => sum + (parseInt(time) || 0), 0);
  
  // 生成带有ID和服务时间的完整路点信息
  const waypointInfo = orderedWaypoints.map((wp, index) => {
    // 为客户位置和正常路点分配适当的服务时间
    const serviceTime = wp.isCustomerLocation ? 0 : (serviceTimes[index - (customerLocation ? 1 : 0)] || 0);
    
    return {
      id: wp.id,
      index: index,
      latitude: wp.latitude,
      longitude: wp.longitude,
      isCustomerLocation: !!wp.isCustomerLocation,
      serviceTime: serviceTime
    };
  });
  
  // 生成路线段数据
  const segments = [];
  for (let i = 0; i < orderedWaypoints.length - 1; i++) {
    const start = orderedWaypoints[i];
    const end = orderedWaypoints[i + 1];
    
    // 每段路线的坐标
    const segmentCoords = [];
    segmentCoords.push([start.latitude, start.longitude]);
    
    // 添加一些中间点
    const steps = 2; 
    for (let j = 1; j <= steps; j++) {
      const ratio = j / (steps + 1);
      const lat = start.latitude + (end.latitude - start.latitude) * ratio;
      const lng = start.longitude + (end.longitude - start.longitude) * ratio;
      segmentCoords.push([lat, lng]);
    }
    
    segmentCoords.push([end.latitude, end.longitude]);
    
    // 计算段距离
    const segDistance = calculateDistance(
      start.latitude, start.longitude,
      end.latitude, end.longitude
    );
    
    // 随机标记一些段为重叠段，用于演示
    const isReturnSegment = i > 0 && Math.random() < 0.3;
    
    segments.push({
      index: i,
      coordinates: segmentCoords,
      distance: segDistance.toFixed(1),
      duration: Math.round(segDistance * 2),
      startWaypoint: waypointInfo[i],
      endWaypoint: waypointInfo[i + 1],
      isReturnSegment,
      suggestedColor: i % 7
    });
  }
  
  return {
    waypoints: waypointInfo,
    coordinates: coordinates,
    distance: distance.toFixed(1),
    duration: duration,
    segments: segments,
    serviceTimes: {
      individual: waypointInfo.map(wp => wp.serviceTime),
      total: totalServiceTime
    },
    totalTime: duration + totalServiceTime
  };
}

/**
 * 计算两点间距离（公里）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  return haversineDistance(lat1, lon1, lat2, lon2);
}

/**
 * 计算模拟路线总距离
 * @param {Array} waypoints - 路线点
 * @returns {Number} - 总距离（公里）
 */
function calculateMockDistance(waypoints) {
  let totalDistance = 0;
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    
    // 使用Haversine公式计算两点间距离
    totalDistance += haversineDistance(
      start.latitude, start.longitude,
      end.latitude, end.longitude
    );
  }
  
  return totalDistance;
}

/**
 * 使用Haversine公式计算两点间的距离（公里）
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径（公里）
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

export default mapApiService; 