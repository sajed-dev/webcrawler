import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import got from 'got';
import fs from 'fs';
import uri from 'node-uri';



let loadedUrls = [];

const url = process.argv[2];

if(!url)
    throw 'Url is mandatory';

console.log('Url is: ', url);

loadedUrls.push(url);

const parsedUrl = uri.parseURI(url);
const host = parsedUrl.host;

const depth = process.argv[3] || 0;

console.log('Depth is: ', depth);

let results = [];

function selectImages(src, _depth, _url) {
    let imageUrl = src;

    if (imageUrl.startsWith(':')) {
        imageUrl = imageUrl.substring(1);
    }

    if (imageUrl.startsWith('//')) {
        imageUrl = imageUrl.substring(2);
    }

    if (imageUrl.startsWith('/')) {
        imageUrl = imageUrl.substring(1);
    }

    if (!imageUrl.startsWith(`${parsedUrl.scheme}://`)) {
        imageUrl = `${parsedUrl.scheme}://` + imageUrl;
    }

    let item = {depth: _depth, imageUrl, sourceUrl: _url};

    console.log('adding new item to results: ', item);

    results.push(item);
}

const load = async (_url, _depth) => {


console.log(`Loading page url=${_url}     depth=${_depth}`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the web page
    await page.goto(_url);

    // Wait for the images to load (you might need to customize this based on your specific page)
    await page.waitForTimeout(5000); // Wait for 5 seconds as an example

    // Get the HTML content of the page
    const body = await page.content();

    /*const {body} = await got(_url).catch(err => {
        //console.log(err);
        return {};
    });*/

    if(!body) return;

    const $ = cheerio.load(body);

    $('img').get().map(img => {

        let imageUrl = img.attribs.src;
        selectImages(imageUrl, _depth, _url);

    });

    let elements = $('*[style*="background-image"]').get();
    elements.map(element => {

        let imageUrl = element.attribs.style.match(/url\(["']?(.*?)["']?\)/)[1];
        selectImages(imageUrl, _depth, _url);

    });

    if (_depth == depth) return;

    _depth++;

    const links = $('a').get();

    for (const a of links) {

        if(a.attribs.href == _url) continue;

        let link = a.attribs.href.endsWith('/')? a.attribs.href.slice(0, -1) : a.attribs.href;

        if(!link) continue;

        // check if the new link is already searched
        if(loadedUrls.includes(link) || loadedUrls.includes(a.attribs.href)) continue;

        if(link == _url) continue;

        //check if this link is external
        const parsedLink = uri.parseURI(link);
        if(host != parsedLink.host) continue;


        if (link.indexOf('http') != -1) {
            await load(link, _depth);
        }else if(link.startsWith('/')){
            await load(url + link, _depth);
        }
    }

    loadedUrls.push(_url);

};

load(url, 0).then(()=>{

    console.log(results);
    fs.writeFile("results.json", JSON.stringify(results, null, 2), 'utf8', (err) => {

        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }

        console.log("JSON file has been saved.");
    })

});


