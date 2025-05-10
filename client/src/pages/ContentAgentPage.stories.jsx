import React from 'react';
import ContentAgentPage from './ContentAgentPage';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

export default {
  title: 'Pages/Content Agent Page',
  tags: ['backend'],
  component: ContentAgentPage,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={{ user: { plan: 'enterprise' } }}>
        <MemoryRouter initialEntries={['/data/content-generator']}>
          <Story />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  ]
};

const Template = (args) => <ContentAgentPage />;

export const Default = Template.bind({});
Default.args = {}; 