const express = require('express')
const path = require("path");
const app = express()
const fs = require('fs'); 
const AWS = require("aws-sdk");
const s3 = new AWS.S3()

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
app.post('/create', async (req, res) => {
  // Generate a unique filename
  const uniqueFilename = `prosperitydata_${Date.now()}_${Math.floor(Math.random() * 1000)}.jsonl`;

  // Create jsonl file with received data
  const data = req.body;
  const jsonl = data.map((item) => JSON.stringify(item)).join('\n');

  try {
    // Upload the file to S3
    await s3.putObject({
      Body: jsonl,
      Bucket: process.env.BUCKET,
      Key: uniqueFilename,
      ContentType: 'application/json',
    }).promise();

    // Construct the file URL

    // Send the file URL as response
    res.send({ fileName: uniqueFilename });

       setTimeout(() => {
       await s3.deleteObject({
    Bucket: process.env.BUCKET,
    Key: uniqueFilename,
  }).promise()

      }, 60000); 
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    res.status(500).send('Error uploading file');
  }
});

app.get('/download/:filename', async (req, res) => {
  const filename = req.params.filename;

  try {
    let s3File = await s3.getObject({
      Bucket: process.env.BUCKET,
      Key: filename,
    }).promise();

    // Set headers to prompt download
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-Type', s3File.ContentType);

    // Pipe the S3 file stream directly to the response
    res.send(s3File.Body);
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      console.log(`No such key: ${filename}`);
      res.status(404).send('File not found');
    } else {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }
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
