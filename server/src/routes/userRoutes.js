const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
// 需要登录
router.use(authMiddleware);

/**
 * GET /api/user/profile
 * 返回用户 email, plan, avatarUrl
 */
router.get('/profile', async (req, res) => {
  const user = req.user;
  try {
    // 从用户资料表读取
    const { data, error } = await supabase
      .from('user_profiles')
      .select('plan, avatar_url')
      .eq('user_id', user.id)
      .single();
    if (error) throw error;
    res.json({
      email: user.email,
      plan: data.plan,
      avatarUrl: data.avatar_url
    });
  } catch (err) {
    console.error('userRoutes GET /profile error:', err);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

/**
 * POST /api/user/plan
 * 更新用户订阅等级
 */
router.post('/plan', async (req, res) => {
  const user = req.user;
  const { plan } = req.body;
  if (!plan) {
    return res.status(400).json({ message: 'plan is required' });
  }
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, plan }, { onConflict: ['user_id'] })
      .select('plan')
      .single();
    if (error) throw error;
    res.json({ plan: data.plan });
  } catch (err) {
    console.error('userRoutes POST /plan error:', err);
    res.status(500).json({ message: 'Failed to update subscription plan' });
  }
});

module.exports = router; 