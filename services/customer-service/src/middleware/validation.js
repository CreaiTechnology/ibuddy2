const Joi = require('joi');

/**
 * 请求验证中间件
 * 使用Joi验证请求数据
 */

// 客户数据验证规则
const customerSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).messages({
    'string.empty': '客户名称不能为空',
    'string.min': '客户名称至少需要{{#limit}}个字符',
    'string.max': '客户名称不能超过{{#limit}}个字符',
    'any.required': '客户名称是必须的'
  }),
  email: Joi.string().email().allow('', null).messages({
    'string.email': '电子邮箱格式无效'
  }),
  phone: Joi.string().allow('', null).max(20).pattern(/^[0-9\+\-\(\)\s]*$/).messages({
    'string.max': '电话号码不能超过{{#limit}}个字符',
    'string.pattern.base': '电话号码格式无效'
  }),
  company: Joi.string().allow('', null).max(100),
  address: Joi.string().allow('', null).max(200),
  notes: Joi.string().allow('', null).max(2000),
  custom_fields: Joi.object().allow(null),
  tags: Joi.array().items(Joi.string().guid()).allow(null)
});

// 标签数据验证规则
const tagSchema = Joi.object({
  name: Joi.string().required().min(1).max(50).messages({
    'string.empty': '标签名称不能为空',
    'string.min': '标签名称至少需要{{#limit}}个字符',
    'string.max': '标签名称不能超过{{#limit}}个字符',
    'any.required': '标签名称是必须的'
  }),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow('', null).messages({
    'string.pattern.base': '颜色代码格式无效，应为#RRGGBB格式'
  }),
  description: Joi.string().allow('', null).max(200)
});

// 互动数据验证规则
const interactionSchema = Joi.object({
  customer_id: Joi.string().guid().required().messages({
    'string.guid': '客户ID格式无效',
    'any.required': '客户ID是必须的'
  }),
  type: Joi.string().required().valid(
    'note', 'email', 'call', 'meeting', 'message', 
    'ai_reply', 'ai_analysis', 'system', 'import'
  ).messages({
    'any.required': '互动类型是必须的',
    'any.only': '互动类型必须是以下之一: note, email, call, meeting, message, ai_reply, ai_analysis, system, import'
  }),
  title: Joi.string().allow('', null).max(100),
  content: Joi.string().required().max(10000).messages({
    'string.empty': '互动内容不能为空',
    'string.max': '互动内容不能超过{{#limit}}个字符',
    'any.required': '互动内容是必须的'
  }),
  metadata: Joi.object().allow(null)
});

// 批量互动验证规则
const bulkInteractionSchema = Joi.object({
  interactions: Joi.array().items(Joi.object({
    customer_id: Joi.string().guid().required(),
    type: Joi.string().valid(
      'note', 'email', 'call', 'meeting', 'message', 
      'ai_reply', 'ai_analysis', 'system', 'import'
    ).default('note'),
    title: Joi.string().allow('', null).max(100),
    content: Joi.string().required().max(10000),
    metadata: Joi.object().allow(null),
    created_at: Joi.date().iso().allow(null)
  })).min(1).required().messages({
    'array.min': '至少需要提供一条互动记录',
    'any.required': '互动记录数组是必须的'
  })
});

/**
 * 创建验证中间件
 * @param {object} schema - Joi验证模式
 * @returns {function} Express中间件函数
 */
const createValidator = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: '请求数据验证失败',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }
    
    next();
  };
};

// 导出验证中间件
module.exports = {
  validateCustomer: createValidator(customerSchema),
  validateTag: createValidator(tagSchema),
  validateInteraction: createValidator(interactionSchema),
  validateBulkInteractions: createValidator(bulkInteractionSchema)
}; 