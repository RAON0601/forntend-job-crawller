const fs = require("fs");
const cron = require("node-cron");
const puppeteer = require("puppeteer");
const { sendMessageToSlack } = require("./slackbot");
const { uploadFileToS3 } = require("./s3");

function extractItems() {
  // 브라우저에서 동작하는 코드들
  const extractedElements = document.querySelectorAll(
    "ul[data-cy='job-list'] li"
  );

  // 여기 코드는 직접 DOM을 해석하여 셀렉터를 사용해야 한다.
  const items = [];
  for (const element of extractedElements) {
    const link = element.querySelector("a").href;
    const position = element.querySelector(".job-card-position").innerHTML;
    const company = element.querySelector(".job-card-company-name").innerHTML;
    items.push({ link, position, company });
  }
  return items;
}

async function scrapeItems(page, extractItems, scrollDelay = 2000) {
  let previousHeight;
  let curRetryCount = 0;
  const MAX_RETRY_COUNT = 20;

  while (curRetryCount < MAX_RETRY_COUNT) {
    // 페이지를 계속 끝으로 이동 시킨다.
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    // 데이터 로드 기다리기
    await page.waitForTimeout(scrollDelay);
    // 페이지를 끝으로 이동 시킨다.
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    // 이전 페이지와 현재 페이지가 같다면 끝인가?
    if (currentHeight <= previousHeight) {
      console.log(`Retry Count:${curRetryCount}`);
      curRetryCount++;
    }
  }

  return await page.evaluate(extractItems);
}

async function main() {
  sendMessageToSlack("채용 공고 수집을 시작합니다");
  const URL =
    "https://www.wanted.co.kr/wdlist/518/669?country=kr&job_sort=company.response_rate_order&years=-1&locations=all";

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // chrome 보안 관련 설정 잘 몰르겠음
    });

    // 브라우저를 연다
    const page = await browser.newPage();
    // URL 이동
    await page.goto(URL);
    // 채용공고 수집
    const infos = await scrapeItems(page, extractItems);
    const filteredInfos = infos
      .map((info) => ({ ...info, position: info.position?.toLowerCase() }))
      .filter(
        (info) =>
          info.position.includes("프론트") ||
          info.position.includes("front") ||
          info.position.includes("웹") ||
          info.position.includes("web") ||
          info.position.includes("풀스택") ||
          info.position.includes("full") ||
          info.position.includes("react") ||
          info.position.includes("리액트")
      );
    fs.writeFileSync("./info.json", JSON.stringify(filteredInfos));
    await uploadFileToS3("./info.json");
    await browser.close();
    sendMessageToSlack(`총 채용 공고: ${filteredInfos.length}`);
  } catch (e) {
    sendMessageToSlack("채용 공고 수집중 에러가 발생했습니다");
  }
}

sendMessageToSlack("serverStart");
const startServer = async () => {
  await main();
};

startServer();
// cron.schedule("0 0 8 * * *", async () => {
//   await main();
// });
