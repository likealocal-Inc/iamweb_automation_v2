export enum DispatchStatus {
  INIT = '미입력', // 미입력
  CHECKING = '확인중', // 확인중
  DISPATCH_NO = '미배차', // 미배차
  DISPATCH_DONE = '배차완료', // 배차완료
  CANCEL = '취소', // 취소
  CHANGE_JINI = '지니변경',
  CHECK_CHANGE_BOOK = '예약변경확인완료',
  EXPECTED = '예정',
  WAITING = '대기중',
  DONE = '종료', //종료
}
