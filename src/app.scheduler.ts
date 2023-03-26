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
import { MomentDate } from './libs/utils/date.utils';
import { DispatchStatus } from './libs/modes/dispatch.status';
import { SlackAlertType } from './libs/utils/slack.utils';

@Injectable()
export class AppScheduler {
  automationSchedulerUtils: AutomationSchedulerUtils;
  iamwebUtils: IamwebUtils;
  automationDbUtils: AutomationDBUtils;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.iamwebUtils = new IamwebUtils(this.httpService);
    this.automationSchedulerUtils = new AutomationSchedulerUtils(
      this.httpService,
    );
    this.automationDbUtils = new AutomationDBUtils();
  }

  /**
   * 아임웹 주문 조회 -> 구글시트에 작성
   */
  @Cron('1 * * * * *')
  async iamwebOrderSearch() {
    console.log(
      '----------- 아임웹 주문데이터 조회 -> 주문 구글시트 스케쥴 ----------------',
    );

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
            await this.automationSchedulerUtils.writeGoogleSheetIamwebOrderInfoAndGetLineString(
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
          await this.automationSchedulerUtils.sendMessageNewOrder(
            lineNumber.iamwebOrderInfoLineNumber,
            iamwebOrderData,
          );
        }
      });
    }
  }

  /**
   * 아엠웹 구글시트로그 작성
   * @returns
   */
  @Cron('30 * * * * *')
  async iamwebOrderCheckChange() {
    console.log(
      '----------- 아임웹 주문데이터 변경에 대한 로그처리 스케쥴 ----------------',
    );

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
        await this.automationSchedulerUtils.readGoogleSheetIamwebOrderInfo(
          orderDBData.googleLineNumber,
        );

      // 구글시트 데이터  -> String
      const orderGoogleSheetDataString: string =
        await this.automationSchedulerUtils.getGoogleLineArrToString(
          orderGoogleSheetData[0],
        );

      // DB에 저장된 데이터와 현재 구글시트의 데이터가 동일한지 확인
      if (orderGoogleSheetDataString !== orderDBData.infoData) {
        // 상태값 체크
        const oldStatus = orderDBData.infoData.split('|')[1];
        const newStatus = orderGoogleSheetDataString.split('|')[1];

        let newIamwebOrderStatus: IamwebOrderStatus;

        // 상태값이 바뀐것에 대한 프로세스
        if (oldStatus !== newStatus) {
          await this.automationSchedulerUtils.updateGoogleSheetAndDBIamwebOrderStatus(
            this.prisma,
            orderDBData.id,
            newIamwebOrderStatus,
          );

          const changeStatusLog = `상태값변경\r\n[${orderDBData.googleLineNumber}] : ${newStatus}`;

          await this.automationSchedulerUtils.sendSlack(
            SlackAlertType.IAMWEB_ORDER,
            changeStatusLog,
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

        const time = MomentDate.nowString('YYYY/MM/DD hh:mm:ss');

        const logString =
          '[' +
          time +
          ']\r\nOLD:' +
          orderDBData.infoData +
          '\r\nNEW:' +
          orderGoogleSheetDataString;

        // 알림 전송
        await this.automationSchedulerUtils.sendSlack(
          SlackAlertType.IAMWEB_ORDER,
          logString,
        );

        // 로그파일 저장
        await this.automationSchedulerUtils.saveIamwebOrderLog(
          this.prisma,
          orderGoogleSheetData,
          logString,
          time,
          'LOG_IAMWEBORDER_' + orderDBData.googleLineNumber + '.log',
        );
      }
    }
  }

  /**
   * 배차 데이터 변경처리
   */
  @Cron('40 * * * * *')
  async dispatchChange() {
    console.log(
      '----------- 배차데이터 변경에 따른 처리 -> 상태값에 따른 주문데이터 처리포함 ----------------',
    );
    // 종료 안된 배차 데이터 가져옴
    const dispatchDBList: DispatchInfo[] =
      await this.automationDbUtils.getDispatchInfoListWithNotEnd(this.prisma);

    for (let index = 0; index < dispatchDBList.length; index++) {
      const dispatchDB = dispatchDBList[index];

      // 배차 구글시트 데이터 가져옴
      const lineNewData: any[][] =
        await this.automationSchedulerUtils.readGoogleSheetDispatchInfo(
          dispatchDB.googleLineNumber,
        );

      // 구글시트 데이터  -> String
      const lineNewDataString: string =
        await this.automationSchedulerUtils.getGoogleLineArrToString(
          lineNewData[0],
        );

      // DB에 저장된 데이터와 현재 구글시트의 데이터가 동일한지 확인
      if (lineNewDataString !== dispatchDB.infoData) {
        // 상태값 체크
        const oldStatus = dispatchDB.infoData.split('|')[4];
        const newStatus = lineNewDataString.split('|')[4];

        // 상태값이 바뀐것에 대한 프로세스
        if (oldStatus !== newStatus) {
          this.automationSchedulerUtils.dispatchChangeStatus(
            this.prisma,
            dispatchDB.iamwebOrderInfoId,
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
        this.automationSchedulerUtils.logAndAlertForDispatch(
          this.prisma,
          dispatchDB.infoData,
          lineNewDataString,
          lineNewData,
          dispatchDB.googleLineNumber,
        );
      }
    }
  }

  /**
   * 주문 -> 배차 시트에 작성
   */
  @Cron('20 * * * * *')
  async dispatch() {
    console.log('----------- 배차데이터 추가 스케쥴 ----------------');

    // 주문 데이터에서 배차요청인 데이터 조회
    const iamwebOrderList: IamwebOrderInfo[] =
      await this.automationDbUtils.getIamwebOrderWithStatus(
        this.prisma,
        IamwebOrderStatus.DISPATCH_REQUEST,
      );

    // 주문시트에서 작성된 배차요청이 아직 배차구글시트에 작성이 안된것만 모은다
    const newDispatchRequestList: IamwebOrderInfo[] =
      await this.automationSchedulerUtils.getNewDispatchRequestList(
        this.prisma,
        iamwebOrderList,
      );

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
          await this.automationSchedulerUtils.writeGoogleSheetDispatchInfoAndGetLineString(
            lineNumber.dispatchInfoLineNumber,
            orderModel,
            DispatchStatus.INIT,
          );

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
        this.automationSchedulerUtils.alertForNewDispatch(
          lineNumber.dispatchInfoLineNumber,
          dispatchStringData,
        );
      });
    }
  }
}
