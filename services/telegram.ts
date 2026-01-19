
const TELEGRAM_BOT_TOKEN = '8571639361:AAEuplHuF4mh6rkaCCWoC-D_c57Iho7rM8Y';
const TELEGRAM_CHAT_ID = '5494141897';

export const sendTelegramNotification = async (message: string) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Telegram notification error:', error);
    return false;
  }
};
