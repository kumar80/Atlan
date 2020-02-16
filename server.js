let http = require('http');
let static = require('node-static');
let fileServer = new static.Server('.');
let path = require('path');
let fs = require('fs');
//let console.log = require('console.log')('example:resume-upload');

let uploads = Object.create(null);

let dir = "./";

function onUpload(req, res) {

  let fileId = req.headers['x-file-id'];
  let startByte = +req.headers['x-start-byte'];

  if (!fileId) {
    res.writeHead(400, "No file id");
    res.end();
  }

  // we'll files "nowhere"
  //let filePath = '/dev/null';
  // could use a real path instead, e.g.
   let filePath = path.join(dir, fileId);

  console.log("onUpload fileId: "+ fileId);

  // initialize a new upload
  if (!uploads[fileId]) uploads[fileId] = {};
  let upload = uploads[fileId];

  console.log("bytesReceived:" + upload.bytesReceived + " startByte:" + startByte)

  let fileStream;

  // if startByte is 0 or not set, create a new file, otherwise check the size and append to existing one
  if (!startByte) {
    upload.bytesReceived = 0;
    fileStream = fs.createWriteStream(filePath, {
      flags: 'w'
    });
    console.log("New file created: " + filePath);
  } else {
    // we can check on-disk file size as well to be sure
    if (upload.bytesReceived != startByte) {
      res.writeHead(400, "Wrong start byte");
      res.end(upload.bytesReceived);
      return;
    }
    // append to existing file
    fileStream = fs.createWriteStream(filePath, {
      flags: 'a'
    });
    console.log("File reopened: " + filePath);
  }


  req.on('data', function(data) {
    console.log("bytes received "+ upload.bytesReceived);
    upload.bytesReceived += data.length;
  });

  // send request body to file
  req.pipe(fileStream);

  // when the request is finished, and all its data is written
  fileStream.on('close', function() {
    if (upload.bytesReceived == req.headers['x-file-size']) {
      console.log("Upload finished");
      delete uploads[fileId];
      // can do something else with the uploaded file here
    //  uploads = Object.create(null);
      res.end("Success " + upload.bytesReceived);
    } else {
      // connection lost, we leave the unfinished file around
      console.log("File unfinished, stopped at " + upload.bytesReceived);
      res.end();
    }
  });

  // in case of I/O error - finish the request
  fileStream.on('error', function(err) {
    console.log("fileStream error");
    res.writeHead(500, "File error");
    res.end();
  });

}

function onStatus(req, res) {
  let fileId = req.headers['x-file-id'];
  let upload = uploads[fileId];
  console.log("onStatus fileId: " + fileId +  " upload:" +  upload);
  if (typeof upload == 'undefined') {
    res.end("0")
  } else {
  //  res.end("0")
    res.end(String(upload.bytesReceived));
  }
}


function accept(req, res) {

  if(req.headers['x-quit'] == "1" ) {
    console.log("quitting")
    fs.access(req.headers['x-file-id'], fs.F_OK, (err) => {
      if (err) {
        console.error(err)
        return
      }    
      //file exists
      fs.unlink(req.headers['x-file-id'], function (err) {
        if (err) throw err;
        // if no error, file has been deleted successfully
        console.log('File deleted!');
        res.end();
    }); 
    })
  }

  if (req.url == '/status') {
    onStatus(req, res);
  } else if (req.url == '/upload' && req.method == 'POST') {
    onUpload(req, res);
  } else {
    fileServer.serve(req, res);
  }

}




// -----------------------------------

if (!module.parent) {
  http.createServer(accept).listen(8080);
  console.log('Server listening at port 8080');
} else {
  exports.accept = accept;
}