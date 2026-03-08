const moment = require('moment');
require('moment-duration-format');

/**
 * Formats milliseconds into "X s Y dk" string.
 * @param {number} ms Milliseconds
 * @returns {string} Formatted string
 */
function formatDuration(ms) {
    if (!ms) return '0s 0dk';
    const duration = moment.duration(ms);
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    return `${hours}s ${minutes}dk`;
}

/**
 * Creates a progress bar
 * @param {number} current Current value
 * @param {number} goal Goal value
 * @param {number} size Size of the bar
 * @returns {string} Progress bar string
 */
function createProgressBar(current, goal, size = 15) {
    const percentage = Math.min(current / goal, 1);
    const progress = Math.round(size * percentage);
    const emptyProgress = size - progress;

    const progressText = '█'.repeat(progress);
    const emptyProgressText = '-'.repeat(emptyProgress);
    const percentageText = Math.round(percentage * 100);

    return `[${progressText}${emptyProgressText}] %${percentageText}`;
}

module.exports = { formatDuration, createProgressBar };
