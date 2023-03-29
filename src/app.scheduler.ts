import { Injectable } from '@nestjs/common';
import { AutomationSchedulerUtils } from './libs/utils/automation.scheduler.utils';
import { LineNumber, IamwebOrderInfo, DispatchInfo } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from './config/prisma/prisma.service';
import { IamwebOrderGoogleModel } from './libs/modes/iamweb.order';
import { IamwebUtils } from './libs/utils/iamweb.utils';
import { AutomationDBUtils } from './libs/utils/automation.db.utils';
import { IamwebOrderStatus } from './libs/modes/iamweb.order.status';
import { DispatchStatus } from './libs/modes/dispatch.status';
import { SlackAlertType } from './libs/core/slack.utils';
import { AutomationConfig } from './config/iamweb.automation/automation.config';
import { AutomationDispatchUtils } from './libs/utils/automation.dispatch.utils';
import { AutomationIamwebOrderUtils } from './libs/utils/automation.iamweborder.utils';

@Injectable()
export class AppScheduler {
  automationDispatchUtils: AutomationDispatchUtils;
  automationIamwebOrderUtils: AutomationIamwebOrderUtils;
  automationSchedulerUtils: AutomationSchedulerUtils;
  iamwebUtils: IamwebUtils;
  automationDbUtils: AutomationDBUtils;

  async init() {
    // 구글 라인 넘버 정보 저장하는 table 세팅
    const numbers: LineNumber[] = await this.prisma.lineNumber.findMany();

    // 이미 테이블의 레코드가 존재하면 아무일 안함
    if (numbers.length > 0) return;

    // 각 구글시트의 라인넘버 시작 번호를 세팅
    const googleLineNumbreInfo = AutomationConfig.googleSheet.startLineNumber;
    await this.prisma.lineNumber.create({
      data: {
        iamwebOrderInfoLineNumber: googleLineNumbreInfo.iamweb.main,
        iamwebOrderInfoLogLineNumber: googleLineNumbreInfo.iamweb.log,
        dispatchInfoLineNumber: googleLineNumbreInfo.dispatch.main,
        dispatchInfoLogLineNumber: googleLineNumbreInfo.dispatch.log,
      },
    });
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.iamwebUtils = new IamwebUtils(this.httpService);
    this.automationDispatchUtils = new AutomationDispatchUtils(
      this.httpService,
    );
    this.automationIamwebOrderUtils = new AutomationIamwebOrderUtils(
      this.httpService,
    );

    this.automationSchedulerUtils = new AutomationSchedulerUtils(
      this.httpService,
    );

    this.automationDbUtils = new AutomationDBUtils();

    this.init();
  }

  /**
   * 아임웹 주문 조회 -> 구글시트에 작성
   */
  @Cron('1 * * * * *')
  async iamwebOrderSearch() {
    const info = '아임웹 주문데이터 조회 -> 주문 구글시트 스케쥴';
    console.log(`----------- ${info} -------------`);

    try {
      // 1. 아엠웹 주문 내역 조회
      const iamwebOrderList: IamwebOrderGoogleModel[] =
        await this.iamwebUtils.getOrderListFromIamweb();

      // 주문데이터가 없을 경우 이후 작업 없음
      if (iamwebOrderList === undefined || iamwebOrderList.length === 0) {
        return;
      }

      // 2. 주문데이터 -> 구글시트
      for (let index = 0; index < iamwebOrderList.length; index++) {
        // 하나의 주문 데이터
        const iamwebOrderData: IamwebOrderGoogleModel = iamwebOrderList[index];
        // 트랜잭션 시작
        await this.prisma.$transaction(async (_prisma) => {
          // 라인넘버 조회
          const lineNumber: LineNumber =
            await this.automationDbUtils.getLineNumber(_prisma);

          // 라인넘버 하나 증가
          lineNumber.iamwebOrderInfoLineNumber++;

          // 동일 주문번호가 DB에 있는지 확인
          const res = await _prisma.iamwebOrderInfo.findMany({
            where: { iamwebOrderId: iamwebOrderData.order_no },
          });

          // 주문번호가 없을때 추가
          if (res.length === 0) {
            // 초기 상태값 (접수)
            const firstStatus: IamwebOrderStatus = IamwebOrderStatus.RECEIPT;

            // 구글시트에 작성 -> String구조로 받음
            const iamwebOrderStringData: string =
              await this.automationIamwebOrderUtils.writeGoogleSheetIamwebOrderInfoAndGetLineString(
                lineNumber.iamwebOrderInfoLineNumber, // 구글시트 라인 넘버
                iamwebOrderData,
                firstStatus,
              );

            // DB에 데이터 저장
            await _prisma.iamwebOrderInfo.create({
              data: {
                iamwebOrderId: iamwebOrderData.order_no,
                googleLineNumber: lineNumber.iamwebOrderInfoLineNumber,
                status: firstStatus, // 접수 상태값
                infoData: iamwebOrderStringData,
              },
            });

            // 새로운 라인넘버 DB에 저장
            await this.automationDbUtils.setLineNumber(_prisma, lineNumber);

            // 신규 주문 알림 전송
            await this.automationIamwebOrderUtils.alserNewOrder(
              lineNumber.iamwebOrderInfoLineNumber,
              iamwebOrderData,
            );
          }
        });
      }
    } catch (err) {
      console.log(err);
      this.automationSchedulerUtils.errorLogAndAlert(`${info}\r\n${err}`);
    }
  }

  /**
   * 아엠웹 구글시트로그 작성
   * @returns
   */
  @Cron('30 * * * * *')
  async iamwebOrderCheckChange() {
    const info = '아임웹 주문데이터 변경에 대한 로그처리 스케쥴';
    console.log(`----------- ${info} -------------`);

    try {
      // DB에서 종료되지 않은 주문의 id값을 조회
      const orderDBList: IamwebOrderInfo[] =
        await this.automationDbUtils.getIamwegOrderInfoListWithNotEnd(
          this.prisma,
        );

      if (orderDBList === undefined) return;

      // 해당 아이디의 구글 시트를 확인
      for (let index = 0; index < orderDBList.length; index++) {
        // DB 데이터
        const orderDBData: IamwebOrderInfo = orderDBList[index];

        // 구글시트 데이터 가져옴
        const orderGoogleSheetData: any[][] =
          await this.automationIamwebOrderUtils.readGoogleSheetIamwebOrderInfo(
            orderDBData.googleLineNumber,
          );

        // 구글시트 데이터  -> String
        const orderGoogleSheetDataString: string =
          await this.automationSchedulerUtils.getGoogleLineArrToString(
            orderGoogleSheetData[0],
          );

        // DB에 저장된 데이터와 현재 구글시트의 데이터가 동일한지 확인
        if (orderGoogleSheetDataString !== orderDBData.infoData) {
          const statusIndex =
            AutomationConfig.googleSheet.iamweb.range.status.arrIndex;

          const delim = AutomationConfig.sign.arrToStrDelim;

          // 상태값 체크
          const oldStatus = orderDBData.infoData.split(delim)[statusIndex];
          const newStatus =
            orderGoogleSheetDataString.split(delim)[statusIndex];

          const time = await AutomationConfig.alert.getAlertTime();

          // 상태값이 바뀐것에 대한 프로세스
          if (oldStatus !== newStatus) {
            await this.automationIamwebOrderUtils.iamwebChangeStatus(
              this.prisma,
              time,
              orderDBData.id,
              orderDBData.googleLineNumber,
              oldStatus,
              newStatus,
            );
          }

          // 데이터가 다르면 DB에 변경된 데이터 업데이트
          await this.automationDbUtils.updateIamwebOrderInfo(
            this.prisma,
            { id: orderDBData.id },
            {
              infoData: orderGoogleSheetDataString,
              status: newStatus,
            },
          );

          // 알림 메세지 전송
          const alertMessage =
            await this.automationIamwebOrderUtils.alertChangeData(
              time,
              orderDBData.infoData,
              orderGoogleSheetDataString,
            );

          // 로그파일 저장
          await this.automationIamwebOrderUtils.saveIamwebOrderLog(
            this.prisma,
            orderGoogleSheetData,
            alertMessage,
            time,
            await AutomationConfig.files.log.iamweb.getLogFileName(
              orderDBData.googleLineNumber,
            ),
          );
        }
      }
    } catch (err) {
      console.log(err);

      this.automationSchedulerUtils.sendSlack(
        SlackAlertType.ERROR,
        `${info}\r\n${err}`,
      );
    }
  }

  /**
   * 주문 -> 배차 시트에 작성
   */
  @Cron('20 * * * * *')
  async addDispatchSheetInGoogleSheet() {
    const info = '배차데이터 추가 스케쥴';
    console.log(`----------- ${info} -------------`);

    try {
      // 주문시트에서 작성된 배차요청이 아직 배차구글시트에 작성이 안된것만 모은다
      const newDispatchRequestList: IamwebOrderInfo[] =
        await this.automationDispatchUtils.getDispatchRequestList(this.prisma);

      // 새로운 배차 요청 배차시트에 작성
      for (let index = 0; index < newDispatchRequestList.length; index++) {
        const newOrderData: IamwebOrderInfo = newDispatchRequestList[index];

        await this.prisma.$transaction(async (_prisma) => {
          // 라인넘버 조회
          const lineNumber: LineNumber =
            await this.automationDbUtils.getLineNumber(_prisma);

          // 라인넘버 하나 증가
          lineNumber.dispatchInfoLineNumber++;

          // 해당 주문데이터를 아엠웹 API로 조회한다.
          const orderModel: IamwebOrderGoogleModel =
            await this.iamwebUtils.getIamwebOrder(newOrderData.iamwebOrderId);

          // 구글시트에 데이터 작성
          const dispatchStringData: string =
            await this.automationDispatchUtils.writeGoogleSheetDispatchInfoAndGetLineString(
              lineNumber.dispatchInfoLineNumber,
              orderModel,
              DispatchStatus.INIT,
            );

          // 배차시트에 데이터 DB 작성
          await _prisma.dispatchInfo.create({
            data: {
              googleLineNumber: lineNumber.dispatchInfoLineNumber,
              iamwebOrderInfoId: newOrderData.id,
              infoData: dispatchStringData,
              status: DispatchStatus.INIT,
            },
          });

          // 새로운 라인넘버 DB에 저장
          await this.automationDbUtils.setLineNumber(_prisma, lineNumber);

          // 알림 전송
          this.automationDispatchUtils.alertForNewDispatch(
            lineNumber.dispatchInfoLineNumber,
            dispatchStringData,
          );
        });
      }
    } catch (err) {
      console.log(err);

      this.automationSchedulerUtils.sendSlack(
        SlackAlertType.ERROR,
        `${info}\r\n${err}`,
      );
    }
  }

  /**
   * 배차 데이터 변경처리
   */
  @Cron('40 * * * * *')
  async dispatchChange() {
    const info =
      '배차데이터 변경에 따른 처리 -> 상태값에 따른 주문데이터 처리포함';
    console.log(`----------- ${info} -------------`);

    try {
      // 종료 안된 배차 데이터 가져옴
      const dispatchDBList: DispatchInfo[] =
        await this.automationDbUtils.getDispatchInfoListWithNotEnd(this.prisma);

      for (let index = 0; index < dispatchDBList.length; index++) {
        const dispatchDB = dispatchDBList[index];

        // 배차 구글시트 데이터 가져옴
        const lineNewData: any[][] =
          await this.automationDispatchUtils.readGoogleSheetDispatchInfo(
            dispatchDB.googleLineNumber,
          );

        // 구글시트 데이터  -> String
        const lineNewDataString: string =
          await this.automationSchedulerUtils.getGoogleLineArrToString(
            lineNewData[0],
          );

        // DB에 저장된 데이터와 현재 구글시트의 데이터가 다를 경우
        // -> 변경된 데이터에 대한 처리
        if (lineNewDataString !== dispatchDB.infoData) {
          const statusIndex =
            AutomationConfig.googleSheet.dispatch.range.status.arrIndex;

          const delim = AutomationConfig.sign.arrToStrDelim;

          // 상태값 체크
          const oldStatus = dispatchDB.infoData.split(delim)[statusIndex];
          const newStatus = lineNewDataString.split(delim)[statusIndex];

          // 상태값이 바뀐것에 대한 프로세스
          if (oldStatus !== newStatus) {
            this.automationDispatchUtils.dispatchChangeStatus(
              this.prisma,
              dispatchDB.iamwebOrderInfoId,
              oldStatus,
              newStatus,
            );
          }

          // 데이터가 다르면 DB에 변경된 데이터 업데이트
          await this.automationDbUtils.updateDispatchInfo(
            this.prisma,
            { id: dispatchDB.id },
            {
              infoData: lineNewDataString,
              status: newStatus,
            },
          );

          // 로그 및 알람 전송
          this.automationDispatchUtils.logAndAlertForDispatch(
            this.prisma,
            dispatchDB.infoData,
            lineNewDataString,
            lineNewData,
            dispatchDB.googleLineNumber,
          );
        }
      }
    } catch (err) {
      console.log(err);

      this.automationSchedulerUtils.sendSlack(
        SlackAlertType.ERROR,
        `${info}\r\n${err}`,
      );
    }
  }
}
