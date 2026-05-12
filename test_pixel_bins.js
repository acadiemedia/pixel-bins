const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  console.log("--- STARTING VERIFICATION TEST ---");
  
  try {
    // 1. Navigate to the local server
    await page.goto('http://192.168.10.111:7777', { waitUntil: 'networkidle' });
    console.log("1. Page loaded.");

    // 2. Click Join Now
    await page.click('#btn-join');
    console.log("2. Switched to Join view.");

    // 3. Fill out the form with a unique name
    const testHeroName = "TitanBot_" + Math.floor(Math.random() * 1000);
    await page.fill('#reg-name', testHeroName);
    await page.fill('#reg-neighborhood', 'Test Sector');
    await page.fill('#reg-contact', 'bot@test.com');
    console.log(`3. Form filled for: ${testHeroName}`);

    // 4. Submit
    // We expect an alert, so we handle it
    page.once('dialog', async dialog => {
      console.log(`- Alert detected: ${dialog.message()}`);
      await dialog.dismiss();
    });
    
    await page.click('#submit-btn');
    console.log("4. Submit clicked. Waiting for sync...");
    
    // Wait for view to switch back to home
    await page.waitForSelector('#home-view.active', { timeout: 10000 });
    console.log("5. Returned to Home view.");

    // 5. Check if profile appears immediately
    const content = await page.textContent('#profiles-container');
    if (content.includes(testHeroName)) {
      console.log("6. SUCCESS: Profile appeared locally.");
    } else {
      throw new Error("FAIL: Profile did not appear locally.");
    }

    // 6. Hard Refresh and check again
    console.log("7. Performing HARD REFRESH...");
    await page.reload({ waitUntil: 'networkidle' });
    
    const contentAfterRefresh = await page.textContent('#profiles-container');
    if (contentAfterRefresh.includes(testHeroName)) {
      console.log("8. SUCCESS: Profile PERSISTED after refresh.");
    } else {
      throw new Error("FAIL: Profile LOST after refresh.");
    }

    console.log("--- TEST PASSED: PERSISTENCE VERIFIED ---");
    await page.screenshot({ path: '/data/data/com.termux/files/home/revo-ops/pixel-bins/test_success.png' });
    
  } catch (err) {
    console.error("--- TEST FAILED ---");
    console.error(err);
    await page.screenshot({ path: '/data/data/com.termux/files/home/revo-ops/pixel-bins/test_fail.png' });
  } finally {
    await page.close();
  }
})();
