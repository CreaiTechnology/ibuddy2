import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import './AppointmentStats.css';
import { Pie, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  BarElement,
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale
} from 'chart.js';
import moment from 'moment';
import { getAppointments } from '../../services/appointmentService';

// 注册ChartJS组件
ChartJS.register(
  ArcElement, 
  BarElement,
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale
);

// 时间范围选项
const TIME_RANGES = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' }
];

const AppointmentStats = ({ services }) => {
  // --- DEBUGGING: 检查传入的 services prop ---
  // console.log('[AppointmentStats] Received services prop:', services);
  // console.log('[AppointmentStats] Type of services prop:', typeof services);
  // console.log('[AppointmentStats] Is services an array?', Array.isArray(services));
  // -----------------------------------------------
  
  // 状态
  const [timeRange, setTimeRange] = useState('week');
  const [customStartDate, setCustomStartDate] = useState(moment().subtract(7, 'days').format('YYYY-MM-DD'));
  const [customEndDate, setCustomEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  
  // 新增状态: 用于存储此组件获取的预约数据、加载和错误状态
  const [internalAppointments, setInternalAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 根据选择的时间范围更新自定义日期
  useEffect(() => {
    if (timeRange === 'custom') {
      setShowCustomDateRange(true);
    } else {
      setShowCustomDateRange(false);
      const today = moment();
      let start, end;
      switch (timeRange) {
        case 'day':
          start = today.clone().startOf('day');
          end = today.clone().endOf('day');
          break;
        case 'week':
          start = today.clone().startOf('isoWeek');
          end = today.clone().endOf('isoWeek');
          break;
        case 'month':
          start = today.clone().startOf('month');
          end = today.clone().endOf('month');
          break;
        default: // Default to week for safety, although initial state covers it
          start = today.clone().startOf('isoWeek');
          end = today.clone().endOf('isoWeek');
      }
      setCustomStartDate(start.format('YYYY-MM-DD'));
      setCustomEndDate(end.format('YYYY-MM-DD'));
    }
  }, [timeRange]);

  // 新增 useEffect: 当日期范围变化时获取预约数据
  useEffect(() => {
    const fetchAppointmentsForRange = async () => {
      setLoading(true);
      setError(null);
      console.log(`[AppointmentStats] Fetching appointments for range: ${customStartDate} to ${customEndDate}`);
      try {
        const startDateISO = moment(customStartDate).startOf('day').toISOString();
        const endDateISO = moment(customEndDate).endOf('day').toISOString();
        
        const result = await getAppointments({ 
          start_gte: startDateISO, 
          start_lte: endDateISO 
        });

        if (result.error) {
          throw result.error;
        }
        
        console.log('[AppointmentStats] Fetched appointments data:', result.data);
        setInternalAppointments(result.data || []); // 使用获取的数据更新 state

      } catch (err) {
        console.error('[AppointmentStats] Error fetching appointments:', err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to load appointment data for the selected range.";
        setError(errorMsg);
        setInternalAppointments([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    // 仅当 customStartDate 和 customEndDate 有效时才获取数据
    if (customStartDate && customEndDate && moment(customStartDate).isValid() && moment(customEndDate).isValid()) {
        if (moment(customEndDate).isBefore(customStartDate)) {
            setError("End date cannot be before start date.");
            setInternalAppointments([]);
        } else {
           fetchAppointmentsForRange();
        }
    } else {
        // Handle invalid date inputs if necessary
        setError("Invalid date range selected.");
        setInternalAppointments([]);
    }

  }, [customStartDate, customEndDate]); // 依赖日期范围的变化

  // !! 修改 !! : filteredAppointments 现在直接使用 internalAppointments
  // 不再需要复杂的过滤逻辑，因为数据获取时已经按日期过滤了
  // const filteredAppointments = internalAppointments;
  // !! 更正 !! : 原始的 filteredAppointments 逻辑可能仍然有用，因为它确保了只使用当前内部获取的数据。
  // 但它不应该再依赖外部的 appointments prop。
  const filteredAppointments = useMemo(() => {
    // 使用 internalAppointments 作为数据源
    if (!Array.isArray(internalAppointments)) {
      console.warn('[AppointmentStats] internalAppointments is not an array:', internalAppointments);
      return [];
    }
    // 无需再按日期过滤，因为 fetch 时已经完成
    return internalAppointments; 
  }, [internalAppointments]); // 只依赖 internalAppointments

  // 按服务类型统计预约数量 (现在使用 filteredAppointments，即 internalAppointments)
  const appointmentsByService = useMemo(() => {
    const stats = {};
    if (!Array.isArray(services)) {
        console.warn('[AppointmentStats] services prop is not an array:', services);
        return {};
    }
    services.forEach(service => {
      if (service && service.id !== undefined) { 
          stats[service.id] = { count: 0, name: service.name || 'Unnamed Service', colour: service.colour || '#CCCCCC' };
      } else {
          console.warn('[AppointmentStats] Invalid service object found:', service);
      }
    });
    filteredAppointments.forEach(appointment => {
      const serviceId = appointment.serviceId || (appointment.extendedProps && appointment.extendedProps.serviceId) || appointment.service_id;
      if (stats[serviceId]) {
        stats[serviceId].count += 1;
      } else {
        const unknownServiceKey = 'unknown';
        if (!stats[unknownServiceKey]) {
            stats[unknownServiceKey] = { count: 0, name: 'Unknown Service', colour: '#adb5bd' };
        }
        stats[unknownServiceKey].count += 1;
        console.warn(`[AppointmentStats] Appointment with ID ${appointment.id} has unknown or missing serviceId: ${serviceId}`);
      }
    });
    return stats;
  }, [filteredAppointments, services]); // 依赖 filteredAppointments 和 services

  // --- 新增: 按状态统计 --- 
  const appointmentsByStatus = useMemo(() => {
    const statusCounts = {
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      other: 0
    };
    filteredAppointments.forEach(appointment => {
      const status = appointment.status?.toLowerCase() || appointment.extendedProps?.status?.toLowerCase() || 'other';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts.other++;
      }
    });
    return statusCounts;
  }, [filteredAppointments]);
  
  // --- 新增: 按日期统计 (用于柱状图) --- 
  const appointmentsByDay = useMemo(() => {
    const dailyCounts = {};
    const start = moment(customStartDate);
    const end = moment(customEndDate);
    // Check if dates are valid before proceeding
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
        return {}; // Return empty if date range is invalid
    }
    for (let m = start.clone(); m.isSameOrBefore(end, 'day'); m.add(1, 'days')) {
      dailyCounts[m.format('YYYY-MM-DD')] = 0;
    }
    filteredAppointments.forEach(appointment => {
      const day = moment(appointment.start).format('YYYY-MM-DD');
      if (dailyCounts.hasOwnProperty(day)) {
        dailyCounts[day]++;
      }
    });
    return dailyCounts;
  }, [filteredAppointments, customStartDate, customEndDate]);

  // 准备饼图数据
  const pieChartData = useMemo(() => {
    const labels = [];
    const data = [];
    const backgroundColor = [];
    const serviceIds = Object.keys(appointmentsByService);
    serviceIds.forEach(id => {
      const service = appointmentsByService[id];
      if (service.count > 0) {
        labels.push(service.name);
        data.push(service.count);
        backgroundColor.push(service.colour);
      }
    });
    return { labels, datasets: [{ data, backgroundColor, borderWidth: 1 }] };
  }, [appointmentsByService]);

  // 准备柱状图数据
  const barChartData = useMemo(() => {
    const sortedDates = Object.keys(appointmentsByDay).sort();
    const labels = sortedDates.map(date => moment(date).format('MM/DD'));
    const data = sortedDates.map(date => appointmentsByDay[date]);
    return { labels, datasets: [{ label: 'Appointments per Day', data, backgroundColor: 'rgba(66, 133, 244, 0.6)', borderColor: 'rgba(66, 133, 244, 1)', borderWidth: 1 }] };
  }, [appointmentsByDay]);

  // 饼图选项配置
  const pieChartOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // 柱状图选项配置
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // 不显示图例
      },
      title: {
        display: true,
        text: 'Daily Appointment Trend'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1 // 确保Y轴是整数
        }
      }
    }
  };

  // 计算总预约数量 (现在基于 filteredAppointments)
  const totalAppointments = useMemo(() => {
    return filteredAppointments.length;
  }, [filteredAppointments]);

  // 处理时间范围改变
  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

  // 渲染统计卡片
  const renderStatCard = (title, value, icon, colorClass) => {
    return (
      <div className={`stat-card ${colorClass}`}>
        <div className="stat-icon">{icon}</div>
        <div className="stat-content">
          <div className="stat-title">{title}</div>
          <div className="stat-value">{value}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="appointment-stats">
      <div className="stats-header">
        <h3>Appointment Statistics</h3>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={handleTimeRangeChange}
            className="time-range-select"
            disabled={loading}
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          
          {showCustomDateRange && (
            <div className="custom-date-range">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="date-input"
                disabled={loading}
              />
              <span className="date-separator">to</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="date-input"
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* 显示加载指示器 */} 
      {loading && (
          <div className="stats-loading-container">
              <div className="stats-loading-spinner"></div>
              <p>正在加载统计数据...</p>
          </div>
      )}
      
      {/* 显示错误信息 */} 
      {!loading && error && (
          <div className="stats-error-container">
              <p>错误: {error}</p>
              {/* Optionally add a retry button here */}
          </div>
      )}
      
      {/* 仅在非加载且无错误时显示内容 */} 
      {!loading && !error && (
        <>
          <div className="stats-cards">
            {renderStatCard('Total Appointments', totalAppointments, '📊', 'blue')}
            {renderStatCard('Confirmed/Pending', appointmentsByStatus.confirmed || 0, '⏳', 'yellow')}
            {renderStatCard('Completed', appointmentsByStatus.completed || 0, '✅', 'green')}
            {renderStatCard('Cancelled/Other', appointmentsByStatus.cancelled + appointmentsByStatus.other || 0, '❌', 'red')}
          </div>

          {totalAppointments > 0 ? (
            <>
              {/* 每日趋势柱状图 */}
              <div className="bar-chart-container">
                <Bar data={barChartData} options={barChartOptions} />
              </div>

              {/* 服务分布饼图和表格 */}
              <div className="stats-chart-container">
                <div className="pie-chart-and-table">
                  <h4>Service Type Distribution</h4>
                  <div className="pie-chart-container">
                    <Pie data={pieChartData} options={pieChartOptions} />
                  </div>
                  <div className="stats-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Service Name</th>
                          <th>Count</th>
                          <th>Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(appointmentsByService)
                          .filter(id => appointmentsByService[id].count > 0)
                          .sort((a, b) => appointmentsByService[b].count - appointmentsByService[a].count)
                          .map(id => {
                            const service = appointmentsByService[id];
                            const percentage = totalAppointments > 0 ? ((service.count / totalAppointments) * 100).toFixed(1) : 0;
                            
                            return (
                              <tr key={id}>
                                <td>
                                  <span 
                                    className="color-dot" 
                                    style={{ backgroundColor: service.colour }}
                                  ></span>
                                  {service.name}
                                </td>
                                <td>{service.count}</td>
                                <td>{percentage}%</td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data-message">
              在选定的时间范围内没有找到预约数据。
            </div>
          )}
        </>
      )}
    </div>
  );
};

AppointmentStats.propTypes = {
  services: PropTypes.array // 只需要 services prop
};

AppointmentStats.defaultProps = {
  services: []
};

export default AppointmentStats; 