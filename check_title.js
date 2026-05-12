const http = require('http');
const WebSocket = require('ws');

async function checkTitle() {
    const getTabs = () => new Promise((resolve) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
        });
    });

    const tabs = await getTabs();
    const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

    let id = 0;
    const send = (method, params = {}) => {
        return new Promise((resolve) => {
            const msgId = ++id;
            const listener = (data) => {
                const res = JSON.parse(data);
                if (res.id === msgId) { ws.removeListener('message', listener); resolve(res.result); }
            };
            ws.on('message', listener);
            ws.send(JSON.stringify({ id: msgId, method, params }));
        });
    };

    ws.on('open', async () => {
        console.log("Connected.");
        await send('Page.navigate', { url: 'http://127.0.0.1:8888' });
        await new Promise(r => setTimeout(r, 5000));
        const res = await send('Runtime.evaluate', { expression: 'document.title' });
        console.log("PAGE TITLE:", res.result.value);
        ws.close();
        process.exit(0);
    });
}
checkTitle();
