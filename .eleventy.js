const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");

const {
    DateTime
} = require("luxon");

const readableDateFilter = (dateObj) => {
    return DateTime.fromJSDate(dateObj, {
        zone: 'utc'
    }).toFormat("dd MMMM yyyy");
}

function extractCodeBlockConfig(html) {
    const magicString = "#CONFIG: "

    const isCodeBlockConfig = (firstCodeLine) => firstCodeLine.indexOf(magicString) > -1;
    const firstCodeLine = html.split("\n", 1)[0];

    // Format will be #CONFIG: { title: "I am a title" }
    if (isCodeBlockConfig(firstCodeLine)) {
        const extracted = firstCodeLine.replace(new RegExp(`.*${magicString}(.*)`), "$1").replace(new RegExp('&quot;', 'g'), '"');

        const htmlWithConfigRemoved = html.replace(new RegExp(`${magicString}.*\n`), "");

        return {
            ...JSON.parse(extracted),
            htmlWithConfigRemoved: htmlWithConfigRemoved
        };
    }

    return {title: "", htmlWithConfigRemoved: html};
}

const codeBlockFilter = (content) => {
    const codeBlockTop = (title) => `
        <div style="width: 100%; background-color: #282c34; border-radius: 10px 10px 0 0; display: inline-flex;">
        <svg style="margin: 10px;" xmlns="http://www.w3.org/2000/svg" width="54" height="14" viewBox="0 0 54 14"><g fill="none" fill-rule="evenodd" transform="translate(1 1)"><circle cx="6" cy="6" r="6" fill="#FF5F56" stroke="#E0443E" stroke-width=".5"></circle><circle cx="26" cy="6" r="6" fill="#FFBD2E" stroke="#DEA123" stroke-width=".5"></circle><circle cx="46" cy="6" r="6" fill="#27C93F" stroke="#1AAB29" stroke-width=".5"></circle></g></svg>
        <span style="color: #e1e1e1; text-align: center; width: 100%; padding: 7.5px 0; font-weight: 900; font-size: 0.7rem;">${title}</span>
        </div>
    `;

    const codeBlockBottom = `<div style="width: 100%; height: 7px; background-color: #282c34; border-radius: 0 0 10px 10px"></div>`


    return content.replaceAll(new RegExp('<pre><code.*>(.*\n)+?<\/code><\/pre>', 'g'), (block) => {
        const codeBlockConfig = extractCodeBlockConfig(block)

        if (codeBlockConfig.simpleCodeBlock) {
            return codeBlockConfig.htmlWithConfigRemoved;
        }

        return `
          ${codeBlockTop(codeBlockConfig.title)}
          ${codeBlockConfig.htmlWithConfigRemoved}
          ${codeBlockBottom}
        `
    })
}

module.exports = function (eleventyConfig) {

    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    eleventyConfig.addPassthroughCopy('src/img')
    eleventyConfig.addFilter("readableDate", readableDateFilter);
    eleventyConfig.addFilter("codeBlock", codeBlockFilter);

    return {
        dir: {input: 'src', output: '_site'}
    };
};
