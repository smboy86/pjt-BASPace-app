import { useLocalSearchParams } from 'expo-router';
import { usePartnerRemodelRequestDetail } from '@/features/partner-request-management';
import { RemodelRequestDetailScreen } from '@/widgets/remodel-request-detail';

export default function PartnerRequestDetailRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const requestId = Array.isArray(params.requestId)
    ? (params.requestId[0] ?? '')
    : (params.requestId ?? '');
  const detailQuery = usePartnerRemodelRequestDetail(requestId);

  return (
    <RemodelRequestDetailScreen
      assignmentStatus={detailQuery.data?.assignmentStatus}
      customerName={detailQuery.data?.customerName}
      isError={detailQuery.isError}
      isLoading={detailQuery.isLoading}
      request={detailQuery.data?.request}
      role="partner"
      onRetry={() => void detailQuery.refetch()}
    />
  );
}
