export interface IPostcodeSearchResult {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: 'R' | 'J';
  zonecode: string;
}

export interface IPostcodeSearchViewProps {
  onError: () => void;
  onSelected: (result: IPostcodeSearchResult) => void;
}
