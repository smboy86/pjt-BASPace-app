export interface IConstructionTypeCostSetting {
  amountManwon: number;
  code: 'DEMOLITION';
  updatedAt: string;
  updatedBy?: string;
}

export interface IUpdateDemolitionCostInput {
  amountManwon: number;
}
