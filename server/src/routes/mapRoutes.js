const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const mapboxSdk = require('@mapbox/mapbox-sdk');
const mapboxDirections = require('@mapbox/mapbox-sdk/services/directions');

// 加载环境变量
dotenv.config();

const router = express.Router();

// Mapbox配置
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// 初始化 Mapbox SDK 客户端
const mapboxClient = mapboxSdk({ accessToken: MAPBOX_ACCESS_TOKEN });
const directionsClient = mapboxDirections(mapboxClient);

/**
 * @route   GET /api/map/config
 * @desc    获取地图配置信息（只提供必要信息，不暴露敏感详情）
 * @access  Private
 */
router.get('/config', async (req, res) => {
  try {
    // 只提供必要的配置信息
    const config = {
      mapbox: {
        accessToken: MAPBOX_ACCESS_TOKEN,
        enabled: !!MAPBOX_ACCESS_TOKEN,
        directionsProfile: 'driving'
      },
      osrm: {
        enabled: true,
        baseUrl: 'https://router.project-osrm.org',
        directionsProfile: 'driving'
      }
    };
    
    res.json(config);
  } catch (error) {
    console.error('获取地图配置时出错:', error);
    res.status(500).json({ error: '获取地图配置失败' });
  }
});

/**
 * @route   POST /api/map/route
 * @desc    规划路线（使用Mapbox SDK以保护API密钥并提供更好的错误处理）
 * @access  Private
 */
router.post('/route', async (req, res) => {
  try {
    const { waypoints, optimize = true } = req.body;
    
    // 验证参数
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ error: '需要至少两个有效的路点' });
    }
    
    // 输出接收到的所有坐标点进行验证
    console.log('[server] 接收到路点:', waypoints.map(p => 
      `[${p.longitude},${p.latitude}]`).join(', '));

    // 使用 Mapbox SDK 准备请求
    // SDK 使用 [经度, 纬度] 格式的坐标
    const coordinates = waypoints.map(point => {
      return [parseFloat(point.longitude), parseFloat(point.latitude)];
    });
    
    // 准备 Mapbox Directions API 请求选项
    const directionsRequest = {
      profile: 'driving',          // 行驶模式: driving, walking, cycling
      geometries: 'geojson',       // 返回格式
      steps: true,                 // 包含分步导航指令
      language: 'zh-Hans',         // 中文导航指令
      waypoints: coordinates.map((coord, index) => {
        return { coordinates: coord };
      })
    };
    
    // 如果需要优化并且有足够的路点，添加优化参数
    if (optimize && waypoints.length > 2) {
      directionsRequest.annotations = ['distance', 'duration', 'speed'];
      // SDK 自动处理路线优化
    }
    
    console.log('[server] 发送 Mapbox SDK 请求, 选项:', JSON.stringify(directionsRequest, null, 2));
    
    const startTime = Date.now();
    
    try {
      // 使用 SDK 发送请求
      const response = await directionsClient.getDirections(directionsRequest).send();
      const endTime = Date.now();
      
      // 获取响应体
      const body = response.body;
      
      // 检查响应
      if (!body || !body.routes || body.routes.length === 0) {
        return res.status(400).json({ error: 'Mapbox API没有返回有效路线' });
      }
      
      // 处理 Mapbox 响应
      const mapboxRoute = body.routes[0];
      console.log('[server] Mapbox SDK 返回成功! 简要信息:', {
        distance: mapboxRoute.distance,
        duration: mapboxRoute.duration,
        hasGeometry: !!mapboxRoute.geometry
      });
      
      // 提取路线坐标（Mapbox 返回 GeoJSON 格式）
      let routeCoordinates = [];
      if (mapboxRoute.geometry && mapboxRoute.geometry.coordinates) {
        routeCoordinates = mapboxRoute.geometry.coordinates.map(
          coord => [coord[1], coord[0]] // 转换为 [lat, lng] 格式以匹配客户端应用
        );
      }
      
      // 提取距离（米转公里）和时间（秒转分钟）
      const distance = (mapboxRoute.distance / 1000).toFixed(1);
      const duration = Math.round(mapboxRoute.duration / 60);
      
      // 记录性能指标
      console.log(`[server] Mapbox 路线规划成功 - API 响应时间: ${endTime - startTime}ms`);
      
      // 提取导航步骤信息 - 添加安全检查
      let steps = [];
      if (mapboxRoute.legs && Array.isArray(mapboxRoute.legs)) {
        steps = mapboxRoute.legs.flatMap(leg => {
          if (leg && leg.steps && Array.isArray(leg.steps)) {
            return leg.steps.map(step => {
              const stepCoords = step.geometry && step.geometry.coordinates ? 
                step.geometry.coordinates.map(coord => [coord[1], coord[0]]) : [];
              
              return {
                instruction: step.maneuver ? step.maneuver.instruction : '',
                distance: step.distance ? (step.distance / 1000).toFixed(2) : '0',
                duration: step.duration ? Math.round(step.duration / 60) : 0,
                coordinates: stepCoords
              };
            });
          }
          return [];
        });
      }
      
      // 返回处理后的数据 - 使用我们最初收到的完整 waypoints
      const result = {
        success: true,
        route: {
          waypoints: waypoints,
          coordinates: routeCoordinates,
          distance,
          duration,
          steps,
          provider: 'mapbox'
        },
        performance: {
          apiResponseTime: endTime - startTime
        }
      };
      
      res.json(result);
    } catch (error) {
      console.error('[server] Mapbox SDK 错误:', error);
      
      // 提取更详细的错误信息
      let errorMessage = error.message || '路线规划失败';
      let errorDetails = null;
      
      if (error.body) {
        console.error('[server] Mapbox API 错误响应:', error.body);
        errorDetails = error.body;
        if (error.body.message) {
          errorMessage = error.body.message;
        }
      }
      
      res.status(500).json({ 
        error: '路线规划失败', 
        message: errorMessage,
        details: errorDetails
      });
    }
  } catch (error) {
    console.error('路线规划处理错误:', error);
    res.status(500).json({ 
      error: '路线规划请求处理失败', 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/map/geocode
 * @desc    地理编码（地址转坐标）
 * @access  Private
 */
router.post('/geocode', async (req, res) => {
  try {
    const { address, options = {} } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: '需要提供地址' });
    }
    
    // 使用Mapbox Geocoding API
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
    
    // 构建参数，支持更多高级选项
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      limit: options.limit || 1,                      // 默认只返回一个结果
      language: options.language || 'en',             // 默认使用英文
      autocomplete: options.autocomplete || false,    // 默认关闭自动完成
      fuzzyMatch: options.fuzzyMatch !== false,       // 默认开启模糊匹配
      country: options.country || '',                 // 国家限制，提高精度
      bbox: options.bbox || '',                       // 边界框，限制搜索范围
      types: options.types || 'address,place,poi',    // 默认查找地址和地点
      proximity: options.proximity || ''              // 偏向于靠近给定坐标的结果
    });
    
    // 如果提供了当前位置，添加proximity参数以提高靠近当前位置的地点权重
    if (options.currentLocation) {
      const { longitude, latitude } = options.currentLocation;
      if (longitude && latitude) {
        params.set('proximity', `${longitude},${latitude}`);
      }
    }
    
    const url = `${geocodingUrl}?${params.toString()}`;
    
    try {
      console.log(`[MapRoutes] 发送地理编码请求: ${address}`);
      const response = await axios.get(url);
      
      if (!response.data || !response.data.features || response.data.features.length === 0) {
        console.warn(`[MapRoutes] 地理编码未找到结果: "${address}"`);
        return res.status(404).json({ 
          error: '找不到该地址的坐标',
          query: address,
          suggestions: [
            "检查拼写并确保地址格式正确",
            "添加更多地址细节，如邮政编码或城市名称",
            "尝试使用更通用的地址格式"
          ]
        });
      }
      
      // 返回结果，可能包含多个匹配项
      const features = response.data.features.map(feature => {
        const [longitude, latitude] = feature.center;
        
        // 提取并计算更详细的精确度指标
        const relevanceScore = feature.relevance || 0;     // Mapbox相关性分数 (0-1)
        const confidence = feature.properties?.confidence || null; // 置信度（如果有）
        const placeType = feature.place_type?.[0] || 'unknown'; // 地点类型
        
        // 计算加权精确度分数
        let accuracyScore = relevanceScore;
        
        // 根据地点类型调整精确度
        if (placeType === 'address') {
          accuracyScore *= 1.0; // 完整地址最准确
        } else if (placeType === 'poi') {
          accuracyScore *= 0.9; // 兴趣点稍微降低精确度
        } else if (placeType === 'place') {
          accuracyScore *= 0.8; // 地名再降低
        } else if (placeType === 'region') {
          accuracyScore *= 0.5; // 区域很不精确
        } else if (placeType === 'country') {
          accuracyScore *= 0.2; // 国家级结果极不精确
        }
        
        return {
          longitude,
          latitude,
          placeName: feature.place_name,
          formattedAddress: feature.place_name,
          placeType: placeType,
          accuracy: {
            relevance: relevanceScore,      // 原始相关性分数
            confidence: confidence,          // Mapbox置信度
            score: parseFloat(accuracyScore.toFixed(4)),  // 最终加权精确度分数
            level: getAccuracyLevel(accuracyScore) // 易于理解的精确度等级
          },
          context: feature.context?.map(item => ({
            id: item.id,
            text: item.text
          })),
          provider: 'mapbox'
        };
      });
      
      // 计算整体可靠性分数 (0-100%)
      const mainResult = features[0];
      const reliability = Math.min(100, Math.round(mainResult.accuracy.score * 100));
      
      // 生成可能的警告信息
      const warnings = [];
      if (reliability < 70) {
        warnings.push({
          type: "low_reliability",
          message: "地理编码结果可能不准确，请验证地址"
        });
      }
      
      // 如果结果不是确切的地址，也添加警告
      if (mainResult.placeType !== 'address') {
        warnings.push({
          type: "not_precise_address",
          message: `结果类型为 ${mainResult.placeType}，而非精确地址`,
          details: { 
            placeType: mainResult.placeType,
            expectedType: "address" 
          }
        });
      }
      
      // 返回增强的结果
      res.json({
        success: true,
        result: mainResult,
        allResults: options.limit > 1 ? features : undefined,
        meta: {
          query: address,
          reliability: reliability,
          warnings: warnings.length > 0 ? warnings : undefined,
          timestamp: new Date().toISOString(),
          provider: "mapbox",
          cacheStatus: "fresh" // 默认为新结果，可由geocodeAddressWithCache函数设置为'hit'
        }
      });
    } catch (error) {
      console.error('[MapRoutes] Mapbox API 错误:', error.response?.data || error.message);
      
      // 返回更详细的错误信息
      res.status(500).json({ 
        error: '地理编码API调用失败', 
        message: error.response?.data?.message || error.message,
        query: address 
      });
    }
  } catch (error) {
    console.error('[MapRoutes] 地理编码处理错误:', error);
    res.status(500).json({ 
      error: '地理编码请求处理失败', 
      message: error.message 
    });
  }
});

/**
 * 根据精确度分数获取可读的精确度等级描述
 * @param {number} score 精确度分数 (0-1)
 * @returns {string} 精确度等级描述
 */
function getAccuracyLevel(score) {
  if (score >= 0.9) return "very_high";
  if (score >= 0.75) return "high";
  if (score >= 0.6) return "medium";
  if (score >= 0.4) return "low";
  return "very_low";
}

/**
 * @route   POST /api/map/reverse-geocode
 * @desc    反向地理编码（坐标转地址）
 * @access  Private
 */
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { longitude, latitude, options = {} } = req.body;
    
    if (longitude === undefined || latitude === undefined) {
      return res.status(400).json({ error: '需要提供经纬度坐标' });
    }
    
    // 使用Mapbox反向地理编码API
    const reverseGeocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`;
    
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      limit: options.limit || 1,
      language: options.language || 'en',
      types: options.types || 'address'
    });
    
    const url = `${reverseGeocodingUrl}?${params.toString()}`;
    
    try {
      const response = await axios.get(url);
      
      if (!response.data || !response.data.features || response.data.features.length === 0) {
        return res.status(404).json({ error: '找不到该坐标对应的地址' });
      }
      
      const feature = response.data.features[0];
      
      // 返回结果
      res.json({
        success: true,
        result: {
          address: feature.place_name,
          placeName: feature.text,
          placeType: feature.place_type?.[0] || 'unknown',
          context: feature.context,
          provider: 'mapbox'
        }
      });
    } catch (error) {
      console.error('[MapRoutes] 反向地理编码错误:', error);
      res.status(500).json({ 
        error: '反向地理编码失败', 
        message: error.response?.data?.message || error.message 
      });
    }
  } catch (error) {
    console.error('[MapRoutes] 反向地理编码处理错误:', error);
    res.status(500).json({ 
      error: '反向地理编码请求处理失败', 
      message: error.message 
    });
  }
});

// 导出路由
module.exports = router; 