/**
 * 파일 처리 유틸
 */
export class FileUtil {
  fs: any;

  constructor() {
    this.fs = require('fs');
  }

  /**
   * 파일에 쓰기
   * @param path
   * @param fileName
   * @param data
   */
  async write(path: string, fileName: string, data: string) {
    if (!this.fs.existsSync(path)) {
      this.fs.mkdirSync(path, { recursive: true });
    }

    await this.fs.writeFileSync(`${path}/${fileName}`, data, {
      encoding: 'utf8',
      flag: 'a+',
      mode: 0o666,
    });
  }

  async getFiles(path: string) {
    if (!this.fs.existsSync(path)) {
      return;
    }
    const files = this.fs.readdirSync(path);
    return files;
  }
}
