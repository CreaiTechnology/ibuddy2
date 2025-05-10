import type { Meta, StoryObj } from '@storybook/react';
import { Button, type ButtonProps } from './button';
import { ArrowRight, Mail, Loader2 } from 'lucide-react';
import React from 'react';

/**
 * 按钮用于触发操作或事件，例如提交表单、打开对话框、取消操作或执行删除操作。
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: '按钮的视觉风格变体'
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: '按钮的尺寸'
    },
    asChild: {
      control: 'boolean',
      description: '是否将按钮渲染为子组件'
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用按钮'
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

/**
 * 默认按钮，通常用于主要操作
 */
export const Default: Story = {
  args: {
    children: '按钮',
    variant: 'default',
  },
};

/**
 * 破坏性操作按钮，通常用于删除或其他不可逆操作
 */
export const Destructive: Story = {
  args: {
    children: '删除',
    variant: 'destructive',
  },
};

/**
 * 带轮廓的按钮，视觉重量较轻
 */
export const Outline: Story = {
  args: {
    children: '轮廓',
    variant: 'outline',
  },
};

/**
 * 次要按钮，用于辅助操作
 */
export const Secondary: Story = {
  args: {
    children: '次要',
    variant: 'secondary',
  },
};

/**
 * 幽灵按钮，仅在悬停时显示背景
 */
export const Ghost: Story = {
  args: {
    children: '幽灵',
    variant: 'ghost',
  },
};

/**
 * 链接样式按钮
 */
export const Link: Story = {
  args: {
    children: '链接',
    variant: 'link',
  },
};

/**
 * 小尺寸按钮
 */
export const Small: Story = {
  args: {
    children: '小按钮',
    size: 'sm',
  },
};

/**
 * 大尺寸按钮
 */
export const Large: Story = {
  args: {
    children: '大按钮',
    size: 'lg',
  },
};

/**
 * 图标按钮
 */
export const Icon: Story = {
  args: {
    children: <Mail />,
    size: 'icon',
    'aria-label': '发送邮件',
  },
};

/**
 * 带图标的按钮
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        下一步
        <ArrowRight />
      </>
    ),
  },
};

/**
 * 加载中状态按钮
 */
export const Loading: Story = {
  args: {
    children: (
      <>
        <Loader2 className="animate-spin" />
        加载中...
      </>
    ),
    disabled: true,
  },
};

/**
 * 禁用状态按钮
 */
export const Disabled: Story = {
  args: {
    children: '禁用',
    disabled: true,
  },
}; 