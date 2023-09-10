const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

// Токен вашего Telegram бота
const telegramBotToken = 'Вставьте свой токен';

// Токен доступа к Яндекс Диску
const yandexDiskToken = 'Вставьте свой токен';
var yandexDiskUploadResponse;
// Создаем экземпляр Telegram бота
const bot = new TelegramBot(telegramBotToken, { polling: true });

function getCurrentDateFolder() {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear().toString();
  const folderName = `${day}.${month}.${year}`;
  return folderName;
}

async function createFolder() {
   const folderName = getCurrentDateFolder();
  try {
    const createFolderUrl = `https://cloud-api.yandex.net/v1/disk/resources?path=/Industria/${encodeURIComponent(folderName)}`;
    const response = await axios.put(createFolderUrl, null, {
      headers: {
        'Authorization': `OAuth ${yandexDiskToken}`,
      },
    });

    if (response.status === 201) {
      console.log(`Папка '${folderName}' успешно создана на Яндекс Диске.`);
      return folderName;
    } else {
      console.error('Ошибка при создании папки, возможно, она уже создана:', response.status, response.statusText);
      return folderName;
    }
  } catch (error) {
    console.error('Ошибка при создании папки, возможно, она уже создана:', error.message);
    return folderName;
  }
}

async function requestUploadURL() {
  try {
    const response = await axios.get(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=%otpusk`, {
      headers: {
        'Authorization': `OAuth ${yandexDiskToken}`,
      },
    });

    if (response.status === 200) {
      // Получаем URL для загрузки
      const uploadURL = response.data.href;
      return uploadURL;
    } else {
      console.error('Ошибка при запросе URL для загрузки:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Ошибка при запросе URL для загрузки:', error.message);
    return null;
  }
}

// Используйте функцию для получения URL для загрузки
requestUploadURL()
  .then((uploadURL) => {
    if (uploadURL) {
      console.log('Получен URL для загрузки файла:', uploadURL);
      // Здесь вы можете загрузить файл на полученный URL с помощью метода PUT
    } else {
      console.log('Не удалось получить URL для загрузки файла.');
    }
  })
  .catch((err) => {
    console.error('Ошибка при получении URL для загрузки файла:', err);
  });
// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Привет! Отправь мне фото или файл, и я загружу его на Яндекс Диск.');
});

// Обработчик получения фото или файла
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.photo[msg.photo.length - 1].file_id;

  try {
    const folderName = await createFolder(); // Создаем папку
    (folderName ? folderName : folderName = getCurrentDateFolder())
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${file.file_path}`;

    // Скачиваем фото или файл
    const response = await axios.get(fileUrl, { responseType: 'stream' });

    // Запрашиваем URL для загрузки на Яндекс Диск
    const timestamp = new Date().getTime(); // Получаем текущую метку времени
    const yandexDiskPath = `Industria/${folderName}/file_${timestamp}.jpg`; // Используем метку времени в имени файла
    const yandexDiskUploadUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(yandexDiskPath)}`;

    yandexDiskUploadResponse = await axios.get(yandexDiskUploadUrl, {
      headers: {
        'Authorization': `OAuth ${yandexDiskToken}`,
      },
    });

    if (yandexDiskUploadResponse.status === 200) {
      uploadUrl = yandexDiskUploadResponse.data.href;

      // Загружаем фото или файл на полученный URL
      yandexDiskUploadResponse = await axios.put(uploadUrl, response.data, {
        headers: {
          'Content-Type': response.headers['content-type'],
          'Content-Length': response.headers['content-length'],
        },
      });

      if (yandexDiskUploadResponse.status === 201) {
        bot.sendMessage(chatId, 'Фото или файл успешно загружены на Яндекс Диск.');
      } else {
        bot.sendMessage(chatId, 'Произошла ошибка при загрузке на Яндекс Диск.');
      }
    } else {
      bot.sendMessage(chatId, 'Произошла ошибка при запросе URL для загрузки на Яндекс Диск.');
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке фото или файла.');
  }
});

bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  try {
    const folderName = await createFolder(); // Создаем папку
    if (folderName) {
      const file = await bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${file.file_path}`;
      

    // Скачиваем файл
    const response = await axios.get(fileUrl, { responseType: 'stream' });

    // Запрашиваем URL для загрузки на Яндекс Диск
    const timestamp = new Date().getTime();
    const yandexDiskPath = `Industria/${folderName}/file_${timestamp}.jpg`;
    const yandexDiskUploadUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(yandexDiskPath)}`;

    yandexDiskUploadResponse = await axios.get(yandexDiskUploadUrl, {
      headers: {
        'Authorization': `OAuth ${yandexDiskToken}`,
      },
    });

    if (yandexDiskUploadResponse.status === 200) {
      uploadUrl = yandexDiskUploadResponse.data.href;

      // Загружаем файл на полученный URL
      yandexDiskUploadResponse = await axios.put(uploadUrl, response.data, {
        headers: {
          'Content-Type': response.headers['content-type'],
          'Content-Length': response.headers['content-length'],
        },
      });

      if (yandexDiskUploadResponse.status === 201) {
        bot.sendMessage(chatId, 'Файл успешно загружен на Яндекс Диск.');
      } else {
        bot.sendMessage(chatId, 'Произошла ошибка при загрузке файла на Яндекс Диск.');
      }
    } else {
      bot.sendMessage(chatId, 'Произошла ошибка при запросе URL для загрузки файла на Яндекс Диск.');
    }
}
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке файла.');
  }
});
// Обработчик текстовых сообщений
bot.onText(/(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  bot.sendMessage(chatId, `Вы отправили текстовое сообщение: ${text}`);
});

// Запускаем бота
console.log('Бот запущен.');