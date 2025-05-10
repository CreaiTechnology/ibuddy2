/**
 * 客户控制器
 */
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const Customer = require('../models/customer');
const Tag = require('../models/tag');
const Interaction = require('../models/interaction');
const mongoose = require('mongoose');
const cacheService = require('../services/cacheService');

// 缓存配置
const CACHE_TTL = 60 * 5; // 5分钟缓存
const CUSTOMER_CACHE_PREFIX = 'customer:';
const CUSTOMER_LIST_CACHE_PREFIX = 'customers:list:';

/**
 * 获取所有客户
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const getCustomers = asyncHandler(async (req, res) => {
  const {
    limit = 20,
    page = 1,
    sort = '-createdAt',
    status,
    search,
    tags,
    source,
    lifecycle
  } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // 构建查询条件
  const query = { isDeleted: false };
  
  // 状态过滤
  if (status) {
    query.status = status;
  }
  
  // 来源过滤
  if (source) {
    query.source = source;
  }
  
  // 生命周期阶段过滤
  if (lifecycle) {
    query.lifecycle = lifecycle;
  }
  
  // 标签过滤
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim());
    query.tags = { $in: tagArray };
  }
  
  // 搜索过滤
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
      { organization: { $regex: search, $options: 'i' } },
      { 'contacts.value': { $regex: search, $options: 'i' } }
    ];
  }
  
  // 尝试从缓存获取结果
  const cacheKey = `${CUSTOMER_LIST_CACHE_PREFIX}${JSON.stringify({ 
    query, limit, skip, sort 
  })}`;
  
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }
  
  // 获取总数
  const total = await Customer.countDocuments(query);
  
  // 获取客户列表
  const customers = await Customer.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('tags', 'name color category');
  
  const result = {
    success: true,
    customers,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  };
  
  // 缓存结果
  await cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL);
  
  res.json(result);
});

/**
 * 通过ID获取客户
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 验证ObjectID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('无效的客户ID', 400);
  }
  
  // 尝试从缓存获取
  const cacheKey = `${CUSTOMER_CACHE_PREFIX}${id}`;
  const cachedCustomer = await cacheService.get(cacheKey);
  
  if (cachedCustomer) {
    return res.json({
      success: true,
      customer: JSON.parse(cachedCustomer)
    });
  }
  
  // 从数据库获取
  const customer = await Customer.findOne({ 
    _id: id, 
    isDeleted: false 
  }).populate('tags', 'name color category');
  
  if (!customer) {
    throw new ApiError('客户未找到', 404);
  }
  
  // 保存到缓存
  await cacheService.set(cacheKey, JSON.stringify(customer), CACHE_TTL);
  
  res.json({
    success: true,
    customer
  });
});

/**
 * 创建新客户
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const createCustomer = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    organization,
    contacts,
    addresses,
    tags,
    customFields,
    status,
    source,
    notes,
    lifecycle
  } = req.body;
  
  // 验证必填字段
  if (!firstName || !lastName) {
    throw new ApiError('名字和姓氏为必填项', 400);
  }
  
  // 如果提供了标签，确保它们存在
  let tagObjects = [];
  if (tags && tags.length > 0) {
    // 处理标签
    tagObjects = await Promise.all(tags.map(async (tagName) => {
      // 查找或创建标签
      const tag = await Tag.findOrCreate({
        name: tagName,
        createdBy: req.user.id
      });
      return tag._id;
    }));
  }
  
  // 创建客户
  const customer = new Customer({
    userId: req.user.id,
    firstName,
    lastName,
    organization,
    contacts: contacts || [],
    addresses: addresses || [],
    tags: tagObjects,
    customFields: customFields || [],
    status: status || 'active',
    source: source || 'direct',
    notes,
    lifecycle: lifecycle || 'lead',
    createdBy: req.user.id,
    lastUpdatedBy: req.user.id
  });
  
  await customer.save();
  
  // 如果有标签，更新标签使用计数
  if (tagObjects.length > 0) {
    await Tag.updateMany(
      { _id: { $in: tagObjects } },
      { $inc: { usageCount: 1 } }
    );
  }
  
  // 清除客户列表缓存
  await cacheService.clearPrefix(CUSTOMER_LIST_CACHE_PREFIX);
  
  // 创建初始笔记互动记录（如果提供了笔记）
  if (notes) {
    const interaction = new Interaction({
      customerId: customer._id,
      userId: req.user.id,
      type: 'note',
      content: notes,
      status: 'completed',
      createdBy: req.user.id
    });
    
    await interaction.save();
  }
  
  // 填充标签引用
  await customer.populate('tags', 'name color category');
  
  res.status(201).json({
    success: true,
    customer
  });
});

/**
 * 更新客户
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 验证ObjectID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('无效的客户ID', 400);
  }
  
  // 查找客户
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  
  if (!customer) {
    throw new ApiError('客户未找到', 404);
  }
  
  const {
    firstName,
    lastName,
    organization,
    contacts,
    addresses,
    tags,
    customFields,
    status,
    source,
    notes,
    lifecycle
  } = req.body;
  
  // 更新基本信息
  if (firstName) customer.firstName = firstName;
  if (lastName) customer.lastName = lastName;
  if (organization) customer.organization = organization;
  if (status) customer.status = status;
  if (source) customer.source = source;
  if (notes) customer.notes = notes;
  if (lifecycle) customer.lifecycle = lifecycle;
  
  // 更新联系方式和地址
  if (contacts) customer.contacts = contacts;
  if (addresses) customer.addresses = addresses;
  
  // 更新自定义字段
  if (customFields) {
    // 合并自定义字段
    const existingFields = {};
    customer.customFields.forEach(field => {
      existingFields[field.key] = field;
    });
    
    customFields.forEach(field => {
      existingFields[field.key] = field;
    });
    
    customer.customFields = Object.values(existingFields);
  }
  
  // 更新标签
  if (tags) {
    // 保存旧标签以便更新使用计数
    const oldTags = [...customer.tags];
    
    // 处理新标签
    const tagObjects = await Promise.all(tags.map(async (tagName) => {
      const tag = await Tag.findOrCreate({
        name: tagName,
        createdBy: req.user.id
      });
      return tag._id;
    }));
    
    customer.tags = tagObjects;
    
    // 更新标签使用计数
    const addedTags = tagObjects.filter(t => !oldTags.includes(t));
    const removedTags = oldTags.filter(t => !tagObjects.includes(t));
    
    if (addedTags.length > 0) {
      await Tag.updateMany(
        { _id: { $in: addedTags } },
        { $inc: { usageCount: 1 } }
      );
    }
    
    if (removedTags.length > 0) {
      await Tag.updateMany(
        { _id: { $in: removedTags } },
        { $inc: { usageCount: -1 } }
      );
    }
  }
  
  // 设置最后更新者
  customer.lastUpdatedBy = req.user.id;
  
  // 保存更新
  await customer.save();
  
  // 清除缓存
  await cacheService.del(`${CUSTOMER_CACHE_PREFIX}${id}`);
  await cacheService.clearPrefix(CUSTOMER_LIST_CACHE_PREFIX);
  
  // 填充标签引用
  await customer.populate('tags', 'name color category');
  
  res.json({
    success: true,
    customer
  });
});

/**
 * 删除客户（软删除）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 验证ObjectID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('无效的客户ID', 400);
  }
  
  // 查找客户
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  
  if (!customer) {
    throw new ApiError('客户未找到', 404);
  }
  
  // 执行软删除
  customer.isDeleted = true;
  customer.lastUpdatedBy = req.user.id;
  await customer.save();
  
  // 清除缓存
  await cacheService.del(`${CUSTOMER_CACHE_PREFIX}${id}`);
  await cacheService.clearPrefix(CUSTOMER_LIST_CACHE_PREFIX);
  
  // 标记关联的互动记录为已删除
  await Interaction.updateMany(
    { customerId: id },
    { isDeleted: true, lastUpdatedBy: req.user.id }
  );
  
  res.json({
    success: true,
    message: '客户已成功删除'
  });
});

/**
 * 获取客户统计信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const getCustomerStats = asyncHandler(async (req, res) => {
  // 按状态统计
  const statusStats = await Customer.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // 按生命周期阶段统计
  const lifecycleStats = await Customer.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$lifecycle', count: { $sum: 1 } } }
  ]);
  
  // 按来源统计
  const sourceStats = await Customer.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$source', count: { $sum: 1 } } }
  ]);
  
  // 获取总数
  const totalCustomers = await Customer.countDocuments({ isDeleted: false });
  const totalDeleted = await Customer.countDocuments({ isDeleted: true });
  
  // 近期添加的客户
  const recentlyAdded = await Customer.countDocuments({
    isDeleted: false,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30天内
  });
  
  res.json({
    success: true,
    stats: {
      total: totalCustomers,
      deleted: totalDeleted,
      recentlyAdded,
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id || 'unknown'] = stat.count;
        return acc;
      }, {}),
      byLifecycle: lifecycleStats.reduce((acc, stat) => {
        acc[stat._id || 'unknown'] = stat.count;
        return acc;
      }, {}),
      bySource: sourceStats.reduce((acc, stat) => {
        acc[stat._id || 'unknown'] = stat.count;
        return acc;
      }, {})
    }
  });
});

/**
 * 获取客户的互动历史
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const getCustomerInteractions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 20, page = 1, types } = req.query;
  
  // 验证ObjectID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError('无效的客户ID', 400);
  }
  
  // 确认客户存在
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) {
    throw new ApiError('客户未找到', 404);
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const typesArray = types ? types.split(',') : [];
  
  // 获取互动记录
  const interactions = await Interaction.getCustomerHistory(id, {
    limit: parseInt(limit),
    skip,
    types: typesArray
  });
  
  // 获取总数
  const totalQuery = { customerId: id, isDeleted: false };
  if (typesArray.length > 0) {
    totalQuery.type = { $in: typesArray };
  }
  
  const total = await Interaction.countDocuments(totalQuery);
  
  res.json({
    success: true,
    interactions,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getCustomerInteractions
}; 