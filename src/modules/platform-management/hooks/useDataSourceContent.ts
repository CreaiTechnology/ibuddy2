import { useState, useEffect, useCallback } from 'react';
import { DataSource, QueryParams, StandardizedData } from '../models/types';
import { useQueryDataQuery } from '../store/apiSlice';

interface UseDataSourceContentProps {
  dataSource: DataSource | null;
  initialParams?: QueryParams;
}

interface UseDataSourceContentReturn {
  data: StandardizedData | null;
  loading: boolean;
  error: any;
  params: QueryParams;
  setParams: (params: QueryParams) => void;
  refresh: () => void;
}

/**
 * Custom hook for fetching and querying data source content
 */
export const useDataSourceContent = ({
  dataSource,
  initialParams = { page: 1, limit: 20 },
}: UseDataSourceContentProps): UseDataSourceContentReturn => {
  const [params, setParams] = useState<QueryParams>(initialParams);
  
  // Query for data based on the data source and params
  const {
    data: queryData,
    isLoading,
    error,
    refetch,
  } = useQueryDataQuery(
    { sourceId: dataSource?.id || '', params },
    { skip: !dataSource?.id }
  );

  // Memoized refresh function
  const refresh = useCallback(() => {
    if (dataSource?.id) {
      refetch();
    }
  }, [dataSource?.id, refetch]);

  // Reset params when data source changes
  useEffect(() => {
    setParams(initialParams);
  }, [dataSource?.id]);

  return {
    data: queryData || null,
    loading: isLoading,
    error,
    params,
    setParams,
    refresh,
  };
};

export default useDataSourceContent; 