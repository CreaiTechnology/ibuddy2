import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const planOrder = ['free', 'proA', 'proB', 'enterprise'];

export function useFeatureGuard(minPlan) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userPlan = user?.plan || 'free';

  useEffect(() => {
    if (planOrder.indexOf(userPlan) < planOrder.indexOf(minPlan)) {
      navigate('/upgrade', { replace: true });
    }
  }, [userPlan, minPlan, navigate]);
} 