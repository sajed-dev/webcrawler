import cheerio from 'cheerio';
import got from 'got';
import fs from 'fs';

const url = process.argv[2];

if(!url)
    throw 'Url is mandatory';

const depth = process.argv[3] || 0;



let results = [];

const load = async (_url, _depth) => {



    const {body} = await got(_url).catch(err => {
        //console.log(err);
        return {};
    });

    if(!body) return;

    const $ = cheerio.load(body);

    $('img').get().map(img => {

        let imageUrl = img.attribs.src;
        results.push({depth: _depth, imageUrl, sourceUrl: _url});

    });

    if (_depth == depth) return;

    _depth++;

    const links = $('a').get();
    for (const a of links) {
        if(a.attribs.href == _url) continue;

        let link = a.attribs.href.endsWith('/')? a.attribs.href.slice(0, -1) : a.attribs.href;

        if(link == _url) continue;

        if (link.indexOf('http') != -1) {
            await load(link, _depth);
        }else if(link.startsWith('/')){
            await load(url + link, _depth);
        }
    }

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


