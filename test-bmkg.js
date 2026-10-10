const http = require('http');
http.get('http://localhost:3005/api/bmkg/gempaterkini', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const json = JSON.parse(body);
    const list = json.data?.Infogempa?.gempa || json.Infogempa?.gempa || [];
    console.log("Length:", list.length);
  });
});
