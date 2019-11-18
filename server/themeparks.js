import {resolve} from 'path';
import {Router} from 'express';
import slugify from 'slugify';
import moment from 'moment';

import {Settings, AllParks} from 'themeparks';

Settings.Cache = resolve(process.env.DB_BASE_PATH || process.cwd(), 'themeparks.sqlite');

const themeparks = AllParks.map(constructor => new constructor());
const themeparksName = themeparks.map(park => park.Name);
/**
 * @var {[String]} themeparksSlug
 */
const themeparksSlug = themeparksName.map(name => slugify(name, {replacement: '-', lower: true, remove: /[^\w\s]/g}));

const router = Router();

router.get('/', (req, res, next) => {
    res.render('index', {themeparksName, themeparksSlug});
});

router.get(/^\/([a-z\-]+)$/, (req, res, next) => {
    const {0: slug} = req.params;
    const {ride: rideFocus} = req.query;
    let parkIndex;

    if ((parkIndex = themeparksSlug.indexOf(slug)) === -1) {
        return next();
    }

    const park = themeparks[parkIndex];
    const statusPriorities = {
        'Operating': 1,
        'Closed': 2,
        'Special': 3,
        'Down': 4,
        'Refurbishment': 5,
    };

    Promise.all([
        park.GetOpeningTimes(),
        park.GetWaitTimes()
    ]).then(([[schedule], waitTimes]) => {
        let schedulesCollection = [{type: schedule.type, openingTime: schedule.openingTime, closingTime: schedule.closingTime, }];

        (schedule.special || []).forEach(({type, openingTime, closingTime}) => {
            schedulesCollection.push({type, openingTime, closingTime });
        });

        schedulesCollection.sort((a, b) => {
            return moment(a.openingTime) - moment(b.openingTime);
        });

        schedulesCollection = schedulesCollection.map(schedule => {
            const now = moment();
            schedule.isActive = now >= moment(schedule.openingTime) && now <= moment(schedule.closingTime);
            return schedule;
        });

        const openedRides = waitTimes.filter(waitTime => waitTime.status === 'Operating').sort((a, b) => {
            return b.waitTime - a.waitTime
        });
        const otherRides = waitTimes.filter(waitTime => waitTime.status !== 'Operating').sort((a, b) => {
            return statusPriorities[a.status] - statusPriorities[b.status]
        });

        const rides = [...openedRides, ...otherRides];
        const followedRides = rides.filter((ride) => rideFocus && ride.id === rideFocus).map(item => item.name).join(', ');

        res.render('park', {slug, park, schedules: schedulesCollection, waitTimes: rides, followedRides, rideFocus: rideFocus || null})
    }).catch((e) => {
        console.error(e);
        next()
    });
});

router.get(/^\/refresh\/([a-z\-]+)$/, (req, res, next) => {
    const {0: slug} = req.params;
    let parkIndex;

    if ((parkIndex = themeparksSlug.indexOf(slug)) === -1) {
        return next();
    }

    const park = themeparks[parkIndex];

    park.GetWaitTimes()
        .then((waitTimes) => {
            const content = {
                rides: waitTimes.map(({id, waitTime: wait, status, lastUpdate}) => ({
                    id,
                    wait,
                    lastUpdate,
                    status_text: status,
                    status: slugify(status, {lower: true})
                }))
            };
            res.jsonp(content)
        });
});

export default router;
export const forSiteMaps = themeparksSlug.map(slug => ({path: `${slug}`, date: moment().format('YYYY-MM-DD')}));

