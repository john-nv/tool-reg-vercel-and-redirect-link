const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const slug = require('slug');
require('dotenv').config()
const multer = require('multer');
const app = express();
const mongoose = require('mongoose');

const db = require('./db/mongo')
const port = process.env.PORT || 3003;
const tokenVercel = process.env.TOKEN_VERCEL
const { domainSchema, linkSchema } = require('./schemas/index')

db.connect()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer();
app.post('/deploy', async (req, res) => {
  let { domain } = req.body
  console.log(domain)
  console.log(req.body)
  domain = slug(domain)
  if (!domain)  return res.status(400).json({ error: 1, message: 'Domain is required' });

  if (!fs.existsSync(domain)) {
    fs.mkdirSync(domain);
    fs.writeFileSync(`${domain}/index.html`, generateIndexHtml('<h1>Tạo nội dung trang web</h1>'));
  } else {
    console.log(`danh muc '${domain}' da ton tai.`);
    return res.json({message: `Domain '${domain}' đã tồn tại`})
  }
  console.log('Triển khai dự án')

  try {
    const output = execSync(`vercel --token ${tokenVercel} --prod --yes ${domain}`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    console.log(output);

    await domainSchema.create({domain})

    return res.status(201).json({ 
      error: 0, 
      message: 'Deployment successful', 
      domainUrl: `https://${domain}.vercel.app`,
      domain: domain,
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 1, note:'Deployment failed', message: error.message });
  }
});

app.post('/add-slug', upload.single('image'), async (req, res) => {
    let { domain, name, description, title, link } = req.body;
    let image = req.file || null;

    let nameFile = slug(name)

    if (!domain || !name || !description || !title || !link || !image) {
        return res.status(400).json({ error: 'Cung cấp đầy đủ các thông số và tệp ảnh' });
    }

    const folderPath = domain;
    const filePath = `${folderPath}/${nameFile}.html`;
    const nameFileImage = `${String(Date.now())}-${slug(image.originalname)}.jpg`;
    const imagePath = `${folderPath}/${nameFileImage}`;


    try {
      if(image) fs.writeFileSync(imagePath, image.buffer);
      if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, generateIndexHtml(name, title, description, link, nameFileImage));
      } else {
          console.log(`slug '${filePath}' đã tồn tại.`);
          return res.status(400).json({
              error: 1,
              message: `slug '${filePath}' đã tồn tại.`
          });
      }

        execSync(`cd ${domain}`);
        const output = execSync(`vercel --token ${tokenVercel} --prod --yes`, {
            cwd: folderPath,
            stdio: 'inherit',
        });

        console.log('output');
        console.log(output);

        console.log(domain, 'https://${domain}.ve rcel.app/${nameFile}.html')
        await linkSchema.create({domain, link: `https://${domain}.vercel.app/${nameFile}.html`})
        res.json({
            success: true,
            error: 0,
            message: 'Successfully',
            name,
            title,
            description,
            redirect: link,
            linkWeb: `https://${domain}.vercel.app/${nameFile}.html`,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/get-domain',async (req, res) => {
  const data = await domainSchema.find()
  return res.status(200).json(data) 
})

app.get('/get-link',async (req, res) => {
  const data = await linkSchema.find()
  return res.status(200).json(data) 
})
  
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function generateIndexHtml(name, title, description,link, imageLink) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <!-- Meta tags for sharing -->
        <meta property="og:title" content="${name}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${imageLink}">
        <link rel="icon" href="favicon.ico" type="image/x-icon">

        <title>${title}</title>
    </head>
    <body>
      <script>
        window.location.href = '${link}';
      </script>
    </body>
    </html>
    `;
}