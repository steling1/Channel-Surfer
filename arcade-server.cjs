const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer((req,res)=>{
  let file;
  try { const url=new URL(req.url,'http://localhost');file=path.resolve(__dirname,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)); } catch {res.writeHead(400);return res.end('Bad request');}
  if(!file.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(err?'Not found':data);});
}).listen(process.env.PORT||5173,'0.0.0.0',()=>console.log('Channel Surf ready at http://localhost:'+(process.env.PORT||5173)));
