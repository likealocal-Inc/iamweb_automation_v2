import { HttpService } from '@nestjs/axios';

import { GoogleSheetUtils } from '../core/google.sheet.utils';
import { SlackAlertType, SlackUtil } from '../core/slack.utils';
import { LogUtil } from '../core/logfile.utils';
import { IamwebOrderGoogleModel } from '../modes/iamweb.order';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AutomationDBUtils } from './automation.db.utils';
import { IamwebOrderStatus } from '../modes/iamweb.order.status';
import { AutomationConfig } from '../../config/iamweb.automation/automation.config';
import { AutomationDataConvert } from './automation.data.convert';
import { AutomationSchedulerUtils } from './automation.scheduler.utils';
import { IamwebOrderInfo, LineNumber } from '@prisma/client';
import { DispatchStatus } from '../modes/dispatch.status';
import { AutomationDispatchUtils } from './automation.dispatch.utils';

export class AutomationIamwebOrderUtils {
  logUtil: LogUtil;
  googleIamwebOrderUtil: GoogleSheetUtils;
  googleIamwebOrderLogUtil: GoogleSheetUtils;
  slackUtil: SlackUtil;
  automationDbUtils: AutomationDBUtils;
  automationSchedulerUtils: AutomationSchedulerUtils;

  constructor(private readonly httpService: HttpService) {
    this.logUtil = new LogUtil();
    this.googleIamwebOrderUtil = new GoogleSheetUtils(
      AutomationConfig.googleSheet.getGoogleSheetIamwebOrderId(),
      AutomationConfig.googleSheet.googleSheetName.iamwebOrderInfo.getIamwebOrder(),
    );

    this.googleIamwebOrderLogUtil = new GoogleSheetUtils(
      AutomationConfig.googleSheet.getGoogleSheetIamwebOrderId(),
      AutomationConfig.googleSheet.googleSheetName.iamwebOrderInfo.getIamwebOrderLog(),
    );

    this.automationSchedulerUtils = new AutomationSchedulerUtils(
      this.httpService,
    );

    this.slackUtil = new SlackUtil(this.httpService);
    this.automationDbUtils = new AutomationDBUtils();
  }

  /**
   * 구글시트에 아임웹 로그데이터 쓰기
   * @param cellNum
   * @param time
   * @param logData
   */
  async __writeGoogleSheetIamwebOrderInfoLog(
    cellNum: number,
    time: string,
    logData: any[][],
  ): Promise<void> {
    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          cellNum,
          AutomationConfig.googleSheet.iamweb.range.log,
        ),
      );

    const newData = [[time, ...logData[0]]];

    await this.googleIamwebOrderLogUtil.updateGoogleSheet(
      cellInfo[0],
      cellInfo[1],
      newData,
    );
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
    const iamwebOrderJsonData =
      await new AutomationDataConvert().convertIamwebOrderFromIamwebOrderModelToJson(
        iamwebOrderdata,
        cellNum,
        iamwebOrderStatus,
      );

    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          cellNum,
          AutomationConfig.googleSheet.iamweb.range.order,
        ),
      );

    await this.googleIamwebOrderUtil.updateGoogleSheet(
      cellInfo[0],
      cellInfo[1],
      [iamwebOrderJsonData],
    );

    return this.automationSchedulerUtils.getGoogleLineArrToString(
      iamwebOrderJsonData,
    );
  }

  /**
   * 새로운 주문에 대한 알림 메세지
   * @param newCellNum
   * @param orderData
   */
  async alserNewOrder(
    newCellNum: number,
    orderData: IamwebOrderGoogleModel,
  ): Promise<void> {
    await this.slackUtil.send(
      SlackAlertType.IAMWEB_ORDER,
      await AutomationConfig.alert.makeNewIamwebOrder(
        newCellNum,
        orderData.order_no,
      ),
    );
  }

  /**
   * 상태값 변경 알람
   * @param time
   * @param googleLineNumber
   * @param oldStatus
   * @param newStatus
   */
  async alertChangeStatus(
    time: string,
    googleLineNumber: number,
    oldStatus: string,
    newStatus: string,
  ): Promise<string> {
    // 상태 변경 알림 메세지
    const changeStatusLog = await AutomationConfig.alert.makeChangeStatus(
      time,
      googleLineNumber,
      oldStatus,
      newStatus,
    );

    await this.automationSchedulerUtils.sendSlack(
      SlackAlertType.IAMWEB_ORDER,
      changeStatusLog,
    );

    return changeStatusLog;
  }

  /**
   * 데이터 변경 알림
   * @param time
   * @param oldData
   * @param newData
   */
  async alertChangeData(
    time: string,
    oldData: string,
    newData: string,
  ): Promise<string> {
    // 알림 메세지 생성
    const alertMessage = await AutomationConfig.alert.makeMessage(
      time,
      oldData,
      newData,
    );

    // 알림 전송
    await this.automationSchedulerUtils.sendSlack(
      SlackAlertType.IAMWEB_ORDER,
      alertMessage,
    );

    return alertMessage;
  }

  /**
   * 아임웹 구글시트 데이터 읽기
   * @param cellNum
   * @returns
   */
  async readGoogleSheetIamwebOrderInfo(cellNum: number): Promise<any[][]> {
    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          cellNum,
          AutomationConfig.googleSheet.iamweb.range.order,
        ),
      );

    return await this.googleIamwebOrderUtil.readGoogleSheet(
      cellInfo[0],
      cellInfo[1],
    );
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
    newStatus: string,
  ): Promise<IamwebOrderInfo> {
    // 주문데이터 조회
    const iamwebOrder: IamwebOrderInfo =
      await prisma.iamwebOrderInfo.findUnique({
        where: { id: iamwebOrderInfoId },
      });

    const cellInfo: string[] =
      await this.automationSchedulerUtils.getGoogleSheetCellStartEnd(
        await this.automationSchedulerUtils.getGoogleSheetRange(
          iamwebOrder.googleLineNumber,
          AutomationConfig.googleSheet.iamweb.range.status,
        ),
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
  ): Promise<void> {
    await this.logUtil.save(
      AutomationConfig.files.log.iamweb.path,
      fileName,
      logString,
    );

    const lineNumber: LineNumber = await this.automationDbUtils.getLineNumber(
      prisma,
    );

    lineNumber.iamwebOrderInfoLogLineNumber++;

    await this.__writeGoogleSheetIamwebOrderInfoLog(
      lineNumber.iamwebOrderInfoLogLineNumber,
      time,
      lineData,
    );

    await this.automationDbUtils.setLineNumber(prisma, lineNumber);
  }

  /**
   * 아임웹 상태값 변경
   * @param prisma
   * @param time
   * @param iamwebDBid
   * @param googleLineNumber
   * @param oldStatus
   * @param newStatus
   */
  async iamwebChangeStatus(
    prisma: PrismaService,
    time: string,
    iamwebDBid: number,
    googleLineNumber: number,
    oldStatus: string,
    newStatus: string,
  ) {
    let newDispatchNewStatus: DispatchStatus = undefined;

    // 접수 -> X
    if (newStatus === IamwebOrderStatus.RECEIPT) {
    }
    // 배차요청 -> 배차관련 조회활때 처리됨
    else if (newStatus === IamwebOrderStatus.DISPATCH_REQUEST) {
    }
    // 배차완료 -> X
    else if (newStatus === IamwebOrderStatus.DISPATCH_DONE) {
    }
    // 전송완료 -> X
    else if (newStatus === IamwebOrderStatus.DISPATCH_SEND) {
    }
    // 전체완료 ->
    else if (newStatus === IamwebOrderStatus.DONE) {
      newDispatchNewStatus = DispatchStatus.DONE;
    }
    // 정보오류 -> X
    else if (newStatus === IamwebOrderStatus.INFO_ERROR) {
    }
    // 배차실패 -> X
    else if (newStatus === IamwebOrderStatus.DISPATCH_FAIL) {
    }
    // 취소완료 ->
    else if (newStatus === IamwebOrderStatus.CANCEL) {
      newDispatchNewStatus = DispatchStatus.CANCEL;
    }
    // 배차변경 -> X
    else if (newStatus === IamwebOrderStatus.DISPATCH_CHANGE) {
    }

    // 배차관련 상태값 변경
    if (newDispatchNewStatus !== undefined) {
      new AutomationDispatchUtils(this.httpService).changeDispatchStatus(
        prisma,
        iamwebDBid,
        newStatus,
      );
    }

    // 구글시트에 데이터 업데이트
    await this.updateGoogleSheetAndDBIamwebOrderStatus(
      prisma,
      iamwebDBid,
      newStatus,
    );

    // 상태값 변경 알람 전송
    await this.alertChangeStatus(time, googleLineNumber, oldStatus, newStatus);
  }
}
