import React from 'react';
import DataCenterLayout from './DataCenterLayout';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default {
  title: 'Layouts/Data Center',
  component: DataCenterLayout,
  tags: ['layout-routing-issue'],
  decorators: [
    (Story, context) => (
      <AuthContext.Provider value={{ user: { plan: context.args.plan } }}>
        <MemoryRouter initialEntries={[context.args.route]}>
          <Story />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  ],
  argTypes: {
    plan: {
      control: { type: 'select' },
      options: ['free', 'proA', 'proB', 'enterprise']
    },
    route: { control: 'text' }
  }
};

const Template = (args) => <DataCenterLayout />;

export const EnterpriseView = Template.bind({});
EnterpriseView.args = {
  plan: 'enterprise',
  route: '/data/agent-reply'
};

export const FreeDashboardView = Template.bind({});
FreeDashboardView.args = {
  plan: 'free',
  route: '/data/dashboard'
}; 