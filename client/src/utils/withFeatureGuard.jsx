import React from 'react';
import { useFeatureGuard } from '../hooks/useFeatureGuard';

export function withFeatureGuard(Component, minPlan) {
  return function GuardedComponent(props) {
    useFeatureGuard(minPlan);
    return <Component {...props} />;
  };
} 