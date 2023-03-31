import * as TelegramBot from 'node-telegram-bot-api';

/**
 * 텔레그램 처리 유틸
 */
export class TelegramUtils {
  private bot: TelegramBot;

  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }

  /**
   * 텔레그램 채팅방 아이디를 얻기 위한 함수
   * 해당 채팅방에 글을 쓰고 내가 마지막으로 쓴 텔레그램 방을 찾는 방법
   */
  async getChatRoomId() {
    this.bot.getUpdates({ allowed_updates: ['message'] }).then((updates) => {
      console.log(updates);

      const latestMessage = updates[updates.length - 1];
      console.log(latestMessage);

      // const chatId = latestMessage.chat.id;

      // console.log(`Latest message in chat ${chatId}: ${latestMessage.text}`);
    });
  }

  /**
   * 메세지 전송
   * @param chatId
   * @param message
   */
  async send(chatId: number, message: string) {
    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error(error);
    }
  }
}
