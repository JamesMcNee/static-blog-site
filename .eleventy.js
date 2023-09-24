const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");

const {
  DateTime
} = require("luxon");

const readableDateFilter = (dateObj) => {
  return DateTime.fromJSDate(dateObj, {
    zone: 'utc'
  }).toFormat("dd MMMM yyyy");
}

module.exports = function(eleventyConfig) {

  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPassthroughCopy('src/img')

    eleventyConfig.addFilter("readableDate", readableDateFilter);

  return {
    dir: { input: 'src', output: '_site' }
  };
};
