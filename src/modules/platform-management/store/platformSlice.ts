import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DataSourceService, SyncService } from '../services/api';
import { DataSource, ConnectionStatus } from '../models/types';

// 状态接口
interface PlatformState {
  dataSources: DataSource[];
  selectedDataSource: DataSource | null;
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: PlatformState = {
  dataSources: [],
  selectedDataSource: null,
  loading: false,
  error: null,
};

// 异步Thunk - 获取所有数据源
export const fetchDataSources = createAsyncThunk(
  'platform/fetchDataSources',
  async (_, { rejectWithValue }) => {
    try {
      return await DataSourceService.getAll();
    } catch (error) {
      return rejectWithValue('获取数据源失败');
    }
  }
);

// 异步Thunk - 获取单个数据源
export const fetchDataSourceById = createAsyncThunk(
  'platform/fetchDataSourceById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await DataSourceService.getById(id);
    } catch (error) {
      return rejectWithValue('获取数据源详情失败');
    }
  }
);

// 异步Thunk - 创建数据源
export const createDataSource = createAsyncThunk(
  'platform/createDataSource',
  async (dataSource: Partial<DataSource>, { rejectWithValue }) => {
    try {
      return await DataSourceService.create(dataSource);
    } catch (error) {
      return rejectWithValue('创建数据源失败');
    }
  }
);

// 异步Thunk - 更新数据源
export const updateDataSource = createAsyncThunk(
  'platform/updateDataSource',
  async ({ id, data }: { id: string; data: Partial<DataSource> }, { rejectWithValue }) => {
    try {
      return await DataSourceService.update(id, data);
    } catch (error) {
      return rejectWithValue('更新数据源失败');
    }
  }
);

// 异步Thunk - 删除数据源
export const deleteDataSource = createAsyncThunk(
  'platform/deleteDataSource',
  async (id: string, { rejectWithValue }) => {
    try {
      await DataSourceService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue('删除数据源失败');
    }
  }
);

// 异步Thunk - 触发同步
export const triggerDataSourceSync = createAsyncThunk(
  'platform/triggerDataSourceSync',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await SyncService.triggerSync(id);
      const status = await SyncService.getSyncStatus(id);
      return {
        id,
        status: status.status,
        lastSync: status.lastSync,
        nextSync: status.nextSync,
      };
    } catch (error) {
      return rejectWithValue('触发同步失败');
    }
  }
);

// 平台管理切片
const platformSlice = createSlice({
  name: 'platform',
  initialState,
  reducers: {
    setSelectedDataSource: (state, action: PayloadAction<DataSource | null>) => {
      state.selectedDataSource = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取所有数据源
      .addCase(fetchDataSources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDataSources.fulfilled, (state, action) => {
        state.loading = false;
        state.dataSources = action.payload;
      })
      .addCase(fetchDataSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 获取单个数据源
      .addCase(fetchDataSourceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDataSourceById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedDataSource = action.payload;
        // 更新列表中对应的数据源
        const index = state.dataSources.findIndex(ds => ds.id === action.payload.id);
        if (index >= 0) {
          state.dataSources[index] = action.payload;
        }
      })
      .addCase(fetchDataSourceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 创建数据源
      .addCase(createDataSource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDataSource.fulfilled, (state, action) => {
        state.loading = false;
        state.dataSources.push(action.payload);
        state.selectedDataSource = action.payload;
      })
      .addCase(createDataSource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 更新数据源
      .addCase(updateDataSource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDataSource.fulfilled, (state, action) => {
        state.loading = false;
        // 更新列表中的数据源
        const index = state.dataSources.findIndex(ds => ds.id === action.payload.id);
        if (index >= 0) {
          state.dataSources[index] = action.payload;
        }
        // 如果当前选中的是这个数据源，也更新它
        if (state.selectedDataSource && state.selectedDataSource.id === action.payload.id) {
          state.selectedDataSource = action.payload;
        }
      })
      .addCase(updateDataSource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 删除数据源
      .addCase(deleteDataSource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDataSource.fulfilled, (state, action) => {
        state.loading = false;
        // 从列表中移除
        state.dataSources = state.dataSources.filter(ds => ds.id !== action.payload);
        // 如果当前选中的是这个数据源，清除选中
        if (state.selectedDataSource && state.selectedDataSource.id === action.payload) {
          state.selectedDataSource = null;
        }
      })
      .addCase(deleteDataSource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // 触发同步
      .addCase(triggerDataSourceSync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(triggerDataSourceSync.fulfilled, (state, action) => {
        state.loading = false;
        // 更新数据源的同步状态
        const index = state.dataSources.findIndex(ds => ds.id === action.payload.id);
        if (index >= 0) {
          state.dataSources[index].status = 
            action.payload.status === 'syncing' 
              ? ConnectionStatus.CONNECTING 
              : ConnectionStatus.CONNECTED;
          state.dataSources[index].lastSync = action.payload.lastSync;
          state.dataSources[index].nextScheduledSync = action.payload.nextSync;
        }
        // 如果当前选中的是这个数据源，也更新它
        if (state.selectedDataSource && state.selectedDataSource.id === action.payload.id) {
          state.selectedDataSource.status = 
            action.payload.status === 'syncing' 
              ? ConnectionStatus.CONNECTING 
              : ConnectionStatus.CONNECTED;
          state.selectedDataSource.lastSync = action.payload.lastSync;
          state.selectedDataSource.nextScheduledSync = action.payload.nextSync;
        }
      })
      .addCase(triggerDataSourceSync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedDataSource, clearError } = platformSlice.actions;

export default platformSlice.reducer; 