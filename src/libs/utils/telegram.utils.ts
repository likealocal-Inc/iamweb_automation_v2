import * as TelegramBot from 'node-telegram-bot-api';

export class TelegramUtils {
  private bot: TelegramBot;

  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }

  async getChatRoomId() {
    this.bot.getUpdates({ allowed_updates: ['message'] }).then((updates) => {
      console.log(updates);

      const latestMessage = updates[updates.length - 1];
      console.log(latestMessage);

      // const chatId = latestMessage.chat.id;

      // console.log(`Latest message in chat ${chatId}: ${latestMessage.text}`);
    });
  }

  async send(chatId: number, message: string) {
    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error(error);
    }
  }
}
