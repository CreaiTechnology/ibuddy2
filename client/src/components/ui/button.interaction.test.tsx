import { composeStories } from '@storybook/react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as stories from './button.stories';

// 将所有故事组合起来以便于测试
const { Default, Disabled, Loading } = composeStories(stories);

describe('Button组件交互测试', () => {
  it('点击按钮时应触发点击事件', () => {
    const onClickMock = jest.fn();
    
    render(<Default onClick={onClickMock} />);
    
    const button = screen.getByRole('button', { name: /按钮/i });
    fireEvent.click(button);
    
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
  
  it('禁用状态下按钮不应触发点击事件', () => {
    const onClickMock = jest.fn();
    
    render(<Disabled onClick={onClickMock} />);
    
    const button = screen.getByRole('button', { name: /禁用/i });
    fireEvent.click(button);
    
    expect(onClickMock).not.toHaveBeenCalled();
  });
  
  it('加载状态下按钮应显示加载指示器', () => {
    render(<Loading />);
    
    // 检查加载图标是否存在
    const loadingIndicator = screen.getByText(/加载中.../i);
    expect(loadingIndicator).toBeInTheDocument();
    
    // 按钮应处于禁用状态
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('按钮应响应键盘交互', () => {
    const onClickMock = jest.fn();
    
    render(<Default onClick={onClickMock} />);
    
    const button = screen.getByRole('button', { name: /按钮/i });
    
    // 模拟按下空格键
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    fireEvent.keyUp(button, { key: ' ', code: 'Space' });
    
    // 模拟按下回车键
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.keyUp(button, { key: 'Enter', code: 'Enter' });
    
    // 两次按键事件都应该触发点击
    expect(onClickMock).toHaveBeenCalledTimes(2);
  });
}); 