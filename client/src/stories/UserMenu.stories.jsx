import React from 'react';
import UserMenu from '../components/UserMenu';
import { AuthContext } from '../context/AuthContext';

const meta = {
  title: 'Components/UserMenu',
  component: UserMenu,
  decorators: [
    (Story, { args }) => (
      <AuthContext.Provider value={args}>
        <Story />
      </AuthContext.Provider>
    ),
  ],
  argTypes: {
    logout: { action: 'logout' },
  },
};

export default meta;

const Template = (args) => <UserMenu />;

export const Default = Template.bind({});
Default.args = {
  user: { plan: 'proA', avatarUrl: 'https://via.placeholder.com/32' },
  logout: () => {},
};

export const NoAvatar = Template.bind({});
NoAvatar.args = {
  user: { plan: 'free', avatarUrl: '' },
  logout: () => {},
}; 