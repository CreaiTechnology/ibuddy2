import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
import { Button } from './button';
import React from 'react';

/**
 * Card组件是一个容器组件，用于分组和展示相关内容和操作
 */
const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

/**
 * 基本卡片示例，展示了卡片的所有部分
 */
export const Default: Story = {
  render: (args) => (
    <Card className="w-[350px]" {...args}>
      <CardHeader>
        <CardTitle>卡片标题</CardTitle>
        <CardDescription>卡片描述文本，提供额外上下文</CardDescription>
      </CardHeader>
      <CardContent>
        <p>卡片内容区域，这里可以放置任何内容，如文本、图像、表单等。</p>
      </CardContent>
      <CardFooter>
        <Button>操作按钮</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * 登录表单卡片示例
 */
export const LoginForm: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>账户登录</CardTitle>
        <CardDescription>请输入您的账户信息登录系统</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="email">邮箱</label>
            <input id="email" type="email" className="w-full p-2 border rounded" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password">密码</label>
            <input id="password" type="password" className="w-full p-2 border rounded" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">注册</Button>
        <Button>登录</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * 产品卡片示例
 */
export const ProductCard: Story = {
  render: () => (
    <Card className="w-[350px] overflow-hidden">
      <div className="h-[180px] bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500">产品图片</span>
      </div>
      <CardHeader>
        <CardTitle>产品名称</CardTitle>
        <CardDescription>¥199.00</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">产品描述信息，介绍产品的特点和优势。</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">加入购物车</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * 无边框简洁卡片
 */
export const Borderless: Story = {
  render: () => (
    <Card className="w-[350px] border-0 shadow-none">
      <CardHeader>
        <CardTitle>无边框卡片</CardTitle>
        <CardDescription>简洁的无边框设计</CardDescription>
      </CardHeader>
      <CardContent>
        <p>适用于需要更轻量级界面的场景。</p>
      </CardContent>
    </Card>
  ),
}; 