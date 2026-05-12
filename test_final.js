const http = require('http');
const WebSocket = require('ws');

async function runTest() {
    console.log("--- Titan Diagnostic Test Starting ---");
    
    const getTabs = () => new Promise((resolve) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
    });

    const tabs = await getTabs();
    const wsUrl = tabs[0].webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    let id = 0;
    const send = (method, params = {}) => {
        return new Promise((resolve, reject) => {
            const msgId = ++id;
            const listener = (data) => {
                const res = JSON.parse(data);
                if (res.id === msgId) {
                    ws.removeListener('message', listener);
                    if (res.error) reject(res.error);
                    else resolve(res.result);
                }
            };
            ws.on('message', listener);
            ws.send(JSON.stringify({ id: msgId, method, params }));
        });
    };

    ws.on('open', async () => {
        try {
            console.log("Connected. Enabling domains...");
            await send('Page.enable');
            await send('Runtime.enable');

            // Log console messages from the browser
            ws.on('message', (data) => {
                const msg = JSON.parse(data);
                if (msg.method === 'Runtime.consoleAPICalled') {
                    console.log(`[BROWSER CONSOLE] ${msg.params.args.map(a => a.value).join(' ')}`);
                }
            });

            console.log("Navigating to Pixel Bins...");
            await send('Page.navigate', { url: 'http://127.0.0.1:8888' });
            await new Promise(r => setTimeout(r, 8000));

            const testHero = "Robot_" + Math.floor(Math.random()*1000);
            console.log(`--- PHASE 1: Sign up ${testHero} ---`);

            await send('Runtime.evaluate', { expression: `
                (async () => {
                    console.log("Robot: Clicking JOIN...");
                    document.getElementById('btn-join').click();
                    await new Promise(r => setTimeout(r, 1000));
                    
                    console.log("Robot: Filling form...");
                    document.getElementById('name').value = '${testHero}';
                    document.getElementById('hood').value = 'Automated Sector';
                    document.getElementById('name').value = 'robot@titan.com';
                    
                    console.log("Robot: Clicking PUBLISH...");
                    document.getElementById('submit-btn').click();
                })()
            `});

            await new Promise(r => setTimeout(r, 12000)); // Long wait for sync

            console.log("--- PHASE 2: Verifying Local Appearance ---");
            const check1 = await send('Runtime.evaluate', { expression: `!!document.querySelector('[data-name="${testHero}"]')` });
            console.log("- Found hero on page:", check1.result.value);

            console.log("--- PHASE 3: Hard Refresh ---");
            await send('Page.reload');
            await new Promise(r => setTimeout(r, 10000));

            console.log("--- PHASE 4: Verifying Persistence ---");
            const check2 = await send('Runtime.evaluate', { expression: `!!document.querySelector('[data-name="${testHero}"]')` });
            
            if (check2.result.value) {
                console.log("--- FINAL STATUS: SUCCESS (PERSISTENCE VERIFIED) ---");
            } else {
                console.error("--- FINAL STATUS: FAILED (DATA LOST) ---");
            }

            const screenshot = await send('Page.captureScreenshot');
            require('fs').writeFileSync('/data/data/com.termux/files/home/revo-ops/pixel-bins/test_diagnostic.png', Buffer.from(screenshot.data, 'base64'));
            console.log("Diagnostic Screenshot saved: test_diagnostic.png");

            ws.close();
            process.exit(check2.result.value ? 0 : 1);

        } catch (err) {
            console.error("Critical Test Error:", err);
            ws.close();
            process.exit(1);
        }
    });
}

runTest();
