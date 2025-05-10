/**
 * 客户互动历史模型
 */
const mongoose = require('mongoose');

// 自定义字段模式
const CustomFieldSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'number', 'date', 'boolean', 'json'],
    default: 'text'
  }
}, { _id: false });

// 互动记录模式
const InteractionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['note', 'call', 'email', 'meeting', 'chat', 'task', 'social', 'other'],
    required: true,
    index: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound', 'internal', 'none'],
    default: 'none'
  },
  channel: {
    type: String,
    enum: ['direct', 'email', 'phone', 'web', 'social', 'app', 'other'],
    default: 'direct'
  },
  subject: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'scheduled', 'canceled', 'archived'],
    default: 'completed'
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'mixed', 'unknown'],
    default: 'unknown'
  },
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    default: 0
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  customFields: [CustomFieldSchema],
  attachments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String
    },
    size: {
      type: Number
    }
  }],
  metadata: {
    type: Object,
    default: {}
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  scheduledDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  createdBy: {
    type: String,
    required: true
  },
  lastUpdatedBy: {
    type: String
  }
}, { 
  timestamps: true 
});

// 索引
InteractionSchema.index({ createdAt: -1 });
InteractionSchema.index({ customerId: 1, createdAt: -1 });
InteractionSchema.index({ type: 1, createdAt: -1 });
InteractionSchema.index({ isDeleted: 1 });
InteractionSchema.index({ status: 1 });
InteractionSchema.index({ 
  subject: 'text', 
  content: 'text', 
  summary: 'text' 
}, {
  weights: {
    subject: 10,
    content: 5,
    summary: 7
  }
});

// 静态方法：查找未删除的互动记录
InteractionSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isDeleted: false }).sort({ createdAt: -1 });
};

// 模型方法：软删除
InteractionSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.lastUpdatedBy = userId;
  return this.save();
};

// 静态方法：通过客户ID获取互动历史
InteractionSchema.statics.getCustomerHistory = function(customerId, options = {}) {
  const { limit = 50, skip = 0, types = [], sort = -1 } = options;
  
  const query = { 
    customerId, 
    isDeleted: false 
  };
  
  if (types && types.length > 0) {
    query.type = { $in: types };
  }
  
  return this.find(query)
    .sort({ createdAt: sort })
    .skip(skip)
    .limit(limit)
    .populate('tags', 'name color category');
};

// 中间件：如果是完成状态设置完成日期
InteractionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  next();
});

// 创建模型
const Interaction = mongoose.model('Interaction', InteractionSchema);

module.exports = Interaction; 