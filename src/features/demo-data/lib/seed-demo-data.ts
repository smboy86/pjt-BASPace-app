import { ECatalogItemCategory, useCatalogItemStore } from '@/entities/catalog-item';
import { EPartnerApprovalStatus, usePartnerStore } from '@/entities/partner';
import {
  ERemodelRequestStatus,
  ERemodelScope,
  ESelectionDecision,
  useRemodelRequestStore,
} from '@/entities/remodel-request';
import {
  EConsultationMessageType,
  useRequestConsultationStore,
} from '@/features/request-consultation';

const now = new Date().toISOString();

export const seedDemoData = (): void => {
  const catalogStore = useCatalogItemStore.getState();
  const partnerStore = usePartnerStore.getState();
  const requestStore = useRemodelRequestStore.getState();
  const consultationStore = useRequestConsultationStore.getState();

  if (catalogStore.items.length === 0) {
    catalogStore.createItem({
      category: ECatalogItemCategory.TOILET,
      brand: '대림바스',
      name: '스마트 일체형 양변기',
      description: '청소가 쉬운 일체형 디자인',
      basePrice: 680000,
      options: [{ id: 'bidet', name: '비데 기능', priceDelta: 220000, isActive: true }],
      isActive: true,
    });
    catalogStore.createItem({
      category: ECatalogItemCategory.TILE,
      brand: 'BASpace Select',
      name: '웜 스톤 패널',
      description: '따뜻한 샌드 톤의 방수 벽 패널',
      basePrice: 420000,
      options: [{ id: 'anti-slip', name: '미끄럼 방지 바닥', priceDelta: 120000, isActive: true }],
      isActive: true,
    });
    catalogStore.createItem({
      category: ECatalogItemCategory.DESIGN_PACKAGE,
      brand: 'BASpace',
      name: '코지 내추럴',
      description: '부드러운 스톤과 우드 톤의 균형',
      basePrice: 0,
      options: [],
      isActive: true,
    });
  }

  if (partnerStore.partners.length === 0) {
    partnerStore.createPartner({
      companyName: '그린바스 성동점',
      contactName: '박시공',
      serviceRegions: ['서울 성동구', '서울 광진구'],
      serviceTypes: ['전체 리모델링', '부분 리모델링'],
      approvalStatus: EPartnerApprovalStatus.APPROVED,
    });
  }

  if (requestStore.requests.length === 0) {
    const request = requestStore.createRequest({
      customerId: 'customer-1',
      region: '서울 성동구',
      housingType: '아파트',
      bathroomType: '공용 욕실',
      estimatedSize: '약 3㎡',
      hasBathtub: false,
      requiresDemolition: true,
      budgetRange: '300~500만원',
      desiredSchedule: '2개월 이내',
      scope: ERemodelScope.FULL,
      priorities: ['디자인', '수납', '청소 편의'],
      notes: '호텔처럼 차분한 분위기를 원하며, 물때가 잘 보이지 않는 소재를 선호합니다.',
      photos: [],
      selections: [
        {
          id: 'selection-toilet',
          category: '변기',
          itemName: '상담 후 결정',
          selectedOptionIds: [],
          selectedOptionNames: [],
          decisionStatus: ESelectionDecision.CONSULTATION_REQUIRED,
        },
        {
          id: 'selection-tile',
          category: '벽·바닥',
          itemName: '웜 스톤 패널',
          selectedOptionIds: [],
          selectedOptionNames: [],
          basePriceSnapshot: 420000,
          decisionStatus: ESelectionDecision.SELECTED,
        },
      ],
    });
    requestStore.updateRequest(request.id, {
      status: ERemodelRequestStatus.MATCHED,
      submittedAt: now,
    });
    const partner = partnerStore.partners[0];
    if (partner) {
      partnerStore.assignPartner(request.id, partner.id);
    }
    consultationStore.addMessage({
      requestId: request.id,
      authorId: 'admin-1',
      messageType: EConsultationMessageType.GENERAL,
      body: '요청 내용을 확인해 그린바스 성동점과 연결했습니다.',
    });
  }
};
