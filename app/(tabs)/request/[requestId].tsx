import { useLocalSearchParams } from 'expo-router';
import { useRemodelRequestStore } from '@/entities/remodel-request';
import { useAuthSession } from '@/features/auth';
import { useRemodelRequestDetail } from '@/features/view-remodel-request-detail';
import { RemodelRequestDetailScreen } from '@/widgets/remodel-request-detail';
import { goBackOrCustomerHome } from '@shared/lib';

export default function CustomerRequestDetailRoute(): React.JSX.Element {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const requestId = Array.isArray(params.requestId)
    ? (params.requestId[0] ?? '')
    : (params.requestId ?? '');
  const { user } = useAuthSession();
  const detailQuery = useRemodelRequestDetail(requestId);
  const localRequest = useRemodelRequestStore((state) =>
    state.requests.find((item) => item.id === requestId && item.customerId === user?.id),
  );
  const request = detailQuery.data?.request ?? localRequest;

  return (
    <RemodelRequestDetailScreen
      customerName={detailQuery.data?.customerName ?? user?.name ?? undefined}
      isError={detailQuery.isError}
      isLoading={detailQuery.isLoading}
      request={request}
      role="customer"
      onBack={goBackOrCustomerHome}
      onRetry={() => void detailQuery.refetch()}
    />
  );
}
