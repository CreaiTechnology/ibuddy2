/** @type { import('@storybook/react').Preview } */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '../src/config/theme.config';
import { MemoryRouter } from 'react-router-dom';
import { withTests } from '@storybook/addon-interactions';

const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    // 交互测试配置
    interactions: {
      disable: false, // 启用交互测试
      controls: { expanded: true }
    },
    // 可访问性配置
    a11y: {
      // 配置可访问性检查选项
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      },
      // 在Storybook界面中添加可访问性选项卡
      manual: true,
    },
    // 确保Jest测试可以更容易地运行
    jest: {
      disableAutoDeps: true,
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
  // 启用交互测试装饰器
  withTests({
    results: {
      // 在Play功能或交互测试失败时抛出异常
      throwOnError: true,
      // 自动清除每个测试后的模拟数据
      autoClear: true,
    },
  }),
  // 应用主题和路由
  (Story) => (
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    </ThemeProvider>
  ),
];

export default preview;