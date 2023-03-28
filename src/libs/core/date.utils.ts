import * as moment from 'moment';

export enum DateAddType {
  years = 'y',
  quarters = 'Q',
  months = 'M',
  weeks = 'w',
  days = 'd',
  hours = 'h',
  minutes = 'm',
  seconds = 's',
  milliseconds = 'ms',
}

export const MomentDate = {
  date: (day = ''): moment.Moment => {
    return moment(day);
  },

  /**
   *
   * 날짜 포멧
   *
   * YYYY	    2014	4 or 2 digit year. Note: Only 4 digit can be parsed on strict mode
   * YY	        14	2 digit year
   * Y	        -25	Year with any number of digits and sign
   * Q	        1..4	Quarter of year. Sets month to first month in quarter.
   * M MM	    1..12	Month number
   * MMM MMMM	Jan..December	Month name in locale set by moment.locale()
   * D DD	    1..31	Day of month
   * Do	        1st..31st	Day of month with ordinal
   * DDD DDDD	1..365	Day of year
   * X	        1410715640.579	Unix timestamp
   * x	        1410715640579	Unix ms timestamp
   *
   * 현재 시간
   *
   * @param format 포멧
   * @returns
   */
  nowString: (format: string): string => {
    return moment().format(format);
  },

  /**
   * 날짜객체 반환
   * @param dateString 날짜 스트링문자열
   * @returns
   */
  now: (): moment.Moment => {
    return moment();
  },

  /**
   * 현재 시간 기준으로 더하기
   * @param num
   * @param type
   * @returns
   */
  add: (num: number, type: DateAddType): moment.Moment => {
    return moment().add(num, type);
  },

  /**
   * 기준날짜에서 더하기
   * @param day 기준날짜
   * @param num 추가숫자
   * @param type 타입
   * @returns
   */
  addFromDate: (
    day: moment.Moment,
    num: number,
    type: DateAddType,
  ): moment.Moment => {
    return moment(day).add(num, type);
  },
};

export class DateUtil {
  dateFromTimeStamp = (timeStamp: number) => {
    const date = new Date(timeStamp * 1000);
    const year = date.getFullYear().toString(); //년도 뒤에 두자리
    const month = ('0' + (date.getMonth() + 1)).slice(-2); //월 2자리 (01, 02 ... 12)
    const day = ('0' + date.getDate()).slice(-2); //일 2자리 (01, 02 ... 31)
    const hour = ('0' + date.getHours()).slice(-2); //시 2자리 (00, 01 ... 23)
    const minute = ('0' + date.getMinutes()).slice(-2); //분 2자리 (00, 01 ... 59)
    const second = ('0' + date.getSeconds()).slice(-2); //초 2자리 (00, 01 ... 59)

    return { year, month, day, hour, minute, second };
  };
  YYYYMMDD = (timeStamp: number, splitStr: string) => {
    const { year, month, day } = this.dateFromTimeStamp(timeStamp);
    return `${year}${splitStr}${month}${splitStr}${day}`;
  };

  HHMMSS = (timeStamp: number, splitStr: string) => {
    const { hour, minute, second } = this.dateFromTimeStamp(timeStamp);
    return `${hour}${splitStr}${minute}${splitStr}${second}`;
  };
}
// export const date : (day = '') => {
//   return moment(day);
// };
// /**
//  *
//  * 날짜 포멧
//  *
//  * YYYY	    2014	4 or 2 digit year. Note: Only 4 digit can be parsed on strict mode
//  * YY	        14	2 digit year
//  * Y	        -25	Year with any number of digits and sign
//  * Q	        1..4	Quarter of year. Sets month to first month in quarter.
//  * M MM	    1..12	Month number
//  * MMM MMMM	Jan..December	Month name in locale set by moment.locale()
//  * D DD	    1..31	Day of month
//  * Do	        1st..31st	Day of month with ordinal
//  * DDD DDDD	1..365	Day of year
//  * X	        1410715640.579	Unix timestamp
//  * x	        1410715640579	Unix ms timestamp
//  *
//  * 현재 시간
//  *
//  * @param format 포멧
//  * @returns
//  */
// export const nowString = (format: string) => {
//   return moment().format(format);
// };

// /**
//  * 날짜객체 반환
//  * @param dateString 날짜 스트링문자열
//  * @returns
//  */
// export const now = () => {
//   return moment();
// };

// /**
//  * 현재 시간 기준으로 더하기
//  * @param num
//  * @param type
//  * @returns
//  */
// export const add = (num: number, type: DateAddType) => {
//   return moment().add(num, type);
// };

// /**
//  * 기준날짜에서 더하기
//  * @param day 기준날짜
//  * @param num 추가숫자
//  * @param type 타입
//  * @returns
//  */
// export const addFromDate = (
//   day: moment.Moment,
//   num: number,
//   type: DateAddType,
// ) => {
//   return moment(day).add(num, type);
// };

// // interface RelativeTimeType {
// //   year_ago;
// //   day_ago;
// //   hour_ago;
// //   hour_in;
// //   hour
// // }
// // export const relativeTime = (type: RelativeTimeType, fromYYYYMMDD?: string) => {
// //   let res: string;
// //   switch (type) {
// //     case type.year:
// //       res = moment(fromYYYYMMDD, 'YYYYMMDD').fromNow();
// //       break;
// //     case type.day:
// //       res = moment().startOf('day').fromNow();
// //   }
// // };
