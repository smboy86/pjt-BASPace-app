import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { IPostcodeSearchResult, IPostcodeSearchViewProps } from '../types';

const POSTCODE_HTML = `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"
    />
    <style>
      * { box-sizing: border-box; }
      html, body, #postcode { width: 100%; height: 100%; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="postcode"></div>
    <script src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    <script>
      new kakao.Postcode({
        width: '100%',
        height: '100%',
        oncomplete: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            address: data.address,
            roadAddress: data.roadAddress,
            jibunAddress: data.jibunAddress,
            userSelectedType: data.userSelectedType,
            zonecode: data.zonecode
          }));
        }
      }).embed(document.getElementById('postcode'), { autoClose: false });
    </script>
  </body>
</html>
`;

export function PostcodeSearchView({
  onError,
  onSelected,
}: IPostcodeSearchViewProps): React.JSX.Element {
  const handleMessage = (event: WebViewMessageEvent): void => {
    try {
      onSelected(JSON.parse(event.nativeEvent.data) as IPostcodeSearchResult);
    } catch {
      onError();
    }
  };

  return (
    <WebView
      onError={onError}
      onHttpError={onError}
      onMessage={handleMessage}
      originWhitelist={['https://*']}
      source={{ html: POSTCODE_HTML, baseUrl: 'https://postcode.map.kakao.com' }}
      style={{ flex: 1 }}
    />
  );
}
