import { AutomationConfig } from 'src/config/iamweb.automation/automation.config';
import { DateUtil } from '../core/date.utils';
import { FileUtil } from '../core/files.utils';

/**
 * 에러 로그처리
 */
export class ErrorLogUtils {
  // 로그파일 쓰기
  async write(data: any) {
    const fileUtils = new FileUtil();
    const time = new DateUtil().nowString('YYYY/MM/DD hh:mm:ss');
    const path = new DateUtil().nowString('YYYY_MM_DD');
    const fileLogInfo = AutomationConfig.files.log.error;
    await fileUtils.write(
      fileLogInfo.path,
      await fileLogInfo.getLogFileName(path),
      `[${time}] ${data}\r\n`,
    );
  }
}
