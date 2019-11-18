import moment from 'moment';
import 'moment-timezone/builds/moment-timezone-with-data-10-year-range';

export function printMoment ($moment, timestamp, timezone) {
    let myMoment;

    if (timestamp) {
        myMoment = moment(parseInt(timestamp) * 1000, 'x');
    } else {
        myMoment = moment();
    }

    if (timezone) {
        myMoment = myMoment.tz(timezone)
    }

    $moment.textContent = myMoment.format('hh:mm A');
}

export default function ($elements) {
    for (let $moment of $elements) {
        const timestamp = $moment.getAttribute('data-timestamp');
        const timezone = $moment.getAttribute('data-timezone');

        printMoment($moment, timestamp, timezone);

        if (!timestamp) {
            setInterval(printMoment.bind(null, $moment, null, timezone), 1000)
        }
    }
}
