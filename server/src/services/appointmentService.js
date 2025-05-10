const supabase = require('../config/supabase');
const { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } = require('date-fns-tz');
// We might need more specific functions from date-fns as we go
const { getHours, getMinutes, setHours, setMinutes, addMinutes, isEqual, isBefore, isAfter, parseISO, startOfDay, endOfDay } = require('date-fns'); 

// Determine Business Timezone
// It's crucial this is correctly set for the environment where the server runs.
// Example: 'America/New_York', 'Europe/Berlin', 'Asia/Shanghai'
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE;
if (!BUSINESS_TIMEZONE) {
    console.error('FATAL ERROR: BUSINESS_TIMEZONE environment variable is not set.');
    // In a real application, you might want to prevent the service from starting or throw a fatal error.
    // For now, we'll default to UTC with a strong warning, but this is NOT recommended for production 
    // unless the business truly operates and defines its hours in UTC.
    if (process.env.NODE_ENV === 'production') {
        throw new Error("BUSINESS_TIMEZONE is not configured. This is required for correct appointment scheduling.");
    }
    console.warn("Warning: BUSINESS_TIMEZONE is not set. Defaulting to UTC. This is NOT recommended for production unless your business operates in UTC.");
    // BUSINESS_TIMEZONE = 'UTC'; // Fallback for non-production or if explicitly desired
}
// A helper to make sure we always have a fallback, though the above check makes it strict for prod.
const getBusinessTimeZone = () => {
    if (!BUSINESS_TIMEZONE && process.env.NODE_ENV !== 'production') return 'UTC';
    if (!BUSINESS_TIMEZONE && process.env.NODE_ENV === 'production') {
         // This should have been caught above, but as a safeguard:
        throw new Error("Critical: Business timezone not available.");
    }
    return BUSINESS_TIMEZONE;
};

class AppointmentService {
    
    /**
     * Check for potential conflicts for a given appointment time slot.
     * Considers existing appointments, staff availability (if team_id provided),
     * and service-specific buffer times.
     * 
     * @param {Object} appointmentData - Data for the potential appointment
     * @param {string} appointmentData.service_id - ID of the service to fetch buffer times
     * @param {string} appointmentData.start_time - ISO 8601 UTC string for the service start time (exclusive of buffers)
     * @param {string} appointmentData.end_time - ISO 8601 UTC string for the service end time (exclusive of buffers)
     * @param {string} [appointmentData.team_member_id] - Optional ID of the assigned team/staff member (will be used as team_id)
     * @param {string} [appointmentData.team_id] - Optional team ID to check (alternative to team_member_id) 
     * @param {string} [appointmentData.exclude_appointment_id] - Optional ID of an appointment to exclude (e.g., when updating)
     * @returns {Promise<Array<Object>>} - Array of conflicting appointments (empty if no conflict)
     */
    async checkConflicts(appointmentData) { 
        const { service_id, start_time, end_time, team_member_id, team_id, exclude_appointment_id } = appointmentData;
        // Handle both team_id and team_member_id (from controller)
        const effectiveTeamId = team_id || team_member_id;
    
        if (!service_id || !start_time || !end_time) {
            console.error('checkConflicts: Missing service_id, start_time, or end_time', appointmentData);
            throw new Error('Service ID, start time, and end time are required for conflict check.');
        }
    
        const appointmentStart = new Date(start_time); 
        const appointmentEnd = new Date(end_time);     
    
        if (isNaN(appointmentStart.getTime()) || isNaN(appointmentEnd.getTime()) || appointmentStart >= appointmentEnd) {
            console.error('checkConflicts: Invalid date range', { start_time, end_time });
            throw new Error('Invalid date range for conflict check.');
        }
    
        // Fetch service-specific buffer times
        let serviceSpecificBuffers;
        let hasBufferColumn = true;
        
        try {
            // Check if buffer column exists
            try {
                const { data: columnCheck, error: columnError } = await supabase.rpc('check_columns', { 
                    p_table_name: 'services',
                    p_columns: ['buffer_minutes', 'duration']
                });
                
                // If column doesn't exist or there's an error, use default buffer value
                if (columnError || !columnCheck || !Array.isArray(columnCheck)) {
                    console.log(`Column check failed, assuming buffer_minutes doesn't exist`);
                    hasBufferColumn = false;
                } else {
                    hasBufferColumn = columnCheck.includes('buffer_minutes');
                }
            } catch (columnCheckError) {
                console.warn('Column check failed, proceeding with assumption of no buffer column:', columnCheckError.message);
                hasBufferColumn = false;
            }
            
            // Select query based on whether buffer column exists
            let selectQuery = 'id, duration';
            if (hasBufferColumn) {
                selectQuery += ', buffer_minutes';
            }
            
            // Query to check if service exists and get buffer
            const { data: service, error: serviceError } = await supabase
                .from('services')
                .select(selectQuery)
                .eq('id', service_id)
                .single();

            if (serviceError) throw serviceError;
            if (!service) throw new Error(`Service with ID ${service_id} not found for conflict check.`);
            
            // Create serviceSpecificBuffers with defaults for missing columns
            serviceSpecificBuffers = {
                id: service.id,
                duration_minutes: service.duration || 60, // Using duration as duration_minutes
                buffer_minutes: hasBufferColumn ? (service.buffer_minutes || 0) : 0
            };
            
        } catch (error) {
            console.error(`checkConflicts: Error fetching service buffers for ID ${service_id}:`, error);
            throw new Error(`Failed to fetch service buffers for conflict check: ${error.message}`);
        }
    
        const { duration_minutes, buffer_minutes } = serviceSpecificBuffers;
    
        // Use the same buffer value for both before and after
        const actualOccupiedStart = new Date(appointmentStart.getTime() - buffer_minutes * 60000);
        const actualOccupiedEnd = new Date(appointmentEnd.getTime() + buffer_minutes * 60000);
    
        try {
            let query = supabase
                .from('appointments')
                .select('service_id_old_uuid, start, end, team_id, clientName')
                .lt('start', actualOccupiedEnd.toISOString())      // Existing one starts before the proposed one ends
                .gt('end', actualOccupiedStart.toISOString()); // Existing one ends after the proposed one starts
    
            if (effectiveTeamId) {
                query = query.eq('team_id', effectiveTeamId);
            }
            
            if (exclude_appointment_id) {
                query = query.neq('service_id_old_uuid', exclude_appointment_id);
            }
            
            query = query.in('status', ['confirmed', 'pending']);
    
            const { data: conflicts, error: queryError } = await query;
    
            if (queryError) {
                console.error('checkConflicts: Supabase error checking conflicts:', queryError);
                console.error('Query that caused error:', query);
                throw new Error('Failed to check for appointment conflicts due to database error.');
            }
    
            console.log(`checkConflicts: Found ${conflicts?.length || 0} conflicts for team ${effectiveTeamId || 'any'} between ${start_time} and ${end_time}`);
            return conflicts || [];
        } catch (error) {
            console.error('checkConflicts: Unexpected error:', error);
            throw error; 
        }
    }

    /**
     * Find suggested available time slots based on criteria.
     *
     * @param {Object} criteria
     * @param {string} criteria.service_id - ID of the service to determine duration
     * @param {string} criteria.target_date_start - The start date of the range to check (e.g., 'YYYY-MM-DD')
     * @param {string} criteria.target_date_end - The end date of the range to check (e.g., 'YYYY-MM-DD')
     * @param {string} [criteria.team_member_id] - Optional specific staff member ID (will be used as team_id)
     * @param {string} [criteria.team_id] - Optional team ID (alternative to team_member_id)
     * @param {number} [criteria.slot_interval_minutes] - Optional interval for slot generation (default 15 min)
     * @returns {Promise<Array<Object>>} - Array of suggested slots { appointment_start_time, appointment_end_time }
     */
    async findAvailableSlots(criteria) {
        const {
            service_id,
            target_date_start,
            target_date_end,
            team_member_id, // Can be null if service can be performed by any available
            team_id,
            slot_interval_minutes = 15 // Default to 15 minutes slot interval
        } = criteria;
        
        // Handle both team_id and team_member_id (from controller)
        const effectiveTeamId = team_id || team_member_id;

        if (!service_id || !target_date_start || !target_date_end) {
            console.error('findAvailableSlots: Missing required criteria', criteria);
            throw new Error('Service ID, target start date, and target end date are required to find slots.');
        }

        const availableSlots = [];
        
        const todayDateOnly = new Date(); 
        todayDateOnly.setUTCHours(0, 0, 0, 0);

        let serviceDetails;
        try {
            // Check if buffer column exists
            let hasBufferColumn = true;
            try {
                const { data: columnCheck, error: columnError } = await supabase.rpc('check_columns', { 
                    p_table_name: 'services',
                    p_columns: ['buffer_minutes', 'duration']
                });
                
                // If column doesn't exist or there's an error, use default buffer value
                if (columnError || !columnCheck || !Array.isArray(columnCheck)) {
                    console.log(`Column check failed, assuming buffer_minutes doesn't exist`);
                    hasBufferColumn = false;
                } else {
                    hasBufferColumn = columnCheck.includes('buffer_minutes');
                }
            } catch (columnCheckError) {
                console.warn('Column check failed, proceeding with assumption of no buffer column:', columnCheckError.message);
                hasBufferColumn = false;
            }

            // Select query based on whether buffer column exists
            let selectQuery = 'id, duration';
            if (hasBufferColumn) {
                selectQuery += ', buffer_minutes';
            }
            
            const { data: service, error: serviceError } = await supabase
                .from('services')
                .select(selectQuery)
                .eq('id', service_id)
                .single();

            if (serviceError) throw serviceError;
            if (!service) throw new Error(`Service with ID ${service_id} not found.`);
            
            // Create serviceDetails with defaults for missing columns
            serviceDetails = {
                id: service.id,
                duration_minutes: service.duration || 60, // Using duration as duration_minutes
                buffer_minutes: hasBufferColumn ? (service.buffer_minutes || 0) : 0
            };
        } catch (error) {
            console.error('findAvailableSlots: Error fetching service details:', error);
            throw new Error(`Failed to fetch valid service details for ID ${service_id}: ${error.message}`);
        }

        const { duration_minutes, buffer_minutes } = serviceDetails;

        const getDatesInRange = (startDateStr, endDateStr) => {
            const dates = [];
            let currentDate = new Date(startDateStr + 'T00:00:00.000Z'); 
            const finalEndDate = new Date(endDateStr + 'T00:00:00.000Z');
            
            if (currentDate < todayDateOnly) {
                currentDate = new Date(todayDateOnly); 
            }

            while (currentDate <= finalEndDate) {
                dates.push(new Date(currentDate)); 
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
            return dates;
        };

        const targetDates = getDatesInRange(target_date_start, target_date_end);

        for (const date of targetDates) {
            const dateStr = date.toISOString().split('T')[0]; 

            let workingHours = null;    
            let dayIsAvailable = false;
            let breaks = [];            
            let overrideDetails = null; 

            const businessTimeZone = getBusinessTimeZone(); // Get it once per date processing

            if (!effectiveTeamId) {
                console.warn(`findAvailableSlots: team_id was not provided for date ${dateStr}. Logic for 'any available member' is not yet fully implemented. Skipping this date.`);
                continue; 
            }

            try {
                const { data: override, error: overrideError } = await supabase
                    .from('override_team_availability')
                    .select('start_time, end_time, break_start_time, break_end_time, is_available, reason')
                    .eq('team_id', effectiveTeamId)
                    .eq('date', dateStr)
                    .maybeSingle(); 

                if (overrideError) throw overrideError;
                overrideDetails = override; 

                if (overrideDetails) {
                    if (overrideDetails.is_available && overrideDetails.start_time && overrideDetails.end_time) {
                        dayIsAvailable = true;
                        workingHours = { start: overrideDetails.start_time, end: overrideDetails.end_time };
                        if (overrideDetails.break_start_time && overrideDetails.break_end_time) {
                            breaks.push({ start: overrideDetails.break_start_time, end: overrideDetails.break_end_time });
                        }
                    } else if (!overrideDetails.is_available) {
                        dayIsAvailable = false; 
                    }
                    if(dayIsAvailable && (!workingHours || !workingHours.start || !workingHours.end)) {
                        dayIsAvailable = false;
                    }
                }
            } catch (error) {
                console.error(`findAvailableSlots: Error fetching override availability for ${effectiveTeamId} on ${dateStr}: ${error.message}`);
                continue; 
            }
            
            if (overrideDetails && !overrideDetails.is_available) {
                continue;
            }

            if (!overrideDetails || (overrideDetails.is_available && !workingHours)) { 
                const dayOfWeek = date.getUTCDay(); 
                try {
                    const { data: defaultAvail, error: defaultAvailError } = await supabase
                        .from('default_team_availability')
                        .select('start_time, end_time, break_start_time, break_end_time, is_working_day')
                        .eq('team_id', effectiveTeamId)
                        .eq('day_of_week', dayOfWeek)
                        .maybeSingle(); 

                    if (defaultAvailError) throw defaultAvailError;

                    if (defaultAvail && defaultAvail.is_working_day && defaultAvail.start_time && defaultAvail.end_time) {
                        dayIsAvailable = true; 
                        workingHours = { start: defaultAvail.start_time, end: defaultAvail.end_time };
                        if (defaultAvail.break_start_time && defaultAvail.break_end_time) {
                            breaks.push({ start: defaultAvail.break_start_time, end: defaultAvail.break_end_time });
                        }
                    } else {
                        dayIsAvailable = false; 
                    }
                } catch (error) {
                    console.error(`findAvailableSlots: Error fetching default availability for ${effectiveTeamId}, Day ${date.getUTCDay()} (${dateStr}): ${error.message}`);
                    dayIsAvailable = false; 
                }
            }
            
            if (!dayIsAvailable || !workingHours) {
                continue; 
            }

            try {
                const { data: holiday, error: holidayError } = await supabase
                    .from('holidays')
                    .select('id, name, affects_all_members')
                    .eq('date', dateStr)
                    .maybeSingle();

                if (holidayError) throw holidayError;

                if (holiday) {
                    const overriddenToWork = overrideDetails && overrideDetails.is_available && overrideDetails.start_time && overrideDetails.end_time;
                    if (holiday.affects_all_members && !overriddenToWork) {
                        continue; 
                    }
                }
            } catch (error) {
                console.error(`findAvailableSlots: Error fetching holiday for ${dateStr}: ${error.message}`);
                continue; 
            }
            
            let existingAppointments = [];
            try {
                // 获取与业务日重叠的UTC预约
                const businessDayStartUTC = this._getDateTimeInBusinessTimeZone(date, "00:00");
                const nextUtcDate = new Date(date.getTime());
                nextUtcDate.setUTCDate(date.getUTCDate() + 1);
                const nextBusinessDayStartUTC = this._getDateTimeInBusinessTimeZone(nextUtcDate, "00:00");

                const { data, error: appointmentsError } = await supabase
                    .from('appointments')
                    .select('start, end') 
                    .eq('team_id', effectiveTeamId) // Use effectiveTeamId instead of team_member_id
                    // 预约的end必须在业务日UTC开始之后
                    .gt('end', businessDayStartUTC.toISOString()) 
                    // 预约的start必须在下一个业务日UTC开始之前
                    .lt('start', nextBusinessDayStartUTC.toISOString())
                    .in('status', ['confirmed', 'pending']); 

                if (appointmentsError) throw appointmentsError;
                existingAppointments = data || [];
            } catch (error) {
                console.error(`findAvailableSlots: Error fetching appointments for ${effectiveTeamId} on ${dateStr}: ${error.message}`);
                continue; 
            }

            const occupiedPeriodsInMinutes = [];
            const currentBusinessDateStr = formatInTimeZone(date, businessTimeZone, 'yyyy-MM-dd');

            // 使用时区逻辑处理现有预约
            existingAppointments.forEach(app => {
                try {
                    const occStartUtc = parseISO(app.start);
                    const occEndUtc = parseISO(app.end);

                    const occStartBizTZ = utcToZonedTime(occStartUtc, businessTimeZone);
                    const occEndBizTZ = utcToZonedTime(occEndUtc, businessTimeZone);

                    const appStartDateBizTZStr = formatInTimeZone(occStartBizTZ, businessTimeZone, 'yyyy-MM-dd');
                    const appEndDateBizTZStr = formatInTimeZone(occEndBizTZ, businessTimeZone, 'yyyy-MM-dd');
                    
                    let startMinutes = 0;
                    let endMinutes = 24 * 60;

                    if (appEndDateBizTZStr < currentBusinessDateStr || appStartDateBizTZStr > currentBusinessDateStr) {
                        return;
                    }

                    if (appStartDateBizTZStr === currentBusinessDateStr) {
                        startMinutes = this._getMinutesFromStartOfDayInBusinessTimeZone(occStartUtc);
                    } else {
                        startMinutes = 0;
                    }

                    if (appEndDateBizTZStr === currentBusinessDateStr) {
                        endMinutes = this._getMinutesFromStartOfDayInBusinessTimeZone(occEndUtc);
                        // If endMinutes is 0, it means it ends exactly at midnight. 
                        // For occupied period on *this* day, it means it occupies 0 minutes.
                        // Adjust only if it ends exactly at midnight AND started before midnight.
                        if (endMinutes === 0 && occStartUtc < occEndUtc) { 
                            // This period effectively doesn't occupy the current day
                            return; // Skip adding this period
                        }
                        // Handle case where it ends exactly at midnight of the *next* day (local time)
                        // This can happen if the original end time was exactly 24:00 or slightly after in local time.
                        // Our helper returns 0 for 00:00. If it truly occupies up to 24:00, we need 24*60.
                        if (endMinutes === 0 && appStartDateBizTZStr === currentBusinessDateStr && occEndUtc > occStartUtc) {
                           endMinutes = 24 * 60; // It occupied the full day until midnight.
                        }
                    } else { 
                        endMinutes = 24 * 60;
                    }
                    
                    if (startMinutes < endMinutes) {
                        occupiedPeriodsInMinutes.push({
                            start: startMinutes,
                            end: endMinutes,
                            type: 'appointment' 
                        });
                    }
                } catch (parseError) {
                     console.error(`Error parsing appointment times for ${dateStr}: ${parseError.message}`, app);
                     // Decide how to handle: skip this appointment or the whole day?
                     // Skipping the appointment seems safer.
                }
            });

            // Process breaks using timezone logic
            breaks.forEach(br => {
                try {
                    const breakStartDateTimeInBizTZ = this._getDateTimeInBusinessTimeZone(date, br.start);
                    const breakEndDateTimeInBizTZ = this._getDateTimeInBusinessTimeZone(date, br.end);
                    
                    const startMinutes = this._getMinutesFromStartOfDayInBusinessTimeZone(breakStartDateTimeInBizTZ);
                    const endMinutes = this._getMinutesFromStartOfDayInBusinessTimeZone(breakEndDateTimeInBizTZ);

                    if (startMinutes < endMinutes) {
                        occupiedPeriodsInMinutes.push({
                            start: startMinutes,
                            end: endMinutes,
                            type: 'break' 
                        });
                    }
                 } catch(timeError) {
                    console.error(`Error processing break time ${br.start}-${br.end} for date ${dateStr}: ${timeError.message}`);
                    // Might indicate invalid time format in DB
                 }
            });

            occupiedPeriodsInMinutes.sort((a, b) => a.start - b.start);

            // Calculate day start/end minutes using timezone logic
            let dayStartMinutes, dayEndMinutes;
             try {
                 const dayStartDateTimeInBizTZ = this._getDateTimeInBusinessTimeZone(date, workingHours.start);
                 const dayEndDateTimeInBizTZ = this._getDateTimeInBusinessTimeZone(date, workingHours.end);
                 dayStartMinutes = this._getMinutesFromStartOfDayInBusinessTimeZone(dayStartDateTimeInBizTZ);
                 dayEndMinutes = this._getMinutesFromStartOfDayInBusinessTimeZone(dayEndDateTimeInBizTZ);
                 // Handle overnight shifts where end time might be earlier than start time in minutes (e.g., 22:00 to 06:00)
                 // In minutes from midnight, this would be 1320 to 360. If end < start, add 24*60 to end.
                 if (dayEndMinutes < dayStartMinutes) {
                     dayEndMinutes += 24 * 60; 
                     // Note: This assumes the working period doesn't exceed 24 hours.
                     // The slot generation loop needs to handle this correctly.
                 }
            } catch(timeError) {
                 console.error(`Error processing working hours ${workingHours.start}-${workingHours.end} for date ${dateStr}: ${timeError.message}`);
                 continue; // Cannot proceed without valid working hours
            }
            
            // Generate and check slots using minutes calculated in business timezone
            for (let proposedServiceStartMinutes = dayStartMinutes; 
                     proposedServiceStartMinutes < dayEndMinutes; 
                     proposedServiceStartMinutes += slot_interval_minutes) {

                const serviceStartTimeMinutes = proposedServiceStartMinutes;
                // Adjust end minutes if it crosses the 24*60 boundary due to overnight shift logic
                const serviceEndTimeMinutes = (serviceStartTimeMinutes + duration_minutes); // Potentially > 24*60

                // Check 1: Service itself must end within the defined working period (potentially > 24*60 for overnight)
                if (serviceEndTimeMinutes > dayEndMinutes) {
                    break; 
                }

                const actualOccupiedStartMinutes = serviceStartTimeMinutes - buffer_minutes;
                const actualOccupiedEndMinutes = serviceEndTimeMinutes + buffer_minutes;

                // Check 2: The full occupied block must be within the defined working period.
                // Needs adjustment for overnight shifts (start might be < dayStartMinutes if buffer goes into prev day?)
                // Current check assumes start >= dayStartMinutes and end <= dayEndMinutes (which might be > 24*60)
                if (actualOccupiedStartMinutes < dayStartMinutes || actualOccupiedEndMinutes > dayEndMinutes) {
                    // Exception: Allow buffer to slightly precede dayStartMinutes if service starts exactly at dayStartMinutes? Requires business rule.
                    // For now, strict containment.
                    continue; 
                }

                let conflict = false;
                for (const period of occupiedPeriodsInMinutes) {
                    // Adjust occupied periods if the working day spans midnight (dayEndMinutes > 24*60)
                    // If our proposed slot is in the 'next day' part (minutes >= 24*60), compare accordingly.
                    // This comparison needs care if occupied periods also span midnight.

                    // Standard overlap check (works even if values > 24*60, as long as consistent)
                    if (actualOccupiedStartMinutes < period.end && actualOccupiedEndMinutes > period.start) {
                        conflict = true;
                        break;
                    }
                }

                if (!conflict) {
                    // Generate UTC ISO strings from business timezone minutes
                    try {
                        const baseDateForSlotBizTZ = this._getDateTimeInBusinessTimeZone(date, '00:00'); 
                        
                        // Use a robust way to add minutes to a Date object respecting timezones
                        // date-fns addMinutes should handle this correctly internally
                        const apptStartBizTZ = addMinutes(baseDateForSlotBizTZ, serviceStartTimeMinutes);
                        const apptEndBizTZ = addMinutes(baseDateForSlotBizTZ, serviceEndTimeMinutes);

                        availableSlots.push({
                            appointment_start_time: zonedTimeToUtc(apptStartBizTZ, businessTimeZone).toISOString(),
                            appointment_end_time: zonedTimeToUtc(apptEndBizTZ, businessTimeZone).toISOString(),
                            team_id: effectiveTeamId,
                            service_id: service_id,
                            date: dateStr 
                        });
                    } catch (dateGenError) {
                         console.error(`Error generating final date/time for slot starting at minute ${serviceStartTimeMinutes} on ${dateStr}: ${dateGenError.message}`);
                         // Skip this slot if final conversion fails
                    }
                }
            }
        }
        return availableSlots; 
    }

    /**
     * Helper function to convert HH:MM string to minutes from midnight.
     * Assumes HH:MM is for the local business day, not UTC.
     * @param {string} timeStr - e.g., "09:30"
     * @returns {number}
     */
    timeToMinutes(timeStr) {
        if (!timeStr || !timeStr.includes(':')) {
            return 0; 
        }
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            return 0; 
        }
        return hours * 60 + minutes;
    }

    /**
     * Converts a UTC Date object (representing a day) and an HH:MM time string 
     * into a new Date object that represents that specific time in the business's local timezone.
     * @private
     * @param {Date} utcDateOnly - A Date object representing a day (e.g., YYYY-MM-DD T00:00:00.000Z from getDatesInRange).
     * @param {string} hhMmTimeStr - Time string in 'HH:MM' format (e.g., "09:30").
     * @returns {Date} A JavaScript Date object whose internal UTC value correctly represents the specified local time in the business timezone.
     */
    _getDateTimeInBusinessTimeZone(utcDateOnly, hhMmTimeStr) {
        if (!hhMmTimeStr || !hhMmTimeStr.includes(':')) {
            console.error('_getDateTimeInBusinessTimeZone: Invalid hhMmTimeStr format.', hhMmTimeStr);
            // Or throw an error, depending on how strict we want to be.
            // For robustness, if time is invalid, it might be better to indicate failure clearly.
            throw new Error(`Invalid time string format for _getDateTimeInBusinessTimeZone: ${hhMmTimeStr}`);
        }
        const [hours, minutes] = hhMmTimeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error(`Invalid time value for _getDateTimeInBusinessTimeZone: ${hhMmTimeStr}`);
        }

        const timeZone = getBusinessTimeZone();
        
        // 1. Format the UTC date to a YYYY-MM-DD string *as it is in the business timezone*
        //    This ensures we are working with the correct calendar day for the business.
        const dateStrInBusinessTZ = formatInTimeZone(utcDateOnly, timeZone, 'yyyy-MM-dd');
        
        // 2. Construct the full date-time string that represents the local time in the business timezone.
        //    e.g., "2023-10-27T09:30:00"
        const localDateTimeStr = `${dateStrInBusinessTZ}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        // 3. Convert this local date-time string (which is in business's timezone) to a UTC Date object.
        //    `zonedTimeToUtc` takes the local time string and the timezone it belongs to.
        return zonedTimeToUtc(localDateTimeStr, timeZone);
    }

    /**
     * Calculates the number of minutes from the start of the day (00:00) 
     * in the business's local timezone for a given Date object.
     * @private
     * @param {Date} dateObject - A JavaScript Date object (which is inherently UTC-based).
     *                           This object should represent a specific point in time.
     * @returns {number} Minutes from the start of the day in the business's local timezone.
     */
    _getMinutesFromStartOfDayInBusinessTimeZone(dateObject) {
        const timeZone = getBusinessTimeZone();
        // Get the representation of this dateObject in the business's timezone.
        // The getHours() and getMinutes() on this new Date object will reflect the local time.
        const dateInBusinessTZ = utcToZonedTime(dateObject, timeZone);
        return dateInBusinessTZ.getHours() * 60 + dateInBusinessTZ.getMinutes();
    }

    // Helper function for debugging, to convert minutes from midnight back to HH:MM string
    // minutesToTimeStr(totalMinutes) {

    // --- Placeholder for Reminder/Follow-up Logic --- 
    
    /**
     * Schedule reminders for an appointment.
     * (Implementation Placeholder)
     */
    async scheduleReminders(appointmentId) {
        console.warn('scheduleReminders is not implemented yet.');
        // Logic to create entries in a 'reminders' table or update appointment flags
    }

    /**
     * Schedule follow-ups for an appointment.
     * (Implementation Placeholder)
     */
    async scheduleFollowUps(appointmentId) {
        console.warn('scheduleFollowUps is not implemented yet.');
        // Logic to create entries in a 'follow_ups' table or update appointment flags
    }
}

module.exports = new AppointmentService(); 