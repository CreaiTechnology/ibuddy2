/** @type { import('@storybook/react').Preview } */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '../src/config/theme.config';
import { MemoryRouter } from 'react-router-dom';

const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

// 添加全局主题切换配置
export const globalTypes = {
  theme: {
    name: 'Theme',
    description: '全局主题',
    defaultValue: 'default',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'default', title: '默认主题' }
      ]
    }
  }
};

// 添加装饰器，注入主题和路由
export const decorators = [
  (Story) => (
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    </ThemeProvider>
  ),
];

export default preview;