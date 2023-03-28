import { DateUtil } from '../core/date.utils';
import { DispatchStatus } from '../modes/dispatch.status';
import { IamwebOrderGoogleModel } from '../modes/iamweb.order';
import { IamwebOrderStatus } from '../modes/iamweb.order.status';
import { IamwebUtils } from './iamweb.utils';

export class AutomationDataConvert {
  /**
   * IamwebOrder 모델 -> Dispatch Json데이터로 변환
   * @param orderData
   * @param cellNum
   * @param dispatchStatus
   * @param iamwebUtils
   * @returns
   */
  async convertDispathFromIamwebOrderModelToJson(
    orderData: IamwebOrderGoogleModel,
    cellNum: number,
    dispatchStatus: DispatchStatus,
    iamwebUtils: IamwebUtils,
  ): Promise<any[]> {
    const formData = orderData.form;

    const yyyy_mm_dd = new DateUtil().YYYYMMDD(orderData.order_time, '-');
    const hh_mm_dd = new DateUtil().HHMMSS(orderData.order_time, ':');

    const productNo = orderData.product_item.items.prod_no;
    const productType: string = await iamwebUtils.getProductType(
      Number(productNo),
    );

    const boardingPersonCount = formData[2].value;
    const boardingDate = formData[3].value;
    const boardingTime = formData[4].value;
    const jsonNewData = [
      (cellNum - 3).toString(), // B '번호'
      orderData.order_no, // C
      yyyy_mm_dd, // D '결제일자' ,
      hh_mm_dd, // E '결제시간',
      '', // F 취소일자
      '', // G 취소시간
      '라이크어로컬', //H
      '010-9985-9547', // I
      productType, // J // 서비스명(편도/대절)
      '-', // K - 대절시간
      orderData.orderer.name, // L'이용자명',
      '010-9985-9547', // M 이용자 연락처,
      `${boardingDate} ${boardingTime}`, // N'탑승일자', //'탑승시간',
      `${orderData.product_item.items.startLocation} ${orderData.product_item.items.startAddress}`, // O'출발지 위치명' '출발지주소',
      `${orderData.product_item.items.endLocation} ${orderData.product_item.items.endAddress}`, // P'도착지위치명',, // '도착지주소',
      boardingPersonCount, // Q '탐승인원',
      // dispatchStatus, // R
    ];

    return jsonNewData;
  }

  /**
   *
   * @param orderData
   * @param cellNum
   * @param iamwebOrderStatus
   * @returns
   */
  async convertIamwebOrderFromIamwebOrderModelToJson(
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
}