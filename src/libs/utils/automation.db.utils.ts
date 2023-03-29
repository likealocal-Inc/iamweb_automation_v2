import { IamwebOrderInfo, LineNumber, DispatchInfo } from '@prisma/client';
import { IamwebOrderStatus } from '../modes/iamweb.order.status';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AutomationConfig } from '../../config/iamweb.automation/automation.config';
export class AutomationDBUtils {
  /**
   * 각 시트의 라인넘버를 반환
   * @param prisma
   * @returns
   */
  async getLineNumber(prisma: any): Promise<LineNumber> {
    //return await prisma.lineNumber.findFirst();
    return await prisma.lineNumber.findFirst();
  }

  /**
   * 라인넘버 업데이트
   * @param prisma
   * @param data
   */
  async setLineNumber(prisma: any, data: LineNumber) {
    await prisma.lineNumber.update({ where: { id: data.id }, data });
  }

  /**
   *
   * @param prisma
   * @param where
   * @returns
   */
  async getIamwebOrderWithStatus(
    prisma: any,
    status: IamwebOrderStatus,
  ): Promise<IamwebOrderInfo[]> {
    return await prisma.iamwebOrderInfo.findMany({ where: { status: status } });
  }

  /**
   *
   * @param prisma
   * @param iamwebOrderIds
   * @returns
   */
  async getDispatchWithIamwebId(
    prisma: PrismaService,
    iamwebId: number,
  ): Promise<DispatchInfo> {
    return await prisma.dispatchInfo.findFirst({
      where: { iamwebOrderInfoId: iamwebId },
    });
  }

  /**
   * 종료안된 주문데이터 조회
   * @param prisma
   * @returns
   */
  async getIamwegOrderInfoListWithNotEnd(
    prisma: PrismaService,
  ): Promise<IamwebOrderInfo[]> {
    return await prisma.iamwebOrderInfo.findMany({
      where: {
        NOT: {
          status: { in: AutomationConfig.dispachFinishStatus },
        },
      },
    });
  }

  /**
   * 배차리스트에서 종료가 안된것 조회
   * @param prisma
   * @returns
   */
  async getDispatchInfoListWithNotEnd(prisma: PrismaService) {
    return await prisma.dispatchInfo.findMany({
      where: {
        NOT: {
          status: { in: AutomationConfig.dispachFinishStatus },
        },
      },
    });
  }

  /**
   * 주문데이터 업데이트
   * @param prisma
   * @param where
   * @param data
   */
  async updateIamwebOrderInfo(prisma: PrismaService, where, data) {
    await prisma.iamwebOrderInfo.update({
      where,
      data,
    });
  }

  /**
   * 배차데이터 업데이트
   * @param prisma
   * @param where
   * @param data
   */
  async updateDispatchInfo(prisma: PrismaService, where, data) {
    await prisma.dispatchInfo.update({
      where,
      data,
    });
  }
}
