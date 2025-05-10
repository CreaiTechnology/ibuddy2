import React from 'react';
import { useParams } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import AutoReplySettingsPage from './AutoReplySettingsPage';
import WalkinBookingSettingsPage from './WalkinBookingSettingsPage';
import OnsiteBookingSettingsPage from './OnsiteBookingSettingsPage';
import BrandSettingsPage from './BrandSettingsPage';

function AgentConfigPage() {
  const { agentId } = useParams();
  let PageComponent;
  let title;
  switch (agentId) {
    case 'auto-reply':
      PageComponent = AutoReplySettingsPage;
      title = '自动回复设置';
      break;
    case 'walkin-booking':
      PageComponent = WalkinBookingSettingsPage;
      title = 'Walk-in 预约设置';
      break;
    case 'onsite-booking':
      PageComponent = OnsiteBookingSettingsPage;
      title = 'On-site 预约设置';
      break;
    case 'content-creation':
      PageComponent = BrandSettingsPage;
      title = '内容生成器设置';
      break;
    default:
      return <Container className="p-4">未知代理: {agentId}</Container>;
  }
  document.title = title;
  const SpecificPage = PageComponent;
  return <SpecificPage />;
}

export default AgentConfigPage; 