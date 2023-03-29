import { HttpService } from '@nestjs/axios';
import { IamwebApiUtils } from './iamweb.api.utils';
import { AutomationConfig } from '../../config/iamweb.automation/automation.config';
import {
  IamwebOrderGoogleModel,
  IamwebProductModel,
} from '../modes/iamweb.order';

// 아임웹 상품 코드
// 아임웹 사이트 상품 URL에서 확인가능
// export enum ProductType {
//   privateTaxi = 133,
//   pickup = 83,
//   sanding = 122,
//   tPickup = 146,
//   tSanding = 147,
//   tPrivateTaxi = 148,
// }

export class IamwebUtils {
  apiUtils: IamwebApiUtils;
  constructor(private readonly httpService: HttpService) {
    this.apiUtils = new IamwebApiUtils(httpService);
  }

  /**
   * 액세스 토큰 조회
   * @returns
   */
  async __getAcessToken(): Promise<string> {
    const res = await this.apiUtils.call(process.env.IAMWEB_API_GETTOKEN_URL);

    if (res === undefined) return;

    return res['access_token'];
  }

  async __getIamwebRequest(accessToken: string): Promise<any> {
    const url = 'https://api.imweb.me/v2/shop/inquirys';
    const res = await this.apiUtils.call(
      url,
      this.apiUtils.makeHeadersAndParams({ 'access-token': accessToken }),
    );
    return res;
  }

  /**
   * 품폭 주문 목록 조회 (https://developers.imweb.me/orders/prodOrders)
   * @param accessToken
   * @param orderId
   * @returns
   */
  async __getIamwebOrderItemList(
    orderId: string,
    accessToken: string,
  ): Promise<IamwebProductModel> {
    const url = `https://api.imweb.me/v2/shop/orders/${orderId}/prod-orders`;
    const res = await this.apiUtils.call(
      url,
      this.apiUtils.makeHeadersAndParams({ 'access-token': accessToken }),
    );

    if (res === undefined) return;

    return new IamwebProductModel(res.data[0]);
  }

  /**
   * 주문리스트 조회
   * @param accessToken
   * @param startTimeStatmp
   * @param endTimeStatmp
   * @returns
   */
  async __getIamwebOrderList(
    startTimeStatmp: string,
    endTimeStatmp: string,
    accessToken: string,
  ) {
    const res = await this.apiUtils.call(
      'https://api.imweb.me/v2/shop/orders',
      this.apiUtils.makeHeadersAndParams(
        { 'access-token': accessToken },
        {
          order_date_from: startTimeStatmp.substring(0, 10),
          order_date_to: endTimeStatmp.substring(0, 10),
        },
      ),
    );

    if (res === undefined) return;

    return res['data']['list'];
  }

  async getProductType(productNo: number) {
    /**
     * 상품
     * 프라이빗택시: 133
     * 인천/김포공항 픽업: 83 - 편도
     * 샌딩: 122 - 편도
     */

    const type = AutomationConfig.iamwebProductID;

    switch (productNo) {
      case type.privateTaxi:
      case type.tPrivateTaxi:
        return '대절';
      case type.pickup:
      case type.sanding:
      case type.tSanding:
      case type.tPickup:
        return '편도';
    }
    return '상품번호오류';
  }

  /**
   * 주문에 대한 요청 조회
   * @returns
   */
  async getIamwebRequest(): Promise<any> {
    const token = await this.__getAcessToken();
    if (token === undefined) return;

    return await this.__getIamwebRequest(token);
  }

  /**
   * 아임웹 주문 데이터 조회
   * @param iamwebOrderNo
   * @returns
   */
  async __getIamwebOrder(iamwebOrderNo: string, accessToken: string) {
    const res = await this.apiUtils.call(
      `https://api.imweb.me/v2/shop/orders/${iamwebOrderNo}`,
      this.apiUtils.makeHeadersAndParams({ 'access-token': accessToken }),
    );

    if (res === undefined) return;

    return res['data'];
  }

  /**
   * 아엠웹 주문정보 조회
   * @param iamwebOrderNo
   * @returns
   */
  async getIamwebOrder(iamwebOrderNo: string): Promise<IamwebOrderGoogleModel> {
    const accessToken = await this.__getAcessToken();
    if (accessToken === undefined) return;

    const res = await this.__getIamwebOrder(iamwebOrderNo, accessToken);

    // 주문데이터를 주문 모델로 변경
    const model: IamwebOrderGoogleModel = new IamwebOrderGoogleModel(res);

    const product = await this.__getIamwebOrderItemList(
      model.order_no,
      accessToken,
    );

    if (product === undefined) return;

    model.product_item = product;

    return model;
  }

  /**
   * Iamweb 주문 데이터 조회
   * @param accessToken
   * @returns
   */
  async getIamwebOrderList(
    startTimeStatmp: string,
    endTimeStatmp: string,
  ): Promise<IamwebOrderGoogleModel[]> {
    // 토큰가져오기

    const accessToken = await this.__getAcessToken();
    if (accessToken === undefined) return;

    const result = [];

    // 해단 조건의 아엠웹 주문 리스트 조회
    const orderList = await this.__getIamwebOrderList(
      startTimeStatmp,
      endTimeStatmp,
      accessToken,
    );

    for (let index = 0; index < orderList.length; index++) {
      const orderData = orderList[index];

      // 주문데이터를 주문 모델로 변경
      const model: IamwebOrderGoogleModel = new IamwebOrderGoogleModel(
        orderData,
      );

      const product = await this.__getIamwebOrderItemList(
        model.order_no,
        accessToken,
      );

      if (product !== undefined) {
        model.product_item = product;
        result.push(model);
      }
    }
    return result;
  }

  /**
   * 아엠웹 주문 데이터 조회
   * @returns
   */
  async getOrderListFromIamweb(): Promise<IamwebOrderGoogleModel[]> {
    const today = new Date();
    const fromDay = new Date(today);
    fromDay.setDate(today.getDate() - 20);

    // 주문리스트를 조회
    return await this.getIamwebOrderList(
      fromDay.valueOf().toString(),
      today.valueOf().toString(),
    );
  }
}
