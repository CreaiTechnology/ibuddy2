# Map View Team Management Implementation

This document provides instructions for implementing team management features in the map view.

## Components Created

1. **TeamAssignmentModal**: A modal component for assigning teams to appointments
   - Located at: `client/src/components/map/TeamAssignmentModal.js`
   - CSS: `client/src/components/map/TeamAssignmentModal.css`

2. **MapView-TeamIntegration.js**: A documentation file that shows exactly how to integrate team assignment into the AppointmentMap component

3. **CSS Styles**: Added team assignment button styles to `AppointmentMap.css`

## Required Changes to Implement This Feature

1. **Add imports to AppointmentMap.js**:
   ```javascript
   import { FaMapMarkerAlt, FaCalendarAlt, FaUsers } from 'react-icons/fa';
   import TeamAssignmentModal from './TeamAssignmentModal';
   import { toast } from 'react-toastify';
   ```

2. **Add state variables to AppointmentMap component**:
   ```javascript
   const [showTeamAssignmentModal, setShowTeamAssignmentModal] = useState(false);
   const [appointmentForTeamAssignment, setAppointmentForTeamAssignment] = useState(null);
   ```

3. **Add handler functions** for opening the team assignment modal and handling team assignment.

4. **Update the popup** in the Marker component to show team information and add a team assignment button.

5. **Add the TeamAssignmentModal component** to the render method of AppointmentMap.

## Next Steps for Further Development

1. **Color-code appointments by team**: Make markers on the map show different colors based on team assignment.

2. **Team filtering**: Add a filter to show only appointments for specific teams.

3. **Team workload visualization**: Add a panel showing how many appointments each team has.

4. **Team route optimization**: Optimize routes separately for each team.

5. **Team capacity analysis**: Add visualization for team capacity (appointments per day/week).

6. **Calendar integration**: Allow viewing team assignments in calendar view as well as map view.

## Implementation Note

The exact changes needed are documented in the `MapView-TeamIntegration.js` file. This file provides a step-by-step guide to integrating the team assignment functionality into the existing AppointmentMap component.

Since the code editor was having difficulty updating the AppointmentMap.js file directly, we created separate files instead. To implement this feature, manually add the code from MapView-TeamIntegration.js to AppointmentMap.js as instructed. 