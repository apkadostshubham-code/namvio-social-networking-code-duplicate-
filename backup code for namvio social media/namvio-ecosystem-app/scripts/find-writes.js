const fs = require('fs');
const lines = fs.readFileSync(
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl',
    'utf8'
).split('\n');

for (const line of lines) {
    if (!line.includes('index.html')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.params?.update?.sessionUpdate !== 'tool_call') continue;
    const tc = raw.params.update.toolCall;
    if (tc?.title !== 'Write') continue;
    if (!(tc.rawInput?.path || '').includes('index.html')) continue;
    const c = tc.rawInput.contents || '';
    console.log(raw.timestamp, c.length, {
        chats: c.includes('view-chats'),
        admin: c.includes('view-admin'),
        legal: c.includes('view-legal'),
        supportRemoved: !c.includes('view-guide') && !c.includes('view-rules') && !c.includes('view-help'),
        motion: c.includes('motion-graphics')
    });
}