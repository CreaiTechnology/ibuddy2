import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';

// Lazy load components
const PlatformOverview = lazy(() => import('./pages/PlatformOverview'));
const DataSourceList = lazy(() => import('./pages/DataSourceList'));
const DataSourceWizard = lazy(() => import('./pages/DataSourceWizard'));
const DataSourceDetail = lazy(() => import('./pages/DataSourceDetail'));
const PlatformSettings = lazy(() => import('./pages/PlatformSettings'));

// Loading fallback
const Loading = () => <div>Loading...</div>;

// Routes configuration
const routes = [
  {
    path: '',
    element: (
      <Suspense fallback={<Loading />}>
        <PlatformOverview />
      </Suspense>
    ),
  },
  {
    path: 'data-sources',
    element: (
      <Suspense fallback={<Loading />}>
        <DataSourceList />
      </Suspense>
    ),
  },
  {
    path: 'data-sources/new',
    element: (
      <Suspense fallback={<Loading />}>
        <DataSourceWizard />
      </Suspense>
    ),
  },
  {
    path: 'data-sources/:id',
    element: (
      <Suspense fallback={<Loading />}>
        <DataSourceDetail />
      </Suspense>
    ),
  },
  {
    path: 'settings',
    element: (
      <Suspense fallback={<Loading />}>
        <PlatformSettings />
      </Suspense>
    ),
  },
];

export default routes; 