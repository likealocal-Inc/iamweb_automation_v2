import { FileUtil } from './files.utils';

export class LogUtil {
  // 로그파일 저장 경로
  filePath = './files';
  file: FileUtil;
  constructor() {
    this.file = new FileUtil();
  }
  /**
   * 로그파일 저장
   * @param data
   * @param fileName
   */
  async save(data: string, fileName: string) {
    await this.file.write(this.filePath, fileName, data + '\n');
  }

  /**
   * 해당 경로페 파일 리스트가져오기
   * @param path
   * @returns
   */
  async getLogFileList() {
    return await this.file.getFiles(this.filePath);
  }
}
