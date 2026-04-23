function getCurrentTimeAndWeather() {
    const now = Date.now();
    // 4 real-world hours = 1 in-game cycle (Day/Night)
    const cycleMs = 14400000;
    const progress = (now % cycleMs) / cycleMs; 
    
    const isDay = progress < 0.5;
    const timeOfDay = isDay ? 'Day ☀️' : 'Night 🌙';

    // Weather changes every hour
    const hourTimestamp = Math.floor(now / 3600000);
    const seed = hourTimestamp * 12345;
    const weatherRoll = (seed % 100) / 100;

    let weather = 'Clear 🌤️';
    let effect = { type: 'none', value: 0, desc: 'No special effects.' };

    if (weatherRoll < 0.15) {
        weather = 'Rain 🌧️';
        effect = { type: 'gathering', target: 'fish', value: 1.5, desc: 'Fishing yield increased by 50%.' };
    } else if (weatherRoll < 0.25) {
        weather = 'Storm ⛈️';
        effect = { type: 'combat', target: 'matk', value: 1.2, desc: 'Magic damage increased by 20%.' };
    } else if (weatherRoll < 0.35) {
        weather = 'Meteor Shower 🌠';
        effect = { type: 'gathering', target: 'mine', value: 2.0, desc: 'Mining yield increased by 100%!' };
    } else if (weatherRoll < 0.45) {
        weather = 'Heatwave 🌡️';
        effect = { type: 'combat', target: 'atk', value: 1.15, desc: 'Physical damage increased by 15%.' };
    } else if (weatherRoll < 0.55) {
        weather = 'Windy 💨';
        effect = { type: 'combat', target: 'spd', value: 5, desc: 'Speed increased by 5 for all.' };
    } else if (weatherRoll < 0.65) {
        weather = 'Foggy 🌫️';
        effect = { type: 'combat', target: 'cr_rate', value: -0.1, desc: 'Crit Rate decreased by 10%.' };
    }

    return { timeOfDay, weather, isDay, effect };
}

module.exports = { getCurrentTimeAndWeather };