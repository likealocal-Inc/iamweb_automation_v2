import { HttpService } from '@nestjs/axios';
import { IamwebOrderInfo, DispatchInfo, LineNumber } from '@prisma/client';

import { GoogleSheetUtils } from '../core/google.sheet.utils';
import { IamwebUtils } from './iamweb.utils';
import { SlackUtil, SlackAlertType } from '../core/slack.utils';
import { LogFileUtil } from '../core/logfile.utils';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AutomationDBUtils } from './automation.db.utils';
import { IamwebOrderStatus } from '../modes/iamweb.order.status';
import { DispatchStatus } from '../modes/dispatch.status';
import { AutomationConfig } from '../../config/iamweb.automation/automation.config';
import { AutomationDataConvert } from './automation.data.convert';
import { AutomationSchedulerUtils } from './automation.scheduler.utils';
import { AutomationIamwebOrderUtils } from './automation.iamweborder.utils';

/**
 *
 */
export class AutomationDispatchUtils {
  logUtil: LogFileUtil;
  googleDispatchUtil: GoogleSheetUtils;
  slackUtil: SlackUtil;
  iamwebUtil: IamwebUtils;
  automationDbUtils: AutomationDBUtils;
  automationSchedulerUtils: AutomationSchedulerUtils;
  googleDispatchLogUtil: GoogleSheetUtils;

  constructor(private readonly httpService: HttpService) {
    this.logUtil = new LogFileUtil();

    this.googleDispatchUtil = new GoogleSheetUtils(
      AutomationConfig.googleSheet.getGoogleSheetDispatchId(),
      AutomationConfig.googleSheet.googleSheetName.dispatchInfo.dispatch(),
    );

    this.googleDispatchLogUtil = new GoogleSheetUtils(
      AutomationConfig.googleSheet.getGoogleSheetDispatchId(),
      AutomationConfig.googleSheet.googleSheetName.dispatchInfo.dispatchLog(),
    );

    this.automationSchedulerUtils = new AutomationSchedulerUtils(
      this.httpService,
    );

    this.slackUtil = new SlackUtil(this.httpService);
    this.iamwebUtil = new IamwebUtils(this.httpService);
    this.automationDbUtils = new AutomationDBUtils();
  }

  /**
   *
   * @param prisma
   * @param iamwebOrderList
   * @returns
   */
  async __getNewDispatchRequestList(
    prisma: PrismaService,
    iamwebOrderList: IamwebOrderInfo[],
  ): Promise<IamwebOrderInfo[]> {
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
   * 구글 시트 읽기
   * @param cellNum
   * @returns
   */
  async readGoogleSheetDispatchInfo(cellNum: number): Promise<any[][]> {
    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          cellNum,
          AutomationConfig.googleSheet.dispatch.range.order,
        ),
      );

    return await this.googleDispatchUtil.readGoogleSheet(
      cellInfo[0],
      cellInfo[1],
    );
  }

  /**
   * 배차 시트에 새로운 데이터 추가시 알림 전송
   * @param dispatchInfoLineNumber
   * @param dispatchStringData
   */
  async alertForNewDispatch(
    dispatchInfoLineNumber: number,
    dispatchStringData: string,
  ): Promise<void> {
    const alertMessage = await AutomationConfig.alert.makeRequestDispatch(
      await AutomationConfig.alert.getAlertTime(),
      dispatchInfoLineNumber,
      dispatchStringData,
    );

    // 텔레그램 전송
    this.automationSchedulerUtils.sendTelegram(alertMessage);

    // 알림 전송
    await this.automationSchedulerUtils.sendSlack(
      SlackAlertType.ORDER_DISPATCH_DATA_CHANGE,
      alertMessage,
    );
  }

  /**
   * 배차 시트에 작성해야 하는 주문데이터 조회
   * @param prisma
   * @returns
   */
  async getDispatchRequestList(
    prisma: PrismaService,
  ): Promise<IamwebOrderInfo[]> {
    const iamwebOrderList: IamwebOrderInfo[] =
      await this.automationDbUtils.getIamwebOrderWithStatus(
        prisma,
        IamwebOrderStatus.DISPATCH_REQUEST,
      );

    // 주문시트에서 작성된 배차요청이 아직 배차구글시트에 작성이 안된것만 모은다
    const newDispatchRequestList: IamwebOrderInfo[] =
      await this.__getNewDispatchRequestList(prisma, iamwebOrderList);

    return newDispatchRequestList;
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
    iamwebOrderdata: string,
    dispatchStatus: DispatchStatus,
  ): Promise<string> {
    const jsonDispatchData =
      await new AutomationDataConvert().convertDispathFromIamwebOrderStringToJson(
        iamwebOrderdata,
        cellNum,
        dispatchStatus,
      );

    // 작성할 셀 범위
    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          cellNum,
          AutomationConfig.googleSheet.dispatch.range.order,
        ),
      );

    // 구글시트에 업데이트
    await this.googleDispatchUtil.updateGoogleSheet(cellInfo[0], cellInfo[1], [
      jsonDispatchData,
    ]);

    return this.automationSchedulerUtils.getGoogleLineArrToString(
      jsonDispatchData,
    );
  }

  /**
   * 배차 상태값 변경처리
   * @param prisma
   * @param iamwebOrderInfoId
   * @param newStatus
   */
  async dispatchChangeStatus(
    prisma: PrismaService,
    iamwebOrderInfoId: number,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    // 해당 주문데이터가 배치에 있는지 확인
    const dispatchList: DispatchInfo[] = await prisma.dispatchInfo.findMany({
      where: { iamwebOrderInfoId: iamwebOrderInfoId },
    });
    if (dispatchList.length === 0) return;

    // 배차에 해당 데이터가 없으면 아무일 없음
    if (dispatchList.length === 0) return;

    let newIamwebOrderStatus: IamwebOrderStatus;

    // 미배차 -> 배차실패
    if (newStatus === DispatchStatus.DISPATCH_NO) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_FAIL;
    }
    // 배차완료 ->  배차완료
    else if (newStatus === DispatchStatus.DISPATCH_DONE) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_DONE;
    }
    // 취소 -> 취소완료
    else if (newStatus === DispatchStatus.CANCEL) {
      newIamwebOrderStatus = IamwebOrderStatus.CANCEL;
    }
    // 종료 -> 전체완료
    else if (newStatus === DispatchStatus.DONE) {
      newIamwebOrderStatus = IamwebOrderStatus.DONE;
    }
    // 지니변경 -> 배차변경
    else if (newStatus === DispatchStatus.CHANGE_JINI) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_CHANGE;
    }
    // 예약변경확인완료 -> 배차변경
    else if (newStatus === DispatchStatus.CHECK_CHANGE_BOOK) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_CHANGE;
    }
    // 예정 -> 배차변경
    else if (newStatus === DispatchStatus.EXPECTED) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_CHANGE;
    }
    // 대기중 -> 배차변경
    else if (newStatus === DispatchStatus.WAITING) {
      newIamwebOrderStatus = IamwebOrderStatus.DISPATCH_CHANGE;
    }

    // 구글시트와 DB에 상태값 업데이트
    const iamwebOrder = await new AutomationIamwebOrderUtils(
      this.httpService,
    ).updateGoogleSheetAndDBIamwebOrderStatus(
      prisma,
      iamwebOrderInfoId,
      newIamwebOrderStatus,
    );

    // 상태값 변경 메세지 생성
    const changeStatusLog = await AutomationConfig.alert.makeChangeStatus(
      await AutomationConfig.alert.getAlertTime(),
      iamwebOrder.googleLineNumber,
      oldStatus,
      newStatus,
    );

    // 슬랙 전송
    await this.automationSchedulerUtils.sendSlack(
      SlackAlertType.ORDER_DISPATCH_DATA_CHANGE,
      changeStatusLog,
    );
  }

  /**
   * 배차시트 상태값 변경
   * @param prisma
   * @param iamwebDBId
   * @param oldStatus
   * @param newStatus
   */
  async changeDispatchStatus(
    prisma: PrismaService,
    iamwebDBId: number,
    newStatus: string,
  ) {
    const dispatchInfo: DispatchInfo = await prisma.dispatchInfo.findFirst({
      where: { iamwebOrderInfoId: iamwebDBId },
    });

    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          dispatchInfo.googleLineNumber,
          AutomationConfig.googleSheet.dispatch.range.status,
        ),
      );

    this.googleDispatchUtil.updateGoogleSheet(cellInfo[0], cellInfo[1], [
      [newStatus],
    ]);
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
  ): Promise<void> {
    const time = await AutomationConfig.alert.getAlertTime();

    const logString = await AutomationConfig.alert.makeMessage(
      time,
      oldData,
      newData,
    );

    // 알림 전송
    await this.automationSchedulerUtils.sendSlack(
      SlackAlertType.ORDER_DISPATCH_DATA_CHANGE,
      logString,
    );

    // 텔레그램에 전송
    await this.automationSchedulerUtils.sendTelegram(logString);

    // 로그파일 저장
    await this.saveDispatchLog(
      prisma,
      lineNewData,
      logString,
      time,
      await AutomationConfig.files.log.dispatch.getLogFileName(
        dispatchGoogleSheetLine,
      ),
    );
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
  ): Promise<void> {
    // 로그파일 작성
    await this.logUtil.save(
      AutomationConfig.files.log.dispatch.path,
      fileName,
      logString,
    );

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
    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          cellNum,
          AutomationConfig.googleSheet.dispatch.range.log,
        ),
      );

    const newData = [[time, ...logData[0]]];

    await this.googleDispatchLogUtil.updateGoogleSheet(
      cellInfo[0],
      cellInfo[1],
      newData,
    );
  }
}
