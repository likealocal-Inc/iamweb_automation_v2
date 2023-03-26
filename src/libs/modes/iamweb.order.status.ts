export enum IamwebOrderStatus {
  RECEIPT = '접수', // 사용자 접수 직후, 시스템 기본값
  DISPATCH_REQUEST = '배차요청', // 관리자 정보이상없음 확인, 배차요청
  DISPATCH_DONE = '배차완료', // 배차요청 시트, 배차완료시 자동변경
  DISPATCH_SEND = '전송완료', // 배차정보 고객 전송 후 선택
  DONE = '전체완료', // 배차정보 고객 확인 완료 후 선택
  INFO_ERROR = '정보오류', // 관리자 정보 문제있음, 확인중
  DISPATCH_FAIL = '배차실패', // 배차요청시트, 미배치시 자동변경
  CANCEL = '취소완료', // 배차실패 또는 정보오류 시 취소처리
  DISPATCH_CHANGE = '배차변경', // 고객 배차 시간 변경에 따른 관리자 임의 입력 또는 진모빌리티 배차정보변경
}
