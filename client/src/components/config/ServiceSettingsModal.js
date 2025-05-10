import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as serviceService from '../../services/serviceService'; // Import service functions
import { toast } from 'react-toastify';
import './ServiceSettingsModal.css'; // 现在我们已经创建了这个 CSS 文件

// 预定义的颜色选项（Flat UI Colors）
const COLOR_PRESETS = [
  { name: '蓝色', value: '#3498DB' },
  { name: '绿色', value: '#2ECC71' },
  { name: '紫色', value: '#9B59B6' },
  { name: '红色', value: '#E74C3C' },
  { name: '橙色', value: '#F39C12' },
  { name: '青色', value: '#1ABC9C' },
  { name: '黄色', value: '#F1C40F' },
  { name: '灰色', value: '#95A5A6' },
  { name: '深蓝', value: '#34495E' },
  { name: '深橙', value: '#D35400' },
  { name: '深绿', value: '#27AE60' },
  { name: '深紫', value: '#8E44AD' }
];

// 颜色选择器组件
const ColorPicker = ({ value, onChange }) => {
  const [customColor, setCustomColor] = useState(value || '');
  const [showColorInput, setShowColorInput] = useState(false);

  useEffect(() => {
    setCustomColor(value || '');
  }, [value]);

  const handlePresetClick = (colorValue) => {
    onChange(colorValue);
    setCustomColor(colorValue);
  };

  const handleCustomColorChange = (e) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(newColor)) {
      onChange(newColor);
    }
  };

  return (
    <div className="color-picker">
      <div className="color-presets">
        {COLOR_PRESETS.map(color => (
          <div
            key={color.value}
            className={`color-preset ${value === color.value ? 'selected' : ''}`}
            style={{ backgroundColor: color.value }}
            title={color.name}
            onClick={() => handlePresetClick(color.value)}
          />
        ))}
      </div>
      <div className="custom-color-container">
        {!showColorInput ? (
          <button
            className="custom-color-button"
            onClick={() => setShowColorInput(true)}
          >
            自定义...
          </button>
        ) : (
          <div className="custom-color-input-container">
            <input
              type="text"
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#RRGGBB"
              className="custom-color-input"
            />
            <div
              className="color-preview"
              style={{ backgroundColor: /^#([0-9A-Fa-f]{3}){1,2}$/.test(customColor) ? customColor : '#CCCCCC' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// 服务表单组件
const ServiceForm = ({ service, onSave, onCancel, isCreating = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    duration: 30,
    price: 0,
    colour: '#3498DB',
    description: '',
    max_overlap: 1
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service && !isCreating) {
      setFormData({
        name: service.name || '',
        duration: service.duration || 30,
        price: service.price || 0,
        colour: service.colour || '#3498DB',
        description: service.description || '',
        max_overlap: service.max_overlap || 1
      });
    }
  }, [service, isCreating]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除字段的错误提示
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleColorChange = (color) => {
    setFormData(prev => ({ ...prev, colour: color }));
    if (errors.colour) {
      setErrors(prev => ({ ...prev, colour: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '服务名称不能为空';
    }

    if (isNaN(formData.duration) || formData.duration <= 0) {
      newErrors.duration = '时长必须是大于0的数字';
    }

    if (isNaN(formData.price) || formData.price < 0) {
      newErrors.price = '价格必须是非负数';
    }

    if (!formData.colour || !/^#([0-9A-Fa-f]{3}){1,2}$/.test(formData.colour)) {
      newErrors.colour = '必须是有效的颜色代码，例如 #FF0000';
    }

    if (isNaN(formData.max_overlap) || formData.max_overlap < 1) {
      newErrors.max_overlap = '最大重叠数必须是大于0的整数';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // 转换表单数据中的数字类型
      const serviceData = {
        ...formData,
        duration: parseInt(formData.duration, 10),
        price: parseFloat(formData.price),
        max_overlap: parseInt(formData.max_overlap, 10)
      };

      await onSave(serviceData);
      // 成功后由调用方处理关闭表单等操作
    } catch (error) {
      console.error('保存服务失败:', error);
      toast.error('保存服务时出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="service-form">
      <div className="form-group">
        <label htmlFor="name">服务名称 <span className="required">*</span></label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'error' : ''}
          disabled={loading}
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="duration">时长（分钟） <span className="required">*</span></label>
        <input
          type="number"
          id="duration"
          name="duration"
          value={formData.duration}
          onChange={handleChange}
          min="1"
          className={errors.duration ? 'error' : ''}
          disabled={loading}
        />
        {errors.duration && <span className="error-text">{errors.duration}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="price">价格 <span className="required">*</span></label>
        <input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          min="0"
          step="0.01"
          className={errors.price ? 'error' : ''}
          disabled={loading}
        />
        {errors.price && <span className="error-text">{errors.price}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="colour">颜色 <span className="required">*</span></label>
        <ColorPicker 
          value={formData.colour} 
          onChange={handleColorChange} 
        />
        {errors.colour && <span className="error-text">{errors.colour}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">描述</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="max_overlap">最大重叠数 <span className="required">*</span></label>
        <input
          type="number"
          id="max_overlap"
          name="max_overlap"
          value={formData.max_overlap}
          onChange={handleChange}
          min="1"
          className={errors.max_overlap ? 'error' : ''}
          disabled={loading}
        />
        {errors.max_overlap && <span className="error-text">{errors.max_overlap}</span>}
        <small className="help-text">允许同一时间段内最多可以预约的次数</small>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={loading} className="cancel-button">
          取消
        </button>
        <button type="submit" disabled={loading} className="save-button">
          {loading ? '保存中...' : isCreating ? '创建服务' : '保存修改'}
        </button>
      </div>
    </form>
  );
};

// 确认删除对话框组件
const DeleteConfirmDialog = ({ service, onConfirm, onCancel }) => {
  return (
    <div className="confirm-dialog">
      <h3>确认删除</h3>
      <p>您确定要删除服务 "{service?.name}" 吗？</p>
      <p className="warning-text">注意：此操作不能撤销。如果该服务有关联的预约，将无法删除。</p>
      <div className="dialog-actions">
        <button onClick={onCancel} className="cancel-button">取消</button>
        <button onClick={onConfirm} className="delete-button">删除</button>
      </div>
    </div>
  );
};

// 主模态框组件
const ServiceSettingsModal = ({ isOpen, onClose }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overlapChanges, setOverlapChanges] = useState({});
  
  // 状态管理: 创建和编辑表单
  const [displayMode, setDisplayMode] = useState('list'); // 'list', 'create', 'edit', 'delete'
  const [selectedService, setSelectedService] = useState(null);
  
  // 获取服务
  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await serviceService.fetchServices();
      setServices(data || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("加载服务列表失败");
      toast.error("加载服务列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 当模态框打开时获取服务列表
  useEffect(() => {
    if (isOpen) {
      setDisplayMode('list');
      setSelectedService(null);
      setOverlapChanges({});
      fetchServices();
    }
  }, [isOpen]);

  // 处理最大重叠数变更（保留原有功能）
  const handleOverlapChange = (serviceId, value) => {
    const numValue = parseInt(value, 10);
    const newChange = isNaN(numValue) ? '' : numValue;
    setOverlapChanges(prev => ({
      ...prev,
      [serviceId]: newChange
    }));
  };

  // 保存最大重叠数变更（保留原有功能）
  const handleSaveOverlap = async () => {
    setLoading(true);
    setError('');
    let successCount = 0;
    let errorCount = 0;

    const updates = Object.entries(overlapChanges).map(async ([id, max_overlap]) => {
      const serviceIdNumber = parseInt(id, 10);
      const originalService = services.find(s => s.id === serviceIdNumber);
      const overlapValue = parseInt(max_overlap, 10);

      if (originalService &&
          !isNaN(overlapValue) &&
          overlapValue >= 0 &&
          overlapValue !== originalService.max_overlap)
      {
        try {
          await serviceService.updateService(id, { max_overlap: overlapValue });
          successCount++;
        } catch (err) {
          console.error(`Error updating service ${id}:`, err);
          errorCount++;
        }
      } else if (isNaN(overlapValue) || overlapValue < 0) {
         toast.warn(`${originalService?.name || `服务 ${id}`} 的重叠值无效，未保存。`);
         errorCount++;
      }
    });

    await Promise.all(updates);
    setLoading(false);

    if (errorCount > 0) {
      toast.error(`${errorCount} 个服务更新失败。请检查输入值。`);
    }
    if (successCount > 0) {
      toast.success(`${successCount} 个服务更新成功。`);
      fetchServices();
      setOverlapChanges({});
    }
    if (successCount === 0 && errorCount === 0) {
       toast.info("没有检测到变更。");
    }
  };

  // 创建新服务
  const handleCreateService = () => {
    setSelectedService(null);
    setDisplayMode('create');
  };

  // 编辑服务
  const handleEditService = (service) => {
    setSelectedService(service);
    setDisplayMode('edit');
  };

  // 删除服务
  const handleDeleteClick = (service) => {
    setSelectedService(service);
    setDisplayMode('delete');
  };

  // 保存新服务
  const handleSaveCreate = async (serviceData) => {
    try {
      const created = await serviceService.createService(serviceData);
      toast.success(`服务"${created.name}"创建成功`);
      fetchServices();
      setDisplayMode('list');
    } catch (error) {
      console.error('创建服务失败:', error);
      toast.error(`创建服务失败: ${error.message || '未知错误'}`);
      throw error; // 传递错误给表单组件处理
    }
  };

  // 保存编辑的服务
  const handleSaveEdit = async (serviceData) => {
    try {
      if (!selectedService || !selectedService.id) {
        throw new Error('没有选择要编辑的服务');
      }
      
      const updated = await serviceService.updateService(selectedService.id, serviceData);
      toast.success(`服务"${updated.name}"更新成功`);
      fetchServices();
      setDisplayMode('list');
    } catch (error) {
      console.error('更新服务失败:', error);
      toast.error(`更新服务失败: ${error.message || '未知错误'}`);
      throw error; // 传递错误给表单组件处理
    }
  };

  // 确认删除服务
  const handleConfirmDelete = async () => {
    if (!selectedService || !selectedService.id) return;
    
    setLoading(true);
    try {
      await serviceService.deleteService(selectedService.id);
      toast.success(`服务"${selectedService.name}"删除成功`);
      fetchServices();
      setDisplayMode('list');
    } catch (error) {
      console.error('删除服务失败:', error);
      
      // 检查是否是因为服务有关联的预约而无法删除
      if (error.response?.status === 409 || error.message?.includes('appointments')) {
        toast.error(`无法删除服务"${selectedService.name}"，因为它有关联的预约。请先删除这些预约。`);
      } else {
        toast.error(`删除服务失败: ${error.message || '未知错误'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 取消当前操作，返回列表视图
  const handleCancel = () => {
    setDisplayMode('list');
    setSelectedService(null);
  };

  // 如果模态框未打开，不显示任何内容
  if (!isOpen) return null;

  // 渲染内容根据当前的显示模式
  const renderContent = () => {
    switch (displayMode) {
      case 'create':
        return (
          <div className="form-container">
            <h3>创建新服务</h3>
            <ServiceForm 
              isCreating={true} 
              onSave={handleSaveCreate} 
              onCancel={handleCancel} 
            />
          </div>
        );
      
      case 'edit':
        return (
          <div className="form-container">
            <h3>编辑服务: {selectedService?.name}</h3>
            <ServiceForm 
              service={selectedService} 
              isCreating={false} 
              onSave={handleSaveEdit} 
              onCancel={handleCancel} 
            />
          </div>
        );
      
      case 'delete':
        return (
          <DeleteConfirmDialog 
            service={selectedService}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancel}
          />
        );
      
      case 'list':
      default:
        return (
          <>
            <div className="services-header">
              <h3>服务列表</h3>
              <button 
                className="create-button" 
                onClick={handleCreateService}
                disabled={loading}
              >
                添加服务
              </button>
            </div>
            
            {loading && <p className="loading-text">加载中...</p>}
            {error && <p className="error-message">{error}</p>}
            
            {!loading && !error && services.length > 0 && (
              <div className="services-table-container">
                <table className="service-settings-table">
                  <thead>
                    <tr>
                      <th>服务名称</th>
                      <th>时长 (分钟)</th>
                      <th>价格</th>
                      <th>颜色</th>
                      <th>最大重叠数</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(service => {
                      // 获取当前显示的最大重叠值（原值或用户修改的值）
                      const currentOverlap = overlapChanges[service.id] !== undefined 
                        ? overlapChanges[service.id] 
                        : (service.max_overlap !== null && service.max_overlap !== undefined ? service.max_overlap : '');

                      return (
                        <tr key={service.id}>
                          <td>{service.name}</td>
                          <td>{service.duration}</td>
                          <td>{service.price}</td>
                          <td>
                            <div className="color-indicator" style={{ backgroundColor: service.colour || '#CCCCCC' }} />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={currentOverlap}
                              onChange={(e) => handleOverlapChange(service.id, e.target.value)}
                              className="overlap-input"
                              disabled={loading}
                            />
                          </td>
                          <td className="actions-cell">
                            <button 
                              className="edit-button" 
                              onClick={() => handleEditService(service)}
                              disabled={loading}
                              title="编辑服务"
                            >
                              编辑
                            </button>
                            <button 
                              className="delete-button" 
                              onClick={() => handleDeleteClick(service)}
                              disabled={loading}
                              title="删除服务"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && !error && services.length === 0 && (
              <p className="no-data-message">没有找到服务。点击"添加服务"来创建第一个服务。</p>
            )}
            
            {/* 为已有的重叠数编辑提供保存按钮 */}
            {Object.keys(overlapChanges).length > 0 && (
              <div className="overlap-changes-alert">
                <p>您修改了 {Object.keys(overlapChanges).length} 个服务的最大重叠数。</p>
                <button 
                  className="save-overlap-button"
                  onClick={handleSaveOverlap}
                  disabled={loading}
                >
                  保存重叠数变更
                </button>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content service-settings-modal">
        <div className="modal-header">
          <h2>服务设置</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {renderContent()}
        </div>
        <div className="modal-footer">
          {displayMode === 'list' && (
            <button className="cancel-button" onClick={onClose} disabled={loading}>
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ServiceSettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ServiceSettingsModal; 