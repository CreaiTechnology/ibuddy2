const supabase = require('../config/supabase');
const axios = require('axios'); // For Mapbox API calls

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const GEOCODING_CACHE_TABLE = 'geocoding_cache';

/**
 * 标准化和清理地址字符串以提高地理编码精确度
 * 
 * @param {string} addressString 原始地址字符串
 * @returns {string} 标准化后的地址字符串
 */
function normalizeAddress(addressString) {
  if (!addressString) return '';

  // 移除多余空格
  let normalized = addressString.trim().replace(/\s+/g, ' ');
  
  // 特殊符号替换 (例如: 将\替换为/)
  normalized = normalized.replace(/\\/g, '/');
  
  // 删除常见的无意义填充词（扩展列表）
  const fillerWords = [
    'near', 'beside', 'next to', 'opposite', 'across from', 'close to', 'around',
    '附近', '旁边', '对面', '隔壁', '附属于', '靠近', '周围', '大约', '大概',
    'behind', 'in front of', 'inside', 'outside', 'between',
    '后面', '前面', '里面', '外面', '之间'
  ];
  
  fillerWords.forEach(word => {
    // 确保只移除独立的填充词，而不是嵌入在其他词中的相同字符
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ');
  });
  
  // 邮政编码格式化
  normalized = normalized.replace(/([a-z0-9])(\d{5,7})\b/gi, '$1 $2');
  
  // 常见路标准化
  const streetReplacements = [
    { from: /\bSt\.?\b/gi, to: 'Street' },
    { from: /\bRd\.?\b/gi, to: 'Road' },
    { from: /\bAve\.?\b/gi, to: 'Avenue' },
    { from: /\bBlvd\.?\b/gi, to: 'Boulevard' },
    { from: /\bLn\.?\b/gi, to: 'Lane' },
    { from: /\bPl\.?\b/gi, to: 'Place' },
    // 马来西亚常见路名缩写
    { from: /\bJln\.?\b/gi, to: 'Jalan' },
    { from: /\bPsrn\.?\b/gi, to: 'Persiaran' },
    { from: /\bLrg\.?\b/gi, to: 'Lorong' },
    { from: /\bTmn\.?\b/gi, to: 'Taman' }
  ];
  
  streetReplacements.forEach(({ from, to }) => {
    normalized = normalized.replace(from, to);
  });
  
  // 处理单位号格式
  normalized = normalized.replace(/(\d+)\s*[#-]\s*(\d+)/g, '$1 Unit $2');
  
  // 清理处理后的多余空格和标点
  normalized = normalized.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/[,.;]+$/, '');
  
  return normalized;
}

/**
 * 验证地理编码结果是否可靠
 */
function isReliableGeocode(coords) {
  // 坐标存在性基础检查
  if (!coords || !coords.latitude || !coords.longitude) {
    console.warn('[MapService] 地理编码结果缺少有效坐标');
    return false;
  }
  
  // 准确度阈值提高到0.75（原来是0.6）
  if (coords.accuracyScore !== undefined && coords.accuracyScore < 0.75) {
    console.warn(`[MapService] 低准确度地理编码结果 (${coords.accuracyScore.toFixed(2)})`);
    return false;
  }
  
  // Mapbox置信度检查
  if (coords.confidence !== undefined && coords.confidence < 8) {
    console.warn(`[MapService] 低Mapbox置信度 (${coords.confidence})`);
    return false;
  }
  
  // 地理围栏检查 - 马来西亚边界
  const MALAYSIA_BOUNDS = {
    minLat: 0.85, maxLat: 7.35,
    minLng: 99.65, maxLng: 119.27
  };
  
  if (coords.latitude < MALAYSIA_BOUNDS.minLat || coords.latitude > MALAYSIA_BOUNDS.maxLat ||
      coords.longitude < MALAYSIA_BOUNDS.minLng || coords.longitude > MALAYSIA_BOUNDS.maxLng) {
    console.warn(`[MapService] 地理编码结果超出马来西亚边界: [${coords.latitude}, ${coords.longitude}]`);
    return false;
  }
  
  return true;
}

/**
 * Geocodes an address string using Mapbox API and caches the result in Supabase.
 * 
 * @param {string} addressString The address to geocode.
 * @returns {Promise<object|null>} Object with { latitude, longitude, formattedAddress, provider } or null if geocoding fails.
 */
async function geocodeAddressWithCache(addressString) {
  if (!addressString || typeof addressString !== 'string' || addressString.trim() === '') {
    console.warn('[MapService] 尝试对空或无效地址字符串进行地理编码。');
    return null;
  }

  // 标准化地址
  const normalizedAddress = normalizeAddress(addressString);
  if (normalizedAddress.length < 5) { // 太短的地址可能无效
    console.warn(`[MapService] 地址过短，可能无效: "${normalizedAddress}"`);
    return null;
  }
  
  if (!supabase) {
    console.error('[MapService] Supabase客户端未初始化。跳过地理编码。');
    // 如果supabase不可用，直接调用Mapbox API但不缓存
    return geocodeWithMapboxDirect(normalizedAddress);
  }

  // 检查缓存
  try {
    const { data: cachedData, error: cacheError } = await supabase
      .from(GEOCODING_CACHE_TABLE)
      .select('latitude, longitude, formatted_address, provider, accuracy_score, confidence, raw_response')
      .eq('address_text', normalizedAddress)
      .maybeSingle(); // 使用maybeSingle()而不是single()避免错误

    if (cacheError && cacheError.code !== 'PGRST116') {
      console.error('[MapService] 从地理编码缓存获取数据时出错:', cacheError);
    }
    
    if (cachedData) {
      console.log(`[MapService] 地理编码缓存命中: "${normalizedAddress}"`);
      return {
        latitude: cachedData.latitude,
        longitude: cachedData.longitude,
        formattedAddress: cachedData.formatted_address,
        provider: cachedData.provider,
        accuracyScore: cachedData.accuracy_score || null,
        confidence: cachedData.confidence || null, 
        rawResponse: cachedData.raw_response,
        fromCache: true
      };
    }
    console.log(`[MapService] 地理编码缓存未命中: "${normalizedAddress}"`);
  } catch (error) {
    console.error('[MapService] 地理编码缓存查找期间异常:', error);
    // 继续执行，尝试直接调用API
  }

  // 缓存未命中，调用Mapbox API
  try {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('[MapService] 未找到MAPBOX_ACCESS_TOKEN。请在服务器.env文件中设置。');
      return null; 
    }

    console.log(`[MapService] 调用Mapbox地理编码API: "${normalizedAddress}"`);
    const mapboxApiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedAddress)}.json`;
    
    // 优化的请求参数
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      limit: 1,                // 仅返回最佳匹配
      autocomplete: false,     // 完全匹配而非自动完成
      fuzzyMatch: true,        // 启用模糊匹配，处理轻微拼写错误
      language: 'en,ms,zh',    // 多语言支持（英语、马来语、中文）
      country: 'my',           // 国家代码（马来西亚）
      types: 'address,place,poi', // 搜索类型扩展
      proximity: '101.6942,3.1466', // 吉隆坡中心点，偏向该区域的结果
      routing: true            // 考虑道路网络，提高准确性
    });
    
    const response = await axios.get(`${mapboxApiUrl}?${params.toString()}`);
    
    if (response.data && response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      
      // 提取额外的准确度指标
      const relevanceScore = feature.relevance || 0;
      const confidence = feature.properties?.confidence || null;
      
      // 获取详细地址组件
      const context = feature.context || [];
      const placeComponents = {};
      context.forEach(item => {
        if (item.id.startsWith('postcode')) placeComponents.postcode = item.text;
        if (item.id.startsWith('place')) placeComponents.place = item.text;
        if (item.id.startsWith('region')) placeComponents.region = item.text;
        if (item.id.startsWith('country')) placeComponents.country = item.text;
      });
      
      const geocodingResult = {
        latitude: feature.center[1],
        longitude: feature.center[0],
        formattedAddress: feature.place_name,
        provider: 'mapbox',
        accuracyScore: relevanceScore,
        confidence: confidence,
        placeComponents: placeComponents,
        rawResponse: feature
      };
      
      // 对低准确度结果发出更详细的警告
      if (relevanceScore < 0.8) {
        console.warn(`[MapService] 低准确度地理编码结果 (${relevanceScore.toFixed(2)}) 地址: "${normalizedAddress}"`);
        console.warn(`  类型: ${feature.place_type}, 置信度: ${confidence || 'unknown'}`);
      }
      
      // 将结果存入缓存
      try {
        const { error: insertError } = await supabase
          .from(GEOCODING_CACHE_TABLE)
          .insert({
            address_text: normalizedAddress,
            latitude: geocodingResult.latitude,
            longitude: geocodingResult.longitude,
            formatted_address: geocodingResult.formattedAddress,
            provider: geocodingResult.provider,
            accuracy_score: geocodingResult.accuracyScore,
            confidence: geocodingResult.confidence,
            raw_response: geocodingResult.rawResponse
          });

        if (insertError) {
          console.error('[MapService] 保存到地理编码缓存时出错:', insertError);
        } else {
          console.log(`[MapService] 地理编码结果已缓存: "${normalizedAddress}"`);
        }
      } catch (cacheError) {
        console.error('[MapService] 地理编码缓存插入期间异常:', cacheError);
        // 缓存失败不影响返回结果
      }
      
      return { ...geocodingResult, fromCache: false };
    } else {
      console.warn(`[MapService] Mapbox地理编码未返回结果，地址: "${normalizedAddress}"`);
      
      // 尝试缓存空结果以避免重复无效查询
      try {
        if (supabase) {
          await supabase.from(GEOCODING_CACHE_TABLE).insert({
            address_text: normalizedAddress,
            provider: 'mapbox',
            created_at: new Date()
          });
        }
      } catch (emptyError) {
        // 忽略空结果缓存错误
      }
    }
  } catch (error) {
    console.error(`[MapService] 使用Mapbox对地址"${normalizedAddress}"进行地理编码时出错:`, error.message);
    
    // 记录API错误详情
    const apiErrorDetails = error.response?.data || {};
    console.error('[MapService] API错误详情:', JSON.stringify(apiErrorDetails));
  }
  return null;
}

// 直接调用Mapbox API的辅助函数（无缓存）
async function geocodeWithMapboxDirect(normalizedAddress) {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('[MapService] 未找到MAPBOX_ACCESS_TOKEN。请在服务器.env文件中设置。');
    return null; 
  }

  try {
    console.log(`[MapService] 直接调用Mapbox地理编码API (无缓存): "${normalizedAddress}"`);
    const mapboxApiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedAddress)}.json`;
    
    // 优化的请求参数
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      limit: 1,
      autocomplete: false,
      fuzzyMatch: true,
      language: 'en,ms,zh',
      country: 'my',
      types: 'address,place,poi',
      proximity: '101.6942,3.1466',
      routing: true
    });
    
    const response = await axios.get(`${mapboxApiUrl}?${params.toString()}`);
    
    if (response.data && response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      
      return {
        latitude: feature.center[1],
        longitude: feature.center[0],
        formattedAddress: feature.place_name,
        provider: 'mapbox',
        accuracyScore: feature.relevance || 0,
        confidence: feature.properties?.confidence || null,
        fromCache: false
      };
    }
  } catch (error) {
    console.error(`[MapService] 直接调用Mapbox API出错:`, error.message);
  }
  return null;
}

/**
 * Fetches route geometry, distance, and duration from Mapbox Directions API.
 * Caching for this function is a TODO.
 * @param {Array<object>} waypoints Array of waypoint objects { latitude, longitude, ... } in optimized order.
 * @param {string} [profile='driving-traffic'] Mapbox routing profile (e.g., driving, walking, cycling, driving-traffic).
 * @returns {Promise<object|null>} Object with { geometry, distance, duration } or null if fetching fails.
 */
async function getRouteWithMapboxAndCache(waypoints, profile = 'driving-traffic') {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error('[MapService] MAPBOX_ACCESS_TOKEN not found for Directions API. Please set it in server .env file.');
    return null;
  }

  if (!waypoints || waypoints.length < 2) {
    console.warn('[MapService] At least two waypoints are required to fetch a route. Provided:', waypoints ? waypoints.length : 0);
    // For a single point, there's no route. For zero points, also no route.
    // Depending on desired behavior, could return a specific structure or null.
    return {
        geometry: null, // Or an empty GeoJSON feature collection 
        distance: 0,
        duration: 0,
        message: "No route generated as less than 2 waypoints provided."
    };
  }

  // Format coordinates for Mapbox API: longitude,latitude;longitude,latitude;...
  const coordinatesString = waypoints.map(wp => `${wp.longitude},${wp.latitude}`).join(';');

  // Construct the Mapbox Directions API URL
  // API options: overview=full (detailed geometry), geometries=geojson (GeoJSON format)
  const mapboxApiUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;

  console.log(`[MapService] Fetching route from Mapbox Directions API for ${waypoints.length} waypoints with profile ${profile}.`);
  // console.log('[MapService] Mapbox API URL:', mapboxApiUrl); // For debugging, can be noisy

  try {
    const response = await axios.get(mapboxApiUrl);

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0]; // Typically, the first route is the one we want
      console.log(`[MapService] Route successfully fetched. Distance: ${(route.distance / 1000).toFixed(2)}km, Duration: ${(route.duration / 60).toFixed(2)}min.`);
      return {
        geometry: route.geometry,   // GeoJSON LineString
        distance: route.distance,   // In meters
        duration: route.duration,   // In seconds
        legs: route.legs,           // Array of route legs, if needed for more detail
        summary: route.weight_name || 'N/A', // e.g. "traffic"
        rawResponse: response.data // Optional: store the whole response if useful later
      };
    } else {
      console.warn('[MapService] Mapbox Directions API returned no routes. Response data:', response.data);
      return null; // Or a more specific error object
    }
  } catch (error) {
    console.error('[MapService] Error fetching route from Mapbox Directions API:', error.response ? error.response.data : error.message);
    // Consider the structure of error.response.data if available, Mapbox might provide specific error messages.
    // e.g., error.response.data.message
    const errorMessage = error.response && error.response.data && error.response.data.message 
                         ? error.response.data.message 
                         : error.message;
    return {
        geometry: null,
        distance: null,
        duration: null,
        error: true,
        message: `Mapbox API Error: ${errorMessage}`
    };
  }
}

// --- TSP Optimization using Simulated Annealing --- 

/**
 * Calculates the Haversine distance between two points on the earth.
 * @param {number} lat1 Latitude of point 1.
 * @param {number} lon1 Longitude of point 1.
 * @param {number} lat2 Latitude of point 2.
 * @param {number} lon2 Longitude of point 2.
 * @returns {number} Distance in kilometers.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  
  if (lat1 === lat2 && lon1 === lon2) return 0;
  if ([lat1, lon1, lat2, lon2].some(coord => typeof coord !== 'number')) return Infinity; // Handle invalid coords

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  lat1 = toRad(lat1);
  lat2 = toRad(lat2);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the total distance of a route (ordered array of waypoints).
 * @param {Array<object>} route Array of waypoint objects with { latitude, longitude }.
 * @returns {number} Total distance in kilometers.
 */
function calculateRouteDistance(route) {
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateHaversineDistance(
      route[i].latitude, route[i].longitude,
      route[i + 1].latitude, route[i + 1].longitude
    );
  }
  return totalDistance;
}

/**
 * Generates a neighbor route using 2-opt swap.
 * Reverses the order of points between two random indices (excluding fixed start/end).
 * @param {Array<object>} route Current route.
 * @param {number} fixedStartIndex Index of the fixed start point (usually 0).
 * @param {number} fixedEndIndex Index of the fixed end point (null if not fixed).
 * @returns {Array<object>} A new route array representing the neighbor.
 */
function generateNeighborRoute(route, fixedStartIndex = 0, fixedEndIndex = null) {
  const n = route.length;
  let i = fixedStartIndex; // Start index for swapping cannot be the fixed start
  let j = fixedStartIndex; // End index for swapping cannot be the fixed start
  
  const maxIndex = (fixedEndIndex !== null && fixedEndIndex >= 0) ? fixedEndIndex : n -1; 
  const minIndex = fixedStartIndex + 1; // Can't swap before the start
  
  if (maxIndex - minIndex < 2) { // Not enough points to swap between fixed points
      return [...route]; // Return a copy
  }

  // Ensure i and j are different and within swappable range
  while (i === j) {
      i = Math.floor(Math.random() * (maxIndex - minIndex )) + minIndex; 
      j = Math.floor(Math.random() * (maxIndex - minIndex )) + minIndex; 
  }
  
  // Ensure i < j
  if (i > j) [i, j] = [j, i];
  
  const newRoute = [...route]; // Create a copy
  // Reverse the segment between i and j (inclusive)
  const segment = newRoute.slice(i, j + 1);
  segment.reverse();
  newRoute.splice(i, segment.length, ...segment);
  
  return newRoute;
}

/**
 * Optimizes the order of waypoints using Simulated Annealing to solve the TSP.
 * Handles optional fixed start and end points.
 * @param {Array<object>} waypoints Array of waypoint objects { id, latitude, longitude, ... }.
 * @param {number} [startPointIndex=0] Index of the waypoint to fix as the starting point.
 * @param {number} [endPointIndex=null] Index of the waypoint to fix as the ending point (null if none).
 * @returns {Promise<Array<object>>} Promise resolving to the array of waypoints in optimized order.
 */
async function optimizeRouteOrder(waypoints, startPointIndex = 0, endPointIndex = null) {
  console.log(`[MapService] Starting TSP Optimization for ${waypoints.length} waypoints.`);
  if (!waypoints || waypoints.length <= 2) {
    console.log('[MapService] Less than 3 waypoints, no optimization needed.');
    return waypoints; // No optimization needed for 0, 1 or 2 points
  }

  // Validate indices
  startPointIndex = Math.min(Math.max(0, startPointIndex), waypoints.length - 1);
  if (endPointIndex !== null) {
    endPointIndex = Math.min(Math.max(0, endPointIndex), waypoints.length - 1);
    if (startPointIndex === endPointIndex) {
        console.warn('[MapService] Start and End point indices are the same. Treating as only fixed start.');
        endPointIndex = null; 
    }
  }
  
  // Prepare the initial route: move fixed points to ends, shuffle the rest
  let initialRoute = [...waypoints];
  const pointsToShuffle = [];
  const fixedStart = initialRoute[startPointIndex];
  const fixedEnd = endPointIndex !== null ? initialRoute[endPointIndex] : null;
  
  initialRoute.forEach((point, index) => {
      if (index !== startPointIndex && index !== endPointIndex) {
          pointsToShuffle.push(point);
      }
  });

  // Simple shuffle for initial randomness (Fisher-Yates shuffle)
  for (let i = pointsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pointsToShuffle[i], pointsToShuffle[j]] = [pointsToShuffle[j], pointsToShuffle[i]];
  }
  
  let currentRoute;
  if (fixedEnd) {
      currentRoute = [fixedStart, ...pointsToShuffle, fixedEnd];
  } else {
      currentRoute = [fixedStart, ...pointsToShuffle];
  }
  
  let bestRoute = [...currentRoute];
  let currentDistance = calculateRouteDistance(currentRoute);
  let bestDistance = currentDistance;

  // Simulated Annealing Parameters (these may need tuning)
  let temperature = 10000.0;   // Initial temperature - high enough to accept many worse moves initially
  const coolingRate = 0.995;  // Cooling rate - how fast temperature decreases (e.g., 0.99 to 0.999)
  const absoluteTemperature = 0.1; // Stopping temperature - when to stop the process
  const maxIterationsPerTemp = 100; // Iterations at each temperature step

  console.log(`[MapService] Initial Distance: ${currentDistance.toFixed(2)} km`);

  while (temperature > absoluteTemperature) {
      for (let i = 0; i < maxIterationsPerTemp; i++) {
          const neighborRoute = generateNeighborRoute(currentRoute, 0, fixedEnd ? currentRoute.length - 1 : null);
          const neighborDistance = calculateRouteDistance(neighborRoute);
          const deltaDistance = neighborDistance - currentDistance;

          // Acceptance probability (Metropolis criterion)
          const acceptanceProbability = Math.exp(-deltaDistance / temperature);

          // Decide whether to move to the neighbor state
          if (deltaDistance < 0 || Math.random() < acceptanceProbability) {
              currentRoute = neighborRoute;
              currentDistance = neighborDistance;

              // Update the best solution found so far
              if (currentDistance < bestDistance) {
                  bestRoute = [...currentRoute];
                  bestDistance = currentDistance;
              }
          }
       }
      // Cool down
      temperature *= coolingRate;
  }

  console.log(`[MapService] Optimized Distance: ${bestDistance.toFixed(2)} km`);
  console.log(`[MapService] Optimized Route Order (IDs): ${bestRoute.map(wp => wp.id || '?').join(' -> ')}`);
  return bestRoute;
}

// 添加更健壮的导出逻辑，即使地理编码无法使用也不会导致系统崩溃
const mapService = {
  geocodeAddressWithCache: async (addressString) => {
    try {
      return await geocodeAddressWithCache(addressString);
    } catch (error) {
      console.error('[MapService] Error in geocodeAddressWithCache:', error);
      return null;
    }
  },
  getRouteWithMapboxAndCache: async (waypoints, profile = 'driving-traffic') => {
    try {
      return await getRouteWithMapboxAndCache(waypoints, profile);
    } catch (error) {
      console.error('[MapService] Error in getRouteWithMapboxAndCache:', error);
      return null;
    }
  },
  calculateHaversineDistance,
  calculateRouteDistance,
  generateNeighborRoute,
  optimizeRouteOrder
};

// 检查必要的配置是否存在
function checkMapServiceConfiguration() {
  const issues = [];
  
  if (!MAPBOX_ACCESS_TOKEN) {
    issues.push('MAPBOX_ACCESS_TOKEN环境变量未设置');
  }
  
  if (!supabase) {
    issues.push('Supabase客户端未初始化');
  } else {
    try {
      // 尝试检查geocoding_cache表是否存在
      supabase.from(GEOCODING_CACHE_TABLE).select('count(*)', { count: 'exact', head: true })
        .then(({ error }) => {
          if (error) {
            console.warn(`[MapService] 警告: ${GEOCODING_CACHE_TABLE}表可能不存在: ${error.message}`);
          }
        })
        .catch(err => {
          console.warn(`[MapService] 无法检查${GEOCODING_CACHE_TABLE}表: ${err.message}`);
        });
    } catch (error) {
      issues.push(`无法访问${GEOCODING_CACHE_TABLE}表: ${error.message}`);
    }
  }
  
  if (issues.length > 0) {
    console.warn('[MapService] 服务配置问题:');
    issues.forEach(issue => console.warn(` - ${issue}`));
    return false;
  }
  
  console.log('[MapService] 服务配置检查通过');
  return true;
}

// 初始化检查
checkMapServiceConfiguration();

module.exports = { mapService }; 