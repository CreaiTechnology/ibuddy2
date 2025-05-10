/**
 * 客户数据模型
 */
const mongoose = require('mongoose');

// 联系信息模式
const ContactSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'phone', 'wechat', 'telegram', 'whatsapp', 'other'],
    required: true
  },
  value: {
    type: String,
    required: true
  },
  primary: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  notes: {
    type: String
  }
}, { _id: true, timestamps: true });

// 客户地址模式
const AddressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  primary: {
    type: Boolean,
    default: false
  }
}, { _id: true, timestamps: true });

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
}, { _id: true, timestamps: true });

// 客户模式
const CustomerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  displayName: {
    type: String
  },
  organization: {
    type: String
  },
  avatar: {
    type: String
  },
  contacts: [ContactSchema],
  addresses: [AddressSchema],
  tags: [{
    type: String,
    ref: 'Tag'
  }],
  customFields: [CustomFieldSchema],
  status: {
    type: String,
    enum: ['active', 'inactive', 'lead', 'potential', 'archived'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['referral', 'website', 'campaign', 'social', 'direct', 'other'],
    default: 'other'
  },
  notes: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
  },
  lastUpdatedBy: {
    type: String
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lifecycle: {
    type: String,
    enum: ['prospect', 'lead', 'customer', 'former', 'champion'],
    default: 'lead'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：全名
CustomerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// 索引
CustomerSchema.index({ firstName: 'text', lastName: 'text', organization: 'text' });
CustomerSchema.index({ 'contacts.value': 1 });
CustomerSchema.index({ createdAt: -1 });
CustomerSchema.index({ updatedAt: -1 });
CustomerSchema.index({ isDeleted: 1 });

// 静态方法：查找未删除的客户
CustomerSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isDeleted: false });
};

// 模型方法：软删除
CustomerSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.lastUpdatedBy = userId;
  return this.save();
};

// 中间件：设置displayName
CustomerSchema.pre('save', function(next) {
  if (!this.displayName) {
    this.displayName = `${this.firstName} ${this.lastName}`;
  }
  next();
});

// 中间件：确保每个联系方式类型最多有一个主要联系方式
CustomerSchema.pre('save', function(next) {
  const contactTypes = {};
  
  if (this.contacts && this.contacts.length) {
    this.contacts.forEach(contact => {
      if (contact.primary) {
        if (contactTypes[contact.type]) {
          contact.primary = false;
        } else {
          contactTypes[contact.type] = true;
        }
      }
    });
  }
  
  next();
});

// 创建模型
const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = Customer; 