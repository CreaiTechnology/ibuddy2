import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import styled from 'styled-components';
import { dataMenu } from '../../config/menu.config';
import { useAuth } from '../../context/AuthContext';

const Layout = styled.div`
  display: flex;
  height: 100vh;
`;
const Sidebar = styled.nav`
  width: 240px;
  background: ${props => props.theme.colors.surface};
  box-shadow: ${props => props.theme.shadows.dropdown};
  padding: 1rem;
`;
const MenuItem = styled.div`
  margin-bottom: 0.5rem;
  a {
    color: ${props => props.theme.colors.text};
    text-decoration: none;
    &:hover { color: ${props => props.theme.colors.primary}; }
  }
`;
const Content = styled.main`
  flex: 1;
  background: ${props => props.theme.colors.background};
  padding: 2rem;
  overflow-y: auto;
`;

export default function DataCenterLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const userPlan = user?.plan || 'free';
  // 在 Dashboard 页（/data/dashboard）路由时隐藏侧边栏
  const hideSidebar = location.pathname === '/data/dashboard';
  // simple plan check function
  const planOrder = ['free','proA','proB','enterprise'];
  const hasAccess = (minPlan) => planOrder.indexOf(userPlan) >= planOrder.indexOf(minPlan);

  return (
    <Layout>
      {!hideSidebar && (
        <Sidebar>
          {dataMenu.filter(item => hasAccess(item.minPlan)).map(item => (
            <MenuItem key={item.key}>
              <Link to={item.path} className={location.pathname.startsWith(item.path) ? 'active' : ''}>
                {item.title}
              </Link>
            </MenuItem>
          ))}
        </Sidebar>
      )}
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
} 