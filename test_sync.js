const http = require('http');

async function testSync() {
    console.log("--- STARTING CDP TEST ---");
    
    // 1. Find the target tab
    const getTabs = () => new Promise((resolve) => {
        http.get('http://localhost:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
    });

    const tabs = await getTabs();
    const targetTab = tabs[0];
    const wsUrl = targetTab.webSocketDebuggerUrl;
    
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);

    let id = 0;
    const send = (method, params = {}) => {
        const msgId = ++id;
        return new Promise((resolve) => {
            const listener = (data) => {
                const res = JSON.parse(data);
                if (res.id === msgId) {
                    ws.removeListener('message', listener);
                    resolve(res.result);
                }
            };
            ws.on('message', listener);
            ws.send(JSON.stringify({ id: msgId, method, params }));
        });
    };

    ws.on('open', async () => {
        console.log("Connected to Chromium.");
        
        // Navigate
        await send('Page.navigate', { url: 'http://192.168.10.111:7777' });
        await new Promise(r => setTimeout(resolve, 5000));
        
        // Signup Simulation
        const testName = "TitanBot_" + Math.floor(Math.random()*100);
        console.log(`Testing with name: ${testName}`);
        
        await send('Runtime.evaluate', { expression: `
            document.getElementById('btn-join').click();
            setTimeout(() => {
                document.getElementById('reg-name').value = '${testName}';
                document.getElementById('reg-neighborhood').value = 'Test Zone';
                document.getElementById('reg-contact').value = 'bot@test.com';
                document.getElementById('submit-btn').click();
            }, 500);
        `});

        await new Promise(r => setTimeout(r, 5000));

        // Refresh
        console.log("Refreshing...");
        await send('Page.reload');
        await new Promise(r => setTimeout(r, 5000));

        // Verify
        const result = await send('Runtime.evaluate', { expression: `document.body.innerText.includes('${testName}')` });
        
        if (result.result.value) {
            console.log("--- TEST PASSED: PERSISTENCE VERIFIED ---");
        } else {
            console.error("--- TEST FAILED: DATA LOST AFTER REFRESH ---");
        }

        ws.close();
        process.exit(result.result.value ? 0 : 1);
    });
}

testSync();
