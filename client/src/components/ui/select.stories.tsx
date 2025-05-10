import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator
} from './select';
import { expect, userEvent, within } from '@storybook/test';

const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof Select>;

/**
 * 基本下拉选择框
 */
export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="选择一个水果" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="apple">苹果</SelectItem>
          <SelectItem value="banana">香蕉</SelectItem>
          <SelectItem value="orange">橙子</SelectItem>
          <SelectItem value="grape">葡萄</SelectItem>
          <SelectItem value="pear">梨子</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 选择框应该默认显示占位符
    const trigger = canvas.getByRole('combobox');
    expect(trigger).toHaveTextContent('选择一个水果');
    
    // 点击触发器打开下拉菜单
    await userEvent.click(trigger);
    
    // 等待下拉菜单打开
    const options = canvas.getAllByRole('option');
    expect(options.length).toBe(5);
    
    // 点击选择"香蕉"选项
    const bananaOption = options.find(option => option.textContent === '香蕉');
    if (bananaOption) {
      await userEvent.click(bananaOption);
    }
    
    // 选择框应该现在显示"香蕉"
    expect(trigger).toHaveTextContent('香蕉');
  }
};

/**
 * 带分组的下拉选择框
 */
export const Grouped: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="选择一个城市" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>华北地区</SelectLabel>
          <SelectItem value="beijing">北京</SelectItem>
          <SelectItem value="tianjin">天津</SelectItem>
          <SelectItem value="shijiazhuang">石家庄</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>华东地区</SelectLabel>
          <SelectItem value="shanghai">上海</SelectItem>
          <SelectItem value="hangzhou">杭州</SelectItem>
          <SelectItem value="nanjing">南京</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>华南地区</SelectLabel>
          <SelectItem value="guangzhou">广州</SelectItem>
          <SelectItem value="shenzhen">深圳</SelectItem>
          <SelectItem value="xiamen">厦门</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 点击触发器打开下拉菜单
    const trigger = canvas.getByRole('combobox');
    await userEvent.click(trigger);
    
    // 检查分组标签是否存在
    const northChinaLabel = canvas.getByText('华北地区');
    expect(northChinaLabel).toBeInTheDocument();
    
    // 选择"上海"选项
    const shanghaiOption = canvas.getByRole('option', { name: '上海' });
    await userEvent.click(shanghaiOption);
    
    // 选择框应该显示"上海"
    expect(trigger).toHaveTextContent('上海');
  }
};

/**
 * 禁用状态的下拉选择框
 */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col space-y-4">
      <Select disabled>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="禁用选择框" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="apple">苹果</SelectItem>
            <SelectItem value="banana">香蕉</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="部分选项禁用" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="apple">苹果</SelectItem>
            <SelectItem value="banana" disabled>香蕉</SelectItem>
            <SelectItem value="orange">橙子</SelectItem>
            <SelectItem value="grape" disabled>葡萄</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 第一个选择框应该被禁用
    const disabledTrigger = canvas.getByText('禁用选择框').closest('button');
    expect(disabledTrigger).toBeDisabled();
    
    // 尝试点击禁用的选择框（不应该打开）
    await userEvent.click(disabledTrigger!);
    
    // 点击第二个选择框
    const partialDisabledTrigger = canvas.getByText('部分选项禁用').closest('button');
    await userEvent.click(partialDisabledTrigger!);
    
    // 选择一个可用的选项
    const appleOption = canvas.getByRole('option', { name: '苹果' });
    await userEvent.click(appleOption);
    
    // 选择框应该显示"苹果"
    expect(partialDisabledTrigger).toHaveTextContent('苹果');
  }
};

/**
 * 表单中的下拉选择框
 */
export const InForm: Story = {
  render: () => (
    <div className="w-[350px] space-y-4 rounded-md border p-4">
      <div className="space-y-2">
        <label htmlFor="location" className="text-sm font-medium">配送地址</label>
        <Select>
          <SelectTrigger id="location" className="w-full">
            <SelectValue placeholder="选择配送城市" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="beijing">北京</SelectItem>
              <SelectItem value="shanghai">上海</SelectItem>
              <SelectItem value="guangzhou">广州</SelectItem>
              <SelectItem value="shenzhen">深圳</SelectItem>
              <SelectItem value="hangzhou">杭州</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">选择您希望配送的城市</p>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="payment" className="text-sm font-medium">支付方式</label>
        <Select defaultValue="alipay">
          <SelectTrigger id="payment" className="w-full">
            <SelectValue placeholder="选择支付方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="alipay">支付宝</SelectItem>
              <SelectItem value="wechat">微信支付</SelectItem>
              <SelectItem value="creditcard">信用卡</SelectItem>
              <SelectItem value="cash">货到付款</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 检查默认选择的支付方式
    const paymentTrigger = canvas.getByLabelText('支付方式');
    expect(paymentTrigger).toHaveTextContent('支付宝');
    
    // 选择配送地址
    const locationTrigger = canvas.getByLabelText('配送地址');
    await userEvent.click(locationTrigger);
    
    // 选择"深圳"
    const shenzhenOption = canvas.getByRole('option', { name: '深圳' });
    await userEvent.click(shenzhenOption);
    
    // 地址选择框应该显示"深圳"
    expect(locationTrigger).toHaveTextContent('深圳');
  }
}; 