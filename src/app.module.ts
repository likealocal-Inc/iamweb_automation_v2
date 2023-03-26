import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './config/prisma/prisma.module';
import { AppScheduler } from './app.scheduler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    PrismaModule,
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'files') }),
  ],
  controllers: [AppController],
  providers: [AppService, AppScheduler],
})
export class AppModule {}
