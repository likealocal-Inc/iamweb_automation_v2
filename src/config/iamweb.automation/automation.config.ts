export const AutomationConfig = {
  googleSheet: {
    iamweb: {
      range: {
        order: {
          start: 'B',
          end: 'AK',
        },
        log: {
          start: 'B',
          end: 'AL',
        },
        status: {
          start: 'C',
          end: 'C',
        },
      },
    },
    dispatch: {
      range: {
        order: {
          start: 'B',
          end: 'R',
        },
        log: {
          start: 'B',
          end: 'S',
        },
      },
    },
  },
  files: {
    log: {
      iamweb: { path: './files/iamweb', name: 'IAMWEBORDER' },
      dispatch: { path: './files/dispatch', name: 'DISPATCH' },
    },
  },
  iamwebProductID: {
    privateTaxi: 133,
    pickup: 83,
    sanding: 122,
    tPrivateTaxi: 148,
    tPickup: 146,
    tSanding: 147,
  },
  iamwebApi: {
    responseCodeList: [
      { CODE: -1, DESC: '잘못된 API 키 또는 시크릿' },
      { CODE: -2, DESC: '잘못된 액세스 토큰으로 접근' },
      { CODE: -5, DESC: '권한 오류' },
      {
        CODE: -6,
        DESC: '이용 버전 권한 오류 ( 보통 버전별 제한에 걸릴 때 발생)',
      },
      { CODE: -7, DESC: '요청횟수 초과' },
      {
        CODE: -10,
        DESC: '잘못된 파라미터 또는 호출 인자가 잘못되었거나 필수 인자가 포함되지 않은 경우',
      },
      { CODE: -11, DESC: '요청 데이터가 존재하지 않는 경우' },
      { CODE: -19, DESC: '내부 처리 오류' },
      { CODE: -98, DESC: '존재하지 않는 서비스로 요청' },
      { CODE: -99, DESC: '존재하지 않는 메소드로 요청' },
      { CODE: -999, DESC: '서비스 점검중' },
      { CODE: 200, DESC: 'Success' },
    ],
    codeCheck: (code: number) => {
      for (
        let index = 0;
        index < AutomationConfig.iamwebApi.responseCodeList.length;
        index++
      ) {
        const temp = AutomationConfig.iamwebApi.responseCodeList[index];
        if (temp.CODE === code) {
          return temp.DESC;
        }
      }
    },
  },
};
