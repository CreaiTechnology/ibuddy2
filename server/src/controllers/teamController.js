const supabase = require('../config/supabase');

// 获取所有团队
exports.getTeams = async (req, res) => {
  try {
    // 查询所有团队
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');

    if (error) {
      console.error('获取团队失败:', error);
      return res.status(500).json({ message: '获取团队数据失败', error: error.message });
    }

    // 返回团队数据
    res.status(200).json(data);
  } catch (error) {
    console.error('团队查询出错:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单个团队
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`获取团队 ${id} 失败:`, error);
      return res.status(404).json({ message: '未找到团队', error: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('获取团队详情出错:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建新团队
exports.createTeam = async (req, res) => {
  try {
    const { name, colour, max_overlap, members = [] } = req.body;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '团队名称为必填项' });
    }

    // 创建团队
    const { data, error } = await supabase
      .from('teams')
      .insert([{ 
        name, 
        colour: colour || '#cccccc', 
        max_overlap: max_overlap || 1,
        members,
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      console.error('创建团队失败:', error);
      return res.status(500).json({ message: '创建团队失败', error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('创建团队出错:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新团队
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, colour, max_overlap, members, status } = req.body;

    // 构建更新对象
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (colour !== undefined) updateData.colour = colour;
    if (max_overlap !== undefined) updateData.max_overlap = max_overlap;
    if (members !== undefined) updateData.members = members;
    if (status !== undefined) updateData.status = status;

    // 更新团队
    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`更新团队 ${id} 失败:`, error);
      return res.status(500).json({ message: '更新团队失败', error: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('更新团队出错:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除团队
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`删除团队 ${id} 失败:`, error);
      return res.status(500).json({ message: '删除团队失败', error: error.message });
    }

    res.status(204).send();
  } catch (error) {
    console.error('删除团队出错:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 