import React from 'react';
import BrandSettingsPage from './BrandSettingsPage';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

export default {
  title: 'Pages/Brand Settings Page',
  tags: ['backend'],
  component: BrandSettingsPage,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={{ user: { plan: 'enterprise' } }}>
        <MemoryRouter initialEntries={['/settings/content-generator']}>
          <Story />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  ],
};

const Template = (args) => <BrandSettingsPage />;

export const Default = Template.bind({});
Default.args = {}; 