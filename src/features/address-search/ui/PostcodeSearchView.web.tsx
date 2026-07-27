import { createElement, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { IPostcodeSearchResult, IPostcodeSearchViewProps } from '../types';

const POSTCODE_SCRIPT_ID = 'kakao-postcode-script';
const POSTCODE_SCRIPT_URL = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

interface IKakaoPostcodeConstructor {
  new (options: {
    height: string;
    oncomplete: (result: IPostcodeSearchResult) => void;
    width: string;
  }): {
    embed: (element: HTMLDivElement, options: { autoClose: boolean }) => void;
  };
}

declare global {
  interface Window {
    kakao?: {
      Postcode: IKakaoPostcodeConstructor;
    };
  }
}

const containerStyle: CSSProperties = {
  flex: 1,
  height: '100%',
  minHeight: 420,
  width: '100%',
};

export function PostcodeSearchView({
  onError,
  onSelected,
}: IPostcodeSearchViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const embedPostcode = (): void => {
      if (!active || !containerRef.current || !window.kakao?.Postcode) return;
      containerRef.current.replaceChildren();
      new window.kakao.Postcode({
        width: '100%',
        height: '100%',
        oncomplete: onSelected,
      }).embed(containerRef.current, { autoClose: false });
    };

    if (window.kakao?.Postcode) {
      embedPostcode();
      return () => {
        active = false;
      };
    }

    const existingScript = document.getElementById(POSTCODE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement('script');
    script.id = POSTCODE_SCRIPT_ID;
    script.src = POSTCODE_SCRIPT_URL;
    script.async = true;
    script.addEventListener('load', embedPostcode);
    script.addEventListener('error', onError);
    if (!existingScript) document.head.appendChild(script);

    return () => {
      active = false;
      script.removeEventListener('load', embedPostcode);
      script.removeEventListener('error', onError);
    };
  }, [onError, onSelected]);

  return createElement('div', { ref: containerRef, style: containerStyle });
}
