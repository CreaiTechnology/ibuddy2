/**
 * 地理编码功能测试脚本
 * 用法: node test-geocoding.js [地址]
 */

// 加载环境变量
require('dotenv').config();

// 导入地图服务
const { mapService } = require('../services/mapService');

// 测试地址列表
const TEST_ADDRESSES = [
  // 标准地址
  'Jalan Sultan Ismail, Kuala Lumpur 50250, Malaysia',
  
  // 缩写地址 
  'Jln Sultan Ismail, KL 50250, MY',
  
  // 含有填充词的地址
  'near KLCC, Jalan Ampang, Kuala Lumpur',
  
  // 不准确或不完整的地址
  'Near Bukit Bintang',
  
  // 完整地址
  '40, Jalan Bukit Bintang, Bukit Bintang, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia',
  
  // 用户可能提供的命令行参数
  ...(process.argv.slice(2))
];

/**
 * 格式化地理编码结果输出
 */
function formatResult(address, result) {
  console.log('\n-------------------------------------------------------');
  console.log(`地址: "${address}"`);
  
  if (!result) {
    console.log('结果: 未找到');
    return;
  }
  
  console.log(`结果: 找到`);
  console.log(`坐标: ${result.latitude}, ${result.longitude}`);
  console.log(`格式化地址: ${result.formattedAddress}`);
  console.log(`准确度分数: ${result.accuracyScore || 'N/A'}`);
  console.log(`置信度: ${result.confidence || 'N/A'}`);
  console.log(`来源: ${result.fromCache ? '缓存' : 'API'}`);
  
  if (result.placeComponents) {
    console.log('地址组件:');
    Object.entries(result.placeComponents).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('地理编码测试开始...');
  console.log(`测试地址数量: ${TEST_ADDRESSES.length}`);
  
  const results = [];
  
  for (const address of TEST_ADDRESSES) {
    try {
      console.log(`正在地理编码地址: "${address}"`);
      
      // 第一次调用 - 从API获取
      const result = await mapService.geocodeAddressWithCache(address);
      
      // 记录结果
      formatResult(address, result);
      
      if (result) {
        // 检查可靠性
        const isReliable = mapService.isReliableGeocode ? 
          mapService.isReliableGeocode(result) : 
          (result.accuracyScore > 0.75);
        
        console.log(`可靠性检查: ${isReliable ? '通过' : '未通过'}`);
        
        // 第二次调用 - 从缓存获取
        console.log('尝试从缓存获取...');
        const cachedResult = await mapService.geocodeAddressWithCache(address);
        if (cachedResult && cachedResult.fromCache) {
          console.log('缓存命中成功!');
        } else {
          console.log('缓存未命中或未正确标记!');
        }
        
        results.push({
          address,
          success: true,
          reliable: isReliable,
          fromCache: cachedResult && cachedResult.fromCache
        });
      } else {
        results.push({
          address,
          success: false
        });
      }
    } catch (error) {
      console.error(`地理编码地址 "${address}" 时出错:`, error.message);
      results.push({
        address,
        success: false,
        error: error.message
      });
    }
  }
  
  // 输出统计
  console.log('\n-------------------------------------------------------');
  console.log('测试统计:');
  console.log(`总地址数: ${results.length}`);
  console.log(`成功地理编码数: ${results.filter(r => r.success).length}`);
  console.log(`可靠结果数: ${results.filter(r => r.success && r.reliable).length}`);
  console.log(`缓存命中数: ${results.filter(r => r.success && r.fromCache).length}`);
  console.log('-------------------------------------------------------');
}

// 执行测试
main().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
}); 