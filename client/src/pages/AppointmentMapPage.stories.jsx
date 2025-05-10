import React from 'react';
import AppointmentMapPage from './AppointmentMapPage';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

export default {
  title: 'Pages/Appointment Map Page',
  tags: ['backend'],
  component: AppointmentMapPage,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={{ user: { plan: 'enterprise' } }}>
        <MemoryRouter initialEntries={['/data/walkin-booking']}>
          <Story />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  ]
};

const Template = (args) => <AppointmentMapPage />;

export const Default = Template.bind({});
Default.args = {}; 