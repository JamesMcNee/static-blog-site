const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");

const {
    DateTime
} = require("luxon");

// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
const htmlDateStringFilter = (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy-LL-dd');
}

const readableDateFilter = (dateObj) => {
    return DateTime.fromJSDate(dateObj, {
        zone: 'utc'
    }).toFormat("dd MMM yyyy");
}

const readTimeFilter = (content) => {
    const wordsPerMinute = 250;

    const stripMarkup = content.replaceAll(/<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g, '')
    const noOfWords = stripMarkup.split(/\s/g).length;
    const minutes = Math.ceil(noOfWords / wordsPerMinute);

    return `${minutes} Minute${minutes > 1 ? 's' : ''}`;
}

module.exports = function (eleventyConfig) {

    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(pluginRss);

    eleventyConfig.addPassthroughCopy('src/img')
    eleventyConfig.addPassthroughCopy('src/styles')
    eleventyConfig.addPassthroughCopy('src/favicon.ico')
    eleventyConfig.addPassthroughCopy('src/robots.txt')

    eleventyConfig.addFilter("readableDate", readableDateFilter);
    eleventyConfig.addFilter('htmlDateString', htmlDateStringFilter);
    eleventyConfig.addFilter("readTime", readTimeFilter);

    eleventyConfig.addCollection("postTags", function (collectionApi) {
        const allPosts = collectionApi.getFilteredByTag("posts")

        const shash = allPosts.reduce((accumulator, current) => {
            const currentPostsTags = current.data.labels.map(label => label.toLowerCase())

            for (const tag of currentPostsTags) {
                const previousAccumulatorTagContent = accumulator[tag] ?? []
                accumulator[tag] = [...previousAccumulatorTagContent, current]
            }

            return accumulator
        }, {})

        // console.log(shash)

        return shash
    });

    return {
        dir: {input: 'src', output: '_site'}
    };
};
