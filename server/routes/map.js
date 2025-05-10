const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Mapbox配置
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

/**
 * @route   GET /api/map/config
 * @desc    获取地图配置信息（不暴露敏感详情）
 * @access  Private
 */
router.get('/config', async (req, res) => {
  try {
    // 只提供必要的配置信息，不直接返回密钥
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
 * @desc    规划路线（服务器代理请求Mapbox以保护API密钥）
 * @access  Private
 */
router.post('/route', async (req, res) => {
  try {
    const { waypoints, optimize = true } = req.body;
    
    // 验证参数
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ error: '需要至少两个有效的路点' });
    }
    
    // 准备Mapbox API所需的坐标格式：经度,纬度
    const coordinates = waypoints
      .map(point => `${point.longitude},${point.latitude}`)
      .join(';');
    
    // 构建Mapbox API URL
    const mapboxBaseUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/`;
    let url = `${mapboxBaseUrl}${coordinates}`;
    
    // 添加查询参数
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      annotations: 'distance,duration,speed',
      language: 'zh-Hans'
    });
    
    // 如果需要路线优化
    if (optimize && waypoints.length > 2) {
      params.append('waypoints_per_route', 'true');
      params.append('waypoint_optimization', 'true');
    }
    
    url = `${url}?${params.toString()}`;
    
    // 发起请求到Mapbox API
    const startTime = Date.now();
    const response = await axios.get(url);
    const endTime = Date.now();
    
    // 处理响应
    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      return res.status(400).json({ error: 'Mapbox API没有返回有效路线' });
    }
    
    // 处理Mapbox响应
    const mapboxRoute = response.data.routes[0];
    
    // 提取路线坐标（Mapbox返回GeoJSON格式）
    const routeCoordinates = mapboxRoute.geometry.coordinates.map(
      coord => [coord[1], coord[0]] // 转换为[lat, lng]格式以匹配客户端应用
    );
    
    // 提取距离（米转公里）和时间（秒转分钟）
    const distance = (mapboxRoute.distance / 1000).toFixed(1);
    const duration = Math.round(mapboxRoute.duration / 60);
    
    // 记录性能指标
    console.log(`[server] Mapbox路线规划成功 - API响应时间: ${endTime - startTime}ms`);
    
    // 提取导航步骤信息
    const steps = mapboxRoute.legs.flatMap(leg => 
      leg.steps.map(step => ({
        instruction: step.maneuver.instruction,
        distance: (step.distance / 1000).toFixed(2),
        duration: Math.round(step.duration / 60),
        coordinates: step.geometry.coordinates.map(coord => [coord[1], coord[0]])
      }))
    );
    
    // 返回处理后的数据
    const result = {
      success: true,
      route: {
        waypoints: waypoints,
        coordinates: routeCoordinates,
        distance,
        duration,
        steps,
        provider: 'mapbox'
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('规划路线时出错:', error);
    res.status(500).json({ 
      error: '路线规划失败', 
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
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: '需要提供地址' });
    }
    
    // 使用Mapbox Geocoding API
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
    
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      limit: 1,
      language: 'zh-Hans'
    });
    
    const url = `${geocodingUrl}?${params.toString()}`;
    
    const response = await axios.get(url);
    
    if (!response.data || !response.data.features || response.data.features.length === 0) {
      return res.status(404).json({ error: '找不到该地址的坐标' });
    }
    
    const feature = response.data.features[0];
    const [longitude, latitude] = feature.center;
    
    // 返回结果
    res.json({
      success: true,
      result: {
        longitude,
        latitude,
        placeName: feature.place_name,
        accuracy: feature.relevance,
        provider: 'mapbox'
      }
    });
  } catch (error) {
    console.error('地理编码时出错:', error);
    res.status(500).json({ 
      error: '地理编码失败', 
      message: error.message 
    });
  }
});

module.exports = router; 