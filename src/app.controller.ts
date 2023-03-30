import { Controller, Get, Query, Render } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { AppService } from './app.service';
import { LogUtil } from './libs/core/logfile.utils';
import { AutomationConfig } from './config/iamweb.automation/automation.config';

// 토큰 배열에 저장될 클래스 타입
class TokenForLogfile {
  email: string;
  uuid: string;
}
// 토큰 정보가 저장될 배열
const uuidIamwebList = {};
const uuidDispatchList = {};
const uuidError = {};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  async getLogFile(
    tokenList: any,
    email: string,
    token: string,
    path,
  ): Promise<any> {
    const tokenObj: TokenForLogfile = tokenList[email];
    if (tokenObj === undefined || tokenObj === null) {
      return;
    }

    if (tokenObj.uuid !== token) {
      return;
    }

    const logFile = await new LogUtil().getLogFileList(path);
    return { files: logFile };
  }

  async makeTokenLogfile(email): Promise<TokenForLogfile> {
    const token = new TokenForLogfile();
    token.email = email;
    token.uuid = uuidv4();
    return token;
  }

  @Get('iamweb_logfiles')
  @Render('logIamwebFiles')
  async logIamwebFileList(
    @Query('token') token: string,
    @Query('email') email: string,
  ): Promise<any> {
    return await this.getLogFile(
      uuidIamwebList,
      email,
      token,
      AutomationConfig.files.log.iamweb.path,
    );
  }

  @Get('dispatch_logfiles')
  @Render('logDispatchFiles')
  async logDispatchFileList(
    @Query('token') token: string,
    @Query('email') email: string,
  ): Promise<any> {
    return await this.getLogFile(
      uuidDispatchList,
      email,
      token,
      AutomationConfig.files.log.dispatch.path,
    );
  }

  @Get('error_logfiles')
  @Render('logErrorFiles')
  async logErrorFileList(
    @Query('token') token: string,
    @Query('email') email: string,
  ): Promise<any> {
    return await this.getLogFile(
      uuidError,
      email,
      token,
      AutomationConfig.files.log.error.path,
    );
  }

  @Get('dispatchGeZtoken')
  async getTokenForDispatch(@Query('email') email: string) {
    const token = await this.makeTokenLogfile(email);
    uuidDispatchList[email] = token;
    return token.uuid;
  }

  @Get('iamwebTok2n')
  async getToken(@Query('email') email: string) {
    const token = await this.makeTokenLogfile(email);
    uuidIamwebList[email] = token;
    return token.uuid;
  }

  @Get('errorTok2n')
  async getTokenError(@Query('email') email: string) {
    const token = await this.makeTokenLogfile(email);
    uuidError[email] = token;
    return token.uuid;
  }
}
