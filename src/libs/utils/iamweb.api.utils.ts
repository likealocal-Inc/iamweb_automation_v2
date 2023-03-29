import { AxiosError, AxiosResponse } from 'axios';
import { Observable, catchError, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { AutomationConfig } from '../../config/iamweb.automation/automation.config';
import { ErrorLogUtils } from './error.log.utils';

/**
 * 아임웹 API 호출 응답 코드
 */
// export const IamwebAPICode = {
//   codeList: [
//     { CODE: -1, DESC: '잘못된 API 키 또는 시크릿' },
//     { CODE: -2, DESC: '잘못된 액세스 토큰으로 접근' },
//     { CODE: -5, DESC: '권한 오류' },
//     {
//       CODE: -6,
//       DESC: '이용 버전 권한 오류 ( 보통 버전별 제한에 걸릴 때 발생)',
//     },
//     { CODE: -7, DESC: '요청횟수 초과' },
//     {
//       CODE: -10,
//       DESC: '잘못된 파라미터 또는 호출 인자가 잘못되었거나 필수 인자가 포함되지 않은 경우',
//     },
//     { CODE: -11, DESC: '요청 데이터가 존재하지 않는 경우' },
//     { CODE: -19, DESC: '내부 처리 오류' },
//     { CODE: -98, DESC: '존재하지 않는 서비스로 요청' },
//     { CODE: -99, DESC: '존재하지 않는 메소드로 요청' },
//     { CODE: -999, DESC: '서비스 점검중' },
//     { CODE: 200, DESC: 'Success' },
//   ],
//   check: (code: number) => {
//     for (let index = 0; index < IamwebAPICode.codeList.length; index++) {
//       const temp = IamwebAPICode.codeList[index];
//       if (temp.CODE === code) {
//         return temp.DESC;
//       }
//     }
//   },
// };

export class IamwebApiUtils {
  constructor(private readonly httpService: HttpService) {}

  /**
   * 에러 파일에 작성하기
   * @param data
   */
  async __writeErrorLog(data: any) {
    await new ErrorLogUtils().write(data);
    // const fileUtils = new FileUtil();
    // const time = new DateUtil().nowString('YYYY/MM/DD hh:mm:ss');
    // const path = new DateUtil().nowString('YYYY_MM_DD');
    // const fileLogInfo = AutomationConfig.files.log.error;
    // fileUtils.write(
    //   fileLogInfo.path,
    //   await fileLogInfo.getLogFileName(path),
    //   `[${time}] ${data}\r\n`,
    // );
  }

  /**
   * API호출 리턴값 체크
   * @param data
   * @returns
   */
  async __checkResponse(data): Promise<any> {
    const code = data['code'];
    if (code === 200) {
      return data;
    }
    const desc = await AutomationConfig.iamwebApi.responseCodeCheck(code);
    this.__writeErrorLog(`Iamweb api error: ${desc}`);

    return data;
  }

  /**
   * 헤더 만들기
   * @param accessToken
   * @returns
   */
  async makeHeadersAndParams(headers = {}, params = {}): Promise<any> {
    return {
      headers,
      params,
    };
  }

  /**
   * API 호출
   * @param url
   * @param headersAndParams
   * @returns
   */
  async call(url: string, headersAndParams = {}): Promise<any> {
    const res: Observable<AxiosResponse<any, any>> = this.httpService.get(
      url,
      headersAndParams,
    );

    const { data } = await firstValueFrom(
      res.pipe(
        catchError((err: AxiosError) => {
          this.__writeErrorLog(url + ':' + err);
          throw 'Error' + err;
        }),
      ),
    );

    const checkedData = await this.__checkResponse(data);
    if (checkedData === undefined) return;

    return checkedData;
  }
}
