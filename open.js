const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { Cluster } = require('puppeteer-cluster');
const XLSX = require('xlsx');

const run = async () => {
  const results = [];

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--incognito'],
  });
}

// Đường dẫn đến tệp danh sách User Agents
const userAgentsFile = 'user_agents.txt';

// Đọc danh sách User Agents từ tệp
const userAgentsList = fs
  .readFileSync(userAgentsFile, 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0);


const inputFile = 'uid_list.txt';
const outputFile = 'results.xlsx';

const uidList = fs
  .readFileSync(inputFile, 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .map((uid) => `https://www.facebook.com/${uid}`);

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 3,
    puppeteerOptions: {
      headless: true,
      defaultViewport: null,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--incognito'],
    },
  });

  cluster.on('taskerror', (err, data) => {
    console.error(`Error occurred while processing URL: ${data}: ${err.message}`);
  });

  cluster.task(async ({ page, data: url }) => {

    await page.goto(url, { waitUntil: 'networkidle0' });

    const aboutURL = `${url}/about`;
    await page.goto(aboutURL);

    const result = await page.evaluate(() => {
      const hasText = (element) => element && element.textContent.trim().length > 0;
      const description = Array.from(document.querySelectorAll('span[style="-webkit-box-orient: vertical;"]')).find(e => e.textContent.includes('Intro'));
      const likeCountElement = Array.from(document.querySelectorAll('[tabindex="0"]')).find(e => e.textContent.includes('likes'));
      const followCountElement = Array.from(document.querySelectorAll('[tabindex="0"]')).find(e => e.textContent.includes('followers'));
      const emailRegExp = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,6}/;
      const emailElement = Array.from(document.querySelectorAll('')).find(e => e.textContent.match(emailRegExp));
      const phoneNumberRegExp = /some-regular-expression-for-phone-number/;
      const phoneNumberElement = Array.from(document.querySelectorAll('*')).find(e => e.textContent.match(phoneNumberRegExp));
      const addressElement = Array.from(document.querySelectorAll('[data-pagelet="ProfileAppSection_0"]')).find(e => e.querySelector('span span').textContent.includes('Địa chỉ'));
      const businessHoursElement = Array.from(document.querySelectorAll('[data-pagelet="ProfileAppSection_0"]')).find(e => e.querySelector('span span').textContent.includes('Giờ hoạt động'));
      const websiteElement = Array.from(document.querySelectorAll('a')).find(e => e.href.includes(url) && e.textContent.includes('Trang web'));
      const avatar = document.querySelector('circle[fill="white"]');
      const cover = document.querySelector('img[data-imgperflogname="profileCoverPhoto"]');
      const username = new URL(win  dow.location.href).pathname.slice(1).replace;

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
        website: websiteElement && websiteElement.style.color === 'có' ? websiteElement.href : 'không có',
        avatar: avatar ? 'có' : 'không có',
        bia: cover ? 'có' : 'không có',
      };
    });

    console.log(result);

    results.push(result);
  });


const results = [];
  for (let i = 0; i < uidList.length; i++) {
    const uid = uidList[i];

    // Chọn một User Agent ngẫu nhiên từ danh sách User Agents
    const userAgent = getRandomUserAgent();

    cluster.queue(uid, uid => uid);

    if ((i + 1) % 100 === 0) {
      await cluster.idle();
      await cluster.close();
      await cluster.launch();
    }
  }

  await cluster.idle();
  await cluster.close();

  const ws = XLSX.utils.json_to_sheet(results);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');
  XLSX.writeFile(wb, outputFile);
})();

function getRandomUserAgent() {
  return userAgentsList[Math.floor(Math.random() * userAgentsList.length)];
}


run().catch(error => {
  console.error(error);
});
