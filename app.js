const express = require('express')
const path = require("path");
const app = express()
const fs = require('fs'); 
// Specify a directory to serve files from
const publicDirectoryPath = path.join(__dirname, '/public');
app.use(express.static(publicDirectoryPath));
app.use(express.json({ limit: '100000mb' }));
// Create a directory if it doesn't exist
if (!fs.existsSync(publicDirectoryPath)){
    fs.mkdirSync(publicDirectoryPath);
}

// #############################################################################
// Logs all request paths and method
app.use(function (req, res, next) {
  res.set('x-timestamp', Date.now())
  res.set('x-powered-by', 'cyclic.sh')
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.path}`);
  next();
});
// create a route for the app to create jsonl file with received data
app.post('/create', (req, res) => {
  // Generate a unique filename
  const uniqueFilename = `finetune_${Date.now()}_${Math.floor(Math.random() * 1000)}.jsonl`;
  const filePath = path.join(publicDirectoryPath, uniqueFilename);

  // Create jsonl file with received data
  const data = req.body;
  console.log(data)
  const jsonl = data.map((item) => JSON.stringify(item)).join('\n');

  fs.writeFile(filePath, jsonl, (err) => {
    if (err) {
      console.error('Error saving file:', err);
      res.status(500).send('Error saving file');
    } else {
      console.log('The file has been saved!');
      // Return the download URL
      const downloadUrl = `http://${req.headers.host}/${uniqueFilename}`;
      res.send({ downloadUrl });
    }
  });
});

// #############################################################################
// This configures static hosting for files in /public that have the extensions
// listed in the array.
var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['htm', 'html','css','js','ico','jpg','jpeg','png','svg'],
  index: ['index.html'],
  maxAge: '1m',
  redirect: false
}
app.use(express.static('public', options))

// #############################################################################
// Catch all handler for all other request.
app.use('*', (req,res) => {
  res.json({
      at: new Date().toISOString(),
      method: req.method,
      hostname: req.hostname,
      ip: req.ip,
      query: req.query,
      headers: req.headers,
      cookies: req.cookies,
      params: req.params
    })
    .end()
})

module.exports = app
