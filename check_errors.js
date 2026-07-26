const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.type(), msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  try {
    await page.goto('http://localhost:5180');
    // Wait for network idle to ensure the app loads
    await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});
  } catch (err) {
    console.log('Navigation Error:', err.message);
  }
  
  await browser.close();
})();
