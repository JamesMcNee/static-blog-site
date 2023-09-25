const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");

const {
    DateTime
} = require("luxon");

const readableDateFilter = (dateObj) => {
    return DateTime.fromJSDate(dateObj, {
        zone: 'utc'
    }).toFormat("dd MMMM yyyy");
}

module.exports = function (eleventyConfig) {

    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(pluginRss);

    eleventyConfig.addPassthroughCopy('src/img')
    eleventyConfig.addPassthroughCopy('src/styles')
    eleventyConfig.addPassthroughCopy('src/favicon.ico')
    eleventyConfig.addFilter("readableDate", readableDateFilter);

    return {
        dir: {input: 'src', output: '_site'}
    };
};
