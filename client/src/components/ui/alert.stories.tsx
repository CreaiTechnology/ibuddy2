import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription } from './alert';
import React from 'react';
import { Terminal, AlertCircle, Info } from 'lucide-react';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof Alert>;

/**
 * 默认样式的警告提示
 */
export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <Info className="h-4 w-4" />
      <AlertTitle>注意</AlertTitle>
      <AlertDescription>
        这是一条提示信息，用于展示非关键的提示内容。
      </AlertDescription>
    </Alert>
  ),
  args: {
    className: "w-[450px]"
  }
};

/**
 * 带有图标的成功提示样式
 */
export const Success: Story = {
  render: (args) => (
    <Alert {...args}>
      <Terminal className="h-4 w-4" />
      <AlertTitle>操作成功!</AlertTitle>
      <AlertDescription>
        您的操作已成功完成，系统已经处理了您的请求。
      </AlertDescription>
    </Alert>
  ),
  args: {
    className: "w-[450px] border-green-500 text-green-600 bg-green-50"
  }
};

/**
 * 警告样式的警告提示
 */
export const Warning: Story = {
  render: (args) => (
    <Alert {...args}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>警告!</AlertTitle>
      <AlertDescription>
        此操作可能导致数据丢失，请确认是否继续。
      </AlertDescription>
    </Alert>
  ),
  args: {
    className: "w-[450px] border-amber-500 text-amber-600 bg-amber-50"
  }
};

/**
 * 破坏性操作警告样式
 */
export const Destructive: Story = {
  render: (args) => (
    <Alert variant="destructive" {...args}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>错误</AlertTitle>
      <AlertDescription>
        系统遇到错误，无法完成您的请求。请稍后再试。
      </AlertDescription>
    </Alert>
  ),
  args: {
    className: "w-[450px]"
  }
}; 