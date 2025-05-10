import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from './dialog';
import React from 'react';
import { Button } from './button';
import { expect, userEvent, within } from '@storybook/test';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof Dialog>;

/**
 * 基本对话框示例
 */
export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>打开对话框</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
          <DialogDescription>
            在此处编辑您的个人资料信息。点击保存后，更改将立即生效。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-sm font-medium">
              姓名
            </label>
            <input
              id="name"
              defaultValue="张三"
              className="col-span-3 h-10 rounded-md border border-input px-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="username" className="text-right text-sm font-medium">
              用户名
            </label>
            <input
              id="username"
              defaultValue="zhangsan"
              className="col-span-3 h-10 rounded-md border border-input px-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">
              取消
            </Button>
          </DialogClose>
          <Button type="submit">保存更改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 对话框应该是关闭的
    const dialog = canvas.queryByRole('dialog');
    expect(dialog).not.toBeInTheDocument();
    
    // 点击打开按钮
    const openButton = canvas.getByRole('button', { name: /打开对话框/i });
    await userEvent.click(openButton);
    
    // 对话框应该打开
    const openDialog = canvas.getByRole('dialog');
    expect(openDialog).toBeInTheDocument();
    
    // 检查对话框的内容
    expect(within(openDialog).getByText('编辑个人资料')).toBeInTheDocument();
    
    // 关闭对话框
    const cancelButton = within(openDialog).getByRole('button', { name: /取消/i });
    await userEvent.click(cancelButton);
    
    // 等待对话框关闭的动画
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // 对话框应该再次关闭
    expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

/**
 * 确认对话框示例
 */
export const Confirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>删除账户</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            您确定要删除您的账户吗？此操作不可逆转，您将失去所有数据。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button">
              取消
            </Button>
          </DialogClose>
          <Button type="submit" data-testid="confirm-delete">确认删除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 点击删除按钮
    const deleteButton = canvas.getByRole('button', { name: /删除账户/i });
    await userEvent.click(deleteButton);
    
    // 确认对话框应该打开
    const dialog = canvas.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    // 检查确认按钮是否存在
    const confirmButton = within(dialog).getByTestId('confirm-delete');
    expect(confirmButton).toBeInTheDocument();
    
    // 点击取消按钮
    const cancelButton = within(dialog).getByRole('button', { name: /取消/i });
    await userEvent.click(cancelButton);
    
    // 等待对话框关闭的动画
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // 对话框应该关闭
    expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

/**
 * 信息展示对话框
 */
export const Information: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>查看详情</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>新功能介绍</DialogTitle>
          <DialogDescription>
            我们最近发布了一些新功能，帮助您更高效地工作
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h4 className="text-sm font-medium mb-2">主要更新:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>全新的用户界面设计，提升用户体验</li>
            <li>性能优化，页面加载速度提升30%</li>
            <li>新增数据分析功能，帮助您做出更明智的决策</li>
            <li>修复了多个已知问题</li>
          </ul>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">我知道了</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}; 