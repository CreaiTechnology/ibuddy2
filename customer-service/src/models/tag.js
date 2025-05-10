/**
 * 标签数据模型
 */
const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#6c757d' // 默认灰色
  },
  category: {
    type: String,
    enum: ['system', 'user', 'segment', 'marketing', 'sales', 'service', 'other'],
    default: 'user'
  },
  createdBy: {
    type: String,
    required: true
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: {}
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 索引
TagSchema.index({ name: 1, category: 1 }, { unique: true });
TagSchema.index({ isArchived: 1 });
TagSchema.index({ category: 1 });
TagSchema.index({ createdBy: 1 });

// 静态方法：查找活跃标签
TagSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isArchived: false });
};

// 静态方法：通过名称查找或创建标签
TagSchema.statics.findOrCreate = async function(tagData) {
  const { name, color, category = 'user', createdBy } = tagData;
  
  try {
    // 先尝试查找
    let tag = await this.findOne({ 
      name: name.trim(),
      category
    });
    
    // 如果不存在则创建
    if (!tag) {
      tag = await this.create({
        name: name.trim(),
        color: color || '#6c757d',
        category,
        createdBy
      });
    }
    
    return tag;
  } catch (error) {
    throw error;
  }
};

// 中间件：确保名称小写
TagSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.toLowerCase();
  }
  next();
});

// 创建模型
const Tag = mongoose.model('Tag', TagSchema);

module.exports = Tag; 