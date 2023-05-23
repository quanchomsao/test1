const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { Cluster } = require('puppeteer-cluster');
const XLSX = require('xlsx');

const results = [];

// Đường dẫn đến tệp danh sách User Agents
const userAgentsFile = 'user_agents.txt';

// Đọc danh sách User Agents từ tệp
const userAgentsList = fs
  .readFileSync(userAgentsFile, 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

function getRandomUserAgent() {
  return userAgentsList[Math.floor(Math.random() * userAgentsList.length)];
}

(async () => {
  const inputFile = 'uid_list.txt';
  const outputFile = 'results.xlsx';

  const uidList = fs
    .readFileSync(inputFile, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 10,
    puppeteerOptions: {
      headless: false,
      defaultViewport: null,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--disable-infobars',
        '--incognito',
      ],
    },
  });

  cluster.on('taskerror', (err, data) => {
    console.error(`Error occurred while processing URL: ${data}: ${err.message}`);
  });

  await cluster.task(async ({ page: taskPage, data: url, worker }) => {
    const uid = url.replace('https://www.facebook.com/', '');

    // Chọn một User Agent ngẫu nhiên từ danh sách User Agents
    const userAgent = getRandomUserAgent();

    const page = await taskPage.browser().newPage();

    await page.setUserAgent(userAgent);

    await page.waitForTimeout(Math.floor(Math.random() * 10000) + 5000);

    await page.goto(url);

    await page.waitForTimeout(5000);

    const result = await page.evaluate((url) => {
      const hasText = (element) => element && element.textContent.trim().length > 0;

      const description = Array.from(document.querySelectorAll('span[style*="-webkit-box-orient: vertical;"]')).find(e => e.textContent.includes('Intro'));
      const likeCountElement = Array.from(document.querySelectorAll('[tabindex="0"]')).find(e => e.textContent.includes('likes'));
      const followCountElement = Array.from(document.querySelectorAll('[tabindex="0"]')).find(e => e.textContent.includes('followers'));

      const emailRegExp = /[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}/;
      const emailElement = Array.from(document.querySelectorAll('*')).find(e => e.textContent.match(emailRegExp));
      const phoneNumberRegExp = /(\+84|0)[0-9]{9,10}/;
      const phoneNumberElement = Array.from(document.querySelectorAll('*')).find(e => e.textContent.match(phoneNumberRegExp));

      const addressElement = Array.from(document.querySelectorAll('[data-pagelet="ProfileAppSection_0"]')).find(e => e.querySelector('span span').textContent.includes('Address'));
      const businessHoursElement = Array.from(document.querySelectorAll('[data-pagelet="ProfileAppSection_0"]')).find(e => e.querySelector('span span').textContent.includes('Hours'));
      const websiteElement = Array.from(document.querySelectorAll('a')).find(e => e.href.includes(url) && e.textContent.includes('http'));

      const avatar = document.querySelector('circle[fill="white"]');
      const cover = document.querySelector('img[data-imgperflogname="profileCoverPhoto"]');

      const username = new URL(window.location.href).pathname.slice(1).replace(/\/$/, '');

      return {
        url,
        username,
        description: hasText(description) ? 'có' : 'không có',
        like: likeCountElement ? likeCountElement.textContent.trim() : 'không có',
        follow: followCountElement ? followCountElement.textContent.trim() : 'không có',
        email: emailElement ? emailElement.textContent.match(emailRegExp)[0] : 'không có',
        sdt: phoneNumberElement ? phoneNumberElement.textContent.match(phoneNumberRegExp)[0] : 'không có',
        diaChi: addressElement ? addressElement.querySelector('div[role="presentation"]').textContent.trim() : 'không có',
        gioHoatDong: businessHoursElement && businessHoursElement.querySelector('div[role="presentation"]').style.color === '#31a24c' ? businessHoursElement.querySelector('div[role="presentation"]').textContent.trim() : 'không có',
        website: websiteElement && websiteElement.style.color === 'hsl(214, 89%, 52%)' ? websiteElement.href : 'không có',
        avatar: avatar ? 'có' : 'không có',
        bia: cover ? 'có' : 'không có',
      };
    }, url);

    console.log(result);

    results.push(result);

    await page.close();
  });

  for (const uid of uidList) {
    cluster.queue('https://www.facebook.com/' + uid);
  }

  await cluster.idle();
  await cluster.close();

  const ws = XLSX.utils.json_to_sheet(results);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');
  XLSX.writeFile(wb, outputFile);
})();
