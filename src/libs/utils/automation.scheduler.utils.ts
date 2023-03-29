import { HttpService } from '@nestjs/axios';

import { SlackAlertType, SlackUtil } from '../core/slack.utils';
import { TelegramUtils } from '../core/telegram.utils';
import { AutomationConfig } from '../../config/iamweb.automation/automation.config';
import { ErrorLogUtils } from './error.log.utils';

type GoogleSheetRange = {
  cellNumber: number;
  start: string;
  end: string;
};

export class AutomationSchedulerUtils {
  slackUtil: SlackUtil;
  telegramUtil: TelegramUtils;

  constructor(private readonly httpService: HttpService) {
    this.slackUtil = new SlackUtil(this.httpService);
    this.telegramUtil = new TelegramUtils();
  }

  /**
   * 구글시트 시작과 끝 셀 세팅
   * @param cellNum
   * @returns
   */
  async getGoogleSheetCellStartEnd(range: GoogleSheetRange) {
    return [
      `${range.start}${range.cellNumber}`,
      `${range.end}${range.cellNumber}`,
    ];
  }

  async getGoogleSheetRange(lineNumber: number, range: any) {
    return { cellNumber: lineNumber, start: range.start, end: range.end };
  }

  /**
   * 구글시트라인 배열 -> 스트링으로 변환 (|로 붙입)
   * @param googleLineArr
   * @returns
   */
  async getGoogleLineArrToString(googleLineArr: string[]): Promise<string> {
    return googleLineArr.join(AutomationConfig.sign.arrToStrDelim);
  }

  /**
   * 변경 데이터에 대한 알림
   * @param data
   * @param orderDBData
   */
  async sendSlack(type: string, logString: string) {
    // 슬랙 전송
    await this.slackUtil.send(type, logString);
  }

  /**
   * 텔레그렘 전송
   * @param msg
   */
  async sendTelegram(msg: string) {
    // 텔레그램 전송
    await this.telegramUtil.send(
      Number.parseInt(process.env.TELEGRAM_BOT_CHAT_ID.toString()),
      msg,
    );
  }

  /**
   * 에러로그 저장 및 알림
   * @param msg
   */
  async errorLogAndAlert(msg: any) {
    await this.sendSlack(SlackAlertType.ERROR, msg);
    await new ErrorLogUtils().write(msg);
  }
}
