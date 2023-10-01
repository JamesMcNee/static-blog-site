const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");

const {
    DateTime
} = require("luxon");

// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
const htmlDateStringFilter = (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
}

const readableDateFilter = (dateObj) => {
    return DateTime.fromJSDate(dateObj, {
        zone: 'utc'
    }).toFormat("dd MMM yyyy");
}

const readTimeFilter = (content) => {
    const wordsPerMinute = 250;

    const stripLinebreaks = content.replaceAll('\n', '')
    const stripFullCodeBlocks = stripLinebreaks.replaceAll(/(<pre(.+?)>([^<]+)?<\/pre>)/g, '')
    const stripMarkup = stripFullCodeBlocks.replaceAll(/<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g, '')
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

        return allPosts.reduce((accumulator, current) => {
            const currentPostsTags = current.data.labels.map(label => label.toLowerCase())

            for (const tag of currentPostsTags) {
                const previousAccumulatorTagContent = accumulator[tag] ?? []
                accumulator[tag] = [...previousAccumulatorTagContent, current]
            }

            return accumulator
        }, {})
    });

    eleventyConfig.amendLibrary("md", mdLib => {
        const anchor = require('markdown-it-anchor')
        mdLib.use(anchor, {
            permalink: anchor.permalink.linkInsideHeader({
                symbol: `<span aria-hidden="true" class="text-sm"><i class="ri-hashtag"></i></span>`,
                placement: 'before'
            })
        })

    });

    eleventyConfig.addShortcode('csp', () => {
        const cspBuilder = require("content-security-policy-builder")

        const myDomains = ['jamesmcnee.com', 'jamesmcnee.co.uk']

        const defaultSrc = `'self' ${myDomains.join(' ')} ${myDomains.map(d => '*.' + d).join(' ')}`

        return cspBuilder({
            directives: {
                'default-src': defaultSrc,
                'img-src': '*',
                'media-src': '*',
                'style-src': `${defaultSrc} https://utteranc.es`,
                'script-src': `${defaultSrc} 'unsafe-inline' https://utteranc.es`,
                'frame-src': `${defaultSrc} https://utteranc.es`,
            }
        })
    })

    return {
        dir: {input: 'src', output: '_site'}
    };
};
