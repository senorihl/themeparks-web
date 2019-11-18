import moment from 'moment';
import octicons from 'octicons';
import * as SmoothScroll from 'smooth-scroll';
import { createStore } from 'redux';
import displayMoments from "./utils/moments-display";
import {updateWaitTimes} from "./store/reducer";
const scroll = new SmoothScroll('a[href*="#"]');

const {slug, rideFocus} = window.themeparks;

if (rideFocus && document.getElementById(`ride-${rideFocus}`)) {
    window.location.hash = `ride-${rideFocus}`;
}

const scrollToRide = () => {
    if (window.location.hash.startsWith('#ride-')) {
        const rideRow = document.getElementById(window.location.hash.slice(1));
        if (rideRow) {
            rideRow.classList.add('ride-row--active');
            scroll.animateScroll(rideRow);
        }
    }
};

const formatSharer = () => {
    Array.from(document.querySelectorAll('[data-sharer-url][data-text]')).forEach((link) => {
        const sharer = link.getAttribute('data-sharer-url');
        const text = link.getAttribute('data-text');
        let href = link.getAttribute('data-href') || `${window.location.origin}${window.location.pathname}`;

        if (href.startsWith('#') || href.startsWith('?')) {
            href = `${window.location.origin}${window.location.pathname}${href}`;
        }

        link.setAttribute('href', sharer.replace(/__url__/g, encodeURIComponent(href)).replace(/__text__/g, encodeURIComponent(text)));
    });
};

window.themeparks = {
    icons: {
        up: octicons['chevron-up'].toSVG({"width": 10}),
        down: octicons['chevron-down'].toSVG({"width": 10}),
        still: octicons['dash'].toSVG({"width": 10}),
    },
    store: {
        waitTimes: createStore(updateWaitTimes),
    }
};

const triggerNextReload = () => {
    setTimeout(() => {
        const scr = document.createElement("script");
        scr.src = `/refresh/${encodeURIComponent(slug)}?callback=window.themeparks.refreshRides`;
        document.body.appendChild(scr);
    },   2 * 60 * 1000);
};

scrollToRide();

displayMoments(document.getElementsByClassName('moment'));

window.themeparks.store.waitTimes.subscribe(() => {
    const rides = window.themeparks.store.waitTimes.getState();

    Object.values(rides).forEach(function ({id, wait: currentWait, lastUpdate, status_text, status}) {
        const $ride = document.getElementById('ride-' + id);

        if ($ride) {
            const previousWait = $ride.getAttribute('data-wait');
            const diff = currentWait - previousWait;
            const previousIcon = $ride.getElementsByClassName('wait-evolution')[0].innerHTML;

            if (!previousIcon || previousWait !== currentWait) {
                let icon;

                if (diff > 0) {
                    icon = window.themeparks.icons.up;
                } else if (diff < 0) {
                    icon = window.themeparks.icons.down;
                }

                if (icon) {
                    $ride.getElementsByClassName('wait-evolution')[0].innerHTML = icon;
                }
            }

            $ride.setAttribute('data-previous-wait', previousWait);
            $ride.setAttribute('data-wait', currentWait);
            $ride.setAttribute('data-status', status);
            $ride.getElementsByClassName('ride-wait')[0].textContent = currentWait >= 0 ? currentWait : 'N/A';
            $ride.getElementsByClassName('ride-status')[0].textContent = status_text;
            $ride.getElementsByClassName('ride-last-update')[0].textContent = moment(lastUpdate).fromNow();
        }
    });

    const p = document.getElementById('ride-list');

    // remove active state
    Array.prototype.slice.call(p.children).forEach((x) => x.classList.remove('ride-row--active'));

    // order by status, opened first
    Array.prototype.slice.call(p.children)
        .map((x) =>  p.removeChild(x))
        .sort((x, y) => parseInt(x.getAttribute('data-status')) - parseInt(y.getAttribute('data-status')))
        .forEach((x) => p.appendChild(x));

    // order opened by wait time
    Array.prototype.slice.call(p.children)
        .filter((x) => x.getAttribute('data-status') === '1')
        .map((x) =>  p.removeChild(x))
        .sort((x, y) => parseInt(x.getAttribute('data-wait')) - parseInt(y.getAttribute('data-wait')))
        .forEach((x) => p.prepend(x));

    // scroll to
    scrollToRide();
    triggerNextReload();
});

window.themeparks.refreshRides = (data) => {
    setTimeout(() => {
        window.themeparks.store.waitTimes.dispatch({ type: 'UPDATE', data: data.rides });
    }, 500);
};

new Promise((resolve) => {triggerNextReload();resolve();}).then();
new Promise((resolve) => {formatSharer();resolve();}).then();

