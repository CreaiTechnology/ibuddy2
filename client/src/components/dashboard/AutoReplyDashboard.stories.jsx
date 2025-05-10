import React from 'react';
import AutoReplyDashboard from './AutoReplyDashboard';
import { AuthContext } from '../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

export default {
  title: 'Pages/Auto Reply Dashboard',
  tags: ['backend'],
  component: AutoReplyDashboard,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={{ user: { plan: 'enterprise' } }}>
        <MemoryRouter initialEntries={['/data/agent-reply']}>
          <Story />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  ],
};

const Template = (args) => <AutoReplyDashboard />;

export const Default = Template.bind({});
Default.args = {}; 