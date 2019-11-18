import {resolve} from 'path';
import {readFileSync, unlinkSync, readdirSync} from 'fs';
import express from 'express';
import helmet from 'helmet';
import MobileDetect from 'mobile-detect';
import Twig from 'twig';
import {createLogger, format, transports} from "winston";
import onFinished from 'on-finished';
import themeparks, {forSiteMaps} from './themeparks';
import moment from "moment-timezone";
import slugify from "slugify";
import minifyHTML from 'express-minify-html';

const logger = createLogger({
    format: format.cli(),
    transports: [new transports.Console()]
});

Twig.extendFunction('asset', (assetFile) => {
    try {
        const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/manifest.json')).toString());
        return manifest[assetFile] || assetFile;
    } catch (e) {
        logger.warn('No manifest file found.', e);
        return assetFile;
    }
});

Twig.extendFilter('timeFromNow', (time) => {
    return moment(time).fromNow();
});

Twig.extendFilter('slug', (string) => {
    return slugify(string, {lower: true});
});

Twig.extendFilter('timezoned', (date, [timezone, format = 'hh:mm A']) => {
    let now;

    if (date === 'now') {
        now = moment();
    } else {
        now = moment(date);
    }
    return now.tz(timezone).format(format);
});

const app = express();

const getip = (req) => {
    return req.ip ||
        req._remoteAddress ||
        (req.connection && req.connection.remoteAddress) ||
        req.headers['x-forwarded-for'] ||
        undefined
};

const pad2 = (num) => {
    const str = String(num);
    return (str.length === 1 ? '0' : '') + str
};

const clfdate = (dateTime) => {
    const date = dateTime.getUTCDate();
    const hour = dateTime.getUTCHours();
    const mins = dateTime.getUTCMinutes();
    const secs = dateTime.getUTCSeconds();
    const year = dateTime.getUTCFullYear();
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateTime.getUTCMonth()];

    return pad2(date) + '/' + month + '/' + year +
        ':' + pad2(hour) + ':' + pad2(mins) + ':' + pad2(secs) +
        ' +0000'
};

let version = '';
try {
    version = readFileSync(resolve(process.cwd(), '.version')).toString().trim()
} catch (e) {
    logger.warn(`${e}`);
}
app.locals = {...app.locals, version: version.length > 0 ? version : `${Date.now()}`};
app.use((req, res, next) => {
    app.locals = {
        ...app.locals,
        md: new MobileDetect(req.headers['user-agent'])
    };
    next();
});

app.set('view engine', 'twig');
app.use(helmet());
app.use((req, res, next) => {
    let startTime = Date.now();
    onFinished(res, () => {
        let duration = Date.now() - startTime;
        const logLevel = (res.statusCode >= 200 && res.statusCode < 500) ? 'info' : 'warn';
        logger[logLevel](`${getip(req)} - ${clfdate(new Date())} "${req.method} ${req.originalUrl || req.url} HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}" ${res.statusCode} ${res.getHeader('content-length')} ${duration}ms`);
    });
    next();
});

app.use('/', express.static(resolve(process.cwd(), 'public'), {cacheControl: process.env.NODE_ENV === 'production'}));
app.get('/sitemap.xml', (req, res) => {
    res.render('sitemap.xml.twig', {entries: [{path: '', date: '2019-11-29'}, ...forSiteMaps]}, (err, html) => {
        res.set('Content-Type', 'text/xml');
        res.send(html);
    });
});
app.use('/', minifyHTML({
    override:      true,
    exception_url: false,
    htmlMinifier: {
        removeComments:            true,
        collapseWhitespace:        true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes:     true,
        removeEmptyAttributes:     true,
        minifyJS:                  true
    }
}), themeparks);

logger.debug('Cleaned previous sockets ' + readdirSync(process.cwd())
    .filter(filename => filename.endsWith('.sock'))
    .map(previousSocket => {
        unlinkSync(`${process.cwd()}/${previousSocket}`);
        return `${previousSocket}`;
    })
    .join(', ')
);

const socket =  process.env.THEMEPARKS_PORT || `${process.cwd()}/app.sock`;
const server = app.listen(socket, () => {
    logger.debug(`Server listening on ${server.address()}`);
});
