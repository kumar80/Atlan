const http = require('http');
const static = require('node-static');
const fileServer = new static.Server('.');
const path = require('path');
const fs = require('fs');
const uploads = Object.create(null);

function onUpload (req,res) {
    const fileId = req.headers['file-id'];
    const start = +req.headers['start'];

    if(!fileId)   res.writeHead(400, "No file id");

    let filePath = path.join('./',fileId);

    if(!uploads[fileId]) uploads[fileId] = {};
    let upload = uploads[fileId];
    let fileStream;
    if(!start){
        upload.bytesReceived =0;
        fileStream = fs.createWriteStream(filePath, { flags:'w'});
    }
    else {
        if(upload.bytesReceived!=start) {
            res.writeHead(400,"Retry Upload");
            res.end(upload.bytesReceived);
        }
        fileStream = fs.createWriteStream(filePath, {flage :'a'});
    }

    req.on('data',(data)=>{
        upload.bytesReceived+=data.length;
    })
    req.pipe(fileStream);
    fileStream.on('close',()=>{
        if(upload.bytesReceived == req.headers['file-size']){
            delete uploads[fileId];
            res.end("success" + upload.bytesReceived);
        }
        else {
            res.end();
        }
    })
    fileStream.on('error',(err)=>{
        res.writeHead(500,"ERROR");
        res.end();
    })
}

function onStatus(req,res) {
    const fileId = req.headers['file-id'];
    const upload = uploads[fileId];
    if(!upload) res.end("0")
    else res.end(bytesReceived.toString(10));
}

function accept(req,res) {
    if(req.url == '/status') onStatus(req,res);
    else if(req.url == '/upload' && req.method == 'POST') onUpload(req,res);
    else fileServer.serve(req,res);
}

if(!module.parent){
    http.createServer(accept).listen(8080);
        console.log('Server at 8080');
}
else {
    exports.accept = accept;
}