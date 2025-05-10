import React from 'react';
import SettingsCenterLayout from './SettingsCenterLayout';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default {
  title: 'Layouts/Settings Center',
  component: SettingsCenterLayout,
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

const Template = (args) => <SettingsCenterLayout />;

export const EnterpriseContentSettings = Template.bind({});
EnterpriseContentSettings.args = {
  plan: 'enterprise',
  route: '/settings/content-generator'
};

export const FreeAgentReplySettings = Template.bind({});
FreeAgentReplySettings.args = {
  plan: 'free',
  route: '/settings/agent-reply'
}; 