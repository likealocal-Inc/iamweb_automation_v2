import { google, sheets_v4 } from 'googleapis';
// import { client_email, private_key } from '../../../google.config.dev.json';

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_SHEET_client_email;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_SHEET_private_key;

export enum GoogleSheetDirecftion {
  COLUMNS = 'COLUMNS',
  ROWS = 'ROWS',
}

/**
 * 구글 시트 처리 유틸
 */
export class GoogleSheetUtils {
  _googleSheet: sheets_v4.Sheets = null;

  sheetId: string;
  sheetName: string;

  constructor(sheetId: string, sheetName: string) {
    this.sheetId = sheetId;
    this.sheetName = sheetName;

    this._googleSheet = this.__getGoogleSheet();
  }

  __getGoogleSheet(): sheets_v4.Sheets {
    if (this._googleSheet !== null) {
      return this._googleSheet;
    }

    const authorize = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY,
      ['https://www.googleapis.com/auth/spreadsheets'],
    );

    // google spread sheet api 가져오기
    this._googleSheet = google.sheets({
      version: 'v4',
      auth: authorize,
    });

    return this._googleSheet;
  }

  /**
   * 일정시간 딜레이후 데이터 읽기
   * @param rangeStart
   * @param rangeEnd
   * @param timeGap
   * @returns
   */
  __readAfterTime(
    rangeStart: string,
    rangeEnd: string,
    timeGap: number,
  ): Promise<any[][]> {
    return new Promise((res, rej) => {
      setTimeout(async () => {
        const data = await this.readGoogleSheetRightNow(rangeStart, rangeEnd);
        res(data);
      }, timeGap);
    });
  }

  /**
   * 구글시트 읽기
   * @param rangeStart
   * @param rangeEnd
   * @param timeGap
   * @returns
   */
  async readGoogleSheet(
    rangeStart: string,
    rangeEnd: string,
    timeGap = 3000,
  ): Promise<any[][]> {
    const res = await this.__readAfterTime(rangeStart, rangeEnd, timeGap);
    return res;
  }

  /**
   * 구글시트 당장 읽기
   * @param rangeStart
   * @param rangeEnd
   * @returns
   */
  async readGoogleSheetRightNow(
    rangeStart: string,
    rangeEnd: string,
  ): Promise<any[][]> {
    const context = await this._googleSheet.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${this.sheetName}!${rangeStart}:${rangeEnd}`,
    });
    return context.data.values;
  }

  /**
   * 구글 시트에 쓰기
   * @param rangeStart
   * @param rangeEnd
   * @param values
   * @param timeGap
   * @param direction
   */
  async updateGoogleSheet(
    rangeStart: string,
    rangeEnd: string,
    values: string[][],
    timeGap = 1000,
    direction: GoogleSheetDirecftion = GoogleSheetDirecftion.ROWS,
  ) {
    setTimeout(async () => {
      await this._googleSheet.spreadsheets.values.update({
        spreadsheetId: this.sheetId,
        valueInputOption: 'USER_ENTERED',
        range: `${this.sheetName}!${rangeStart}:${rangeEnd}`,
        requestBody: {
          majorDimension: direction.toString(),
          range: `${this.sheetName}!${rangeStart}:${rangeEnd}`,
          values: values,
        },
      });
    }, timeGap);
  }
}
