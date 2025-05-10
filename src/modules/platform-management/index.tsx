import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ModuleRoutes from './routes';

/**
 * Platform API Management模块入口组件
 * 提供统一的平台API和资源管理界面
 */
const PlatformManagement: React.FC = () => {
  return (
    <Routes>
      {ModuleRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={route.element}
        />
      ))}
    </Routes>
  );
};

export default PlatformManagement; 