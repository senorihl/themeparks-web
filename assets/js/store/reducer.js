export function createLastUpdateReducer(lastUpdate) {
    return function (state = {lastUpdate, previousUpdate: null}, action) {
        if (action.type === 'UPDATE') {
            state.previousUpdate = state.lastUpdate;
            state.lastUpdate = action.data;
        }

        return state;
    }
}

export function updateWaitTimes(state = {}, action) {
    if (action.type === 'UPDATE') {
        state = action.data;
    }

    return state;
}
