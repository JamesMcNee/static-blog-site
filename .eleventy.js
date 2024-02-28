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

    const isBuildingInCI = !!process.env['CF_PAGES_BRANCH']

    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(pluginRss);

    eleventyConfig.addPassthroughCopy('src/img')
    eleventyConfig.addPassthroughCopy('src/styles')
    eleventyConfig.addPassthroughCopy('src/favicon.ico')
    eleventyConfig.addPassthroughCopy('src/robots.txt')
    eleventyConfig.addPassthroughCopy('src/scripts', { filter: (f) => f !== 'main.js'})

    eleventyConfig.addFilter("readableDate", readableDateFilter);
    eleventyConfig.addFilter('htmlDateString', htmlDateStringFilter);
    eleventyConfig.addFilter("readTime", readTimeFilter);

    const shouldDisplayItem = item => !item.data?.draft || process.env['CF_PAGES_BRANCH'] === 'preview' || !isBuildingInCI

    eleventyConfig.addFilter('shouldDisplayItem', function(collection) {
        return collection.filter(shouldDisplayItem)
    });

    eleventyConfig.addCollection('visiblePosts', (collectionApi) => {
        const allPosts = collectionApi.getFilteredByTag("posts")

        return allPosts.filter(shouldDisplayItem)
    })

    eleventyConfig.addCollection('visibleLabs', (collectionApi) => {
        const allLabs = collectionApi.getFilteredByTag("labs")

        return allLabs.filter(shouldDisplayItem)
    })

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

        const allowedScriptDomains = [
            "https://giscus.app",
            "https://static.cloudflareinsights.com"
        ]

        const allowedStyleDomains = [
            "https://giscus.app"
        ]

        const allowedInlineScriptHashes = [
            'sha256-smKXypSFxzKD9ffC0rSshp292sAzf/X7cquCvQEA8XA=', // The post search script on index
            'sha256-vUQEo1OmhinjY+7gfAiahkgCt/1E1smts+xQjZVgY6Q=' // The lab search script
        ]

        return cspBuilder({
            directives: {
                'default-src': `'none'`,
                'img-src': '* data:',
                'media-src': '*',
                'connect-src': `${defaultSrc}`,
                'font-src': `${defaultSrc}`,
                'style-src': `${defaultSrc} ${allowedStyleDomains.join(' ')}`,
                'script-src': `${defaultSrc} ${allowedInlineScriptHashes.length > 0 ? `` : ''} ${allowedInlineScriptHashes.map(hash => `'${hash}'`).join(' ')} ${allowedScriptDomains.join(' ')}`,
                'script-src-attr': `'unsafe-hashes' 'sha256-1jAmyYXcRq6zFldLe/GCgIDJBiOONdXjTLgEFMDnDSM='`, // This is to allow the preloading of stylesheets
                'frame-src': `${defaultSrc} https://giscus.app`,
                'frame-ancestors': `'none'`,
                'object-src': `'none'`,
                'form-action': `'self'`,
                'base-uri': `'none'`
            }
        })
    })

    eleventyConfig.addShortcode('commitShaOrBranch', () => {
        return process.env.CF_PAGES_COMMIT_SHA ?? 'main'
    })

    return {
        dir: {input: 'src', output: '_site'}
    };
};
