import { HttpService } from '@nestjs/axios';
import { LineNumber, IamwebOrderInfo, DispatchInfo } from '@prisma/client';

import { DateUtil, MomentDate } from './date.utils';
import { GoogleSheetUtils } from './google.sheet.utils';
import { IamwebUtils } from './iamweb.utils';
import { SlackUtil, SlackAlertType } from './slack.utils';
import { LogUtil } from './log.utils';
import { TelegramUtils } from './telegram.utils';
import { IamwebOrderGoogleModel } from '../modes/iamweb.order';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AutomationDBUtils } from './automation.db.utils';
import { IamwebOrderStatus } from '../modes/iamweb.order.status';
import { DispatchStatus } from '../modes/dispatch.status';

const GOOGLE_SHEET_IAMWEB_ORDER_ID = process.env.GOOGLE_SHEET_IAMWEB_ORDER_ID;
const GOOGLE_SHEET_DISPATCH_ID = process.env.GOOGLE_SHEET_DISPATCH_ID;

// 구글 시트 이름
const GoogleSheetName = {
  iamwebOrderInfo: {
    iamwebOrder: process.env.GOOGLE_SHEET_NAME_IAMWEB_ORDER,
    iamwebOrderLog: process.env.GOOGLE_SHEET_NAME_IAMWEB_ORDER_LOG,
  },
  dispatchInfo: {
    dispatch: process.env.GOOGLE_SHEET_NAME_DISPATCH,
    dispatchLog: process.env.GOOGLE_SHEET_NAME_DISPATCH_LOG,
  },
};

// 종료 상태값
export const IamwebOrderEndStatus = [
  IamwebOrderStatus.DONE,
  IamwebOrderStatus.CANCEL,
];

type GoogleSheetRange = {
  cellNumber: number;
  start: string;
  end: string;
};

export class AutomationSchedulerUtils {
  logUtil: LogUtil;
  googleIamwebOrderUtil: GoogleSheetUtils;
  googleIamwebOrderLogUtil: GoogleSheetUtils;
  googleDispatchUtil: GoogleSheetUtils;
  googleDispatchLogUtil: GoogleSheetUtils;
  slackUtil: SlackUtil;
  iamwebUtil: IamwebUtils;
  telegramUtil: TelegramUtils;
  automationDbUtils: AutomationDBUtils;

  constructor(private readonly httpService: HttpService) {
    this.logUtil = new LogUtil();
    this.googleIamwebOrderUtil = new GoogleSheetUtils(
      GOOGLE_SHEET_IAMWEB_ORDER_ID,
      GoogleSheetName.iamwebOrderInfo.iamwebOrder,
    );
    this.googleIamwebOrderLogUtil = new GoogleSheetUtils(
      GOOGLE_SHEET_IAMWEB_ORDER_ID,
      GoogleSheetName.iamwebOrderInfo.iamwebOrderLog,
    );
    this.googleDispatchUtil = new GoogleSheetUtils(
      GOOGLE_SHEET_DISPATCH_ID,
      GoogleSheetName.dispatchInfo.dispatch,
    );
    this.googleDispatchLogUtil = new GoogleSheetUtils(
      GOOGLE_SHEET_DISPATCH_ID,
      GoogleSheetName.dispatchInfo.dispatchLog,
    );

    this.slackUtil = new SlackUtil(this.httpService);
    this.iamwebUtil = new IamwebUtils(this.httpService);
    this.telegramUtil = new TelegramUtils();
    this.automationDbUtils = new AutomationDBUtils();
  }

  /**
   * 구글시트 시작과 끝 셀 세팅
   * @param cellNum
   * @returns
   */
  __getGoogleSheetCellStartEnd(range: GoogleSheetRange) {
    return [
      `${range.start}${range.cellNumber}`,
      `${range.end}${range.cellNumber}`,
    ];
  }

  /**
   * 아임웹 라인 범위
   * @param cellNumber
   * @returns
   */
  __getIamwebOrderRange(cellNumber: number): GoogleSheetRange {
    return { cellNumber: cellNumber, start: 'B', end: 'AK' };
  }

  /**
   * 아임웹 주문 상태값 범위
   * @param cellNumber
   * @returns
   */
  __getIamwebOrderStatusRange(cellNumber: number): GoogleSheetRange {
    return { cellNumber: cellNumber, start: 'C', end: 'C' };
  }

  /**
   * 아임웹 로그 범위
   * @param cellNumber
   * @returns
   */
  __getIamwebOrderLogRange(cellNumber: number): GoogleSheetRange {
    return { cellNumber: cellNumber, start: 'B', end: 'AL' };
  }

  /**
   * 배차 라인 범위
   * @param cellNumber
   * @returns
   */
  __getDispatchRange(cellNumber: number): GoogleSheetRange {
    return { cellNumber: cellNumber, start: 'B', end: 'R' };
  }

  /**
   * 배차 로그 범위
   * @param cellNumber
   * @returns
   */
  __getDispatchLogRange(cellNumber: number): GoogleSheetRange {
    return { cellNumber: cellNumber, start: 'B', end: 'S' };
  }

  /**
   * Iamweb Order -> Json 데이터
   * @param orderData
   * @param cellNum
   * @returns
   */
  async __convertJsonDataFromIamwebOrder(
    orderData: IamwebOrderGoogleModel,
    cellNum: number,
    iamwebOrderStatus: IamwebOrderStatus,
  ): Promise<any[]> {
    const formData = orderData.form;

    const yyyy_mm_dd = new DateUtil().YYYYMMDD(orderData.order_time, '-');
    const hh_mm_dd = new DateUtil().HHMMSS(orderData.order_time, ':');

    const snsChannel = formData[0].value;
    const snsId = formData[1].value;
    const boardingPersonCount = formData[2].value;
    const boardingDate = formData[3].value;
    const boardingTime = formData[4].value;
    const airplane = formData[5].value;
    const takeOffAndLandingTime = formData[6].value;
    const etc = formData[7].value;
    const jsonNewData = [
      (cellNum - 3).toString(), // '번호'
      iamwebOrderStatus.toString(), // '상태값'
      '구입채널', // '구입채널'
      orderData.orderer.member_code, // '회원코드',
      orderData.orderer.name, //'닉네임',
      orderData.orderer.email, //'계정',
      orderData.orderer.name, //'주문자명',
      orderData.orderer.email, //'주문자 Email',
      orderData.orderer.call.toString(), // '주문자 연락처',
      orderData.order_no, //'주문번호',
      yyyy_mm_dd, //'결제일자',
      hh_mm_dd, //'결제시간',
      `${orderData.payment.total_price}(${orderData.payment.price_currency})`, //'결제금액',
      orderData.product_item.items.prod_name, // '상품명',
      orderData.product_item.items.startLocation, //'출발지 위치명',
      '출발지 위치명(관리자)',
      orderData.product_item.items.startAddress, //'출발지주소',
      '출발지주소(관리자)',
      orderData.product_item.items.endAirport, // '도착공항',
      orderData.product_item.items.endLocation, //'도착지위치명',
      '도착지위치명(관리자)',
      orderData.product_item.items.endAddress, // '도착지주소',
      '도착지주소(관리자)',
      orderData.product_item.items.startAirport, //'출발공항',
      snsChannel, //'SNS채널',
      snsId, //'SNS ID',
      boardingPersonCount, //'탐승인원',
      boardingDate, //'탑승일자',
      boardingTime, //'탑승시간',
      '(변경)탑승시간',
      airplane, //'비행편',
      takeOffAndLandingTime, //'이착륙시간',
      etc, //'기타',
      '취소사유',
      '취소일자',
      '취소시간',
    ];

    return jsonNewData;
  }

  /**
   *
   * @param orderData
   * @param cellNum
   * @param dispatchStatus
   * @returns
   */
  async __convertJsonDataFromDispatch(
    orderData: IamwebOrderGoogleModel,
    cellNum: number,
    dispatchStatus: DispatchStatus,
  ): Promise<any[]> {
    const formData = orderData.form;

    const yyyy_mm_dd = new DateUtil().YYYYMMDD(orderData.order_time, '-');
    const hh_mm_dd = new DateUtil().HHMMSS(orderData.order_time, ':');

    const productNo = orderData.product_item.items.prod_no;
    const productType: string = await this.iamwebUtil.getProductType(
      Number(productNo),
    );

    const boardingPersonCount = formData[2].value;
    const boardingDate = formData[3].value;
    const boardingTime = formData[4].value;
    const jsonNewData = [
      (cellNum - 3).toString(), // '번호'
      orderData.order_no,
      yyyy_mm_dd, //'결제일자',
      hh_mm_dd, //'결제시간',
      dispatchStatus,
      '', //취소일자
      '', //취소시간
      '라이크어로컬',
      '010-9985-9547',
      productType,
      '-',
      orderData.orderer.name, //'주문자명',
      '010-9985-9547', // 이용자 연락처,
      `${boardingDate} ${boardingTime}`, //'탑승일자', //'탑승시간',
      `${orderData.product_item.items.startLocation} ${orderData.product_item.items.startAddress}`, //'출발지 위치명' '출발지주소',
      `${orderData.product_item.items.endLocation} ${orderData.product_item.items.endAddress}`, //'도착지위치명',, // '도착지주소',
      boardingPersonCount, //'탐승인원',
    ];

    return jsonNewData;
  }

  /**
   * 구글시트라인 배열 -> 스트링으로 변환 (|로 붙입)
   * @param googleLineArr
   * @returns
   */
  async getGoogleLineArrToString(googleLineArr: string[]): Promise<string> {
    return googleLineArr.join('|');
  }

  /**
   * 아엠웹 구글시트 상태값 업데이트 -> DB업데이트 포함
   * @param prisma
   * @param iamwebOrderInfoId
   * @param newStatus
   */
  async updateGoogleSheetAndDBIamwebOrderStatus(
    prisma: PrismaService,
    iamwebOrderInfoId: number,
    newStatus: IamwebOrderStatus,
  ): Promise<IamwebOrderInfo> {
    // 주문데이터 조회
    const iamwebOrder: IamwebOrderInfo =
      await prisma.iamwebOrderInfo.findUnique({
        where: { id: iamwebOrderInfoId },
      });

    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getIamwebOrderStatusRange(iamwebOrder.googleLineNumber),
    );

    // 구글시트에 상태값 업데이트
    await this.googleIamwebOrderUtil.updateGoogleSheet(
      cellInfo[0],
      cellInfo[1],
      [[newStatus]],
    );

    // DB에 상태값 업데이트
    await prisma.iamwebOrderInfo.update({
      where: { id: iamwebOrderInfoId },
      data: { status: newStatus },
    });

    return iamwebOrder;
  }

  /**
   * 아임웹 주문 데이터 구글시트에 작성
   * @param cellNum
   * @param iamwebOrderdata
   * @param iamwebOrderStatus
   * @returns
   */
  async writeGoogleSheetIamwebOrderInfoAndGetLineString(
    cellNum: number,
    iamwebOrderdata: IamwebOrderGoogleModel,
    iamwebOrderStatus: IamwebOrderStatus,
  ): Promise<string> {
    // 아임웹 주문 데이터 -> json구조로 변경
    const iamwebOrderJsonData = await this.__convertJsonDataFromIamwebOrder(
      iamwebOrderdata,
      cellNum,
      iamwebOrderStatus,
    );

    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getIamwebOrderRange(cellNum),
    );

    await this.googleIamwebOrderUtil.updateGoogleSheet(
      cellInfo[0],
      cellInfo[1],
      [iamwebOrderJsonData],
    );

    return this.getGoogleLineArrToString(iamwebOrderJsonData);
  }

  /**
   * 배차 데이터 작성
   * @param cellNum
   * @param iamwebOrderdata
   * @param dispatchStatus
   * @returns
   */
  async writeGoogleSheetDispatchInfoAndGetLineString(
    cellNum: number,
    iamwebOrderdata: IamwebOrderGoogleModel,
    dispatchStatus: DispatchStatus,
  ): Promise<string> {
    const jsonData = await this.__convertJsonDataFromDispatch(
      iamwebOrderdata,
      cellNum,
      dispatchStatus,
    );

    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getDispatchRange(cellNum),
    );

    await this.googleDispatchUtil.updateGoogleSheet(cellInfo[0], cellInfo[1], [
      jsonData,
    ]);

    return this.getGoogleLineArrToString(jsonData);
  }

  /**
   * 배차로그에 데이터 작성
   * @param cellNum
   * @param time
   * @param iamwebOrderdata
   * @param dispatchStatus
   * @returns
   */
  async writeGoogleSheetDispatchLogAndGetLineString(
    cellNum: number,
    time: string,
    iamwebOrderdata: IamwebOrderGoogleModel,
    dispatchStatus: DispatchStatus,
  ): Promise<string> {
    const jsonData = await this.__convertJsonDataFromDispatch(
      iamwebOrderdata,
      cellNum,
      dispatchStatus,
    );

    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getDispatchRange(cellNum),
    );
    const newData = [time, ...cellInfo[0]];

    await this.googleDispatchUtil.updateGoogleSheet(cellInfo[0], cellInfo[1], [
      newData,
    ]);

    return this.getGoogleLineArrToString(jsonData);
  }

  /**
   * 아임웹 구글시트 데이터 읽기
   * @param cellNum
   * @returns
   */
  async readGoogleSheetIamwebOrderInfo(cellNum: number): Promise<any[][]> {
    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getIamwebOrderRange(cellNum),
    );

    return await this.googleIamwebOrderUtil.readGoogleSheet(
      cellInfo[0],
      cellInfo[1],
    );
  }

  /**
   * 주문 로그 시트 데이터 가져오기
   * @param cellNum
   * @returns
   */
  async readGoogleSheetIamwebOrderLogInfo(cellNum: number): Promise<any[][]> {
    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getIamwebOrderLogRange(cellNum),
    );

    return await this.googleIamwebOrderLogUtil.readGoogleSheet(
      cellInfo[0],
      cellInfo[1],
    );
  }

  /**
   * 구글시트에 아임웹 로그데이터 쓰기
   * @param cellNum
   * @param time
   * @param logData
   */
  async writeGoogleSheetIamwebOrderInfoLog(
    cellNum: number,
    time: string,
    logData: any[][],
  ): Promise<void> {
    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getIamwebOrderLogRange(cellNum),
    );

    const newData = [[time, ...logData[0]]];

    await this.googleIamwebOrderLogUtil.updateGoogleSheet(
      cellInfo[0],
      cellInfo[1],
      newData,
    );
  }

  /**
   * 배차로그 구글시트 작성
   * @param cellNum
   * @param time
   * @param logData
   */
  async writeGoogleSheetDispatchLog(
    cellNum: number,
    time: string,
    logData: any[][],
  ): Promise<void> {
    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getDispatchLogRange(cellNum),
    );

    const newData = [[time, ...logData[0]]];

    await this.googleDispatchLogUtil.updateGoogleSheet(
      cellInfo[0],
      cellInfo[1],
      newData,
    );
  }

  /**
   * 주문 로그 시트 데이터 가져오기
   * @param cellNum
   * @returns
   */
  async readGoogleSheetDispatchInfo(cellNum: number): Promise<any[][]> {
    const cellInfo: string[] = this.__getGoogleSheetCellStartEnd(
      this.__getDispatchRange(cellNum),
    );

    return await this.googleDispatchUtil.readGoogleSheet(
      cellInfo[0],
      cellInfo[1],
    );
  }

  /**
   * 새로운 주문에 대한 알림 메세지
   * @param newCellNum
   * @param orderData
   */
  async sendMessageNewOrder(
    newCellNum: number,
    orderData: IamwebOrderGoogleModel,
  ) {
    await this.slackUtil.send(
      SlackAlertType.IAMWEB_ORDER,
      `New Order[sheet_no:${newCellNum}, order_no:${orderData.order_no}]`,
    );
  }

  /**
   * 변경 데이터에 대한 알림
   * @param data
   * @param orderDBData
   */
  async sendSlack(type: string, logString: string) {
    // 슬랙 전송
    this.slackUtil.send(type, logString);
  }

  /**
   * 텔레그렘 전송
   * @param msg
   */
  async sendTelegram(msg: string) {
    // 텔레그램 전송
    this.telegramUtil.send(
      Number.parseInt(process.env.TELEGRAM_BOT_CHAT_ID.toString()),
      msg,
    );
  }

  /**
   * 아임웹 로그데이터 쓰기
   * @param prisma
   * @param lineData
   * @param orderData
   */
  async saveIamwebOrderLog(
    prisma: PrismaService,
    lineData: any[][],
    logString: string,
    time: string,
    fileName: string,
  ) {
    await this.logUtil.save(logString, fileName);

    const lineNumber: LineNumber = await this.automationDbUtils.getLineNumber(
      prisma,
    );

    lineNumber.iamwebOrderInfoLogLineNumber++;

    await this.writeGoogleSheetIamwebOrderInfoLog(
      lineNumber.iamwebOrderInfoLogLineNumber,
      time,
      lineData,
    );

    await this.automationDbUtils.setLineNumber(prisma, lineNumber);
  }

  /**
   * 아임웹 로그데이터 쓰기
   * @param prisma
   * @param lineData
   * @param orderData
   */
  async saveDispatchLog(
    prisma: PrismaService,
    lineData: any[][],
    logString: string,
    time: string,
    fileName: string,
  ) {
    // 로그파일 작성
    await this.logUtil.save(logString, fileName);

    const lineNumber: LineNumber = await this.automationDbUtils.getLineNumber(
      prisma,
    );

    lineNumber.dispatchInfoLogLineNumber++;

    await this.writeGoogleSheetDispatchLog(
      lineNumber.dispatchInfoLogLineNumber,
      time,
      lineData,
    );

    await this.automationDbUtils.setLineNumber(prisma, lineNumber);
  }

  /**
   *
   * @param prisma
   * @param iamwebOrderList
   * @returns
   */
  async getNewDispatchRequestList(
    prisma: PrismaService,
    iamwebOrderList: IamwebOrderInfo[],
  ) {
    const newDispatchRequestList: IamwebOrderInfo[] = [];

    for (let index = 0; index < iamwebOrderList.length; index++) {
      const iamwebOrder = iamwebOrderList[index];
      const iamwebId = iamwebOrder.id;

      // 배차 데이터에 배차요청
      const dispatchInfo: DispatchInfo =
        await this.automationDbUtils.getDispatchWithIamwebId(prisma, iamwebId);

      if (dispatchInfo === undefined || dispatchInfo === null) {
        newDispatchRequestList.push(iamwebOrder);
      }
    }
    return newDispatchRequestList;
  }

  /**
   * 배차 시트에 새로운 데이터 추가시 알림 전송
   * @param dispatchInfoLineNumber
   * @param dispatchStringData
   */
  async alertForNewDispatch(
    dispatchInfoLineNumber: number,
    dispatchStringData: string,
  ) {
    const logString = `배차요청등록: ${dispatchInfoLineNumber}:${dispatchStringData}`;

    // 텔레그램 전송
    this.sendTelegram(logString);

    // 알림 전송
    await this.sendSlack(SlackAlertType.ORDER_DISPATCH_DATA_CHANGE, logString);
  }

  /**
   * 배차 데이터 변경에 대한 로그 및 알람 전송
   * @param prisma
   * @param oldData
   * @param newData
   * @param lineNewData
   * @param dispatchGoogleSheetLine
   */
  async logAndAlertForDispatch(
    prisma: PrismaService,
    oldData: string,
    newData: string,
    lineNewData: any[][],
    dispatchGoogleSheetLine: number,
  ) {
    const time = MomentDate.nowString('YYYY/MM/DD hh:mm:ss');

    const logString = '[' + time + ']\r\nOLD:' + oldData + '\r\nNEW:' + newData;

    // 알림 전송
    await this.sendSlack(SlackAlertType.ORDER_DISPATCH_DATA_CHANGE, logString);

    // 로그파일 저장
    await this.saveDispatchLog(
      prisma,
      lineNewData,
      logString,
      time,
      `LOG_DISPATCH_${dispatchGoogleSheetLine}.log`,
    );
  }

  async dispatchChangeStatus(
    prisma: PrismaService,
    iamwebOrderInfoId: number,
    newStatus: string,
  ) {
    let newIamwebOrderStatus: IamwebOrderStatus; // 미배차 -> 배차실패

    // 미배차 -> 배차실패
    if (newStatus === DispatchStatus.DISPATCH_NO) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_FAIL;
    }
    // 배차완료 ->  배차완료
    else if (newStatus === DispatchStatus.DISPATCH_DONE) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_DONE;
    }

    // 구글시트와 DB에 상태값 업데이트
    const iamwebOrder = await this.updateGoogleSheetAndDBIamwebOrderStatus(
      prisma,
      iamwebOrderInfoId,
      newIamwebOrderStatus,
    );

    const changeStatusLog = `상태값변경\r\n[${iamwebOrder.googleLineNumber}] : ${newStatus}`;

    await this.sendSlack(
      SlackAlertType.ORDER_DISPATCH_DATA_CHANGE,
      changeStatusLog,
    );
  }
}
