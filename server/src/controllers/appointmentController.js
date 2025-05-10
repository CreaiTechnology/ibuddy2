const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const appointmentService = require('../services/appointmentService');
const { mapService } = require('../services/mapService.js');

// Helper function for error handling
const handleServiceError = (error, res, defaultMessage) => {
  console.error(defaultMessage, error);
  res.status(error.status || 500).json({ message: error.message || defaultMessage });
};

// Helper function to build address string for geocoding
const buildAddressString = (address) => {
  if (!address) return null;
  
  // 移除可能的空对象
  if (Object.keys(address).length === 0) return null;
  
  // 处理两种格式的地址对象
  const line1 = address.line1 || address.address_line1 || '';
  const line2 = address.line2 || address.address_line2 || '';
  const city = address.city || '';
  const postalCode = address.postalCode || address.postal_code || '';
  const state = address.state || address.region || '';
  const country = address.country || '';
  
  // 构建完整地址
  const parts = [];
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);
  if (city) parts.push(city);
  
  // 正确格式化邮编和州/省
  if (postalCode && state) {
    parts.push(`${postalCode} ${state}`);
  } else {
    if (postalCode) parts.push(postalCode);
    if (state) parts.push(state);
  }
  
  if (country) parts.push(country);
  
  // 过滤掉空元素并连接
  return parts.filter(part => part && String(part).trim() !== '').join(', ');
};

// 验证地理编码结果是否可靠
const isReliableGeocode = (coords) => {
  // 如果坐标不存在，明显是不可靠的
  if (!coords) return false;
  
  // 基于精确度分数过滤低质量结果
  if (coords.accuracyScore && coords.accuracyScore < 0.6) {
    console.warn(`[AppointmentController] 低置信度地理编码结果 (${coords.accuracyScore.toFixed(2)})`);
    return false;
  }
  
  // 如果位置在海洋中或明显无效位置，也认为不可靠
  // 这里可以添加具体业务区域的边界检查
  
  return true;
};

// 获取所有预约（支持过滤）
exports.getAppointments = async (req, res) => {
  try {
    const { start_gte, start_lte, booking_type, service_id, team_id } = req.query;
    
    let query = supabase.from('appointments').select(`
      service_id_old_uuid, 
      start, end, serviceId, clientName, clientPhone, status, create_at, service_id, 
      address_line1, address_line2, city, postal_code, country, team_id, 
      booking_type, latitude, longitude, source,
      service:services(*),
      team:teams(*)
    `);
    
    if (start_gte) query = query.gte('start', start_gte);
    if (start_lte) query = query.lte('start', start_lte);
    if (booking_type) query = query.eq('booking_type', booking_type);
    if (service_id) query = query.eq('service_id', service_id);
    if (team_id) query = query.eq('team_id', team_id);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching appointments:', error);
      return res.status(500).json({ message: 'Failed to fetch appointments', error: error.details || error.message });
    }
    
    // Map service_id_old_uuid to id for frontend consistency
    const responseData = data.map(appt => ({ ...appt, id: appt.service_id_old_uuid }));
    res.status(200).json(responseData);

  } catch (error) {
    handleServiceError(error, res, 'Internal server error fetching appointments');
  }
};

// 获取单个预约
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params; // This 'id' parameter is the value of service_id_old_uuid
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        service_id_old_uuid,
        start, end, serviceId, clientName, clientPhone, status, create_at, service_id,
        address_line1, address_line2, city, postal_code, country, team_id,
        booking_type, latitude, longitude, source,
        service:services(*),
        team:teams(*)
      `)
      .eq('service_id_old_uuid', id)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching appointment ${id}:`, error);
      return res.status(500).json({ message: 'Failed to fetch appointment', error: error.details || error.message });
    }
    if (!data) {
        return res.status(404).json({ message: 'Appointment not found' });
    }
    
    const responseData = { ...data, id: data.service_id_old_uuid };
    res.status(200).json(responseData);
  } catch (error) {
    handleServiceError(error, res, 'Internal server error fetching appointment by ID');
  }
};

// 获取可用时间段建议
exports.getAppointmentSuggestions = async (req, res) => {
  try {
    const { service_id, date, team_id, preferred_start_hour, preferred_end_hour } = req.query;

    if (!service_id || !date) {
      return res.status(400).json({ message: 'Missing required query parameters: service_id, date' });
    }

    // Construct criteria object
    const criteria = { 
        service_id, 
        date, 
        team_id, 
        preferred_start_hour: preferred_start_hour ? parseInt(preferred_start_hour) : undefined,
        preferred_end_hour: preferred_end_hour ? parseInt(preferred_end_hour) : undefined
    };
    
    // Call the service function
    const availableSlots = await appointmentService.findAvailableSlots(criteria);

    res.status(200).json(availableSlots);

  } catch (error) {
    handleServiceError(error, res, 'Internal server error fetching appointment suggestions');
  }
};

// --- 获取地图所需的预约数据 ---
exports.getMapAppointments = async (req, res) => {
  try {
    const { start_gte, start_lte, team_id } = req.query;

    if (!start_gte || !start_lte) {
      return res.status(400).json({ message: 'Missing required query parameters: start_gte, start_lte' });
    }

    // 查询所有可用的列，以检查是否存在 geocoding 相关列
    // 这样我们能适应不同的数据库结构，避免"列不存在"错误
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'appointments')
      .eq('table_schema', 'public');
      
    // 修正：使用原始SQL查询正确访问information_schema
    let hasGeocodeAccuracy = false;
    let hasGeocodeStatus = false;
    let hasFormattedAddress = false;
    
    try {
      const columnsToCheck = ['geocode_accuracy', 'geocode_status', 'formatted_address'];
      let existingColumns = [];
      
      try {
        // 尝试使用 RPC 检查列是否存在
        const { data, error } = await supabase.rpc('check_columns', { 
          p_table_name: 'appointments',
          p_columns: columnsToCheck
        });
        
        if (error) {
          console.warn('[getMapAppointments] 使用RPC检查列存在性失败:', error.message);
          
          // 回退到直接查询 information_schema
          for (const col of columnsToCheck) {
            const { data: colData } = await supabase
              .from('information_schema.columns')
              .select('column_name')
              .eq('table_schema', 'public')
              .eq('table_name', 'appointments')
              .eq('column_name', col)
              .maybeSingle();
              
            if (colData) {
              existingColumns.push(col);
            }
          }
        } else if (data) {
          existingColumns = data;
        }
      } catch (rpcError) {
        console.warn('[getMapAppointments] RPC调用出错:', rpcError.message);
        // 使用空数组，表示我们不确定哪些列存在
      }
      
      // 根据检查结果设置标志
      hasGeocodeAccuracy = existingColumns.includes('geocode_accuracy');
      hasGeocodeStatus = existingColumns.includes('geocode_status');
      hasFormattedAddress = existingColumns.includes('formatted_address');
      
      console.log(`[getMapAppointments] 已检测列: 精度=${hasGeocodeAccuracy}, 状态=${hasGeocodeStatus}, 格式化地址=${hasFormattedAddress}`);
    } catch (e) {
      console.error('[getMapAppointments] 尝试检查列存在性时出错:', e);
      // 降级到保守模式：不尝试访问可能不存在的列
      hasGeocodeAccuracy = false;
      hasGeocodeStatus = false;
      hasFormattedAddress = false;
    }
    
    // 构建查询字符串，保证只包含存在的列
    let selectQuery = `
      service_id_old_uuid,
      start,
      end,
      clientName,
      clientPhone,
      latitude,
      longitude,
      address_line1, address_line2, city, postal_code, country,
      status,
      service_id, 
      team_id,
      booking_type,`;
    
    // 有条件地添加精确度相关列
    if (hasGeocodeAccuracy) {
      selectQuery += '\ngeocode_accuracy,';
    }
    if (hasGeocodeStatus) {
      selectQuery += '\ngeocode_status,';
    }
    if (hasFormattedAddress) {
      selectQuery += '\nformatted_address,';
    }
    
    // 添加关联查询
    selectQuery += `
      service:services ( name ), 
      team:teams ( name, colour ) 
    `;

    let query = supabase
      .from('appointments')
      .select(selectQuery)
      .eq('booking_type', 'on-site')
      .gte('start', start_gte)
      .lte('start', start_lte);

    if (team_id && team_id !== 'all') {
      query = query.eq('team_id', team_id);
    }

    const { data, error } = await query.order('start');

    if (error) {
      console.error('Error fetching map appointments:', error);
      return res.status(500).json({ message: 'Failed to fetch map appointments', error: error.details || error.message });
    }

    const transformedData = data.map(appt => {
      // Construct a full address object from the individual fields
      const addressObject = {
        line1: appt.address_line1,
        line2: appt.address_line2,
        city: appt.city,
        postalCode: appt.postal_code,
        country: appt.country
      };

      // Get contact info from available fields
      const contactInfo = appt.contactInfo || appt.clientPhone || null;
      
      // 使用安全的访问方式，提供默认值
      const accuracyScore = appt.geocode_accuracy !== undefined ? appt.geocode_accuracy : null;
      
      // Determine accuracy level based on the accuracy score
      let accuracyLevel = 'unknown';
      if (accuracyScore !== null && accuracyScore !== undefined) {
        if (accuracyScore >= 0.9) accuracyLevel = 'very_high';
        else if (accuracyScore >= 0.75) accuracyLevel = 'high';
        else if (accuracyScore >= 0.6) accuracyLevel = 'medium';
        else if (accuracyScore >= 0.4) accuracyLevel = 'low';
        else accuracyLevel = 'very_low';
      }

      return {
        id: appt.service_id_old_uuid,
        start: appt.start,
        end: appt.end,
        title: appt.clientName || 'On-site Visit',
        coordinates: (appt.latitude && appt.longitude) ? { lat: appt.latitude, lng: appt.longitude } : null,
        extendedProps: {
          clientName: appt.clientName,
          // Include both address object for components and formatted address for display
          address: addressObject,
          formattedAddress: appt.formatted_address || buildAddressString(addressObject),
          status: appt.status,
          serviceId: appt.service_id,
          teamId: appt.team_id,
          bookingType: appt.booking_type,
          serviceName: appt.service?.name,
          teamName: appt.team?.name,
          teamColour: appt.team?.colour,
          // Include contact information
          phoneNumber: appt.clientPhone,
          contactInfo: contactInfo,
          // Include geocoding accuracy information with safe handling
          accuracyScore: accuracyScore,
          accuracyLevel: accuracyLevel,
          geocodeStatus: appt.geocode_status || 'unknown'
        }
      };
    });

    res.status(200).json(transformedData);

  } catch (error) {
    handleServiceError(error, res, 'Internal server error fetching map appointments');
  }
};
// --- End 获取地图数据 ---

// 创建新预约
exports.createAppointment = async (req, res) => {
  try {
    const appointmentData = req.body;
    const { start, end, service_id, booking_type, clientName, address, force = false } = appointmentData;
    
    // Basic validation
    if (!clientName || !start || !end || !service_id || !booking_type) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['clientName', 'start', 'end', 'service_id', 'booking_type'] 
      });
    }
    
    // Date validation handled by service, but good practice to check early
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate) || startDate >= endDate) {
      return res.status(400).json({ message: 'Invalid date range' });
    }
    
    // Check for conflicts using the service (unless force=true)
    if (!force) {
      try {
        // Pass potential data needed for conflict check
        const conflicts = await appointmentService.checkConflicts({ 
          service_id, 
          start_time: start, 
          end_time: end, 
          team_member_id: appointmentData.team_id 
        });
        if (conflicts.length > 0) {
        return res.status(409).json({
            message: `Appointment time conflicts with ${conflicts.length} existing appointment(s). Use force=true to override.`,
          isConflict: true,
          details: conflicts,
          canForce: true
        });
        }
      } catch (conflictError) {
        // Handle errors during conflict check specifically
        return handleServiceError(conflictError, res, 'Error checking for appointment conflicts');
      }
    }
    
    // Prepare data for insertion (remove force flag, set defaults if needed)
    const dataToInsert = { ...appointmentData };
    delete dataToInsert.force;
    dataToInsert.status = dataToInsert.status || 'confirmed';
    
    // Handle address mapping from object to individual fields
    if (dataToInsert.address) {
      // Map address object to individual fields
      dataToInsert.address_line1 = dataToInsert.address.line1;
      dataToInsert.address_line2 = dataToInsert.address.line2;
      dataToInsert.city = dataToInsert.address.city;
      dataToInsert.postal_code = dataToInsert.address.postalCode;
      dataToInsert.country = dataToInsert.address.country;
      // Remove the address object as it's not directly stored in the database
      delete dataToInsert.address;
    }
    
    // Remove any undefined fields before insert
    Object.keys(dataToInsert).forEach(key => 
        dataToInsert[key] === undefined && delete dataToInsert[key]
    );

    // --- Geocoding for on-site appointments ---
    if (dataToInsert.booking_type === 'on-site') {
      // Create address object for geocoding
      const addressForGeocoding = {
        line1: dataToInsert.address_line1,
        line2: dataToInsert.address_line2,
        city: dataToInsert.city,
        postalCode: dataToInsert.postal_code,
        country: dataToInsert.country
      };
      
      const addressString = buildAddressString(addressForGeocoding);
      console.log(`[CreateAppointment] Geocoding address: "${addressString}"`);
      
      if (addressString) {
        try {
          // 安全检查 mapService 是否存在且有 geocodeAddressWithCache 方法
          if (!mapService || typeof mapService.geocodeAddressWithCache !== 'function') {
            console.error('[CreateAppointment] MapService not available or geocodeAddressWithCache method not found');
            // 跳过地理编码，但不中断预约创建
          } else {
            const coords = await mapService.geocodeAddressWithCache(addressString);
            if (coords && isReliableGeocode(coords)) {
              dataToInsert.latitude = coords.latitude;
              dataToInsert.longitude = coords.longitude;
              
              // 检查数据库中是否存在相关列，避免插入错误
              try {
                let columnsToCheck = ['geocode_accuracy', 'geocode_status', 'geocode_error', 'formatted_address'];
                let existingColumns = [];
                
                try {
                  // 尝试使用 RPC 检查列是否存在
                  const { data, error } = await supabase.rpc('check_columns', { 
                    p_table_name: 'appointments',
                    p_columns: columnsToCheck
                  });
                  
                  if (error) {
                    console.warn('[CreateAppointment] 使用RPC检查列存在性失败:', error.message);
                    
                    // 回退到直接查询 information_schema
                    for (const col of columnsToCheck) {
                      const { data: colData } = await supabase
                        .from('information_schema.columns')
                        .select('column_name')
                        .eq('table_schema', 'public')
                        .eq('table_name', 'appointments')
                        .eq('column_name', col)
                        .maybeSingle();
                        
                      if (colData) {
                        existingColumns.push(col);
                      }
                    }
                  } else if (data) {
                    existingColumns = data;
                  }
                } catch (rpcError) {
                  console.warn('[CreateAppointment] RPC调用出错:', rpcError.message);
                  // 使用空数组，表示我们不确定哪些列存在
                }
                
                // 使用 existingColumns 判断列是否存在
                const hasColumn = (columnName) => existingColumns.includes(columnName);
                
                // 有条件地设置精确度相关字段
                if (hasColumn('geocode_accuracy')) {
                  dataToInsert.geocode_accuracy = coords.accuracyScore || null;
                }
                
                if (hasColumn('geocode_status')) {
                  dataToInsert.geocode_status = 'success';
                }
                
                // 如果地址被纠正且表中有格式化地址列，则存储格式化的地址
                if (coords.formattedAddress && coords.formattedAddress !== addressString) {
                  if (hasColumn('formatted_address')) {
                    dataToInsert.formatted_address = coords.formattedAddress;
                  }
                  console.log(`[CreateAppointment] 地址已规范化: "${coords.formattedAddress}"`);
                }
              } catch (columnCheckError) {
                console.warn('[CreateAppointment] 检查数据库列时出错:', columnCheckError);
                // 出错时继续，不设置可能不存在的列
              }
              
              console.log(`[CreateAppointment] Geocoding successful: Lat=${coords.latitude}, Lng=${coords.longitude}, Accuracy=${coords.accuracyScore || 'unknown'}`);
            } else {
              if (coords) {
                console.warn(`[CreateAppointment] 地理编码结果不可靠 (准确度: ${coords.accuracyScore || 'unknown'}) 地址: "${addressString}"`);
              } else {
                console.warn(`[CreateAppointment] 地理编码无结果，地址: "${addressString}"`);
              }
              // 避免地理编码失败导致预约创建失败
            }
          }
        } catch (geocodeError) {
          console.error(`[CreateAppointment] 地理编码失败，地址: "${addressString}":`, geocodeError);
          // 记录错误但继续创建预约
        }
      }
    }
    // --- End Geocoding ---

    // Insert into database
    const { data, error } = await supabase
      .from('appointments')
      .insert([dataToInsert])
      .select(`
        service_id_old_uuid,
        start, end, serviceId, clientName, clientPhone, status, create_at, service_id,
        address_line1, address_line2, city, postal_code, country, team_id,
        booking_type, latitude, longitude, source,
        service:services(*),
        team:teams(*)
      `)
      .single();
    
    if (error) {
      console.error('Error creating appointment in Supabase:', error);
      // Provide more specific error message if possible (e.g., unique constraint)
      return res.status(500).json({ message: 'Failed to create appointment', error: error.details || error.message });
    }

    // Optionally trigger reminder/follow-up scheduling (async, don't block response)
    if (data && data.id) {
        appointmentService.scheduleReminders(data.id).catch(err => console.error("Failed to schedule reminders:", err));
        appointmentService.scheduleFollowUps(data.id).catch(err => console.error("Failed to schedule follow-ups:", err));
    }
    
    res.status(201).json(data);
  } catch (error) {
    // Catch any unexpected errors (e.g., from validation before service call)
    handleServiceError(error, res, 'Internal server error creating appointment');
  }
};

// 更新预约
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params; // This 'id' parameter is the value of service_id_old_uuid
    const { force = false, ...updateDataFromRequest } = req.body;
    
    let updateData = { ...updateDataFromRequest }; // Create a mutable copy

    // Handle address mapping from object to individual fields
    if (updateData.address) {
      // Map address object to individual fields
      updateData.address_line1 = updateData.address.line1;
      updateData.address_line2 = updateData.address.line2;
      updateData.city = updateData.address.city;
      updateData.postal_code = updateData.address.postalCode;
      updateData.country = updateData.address.country;
      // Remove the address object as it's not directly stored in the database
      delete updateData.address;
    }

    if (updateData.start && updateData.end) {
      const startDate = new Date(updateData.start);
      const endDate = new Date(updateData.end);
      if (isNaN(startDate) || isNaN(endDate) || startDate >= endDate) {
        return res.status(400).json({ message: 'Invalid date range for update' });
      }
    }
    
    let requiresConflictCheck = false;
    if ((updateData.start || updateData.end || updateData.team_id !== undefined)) {
        requiresConflictCheck = true;
    }

    // --- Get current appointment booking type and check if address is being updated --- 
    let isOnSite = false;
    let addressChanged = false;
    let addressToGeocode = null;

    try {
      // Fetch current booking_type and address only if needed
      if (updateData.address_line1 || requiresConflictCheck || updateData.booking_type === undefined) {
          const { data: currentAppointment, error: fetchError } = await supabase
            .from('appointments')
            .select('booking_type, address_line1, address_line2, city, postal_code, country, team_id, latitude, longitude') // Select fields needed
            .eq('service_id_old_uuid', id)
            .maybeSingle(); // Use maybeSingle as it might not exist

          if (fetchError) {
              throw new Error('Could not fetch current appointment details for update.');
          }
          if (!currentAppointment) {
              return res.status(404).json({ message: 'Appointment not found' });
          }
          
          isOnSite = updateData.booking_type !== undefined 
            ? updateData.booking_type === 'on-site' 
            : currentAppointment.booking_type === 'on-site';
           
          // Determine if address changed and needs geocoding
          if (isOnSite) {
              // Create address objects for comparison
              const currentAddress = {
                line1: currentAppointment.address_line1,
                line2: currentAppointment.address_line2,
                city: currentAppointment.city,
                postalCode: currentAppointment.postal_code,
                country: currentAppointment.country
              };
              
              const newAddress = {
                line1: updateData.address_line1 !== undefined ? updateData.address_line1 : currentAppointment.address_line1,
                line2: updateData.address_line2 !== undefined ? updateData.address_line2 : currentAppointment.address_line2,
                city: updateData.city !== undefined ? updateData.city : currentAppointment.city,
                postalCode: updateData.postal_code !== undefined ? updateData.postal_code : currentAppointment.postal_code,
                country: updateData.country !== undefined ? updateData.country : currentAppointment.country
              };
              
              const currentAddressString = buildAddressString(currentAddress);
              const newAddressString = buildAddressString(newAddress);
              
              // Only geocode if the new address is different from the old one
              if (newAddressString && newAddressString !== currentAddressString) {
                  addressChanged = true;
                  addressToGeocode = newAddressString; // Geocode the new address string
              } else if (!newAddressString && currentAddressString) {
                  // Address was removed or became invalid, clear coords
                  addressChanged = true; 
                  updateData.latitude = null;
                  updateData.longitude = null;
              } else if (newAddressString && !currentAddressString) {
                  // Address was added
                  addressChanged = true;
                  addressToGeocode = newAddressString;
              }
          }

          // Use fetched team_id for conflict check if not provided in updateData
          if (requiresConflictCheck && updateData.team_id === undefined) {
              updateData.team_id_for_check = currentAppointment.team_id;
          }
      }
      
       // If booking type explicitly changes to non-onsite, clear coordinates
       if (updateData.booking_type !== undefined && updateData.booking_type !== 'on-site') {
            updateData.latitude = null;
            updateData.longitude = null;
            addressToGeocode = null; // Ensure we don't geocode
       }
      
    } catch(fetchError) {
         console.error('[UpdateAppointment] Error fetching current appointment:', fetchError);
         return handleServiceError(fetchError, res, 'Error fetching current appointment data for update.');
    }
    // --- End Fetching Current Data ---

    // --- Geocode if address changed --- 
    if (addressToGeocode) {
      console.log(`[UpdateAppointment] Geocoding updated address: "${addressToGeocode}"`);
      try {
        // 安全检查 mapService 是否存在且有 geocodeAddressWithCache 方法
        if (!mapService || typeof mapService.geocodeAddressWithCache !== 'function') {
          console.error('[UpdateAppointment] MapService not available or geocodeAddressWithCache method not found');
          // 跳过地理编码，但不中断预约更新
        } else {
          const coords = await mapService.geocodeAddressWithCache(addressToGeocode);
          if (coords && isReliableGeocode(coords)) {
            updateData.latitude = coords.latitude;
            updateData.longitude = coords.longitude;
            
            // 检查数据库中是否存在相关列，避免更新错误
            try {
              let columnsToCheck = ['geocode_accuracy', 'geocode_status', 'geocode_error', 'formatted_address'];
              let existingColumns = [];
              
              try {
                // 尝试使用 RPC 检查列是否存在
                const { data, error } = await supabase.rpc('check_columns', { 
                  p_table_name: 'appointments',
                  p_columns: columnsToCheck
                });
                
                if (error) {
                  console.warn('[UpdateAppointment] 使用RPC检查列存在性失败:', error.message);
                  
                  // 回退到直接查询 information_schema
                  for (const col of columnsToCheck) {
                    const { data: colData } = await supabase
                      .from('information_schema.columns')
                      .select('column_name')
                      .eq('table_schema', 'public')
                      .eq('table_name', 'appointments')
                      .eq('column_name', col)
                      .maybeSingle();
                      
                    if (colData) {
                      existingColumns.push(col);
                    }
                  }
                } else if (data) {
                  existingColumns = data;
                }
              } catch (rpcError) {
                console.warn('[UpdateAppointment] RPC调用出错:', rpcError.message);
                // 使用空数组，表示我们不确定哪些列存在
              }
              
              // 使用 existingColumns 判断列是否存在
              const hasColumn = (columnName) => existingColumns.includes(columnName);
              
              // 有条件地设置精确度相关字段
              if (hasColumn('geocode_accuracy')) {
                updateData.geocode_accuracy = coords.accuracyScore || null;
              }
              
              if (hasColumn('geocode_status')) {
                updateData.geocode_status = 'success';
                // 清除之前的错误状态
                if (hasColumn('geocode_error')) {
                  updateData.geocode_error = null;
                }
              }
              
              // 如果地址被纠正且表中有格式化地址列，则存储格式化的地址
              if (coords.formattedAddress && coords.formattedAddress !== addressToGeocode) {
                if (hasColumn('formatted_address')) {
                  updateData.formatted_address = coords.formattedAddress;
                }
                console.log(`[UpdateAppointment] 地址已规范化: "${coords.formattedAddress}"`);
              }
            } catch (columnCheckError) {
              console.warn('[UpdateAppointment] 检查数据库列时出错:', columnCheckError);
              // 出错时继续，不设置可能不存在的列
            }
            
            console.log(`[UpdateAppointment] Geocoding successful: Lat=${coords.latitude}, Lng=${coords.longitude}, Accuracy=${coords.accuracyScore || 'unknown'}`);
          } else {
            if (coords) {
              console.warn(`[UpdateAppointment] 地理编码结果不可靠 (准确度: ${coords.accuracyScore || 'unknown'}) 地址: "${addressToGeocode}"`);
            } else {
              console.warn(`[UpdateAppointment] 地理编码无结果，地址: "${addressToGeocode}"`);
            }
            // 保留现有坐标，但记录问题
            delete updateData.latitude;
            delete updateData.longitude;
          }
        }
      } catch (geocodeError) {
        console.error(`[UpdateAppointment] 地理编码失败，地址: "${addressToGeocode}":`, geocodeError);
        delete updateData.latitude;
        delete updateData.longitude;
      }
    }
    // --- End Geocoding --- 

    // Check for conflicts if time or team is changed (unless force=true)
    if (requiresConflictCheck && !force) {
      try {
        const teamIdForCheck = updateData.team_id_for_check !== undefined ? updateData.team_id_for_check : updateData.team_id;
        const conflicts = await appointmentService.checkConflicts({
          start: updateData.start, // Use potentially updated start/end
          end: updateData.end,
          team_id: teamIdForCheck,
          exclude_appointment_id: id // Exclude the current appointment
        });
        // Clean up temporary field
        delete updateData.team_id_for_check;
        
        if (conflicts.length > 0) {
          return res.status(409).json({
            message: `Updating appointment time conflicts with ${conflicts.length} existing appointment(s). Use force=true to override.`,
            isConflict: true,
            details: conflicts,
            canForce: true
          });
        }
      } catch (conflictError) {
        // Clean up temporary field even on error
        delete updateData.team_id_for_check;
        return handleServiceError(conflictError, res, 'Error checking for appointment conflicts during update');
      }
    } else {
        // Clean up temporary field if conflict check was skipped
        delete updateData.team_id_for_check;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update after processing' });
    }

    // Update the record
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('service_id_old_uuid', id)
      .select(`
        service_id_old_uuid,
        start, end, serviceId, clientName, clientPhone, status, create_at, service_id,
        address_line1, address_line2, city, postal_code, country, team_id,
        booking_type, latitude, longitude, source,
        service:services(*),
        team:teams(*)
      `)
      .single();
    
    if (error) {
      console.error(`Error updating appointment ${id}:`, error);
      return res.status(404).json({ message: 'Appointment not found or update failed', error });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Unexpected error in updateAppointment:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// 删除预约
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params; // This 'id' parameter is the value of service_id_old_uuid
    
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('service_id_old_uuid', id);
    
    if (error) {
      console.error(`Error deleting appointment ${id}:`, error);
      return res.status(404).json({ message: 'Appointment not found or delete failed', error });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Unexpected error in deleteAppointment:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}; 