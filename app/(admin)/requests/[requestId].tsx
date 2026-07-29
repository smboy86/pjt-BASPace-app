import { useLocalSearchParams } from 'expo-router';
import { useRemodelRequestDetail } from '@/features/view-remodel-request-detail';
import { RemodelRequestDetailScreen } from '@/widgets/remodel-request-detail';

export default function AdminRequestDetailRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const requestId = Array.isArray(params.requestId)
    ? (params.requestId[0] ?? '')
    : (params.requestId ?? '');
  const detailQuery = useRemodelRequestDetail(requestId);

  return (
    <RemodelRequestDetailScreen
      customerName={detailQuery.data?.customerName}
      isError={detailQuery.isError}
      isLoading={detailQuery.isLoading}
      request={detailQuery.data?.request}
      role="admin"
      onRetry={() => void detailQuery.refetch()}
    />
  );
}
