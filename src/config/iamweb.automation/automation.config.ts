import { DispatchStatus } from '../../libs/modes/dispatch.status';
import { DateUtil } from '../../libs/core/date.utils';
export const AutomationConfig = {
  sign: {
    // 배열 -> 스트링 변환시 구분자
    arrToStrDelim: '|',
  },
  // 구글시트 관련 설정
  googleSheet: {
    getGoogleSheetIamwebOrderId: () => process.env.GOOGLE_SHEET_IAMWEB_ORDER_ID,
    getGoogleSheetDispatchId: () => process.env.GOOGLE_SHEET_DISPATCH_ID,
    GoogleSheetName: {
      iamwebOrderInfo: {
        getIamwebOrder: () => process.env.GOOGLE_SHEET_NAME_IAMWEB_ORDER,
        getIamwebOrderLog: () => process.env.GOOGLE_SHEET_NAME_IAMWEB_ORDER_LOG,
      },
      dispatchInfo: {
        dispatch: () => process.env.GOOGLE_SHEET_NAME_DISPATCH,
        dispatchLog: () => process.env.GOOGLE_SHEET_NAME_DISPATCH_LOG,
      },
    },
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
          arrIndex: 1,
        },
      },
    },
    dispatch: {
      range: {
        order: {
          start: 'B',
          end: 'Y',
        },
        log: {
          start: 'B',
          end: 'S',
        },
        status: {
          start: 'R',
          end: 'R',
          arrIndex: 16,
        },
      },
    },
  },
  // 파일 처리 관련 설정
  files: {
    log: {
      iamweb: { path: './files/iamweb', name: 'IAMWEBORDER' },
      dispatch: { path: './files/dispatch', name: 'DISPATCH' },
    },
  },
  // 아임웹 상품 아이디
  iamwebProductID: {
    privateTaxi: 133,
    pickup: 83,
    sanding: 122,
    tPrivateTaxi: 148,
    tPickup: 146,
    tSanding: 147,
  },
  // 아임웨 API 설정
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
    responseCodeCheck: (code: number) => {
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
  // 배차 종료 상태값
  dispachFinishStatus: [DispatchStatus.CANCEL, DispatchStatus.DONE],

  alert: {
    // 알림에 들어 갈 시간
    getAlertTime: async (): Promise<string> => {
      return new DateUtil().nowString('YYYY/MM/DD hh:mm:ss');
    },
    makeNewIamwebOrder: async (
      newCellNum: number,
      orderNo: number,
    ): Promise<string> => {
      return `New Order[sheet_no:${newCellNum}, order_no:${orderNo}]`;
    },
    // 배차요청 등록
    makeRequestDispatch: async (
      time: string,
      dispatchGoogleLineNumber: number,
      data: string,
    ): Promise<string> => {
      return `배차요청등록: [${time}] [${dispatchGoogleLineNumber}]:${data}`;
    },
    // 상태값 변경
    makeChangeStatus: async (
      time: string,
      googleLineNumber: number,
      oleStatus: string,
      newStatus: string,
    ): Promise<string> => {
      return `상태값변경\r\n[${time}] [${googleLineNumber}] : ${oleStatus} -> ${newStatus}`;
    },
    // 알림 메세지
    makeMessage: async (
      time: string,
      oldData: string,
      newData: string,
    ): Promise<string> => {
      return `[${time}]\r\nOLD: ${oldData} \r\nNEW: ${newData}`;
    },
  },
  // 로그파일 처리
  logfile: {
    // 배치 로그파일 이름
    makeDispatchFileName: async (lineNumber: number): Promise<string> => {
      return `LOG_${AutomationConfig.files.log.dispatch.name}_${lineNumber}.log`;
    },
    makeIamwebFileName: async (lineNumber: number): Promise<string> => {
      return `LOG_${AutomationConfig.files.log.iamweb.name}_${lineNumber}.log`;
    },
  },
};
