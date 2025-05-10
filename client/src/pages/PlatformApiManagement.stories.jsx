import React from 'react';
import PlatformApiManagement from './PlatformApiManagement';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

export default {
  title: 'Pages/Platform API Management',
  tags: ['backend'],
  component: PlatformApiManagement,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={{ user: { plan: 'enterprise' } }}>
        <MemoryRouter initialEntries={['/dashboard/platform-api']}>
          <Story />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  ],
};

const Template = (args) => <PlatformApiManagement />;

export const Default = Template.bind({});
Default.args = {}; 